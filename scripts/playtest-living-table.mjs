import { chromium } from 'playwright';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Local integration fixture: real command handler + real browser UI, no hosted writes
// or inference. Only its injected clock advances between completed turn boundaries.
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log('Usage: npm run test:living-table -- [--base-url http://localhost:5198]\nStart the local Vite development server first. Requires Playwright Chromium.');
  process.exit(0);
}
if (args.length && (args.length !== 2 || args[0] !== '--base-url')) throw new Error('Use --base-url http://localhost:5198, or omit it for that default.');
const origin = new URL(args[1] ?? 'http://localhost:5198');
if (origin.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
  || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
  throw new Error('Scene playtests require a plain HTTP loopback origin, without credentials, path, query, or fragment.');
}
const base = origin.origin;
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
await mkdir('output/playwright', { recursive: true });
let ssr, browser, handler, getScene;
let offset = 0;
const clock = () => Date.now() + offset;
let externalCalls = 0;
const pages = [];
const records = [];
const checks = [];
const faults = { blockAReads: false, loseAResponses: 0 };
const errors = [];
const consoleErrors = [];
const blockedOrigins = new Set();
const note = (name, detail = {}) => { checks.push({ name, ...detail }); console.log(JSON.stringify({ name, ...detail })); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function service(payload) {
  const response = await handler(new Request(`${base}/api/dropinn`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }));
  const result = await response.json();
  assert.equal(response.status, 200, result.error);
  return result;
}
async function setup(name, viewport) {
  const context = await browser.newContext({ viewport, hasTouch: true });
  await context.addInitScript(({ offset }) => { const realNow = Date.now.bind(Date); window.__qaOffset = offset; Date.now = () => realNow() + window.__qaOffset; }, { offset });
  const page = await context.newPage(); pages.push(page);
  page.on('pageerror', error => errors.push({ page: name, message: error.message }));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push({ page: name, message: message.text() }); });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== base) {
      blockedOrigins.add(url.origin);
      return route.abort('blockedbyclient');
    }
    return route.fallback();
  });
  await page.route('**/api/dropinn', async route => {
    const payload = route.request().postDataJSON();
    if (name === 'A' && payload.command?.type === 'act' && faults.rejectAAct) { faults.rejectAAct = false; return route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({error:'This move was rejected for the local recovery check.'})}); }
    if (name === 'A' && payload.command?.type === 'act' && faults.pauseAAct) await faults.pauseAAct;
    if (name === 'A' && faults.blockAReads && payload.operation === 'read') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Intentional QA read interruption' }) });
    const response = await handler(new Request(`${base}/api/dropinn`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }));
    const body = await response.text();
    if (payload.operation === 'command' && payload.command?.type === 'act') {
      records.push({ page: name, command: structuredClone(payload.command), response: JSON.parse(body), status: response.status });
      if (name === 'A' && faults.loseAResponses > 0) { faults.loseAResponses--; faults.blockAReads = true; return route.abort('failed'); }
    }
    return route.fulfill({ status: response.status, contentType: 'application/json', body });
  });
  await page.goto(`${base}/?session=scrollqa${name.toLowerCase()}`);
  assert.equal(await page.evaluate(async () => (await import('/src/lib/dropinn/api.ts')).localPlay), true, 'The selected Vite server must run the local backend.');
  await page.getByRole('button', { name: 'Play with friends', exact: true }).waitFor();
  return page;
}
async function state(page) {
  return page.evaluate(async () => {
    const store = (await import('/src/store/adventureStore.ts')).useAdventureStore.getState();
    return { userId: store.userId, character: store.character, room: store.room, pendingMove: store.pendingMove, loading: store.loading, proposal: store.proposal, error: store.error, restoringCode: store.restoringCode };
  });
}
async function sync(page) {
  await page.waitForFunction(async () => !(await import('/src/store/adventureStore.ts')).useAdventureStore.getState().loading);
  await page.evaluate(async () => (await import('/src/store/adventureStore.ts')).useAdventureStore.getState().syncRoom());
}
async function syncAll() { for (const page of pages) await sync(page); }
async function advanceTo(time) {
  offset = Math.max(offset, time - Date.now());
  for (const page of pages) await page.evaluate(value => { window.__qaOffset = value; }, offset);
  await syncAll();
}
async function readyNext(page) {
  let room = (await state(page)).room;
  if (room.phase === 'reveal' && room.status !== 'completed') await advanceTo(room.revealUntil + 1);
  await page.waitForFunction(async () => (await import('/src/store/adventureStore.ts')).useAdventureStore.getState().room?.phase === 'choosing');
}
async function select(page, token, targetId, kind = 'scene') {
  const back = page.getByRole('button', { name: 'Back to scene', exact: true });
  if (await back.isVisible() && await back.isEnabled()) await back.click();
  const change = page.getByRole('button', { name: 'Change move', exact: true });
  if (await change.isVisible() && await change.isEnabled()) await change.click();
  const close = page.getByRole('button', { name: 'Close inspection', exact: true });
  if (await close.isVisible()) await close.click();
  await showTokens(page);
  const labels = { fight: 'Fight', influence: 'Influence', investigate: 'Investigate', assist: 'Help' };
  await page.getByRole('button', { name: `${labels[token]} token`, exact: true }).click();
  await page.locator(`[data-scene-target="${targetId}"][data-target-kind="${kind}"]`).click();
  await page.getByRole('button', { name: /Hold and release the die|Release with timing assistance/ }).waitFor({ state: 'visible' });
}
async function showTokens(page) {
  const show = page.getByRole('button', { name: 'Show tokens', exact: true });
  if (await show.isVisible()) await show.click();
}
async function skip(page) {
  const before = records.length;
  await page.getByRole('button', { name: 'Roll now', exact: true }).click();
  await page.waitForFunction(async () => !(await import('/src/store/adventureStore.ts')).useAdventureStore.getState().loading);
  assert.equal(records.length, before + 1);
  return records.at(-1);
}
try {
  ssr = await createServer({ configFile:false, cacheDir:'node_modules/.vite-living-tests', optimizeDeps:{noDiscovery:true,include:[]}, server:{middlewareMode:true,hmr:false}, appType:'custom',logLevel:'error' });
  const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
  ({ getScene } = await ssr.ssrLoadModule('/src/lib/dropinn/scene.ts'));
  const { combinationDefinition, combinationState } = await ssr.ssrLoadModule('/src/lib/dropinn/combinations.ts');
  handler = createDropinnHandler({local:true,env:{},now:clock,fetch:async()=>{externalCalls++;throw new Error('No external calls');}});
  browser = await chromium.launch({headless:true});
  const a = await setup('A',{width:390,height:844}), b = await setup('B',{width:390,height:844});
  await a.getByRole('button',{name:'Play with friends',exact:true}).click();
  await a.getByRole('button',{name:'Start a friend table',exact:true}).click();
  await a.getByRole('main',{name:'Adventure table'}).waitFor();
  await a.getByRole('button',{name:'Invite',exact:true}).click();
  const invite = await a.getByRole('textbox',{name:'Full invitation link'}).inputValue();
  await a.keyboard.press('Escape');
  await b.getByRole('button',{name:'Play with friends',exact:true}).click();
  await b.getByRole('textbox',{name:'Adventure code or invitation link'}).fill(invite);
  await b.getByRole('button',{name:'Join adventure by code'}).click();
  await b.getByRole('main',{name:'Adventure table'}).waitFor();
  await a.route('**/art/**', route=>route.abort('failed'));
  await a.reload(); await a.getByRole('main',{name:'Adventure table'}).waitFor();
  assert.equal(await a.locator('.di-stage-targets [data-scene-target]').count(),4);
  assert.equal(await a.getByRole('button',{name:'Help token',exact:true}).count(),1);
  await a.locator('[data-scene-target=gate]').click();
  await a.getByRole('group',{name:'Moves for this target'}).waitFor();
  note('unavailable-art-keeps-labels-and-legal-moves');
  await a.unroute('**/art/**'); await a.reload(); await sync(a);
  await a.evaluate(()=>{ window.__stageBudget={maxParticles:0,frames:0}; window.__stageSample=setInterval(()=>{window.__stageBudget.maxParticles=Math.max(window.__stageBudget.maxParticles,document.querySelectorAll('.di-stage-effects .di-impact i').length);window.__stageBudget.frames++;},16); });
  for (let chapter=0;chapter<3;chapter++) {
    let room=(await state(a)).room;
    assert.equal(room.adventureVersion,2);
    for(let attempt=0;!combinationState(room)&&attempt<8;attempt++) {
      const setupMove=combinationDefinition(room);
      for(const page of [a,b]) {
        const self=await state(page);
        if(!room.seats.some(seat=>seat.actorId===self.userId && seat.kind==='human')) continue;
        await select(page,'assist',setupMove.sourceId); await skip(page);
      }
      await syncAll(); room=(await state(a)).room;
      assert.equal(await a.locator('.di-round-scroll').count(),0,'Committed actions never auto-open parchment');
      await readyNext(a); await syncAll(); room=(await state(a)).room;
    }
    assert.ok(combinationState(room),'A real successful setup opens an opportunity');
    assert.equal(room.chapter,chapter);
    const definition=combinationDefinition(room);
    for(const [index,page] of [a,b].entries()) {
      const payoff=definition.payoffs[index];
      await page.locator('.di-combination-notice.is-ready').waitFor();
      assert.equal(await page.locator('.di-combination-links path').count(),2);
      await select(page,payoff.token,payoff.targetId);
      const group=page.getByRole('group',{name:'Scene combination'});
      assert.equal(await group.getByRole('button',{name:'Ordinary move'}).getAttribute('aria-pressed'),'true');
      await group.getByRole('button',{name:new RegExp(payoff.label)}).click();
      for(const viewport of [{width:390,height:844},{width:320,height:568},{width:1280,height:800}]) {
        await page.setViewportSize(viewport);
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const geometry=await page.evaluate(()=>({height:innerHeight,scroll:document.documentElement.scrollHeight,targets:[...document.querySelectorAll('[data-scene-target]')].map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};}),width:innerWidth}));
        assert.ok(geometry.scroll<=geometry.height+1,JSON.stringify(geometry));
        for(const target of geometry.targets) assert.ok(target.w>=44 && target.h>=44 && target.x>=0 && target.right<=geometry.width+1 && target.y>=0 && target.bottom<=geometry.height,JSON.stringify(target));
        const controls=await page.evaluate(()=>({footer:document.querySelector('.di-scene-tools').getBoundingClientRect().bottom,release:document.querySelector('.di-focus-control').getBoundingClientRect().bottom,toolTop:document.querySelector('.di-scene-tools').getBoundingClientRect().top}));
        assert.ok(controls.footer<=viewport.height+1 && controls.release<=controls.toolTop+1,JSON.stringify(controls));
        const choice=await group.boundingBox(), release=await page.locator('.di-focus-control').boundingBox();
        assert.ok(choice.y+choice.height<=release.y+1,'Combination choices stay above the release control');
        await page.screenshot({path:`output/playwright/living-combo-${chapter}-${index}-${viewport.width}.png`,animations:'disabled'});
      }
      if(chapter===0 && index===0) {
        await page.setViewportSize({width:390,height:844});
        const enlarged=await page.addStyleTag({content:'.di-object-label{font-size:18px!important;line-height:1.15!important}.di-scene-selection span,.di-combo-choices button,.di-combo-choices small{font-size:16px!important;line-height:1.2!important}'});
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const enlargedFit=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,footer:document.querySelector('.di-scene-tools').getBoundingClientRect().bottom,height:innerHeight}));
        assert.ok(enlargedFit.scroll<=enlargedFit.width && enlargedFit.footer<=enlargedFit.height+1,JSON.stringify(enlargedFit));
        await page.screenshot({path:'output/playwright/living-enlarged-text-390.png',animations:'disabled'});
        await enlarged.evaluate(node=>node.remove());
        note('enlarged-target-and-action-text-390',enlargedFit);
      }
      if (chapter===0 && index===0) faults.loseAResponses=1;
      await skip(page);
      const receipt=records.at(-1);
      if (chapter===0 && index===0) {
        await page.waitForFunction(async()=>!!(await import('/src/store/adventureStore.ts')).useAdventureStore.getState().pendingMove);
        const saved=(await state(page)).pendingMove;
        assert.deepEqual(saved.action.combination,{id:definition.id,payoffId:payoff.id});
        await page.getByRole('button',{name:'Retry same move',exact:true}).click();
        await page.waitForFunction(async()=>!(await import('/src/store/adventureStore.ts')).useAdventureStore.getState().pendingMove);
        faults.blockAReads=false;
        assert.deepEqual(records.at(-1).command,receipt.command,'Retry preserves the entire combination, approach and release');
        assert.equal(combinationState(records.at(-1).response.room).usedBy.filter(id=>id===receipt.command.userId).length,1);
        note('combination-lost-response-exact-retry');
      }
      assert.deepEqual(receipt.command.action.combination,{id:definition.id,payoffId:payoff.id});
      assert.ok(combinationState(receipt.response.room).usedBy.includes((await state(page)).userId));
    }
    await syncAll(); room=(await state(a)).room;
    assert.equal(room.events.filter(event=>event.turn===room.turn && event.result?.combination?.kind==='payoff').length,2);
    await a.waitForFunction(()=>document.querySelector('.di-turn-consequence')?.textContent);
    await a.screenshot({path:`output/playwright/living-payoff-${chapter}.png`});
    const sample=await a.evaluate(()=>window.__stageBudget);
    if(sample) {assert.ok(sample.maxParticles<=24);note('sampled-transient-budget',sample);}
    await a.reload(); await sync(a);
    assert.equal(await a.locator('.di-stage-effects').count(),0,'Reload never replays impacts');
    assert.equal(combinationState((await state(a)).room).usedBy.length,2);
    note('real-two-player-combination',{chapter,payoffs:definition.payoffs.map(item=>item.id)});
    // Finish the chapter using ordinary real commands, preserving all dice and caps.
    for(let turns=0;turns<12 && room.chapter===chapter && room.status!=='completed';turns++) {
      await readyNext(a); await syncAll(); room=(await state(a)).room;
      if(room.chapter!==chapter||room.status==='completed') break;
      const target=getScene(room).targets.find(item=>item.tokens.includes('assist'));
      for(const page of [a,b]) { await select(page,'assist',target.id); await skip(page); }
      await syncAll();room=(await state(a)).room;
    }
  }
  assert.equal((await state(a)).room.status,'completed');
  const budget=await a.evaluate(()=>{clearInterval(window.__stageSample);return window.__stageBudget;});
  // Reload checks intentionally reset page-local sampling; finite effects are also bounded in source.
  if (budget) { assert.ok(budget.maxParticles<=24); note('sampled-transient-budget',budget); }
  assert.deepEqual(errors,[]);assert.equal(externalCalls,0);
} catch(error) {
  note('FAILED',{message:error.message,stack:error.stack}); process.exitCode=1;
  for(let i=0;i<pages.length;i++) await pages[i].screenshot({path:`output/playwright/living-failure-${i}.png`}).catch(()=>{});
} finally {
  await writeFile('output/playwright/living-table-results.json',JSON.stringify({checks,errors,externalCalls,evidence:'Real isolated local handler, two Chromium identities, real setup and payoff rolls; controlled round boundaries. No hosted writes.'},null,2));
  await browser?.close();await ssr?.close();
}
