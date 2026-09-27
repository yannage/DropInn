import {chromium} from 'playwright';
import {createServer} from 'vite';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

// Real browser + real isolated local handler, controlled clock. Never calls a hosted API.
const vite=await createServer({cacheDir:'node_modules/.vite-collection-tests',server:{host:'127.0.0.1',port:5207,strictPort:true}});
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
const localRoute=async route=>{
 const request=route.request(),url=new URL(request.url());
 if(url.origin!==origin) return route.abort();
 if(url.pathname==='/api/dropinn') {
  const response=await handler(new Request(request.url(),{method:'POST',headers:{'Content-Type':'application/json'},body:request.postData()}));
  return route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
 }
 return route.continue();
};
await context.route('**/*',localRoute);
const state=()=>page.evaluate(async()=>{const {useAdventureStore:s}=await import('/src/store/adventureStore.ts');const v=s.getState();return {collection:v.collection,hero:v.character,room:v.room,error:v.error};});
async function wardrobe() {
 await page.getByRole('button',{name:'Customize hero',exact:true}).click();
 await page.getByRole('tab',{name:/Hats ·/}).click();
 await page.getByRole('region',{name:'First tales collection'}).waitFor();
}
async function finishAdventure(id) {
 await page.evaluate(async id=>{const {useAdventureStore:s}=await import('/src/store/adventureStore.ts');await s.getState().playNow(id);},id);
 let observerContext,observer;
 if(id==='briar-glen') {
  observerContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await observerContext.route('**/*',localRoute);
  observer=await observerContext.newPage();
  observer.on('pageerror',error=>errors.push(error.message));
  await observer.goto(`${origin}/?session=rewardobserver`);
  await observer.locator('.di-lobby-play').waitFor();
  await observer.evaluate(async code=>{const {useAdventureStore:s}=await import('/src/store/adventureStore.ts');await s.getState().joinRoom(code);},(await state()).room.code);
 }
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
  if(current.room.phase==='choosing') {
   now+=31000;
   await page.evaluate(async()=>{const {useAdventureStore:s}=await import('/src/store/adventureStore.ts');await s.getState().syncRoom();});
   current=await state();
  }
  if(!captured && current.room.outcomes.length) {
   captured=true;
   const reward=page.locator('.di-party-keepsake');
   await reward.waitFor();assert.match(await reward.innerText(),/\+1 Thread/);
   await page.screenshot({path:`output/playwright/collection-reward-${id}.png`});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1 || document.documentElement.scrollHeight>innerHeight+1);
   assert.equal(overflow,false,'Reward stays inside mobile viewport');
   if(observer) {
    await observer.evaluate(async()=>{const {useAdventureStore:s}=await import('/src/store/adventureStore.ts');await s.getState().syncRoom();});
    const observed=await observer.evaluate(async()=>{const {useAdventureStore:s}=await import('/src/store/adventureStore.ts');const v=s.getState();return {earned:v.collection.earned,hats:v.collection.hats,outcomes:v.room.outcomes.length};});
    assert.equal(observed.earned,0);assert.deepEqual(observed.hats,[]);
    assert.equal(observed.outcomes,current.room.outcomes.length,'Both browsers agree on chapter completion');
    assert.doesNotMatch(await observer.locator('.di-party-keepsake').innerText(),/\+1 Thread|New hat unlocked|In your collection/);
    await observerContext.close();observer=null;
    note('Two browser contexts share the chapter result; only the contributor receives a personal cosmetic reward');
   }
  }
  if(current.room.status!=='completed') {
   now+=41000;
   await page.evaluate(async()=>{const {useAdventureStore:s}=await import('/src/store/adventureStore.ts');await s.getState().syncRoom();});
  }
 }
 assert.equal((await state()).room.status,'completed');
 await page.evaluate(async()=>{const {useAdventureStore:s}=await import('/src/store/adventureStore.ts');await s.getState().leaveRoom();});
 const recap=page.getByRole('dialog',{name:'Your adventure recap'});
 await recap.waitFor();
 if(id==='briar-glen') {
  assert.equal(await recap.getByText('New hat unlocked',{exact:true}).count(),3);
  const before=(await state()).hero.equipment;
  await recap.getByRole('button',{name:'View your hat',exact:true}).first().click();
  await page.getByRole('tab',{name:/Hats/}).waitFor();
  assert.equal(await page.getByRole('tab',{name:/Hats/}).getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('[data-cosmetic-id="shepherd"]').evaluate(node=>node.classList.contains('di-cosmetic-highlight')),true);
  assert.deepEqual((await state()).hero.equipment,before,'Viewing a reward never equips');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.locator('.di-visit').first().click();
  await recap.waitFor();
  assert.equal(await recap.getByText('New hat unlocked',{exact:true}).count(),0,'Historical recap does not celebrate again');
  await recap.getByRole('button',{name:'Unlock a new look',exact:true}).click();
  await page.getByRole('region',{name:'First tales collection'}).waitFor();
  assert.equal(await page.locator('[data-cosmetic-id="shepherd-blue"]').evaluate(node=>node.classList.contains('di-cosmetic-highlight')),true);
  assert.equal((await state()).collection.spent,0,'Wardrobe handoff never spends');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  note('Reward recap links target hats and styles without spending or equipping; historical recaps never reannounce new hats');
 } else await recap.getByRole('button',{name:'Back to the inn',exact:false}).click();
}
try {
 await page.goto(`${origin}/?session=collectionqa`);
 await page.locator('.di-lobby-play').waitFor();
 await page.getByRole('button',{name:'Change story',exact:true}).click();
 const cards=page.getByRole('group',{name:'Story choices'});
 assert.equal(await cards.locator('article').first().getByText('Hat to unlock',{exact:false}).count(),3);
 assert.equal(await cards.getByText('+1 Thread per contributed chapter',{exact:true}).count(),4);
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Customize hero from header',exact:true}).click();
 await page.getByRole('tab',{name:'Character',exact:true}).waitFor();
 await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('button',{name:'Customize hero from header',exact:true}).evaluate(button=>button===document.activeElement),true);
 await page.getByRole('button',{name:'Choose a look',exact:true}).click();
 await page.getByRole('region',{name:'First tales collection'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Craft Blue',exact:true}).isDisabled(),true);
 await page.keyboard.press('Escape');
 note('All four stories preview real rewards; header and suggested-look links open the correct customizer tab');
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
 await page.reload();await page.locator('.di-lobby-play').waitFor();
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
  if(issues.overflow) console.log('Overflow diagnostics',await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width && r.right>innerWidth+1 && !e.closest('.di-story-cards');}).slice(0,15).map(e=>({tag:e.tagName,class:String(e.className),right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))})));
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
