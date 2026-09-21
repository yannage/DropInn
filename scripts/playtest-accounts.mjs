import {chromium} from 'playwright';
import {createServer} from 'vite';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

// Real browser + Supabase auth client, deterministic Auth/command responses.
// SQL ownership/concurrency is separately tested by test-database.mjs.
process.env.DROPINN_BACKEND='supabase';
process.env.VITE_SUPABASE_URL='https://account-qa.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY='qa-public-key';
const vite=await createServer({server:{host:'127.0.0.1',port:5205,strictPort:true}});
await vite.listen();
const base='http://127.0.0.1:5205';
const {createCharacterProfile}=await vite.ssrLoadModule('/src/lib/character.ts');
const browser=await chromium.launch({headless:true});
await mkdir('output/playwright',{recursive:true});
const users=new Map(),heroes=new Map(),claims=new Map(),selected=new Map();
const checks=[],errors=[];
let failSave=false,offlineAccount=false;
const note=name=>{checks.push(name);console.log(name);};
function user(guest=true,email){const u={id:randomUUID(),aud:'authenticated',role:'authenticated',is_anonymous:guest,email,identities:guest?[]:[{provider:'email'}],created_at:new Date().toISOString(),app_metadata:{},user_metadata:{}};users.set(u.id,u);heroes.set(u.id,[{playerId:u.id,character:createCharacterProfile('Wren','wizard')}]);return u;}
function session(u){const jwt=[{alg:'HS256',typ:'JWT'},{sub:u.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),is_anonymous:u.is_anonymous},'qa-signature'].map(v=>Buffer.from(typeof v==='string'?v:JSON.stringify(v)).toString('base64url')).join('.');return {access_token:jwt,refresh_token:u.id,expires_in:3600,token_type:'bearer',user:u};}
function fromHeader(request){const token=request.headers().authorization?.replace('Bearer ','');try{return users.get(JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub);}catch{return null;}}
function account(u){const list=heroes.get(u.id);return {id:u.id,guest:u.is_anonymous,email:u.email,identities:u.identities.map(i=>i.provider),heroes:list,selectedCharacterId:selected.get(u.id) ?? list[0].character.id,capabilities:{heroSlots:1,payments:false},providers:{google:true,email:true}};}
async function setup(){
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();let emailTarget,googleTarget;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   const json=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
   if(url.pathname.startsWith('/auth/v1/')) {
     const body=req.postDataJSON() ?? {},u=fromHeader(req);
     if(url.pathname.endsWith('/signup')) return json(session(user()));
     if(url.pathname.endsWith('/logout')) return json({});
     if(url.pathname.endsWith('/user/identities/authorize')) {googleTarget=u;return json({url:`${base}/?code=qa-google`});}
     if(url.pathname.endsWith('/token')) {
       const who=googleTarget ?? users.get(body.refresh_token);
       if(googleTarget){who.is_anonymous=false;who.email='google@qa.invalid';who.identities=[{provider:'google'}];googleTarget=null;}
       return json(session(who));
     }
     if(url.pathname.endsWith('/user')) {
       if(req.method()==='PUT'){emailTarget=u;u.email=body.email;}
       return json(u);
     }
     if(url.pathname.endsWith('/otp')) {emailTarget=[...users.values()].find(item=>item.email===body.email && !item.is_anonymous);return json({});}
     if(url.pathname.endsWith('/verify')) {
       if(body.token!=='123456')return json({msg:'That code expired. Request a new code.'},403);
       emailTarget.is_anonymous=false;emailTarget.identities=[{provider:'email'}];return json(session(emailTarget));
     }
     throw new Error(`Unexpected auth request ${url.pathname}`);
   }
   if(url.origin===base && url.pathname==='/api/dropinn') {
     const body=req.postDataJSON(),u=fromHeader(req);
     if(!u)return json({backend:'supabase',error:'Sign in first'},401);
     if(body.operation==='account'){if(offlineAccount)return json({error:'Account loading interrupted. Retry.'},503);return json({backend:'supabase',account:account(u)});}
     if(body.operation==='list')return json({backend:'supabase',rooms:[]});
     if(body.operation==='history')return json({backend:'supabase',recaps:[]});
     if(body.operation==='hero-save'){
       assert.equal(body.character.xp,undefined);assert.equal(body.character.inventory,undefined);
       if(failSave)return json({error:'Save interrupted. Please retry.'},503);
       const entry=heroes.get(u.id).find(h=>h.character.id===body.character.id);assert.ok(entry);
       entry.character={...entry.character,...body.character};return json({backend:'supabase',character:entry.character});
     }
     if(body.operation==='hero-select'){selected.set(u.id,body.characterId);return json({backend:'supabase',account:account(u)});}
     if(body.operation==='claim-prepare'){const token='c'+randomUUID().replaceAll('-','')+'1234567890';claims.set(token,u.id);return json({backend:'supabase',claimToken:token});}
     if(body.operation==='claim-redeem'){
       const source=claims.get(body.claimToken);assert.ok(source);if(source!==u.id){for(const entry of heroes.get(source) ?? [])if(!heroes.get(u.id).some(h=>h.character.id===entry.character.id))heroes.get(u.id).push(entry);}return json({backend:'supabase',account:account(u)});
     }
     throw new Error(`Unexpected game request ${body.operation}`);
   }
   if(url.origin!==base)return route.abort();
   return route.continue();
 });
 await page.goto(base);await page.getByRole('button',{name:'Save your hero',exact:true}).waitFor();
 return page;
}
const state=page=>page.evaluate(async()=>{const s=(await import('/src/store/adventureStore.ts')).useAdventureStore.getState();return {character:s.character,account:s.account,error:s.error,saveStatus:s.saveStatus};});
try{
 const a=await setup();
 await a.getByRole('button',{name:'Make this hero yours'}).click();await a.getByLabel('Hero name').fill('Moss');
 failSave=true;await a.getByRole('button',{name:'Save hero',exact:true}).click();await a.getByRole('alert').filter({hasText:'Save interrupted'}).first().waitFor();
 assert.equal((await state(a)).character.name,'Wren');failSave=false;await a.getByRole('button',{name:'Save hero',exact:true}).click();
 await a.getByRole('dialog',{name:'Meet your little weirdo.'}).waitFor({state:'hidden'});
 const guest=(await state(a)).character;assert.equal(guest.name,'Moss');
 await a.reload();await a.getByRole('button',{name:'Save your hero',exact:true}).click();assert.equal((await state(a)).character.id,guest.id);note('guest edit retry and reload');
 for(const viewport of [{width:390,height:844},{width:320,height:568}]){
   await a.setViewportSize(viewport);const box=await a.getByRole('dialog',{name:'Your hero, wherever you drop in'}).boundingBox();assert.ok(box.x>=0 && box.x+box.width<=viewport.width);
   await a.screenshot({path:`output/playwright/accounts-signin-${viewport.width}.png`,animations:'disabled'});
 }
 await a.getByLabel('Email address',{exact:true}).fill('moss@qa.invalid');await a.getByRole('button',{name:'Save with an email code'}).click();
 await a.getByLabel('Six-digit login code').fill('000000');await a.getByRole('button',{name:'Verify code',exact:true}).click();await a.getByRole('alert').filter({hasText:'code expired'}).waitFor();
 await a.getByLabel('Six-digit login code').fill('123456');await a.getByRole('button',{name:'Verify code',exact:true}).click();await a.getByRole('button',{name:'Sign out on this browser'}).waitFor();
 let s=await state(a);assert.equal(s.account.guest,false);assert.equal(s.character.id,guest.id);note('email upgrade keeps hero; expired code is recoverable');
 await a.waitForFunction(()=>![...document.querySelectorAll('button')].find(b=>b.textContent==='Sign out on this browser')?.disabled);
 await a.locator('.di-scene-drawer-body').evaluate(el=>{el.scrollTop=0;});
 await a.screenshot({path:'output/playwright/accounts-saved-320.png',animations:'disabled'});
 const b=await setup();await b.getByRole('button',{name:'Save your hero',exact:true}).click();await b.getByLabel('I already have a DropInn account').check();
 await b.getByLabel('Email address',{exact:true}).fill('moss@qa.invalid');await b.getByRole('button',{name:'Email me a login code'}).click();await b.getByLabel('Six-digit login code').fill('123456');await b.getByRole('button',{name:'Verify code',exact:true}).click();await b.getByRole('button',{name:'Sign out on this browser'}).waitFor();
 await b.waitForFunction(async()=>((await import('/src/store/adventureStore.ts')).useAdventureStore.getState().account?.heroes.length ?? 0)===2);
 assert.equal((await state(b)).character.id,guest.id);note('second browser restores account and preserves both heroes');
 const imported=(await state(b)).account.heroes.find(h=>h.character.id!==guest.id);await b.getByRole('button',{name:new RegExp(`${imported.character.name}.*XP`)}).click();
 await b.reload();await b.getByRole('button',{name:'Your account & heroes',exact:true}).waitFor();assert.equal((await state(b)).character.id,imported.character.id);note('selected hero persists across reload');
 await b.getByRole('button',{name:'Your account & heroes',exact:true}).click();await b.getByRole('button',{name:'Sign out on this browser'}).click();await b.getByRole('button',{name:'Save with an email code'}).waitFor();assert.equal((await state(b)).account.guest,true);assert.notEqual((await state(b)).character.id,guest.id);note('sign-out isolates account data');
 const c=await setup();await c.getByRole('button',{name:'Save your hero',exact:true}).click();const beforeGoogle=(await state(c)).character.id;await c.getByRole('button',{name:'Continue with Google'}).click();await c.getByRole('button',{name:'Your account & heroes',exact:true}).waitFor();assert.equal((await state(c)).character.id,beforeGoogle);note('Google PKCE callback completes before guest initialization');
 offlineAccount=true;await c.reload();await c.getByText('Account loading interrupted. Retry.').first().waitFor();assert.equal((await state(c)).character.id,beforeGoogle);offlineAccount=false;
 await c.getByRole('button',{name:/Your account & heroes|Save your hero/}).click();await c.getByRole('button',{name:'Retry account sync'}).click();await c.getByRole('button',{name:'Sign out on this browser'}).waitFor();note('failed cloud load does not replace hero and retry recovers');
 await c.keyboard.press('Escape');assert.equal(await c.getByRole('dialog').count(),0);
 assert.deepEqual(errors,[]);note('keyboard dismissal and no browser exceptions');
}catch(error){console.error(error);for(const [i,page] of browser.contexts().flatMap(c=>c.pages()).entries())await page.screenshot({path:`output/playwright/accounts-failure-${i}.png`}).catch(()=>{});process.exitCode=1;}
finally{await writeFile('output/playwright/accounts-results.json',JSON.stringify({evidence:'Local browser, real Supabase SDK; mocked Auth and game API. No hosted delivery, Google consent or physical device assertion.',checks,errors},null,2));await browser.close();await vite.close();}
