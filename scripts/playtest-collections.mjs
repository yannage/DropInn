import {chromium} from 'playwright';
import {createServer} from 'vite';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

// Real browser + real isolated local handler, controlled clock. Never calls a hosted API.
const vite=await createServer({server:{host:'127.0.0.1',port:5207,strictPort:true}});
await vite.listen();
const origin='http://127.0.0.1:5207';
const {createDropinnHandler}=await vite.ssrLoadModule('/server/dropinn.ts');
let now=Date.now();
const handler=createDropinnHandler({local:true,now:()=>now,env:{}});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
const page=await context.newPage();
const errors=[],checks=[];
page.on('pageerror',error=>errors.push(error.message));
const note=text=>{checks.push(text);console.log(`PASS: ${text}`);};
await mkdir('output/playwright',{recursive:true});
await context.route('**/*',async route=>{
 const request=route.request(),url=new URL(request.url());
 if(url.origin!==origin) return route.abort();
 if(url.pathname==='/api/dropinn') {
  const response=await handler(new Request(request.url(),{method:'POST',headers:{'Content-Type':'application/json'},body:request.postData()}));
  return route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
 }
 return route.continue();
});
const state=()=>page.evaluate(async()=>{const {useAdventureStore:s}=await import('/src/store/adventureStore.ts');const v=s.getState();return {collection:v.collection,hero:v.character,room:v.room,error:v.error};});
async function wardrobe() {
 await page.getByRole('button',{name:'Your hero',exact:true}).click();
 await page.getByRole('tab',{name:/Hats ·/}).click();
 await page.getByRole('region',{name:'First tales collection'}).waitFor();
}
async function finishAdventure(id) {
 await page.evaluate(async id=>{const {useAdventureStore:s}=await import('/src/store/adventureStore.ts');await s.getState().playNow(id);},id);
 let captured=false;
 for(let turn=0;turn<31;turn++) {
  let current=await state();
  if(current.room?.status==='completed') break;
  assert.ok(current.room,'Room exists');
  await page.evaluate(async()=>{
   const {useAdventureStore:s}=await import('/src/store/adventureStore.ts');
   const {getScene}=await import('/src/lib/dropinn/scene.ts');
   const target=getScene(s.getState().room).targets.find(target=>target.tokens.includes('assist'));
   await s.getState().commitAction({token:'assist',targetId:target.id});
  });
  current=await state();assert.equal(current.error,null);
  if(!captured && current.room.outcomes.length) {
   captured=true;
   const reward=page.locator('.di-party-keepsake');
   await reward.waitFor();assert.match(await reward.innerText(),/\+1 Thread/);
   await page.screenshot({path:`output/playwright/collection-reward-${id}.png`});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1 || document.documentElement.scrollHeight>innerHeight+1);
   assert.equal(overflow,false,'Reward stays inside mobile viewport');
  }
  if(current.room.status!=='completed') {
   now+=41000;
   await page.evaluate(async()=>{const {useAdventureStore:s}=await import('/src/store/adventureStore.ts');await s.getState().syncRoom();});
  }
 }
 assert.equal((await state()).room.status,'completed');
 await page.evaluate(async()=>{const {useAdventureStore:s}=await import('/src/store/adventureStore.ts');await s.getState().leaveRoom();s.getState().dismissRecap();});
}
try {
 await page.goto(`${origin}/?session=collectionqa`);
 await page.getByRole('button',{name:'Play Now',exact:true}).waitFor();
 await wardrobe();
 assert.equal(await page.getByRole('button',{name:'Craft Blue',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Aim for Blue',exact:true}).click();
 await page.getByRole('button',{name:'Close character builder'}).click();
 await finishAdventure('briar-glen');
 assert.equal((await state()).collection.earned,3);
 assert.ok((await state()).collection.hats.includes('shepherd'));
 note('Three chapter credits, goal progress, guaranteed base hat and bounded mobile reward presentation');
 await wardrobe();
 const prior=(await state()).hero.equipment.hat;
 await page.getByRole('button',{name:'Craft Blue',exact:true}).click();
 await page.getByRole('button',{name:'Wear Blue',exact:true}).waitFor();
 assert.equal((await state()).collection.spent,3);assert.equal((await state()).hero.equipment.hat,prior,'Craft never equips');
 await page.getByRole('button',{name:'Wear Blue',exact:true}).click();
 await page.getByRole('button',{name:'Save hero',exact:true}).click();
 assert.equal((await state()).hero.equipment.hatColor,'shepherd-blue');
 await page.reload();await page.getByRole('button',{name:'Play Now',exact:true}).waitFor();
 assert.equal((await state()).collection.spent,3);assert.equal((await state()).hero.equipment.hatColor,'shepherd-blue');
 note('Crafting spends once, does not auto-equip, and saved blue style survives reload');
 await page.setViewportSize({width:320,height:568});
 await finishAdventure('last-flight-teacup');
 assert.equal((await state()).collection.earned,6);assert.equal((await state()).collection.spent,3);
 await wardrobe();assert.equal(await page.getByRole('button',{name:'Craft Feather trim',exact:true}).isDisabled(),true);
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:1280,height:900}]) {
  await page.setViewportSize(viewport);
  await page.getByRole('region',{name:'First tales collection'}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`output/playwright/collection-wardrobe-${viewport.width}.png`});
  const issues=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,small:[...document.querySelectorAll('.di-collection button')].filter(b=>b.getBoundingClientRect().height<43).length}));
  assert.deepEqual(issues,{overflow:false,small:0});
 }
 await page.getByRole('button',{name:'Original hat color',exact:true}).click();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 assert.equal((await state()).hero.equipment.hatColor,'shepherd-blue');
 note('Cross-story Thread, insufficient-balance gating, Cancel, reduced motion, desktop and both phone sizes');
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Your discoveries',exact:true}).click();
 const journal=page.getByRole('dialog',{name:'Your discoveries'});
 await journal.waitFor();assert.equal(await journal.getByText('3/3 chapters discovered',{exact:true}).count(),2);
 await page.keyboard.press('Tab');await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>document.activeElement?.tagName),'SUMMARY','Discoveries are keyboard accessible');
 assert.equal(await journal.getByText('Your first chapter is waiting.',{exact:true}).count(),2);
 await journal.locator('summary').first().click();
 await page.screenshot({path:'output/playwright/collection-journal.png'});
 await page.keyboard.press('Escape');await journal.waitFor({state:'hidden'});
 assert.equal(await page.getByRole('button',{name:'Your discoveries',exact:true}).evaluate(button=>button===document.activeElement),true);
 note('Discovery journal preserves seen outcomes, conceals unseen endings, and restores keyboard focus');
 await finishAdventure('inn-misplaced-tomorrow');
 await wardrobe();
 await page.getByRole('button',{name:'Craft Feather trim',exact:true}).click();
 await page.getByRole('button',{name:'Wear Feather trim',exact:true}).click();
 await page.getByRole('button',{name:'Save hero',exact:true}).click();
 assert.equal((await state()).collection.earned,9);assert.equal((await state()).collection.spent,9);
 assert.equal((await state()).hero.equipment.hatTrim,'shepherd-feather');
 await page.evaluate(async()=>{const {useAdventureStore:s}=await import('/src/store/adventureStore.ts');await s.getState().playNow('orchard-walked-away');});
 const admitted=await state();
 assert.ok(Object.values(admitted.room.players).some(player=>player.character.equipment.hatColor==='shepherd-blue' && player.character.equipment.hatTrim==='shepherd-feather'));
 await page.screenshot({path:'output/playwright/collection-equipped-table.png'});
 note('Six-Thread feather craft combines with the blue palette and is pinned on admission to a fourth story');
 assert.deepEqual(errors,[]);
} finally {
 await writeFile('output/playwright/collection-results.json',JSON.stringify({checks,errors,evidence:'Local Chromium with real isolated handler; not hosted Realtime or human retention evidence.'},null,2));
 await context.close();await browser.close();await vite.close();
}
