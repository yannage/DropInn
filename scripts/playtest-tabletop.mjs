import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base=process.argv[2] ?? 'http://127.0.0.1:5206';
const url=new URL(base);
if(url.protocol!=='http:' || !['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Use a local preview only.');
await mkdir('output/playwright',{recursive:true});
const browser=await chromium.launch({headless:true});
const checks=[],errors=[];
const note=name=>{checks.push(name);console.log(name);};
const state=page=>page.evaluate(async()=>{const s=(await import('/src/store/adventureStore.ts')).useAdventureStore.getState();return {room:s.room,userId:s.userId};});
try{
  for(const [width,height] of [[1280,900],[390,844],[320,568]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/?session=tabletopqa${width}`);
    await page.getByRole('button',{name:'Start a friend table',exact:true}).waitFor();
    if(width===1280)await page.screenshot({path:'output/playwright/tabletop-lobby-1280.png'});
    const opened=page.waitForResponse(r=>r.url().endsWith('/api/dropinn') && r.request().postDataJSON()?.operation==='play');
    await page.getByRole('button',{name:'Start a friend table',exact:true}).click();
    assert.equal((await (await opened).json()).backend,'local');
    await page.getByRole('main',{name:'Adventure table'}).waitFor();
    await page.waitForFunction(()=>[...document.querySelectorAll('.di-tabletop-art img')].every(img=>img.complete && img.naturalWidth>0));
    assert.equal(await page.locator('.di-scene-hand [aria-pressed=true]').count(),0,'No token is falsely selected before inspection');
    await page.screenshot({path:`output/playwright/tabletop-hand-${width}.png`});
    await page.locator('[data-scene-target=mara]').click();
    await page.getByRole('group',{name:'Moves for this target'}).waitFor();
    await page.screenshot({path:`output/playwright/tabletop-inspect-${width}.png`});
    await page.getByRole('button',{name:/Influence: Ask what she saw/}).click();
    const hold=page.getByRole('button',{name:'Hold and release the die'});await hold.waitFor();
    const sizes=await page.locator('.di-focus-choices button,.di-focus-hold,.di-focus-roll-now,.di-scene-selection>button').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {name:n.textContent,width:b.width,height:b.height};}));
    assert.ok(sizes.every(b=>b.width>=44 && b.height>=44),JSON.stringify(sizes));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight),'stage fits viewport');
    await page.screenshot({path:`output/playwright/tabletop-focus-${width}.png`});
    const resolved=page.waitForResponse(r=>r.url().endsWith('/api/dropinn') && r.request().postDataJSON()?.command?.type==='act');
    await page.getByRole('button',{name:'Roll now',exact:true}).click();
    const result=await (await resolved).json();assert.equal(result.backend,'local');
    const before=await state(page);assert.ok(before.room.events.some(e=>e.actorId===before.userId && e.result));
    await page.getByRole('region',{name:'Round actions and consequences'}).waitFor();
    assert.ok(await page.locator('.di-payoff-benefits').count()>0);
    await page.screenshot({path:`output/playwright/tabletop-payoff-${width}.png`});
    await page.getByRole('button',{name:/Last round/}).waitFor();
    const committed=(await state(page)).room.players[before.userId].actions;
    await page.getByRole('button',{name:/Last round/}).click();
    await page.getByRole('dialog',{name:'Last round',exact:true}).waitFor();
    assert.equal(await page.locator('.di-round-recap').getAttribute('data-fresh'),'false');
    assert.equal((await state(page)).room.players[before.userId].actions,committed);
    await page.keyboard.press('Escape');
    note(`art, inspect, choice, recorded payoff and journal at ${width}x${height}`);
    // Asset failure must leave named, usable controls and a CSS paper fallback.
    await page.route('**/art/ui-*.webp',r=>r.abort());
    await page.reload();await page.getByRole('main',{name:'Adventure table'}).waitFor();
    await page.waitForFunction(()=>document.querySelector('.di-scene-spark .di-tabletop-art svg'));
    assert.ok(await page.getByRole('button',{name:'Spotlight idea',exact:true}).isVisible());
    await page.getByRole('button',{name:'Fight token',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Fight token',exact:true}).getAttribute('aria-pressed'),'true');
    note(`missing illustration preserves fallback and input at ${width}`);
    await page.getByRole('button',{name:'Leave & save',exact:true}).click();await context.close();
  }
  assert.deepEqual(errors,[]);
}catch(e){console.error(e);process.exitCode=1;for(const [i,page] of browser.contexts().flatMap(c=>c.pages()).entries())await page.screenshot({path:`output/playwright/tabletop-failure-${i}.png`}).catch(()=>{});}
finally{await writeFile('output/playwright/tabletop-results.json',JSON.stringify({evidence:'Local Vite command service, Chromium desktop emulation, reduced-motion layouts. No hosted or physical-device claim.',checks,errors},null,2));await browser.close();}
