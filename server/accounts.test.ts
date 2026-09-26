import {describe,expect,it,vi} from 'vitest';
import {createDropinnHandler} from './dropinn';
import {validatedHero} from './accounts';
import {createCharacterProfile} from '../src/lib/character';

const owner='11111111-1111-4111-8111-111111111111',heroId='22222222-2222-4222-8222-222222222222';
function harness({guest=false,missingSchema=false,revoked=false,missingCollection=false,styles=[] as string[],hats=['reed']}={}) {
 const writes:{path:string;body:any}[]=[];
 const row={id:heroId,user_id:owner,name:'Moss',class_key:'wizard',xp:320,level:4,inventory:['A silver river reed'],appearance:{body:'round',eyes:'wide',nose:'none',mouth:'flat'},equipment:{hat:'reed'}};
 const handler=createDropinnHandler({local:false,env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only'},fetch:vi.fn(async(input,init)=>{
   const url=new URL(String(input));const body=init?.body?JSON.parse(String(init.body)):undefined;
   if(url.pathname==='/auth/v1/user')return Response.json({id:owner,is_anonymous:guest,email:guest?undefined:'test@example.invalid',identities:guest?[]:[{provider:'email'}]});
   if(url.pathname.endsWith('/dropinn_rate_limit'))return Response.json(true);
   if(missingSchema)return Response.json({code:'PGRST202',message:'Missing function'},{status:404});
   if(url.pathname.endsWith('/player_ownership'))return Response.json(url.searchParams.get('select')==='account_id'?{account_id:owner}:revoked?[]:[{player_id:owner}]);
   if(url.pathname.endsWith('/characters'))return Response.json(url.searchParams.has('id')?row:[row]);
   if(url.pathname.endsWith('/player_accounts'))return Response.json({selected_character_id:heroId});
   if(url.pathname.endsWith('/dropinn_bootstrap_account'))return Response.json(null);
   if(url.pathname.endsWith('/dropinn_collection'))return missingCollection?Response.json({code:'PGRST202',message:'Missing function'},{status:404}):Response.json({earned:0,spent:0,hats,styles,discoveries:[]});
   writes.push({path:url.pathname,body});
   if(url.pathname.endsWith('/dropinn_craft'))return Response.json({earned:3,spent:3,hats:['shepherd'],styles:[body.p_recipe_id],discoveries:[]});
   if(url.pathname.endsWith('/dropinn_save_hero'))return Response.json({...row,name:body.p_hero.name,appearance:body.p_hero.appearance,equipment:body.p_hero.equipment});
   return Response.json(null);
 }) as typeof fetch});
 const call=async(body:unknown)=>{const r=await handler(new Request('http://localhost/api/dropinn',{method:'POST',headers:{Authorization:'Bearer test-only'},body:JSON.stringify(body)}));return {status:r.status,...await r.json()};};
 return {call,writes};
}
describe('server account authority',()=>{
 it('reports a missing collection migration and validates account styles from stored entitlements',async()=>{
   const missing=await harness({missingCollection:true}).call({operation:'collection'});
   expect(missing.status).toBe(503);expect(missing.error).toContain('202609250001_collections.sql');
   const {call}=harness({hats:['shepherd'],styles:['shepherd-blue']});
   const result=await call({operation:'hero-save',character:{...createCharacterProfile('Moss','wizard'),id:heroId,cosmeticUnlocks:{hats:['moonstone'],styles:['shepherd-red']},equipment:{hat:'shepherd',hatColor:'shepherd-blue',hatTrim:'shepherd-feather'}}});
   expect(result.status).toBe(200);expect(result.character.equipment).toEqual({hat:'shepherd',hatColor:'shepherd-blue',hatTrim:null});
 });
 it('crafts only for the authenticated account and rejects unknown recipes',async()=>{
   const {call,writes}=harness();
   expect((await call({operation:'craft',recipeId:'fake',commandId:'valid-craft'})).status).toBe(400);
   await call({operation:'craft',recipeId:'shepherd-blue',commandId:'valid-craft',accountId:'forged',cost:0});
   expect(writes.find(w=>w.path.endsWith('/dropinn_craft'))?.body).toEqual({p_account:owner,p_recipe_id:'shepherd-blue',p_command_id:'valid-craft'});
 });
 it('bootstraps an owned account and reports unconfigured providers honestly',async()=>{
   const {call}=harness();const result=await call({operation:'account'});expect(result.status).toBe(200);expect(result.account).toMatchObject({id:owner,guest:false,identities:['email'],capabilities:{heroSlots:1,payments:false},providers:{google:false,email:false}});expect(result.account.heroes[0].character).toMatchObject({xp:320,equipment:{hat:'reed'}});
 });
 it('preserves the original error boundary for a missing account migration',async()=>{
   const {call}=harness({missingSchema:true});const result=await call({operation:'account'});expect(result.status).toBe(503);expect(result.error).toContain('202609210001_accounts.sql');
 });
 it('rejects a revoked guest session before it can load a hero',async()=>{const {call}=harness({revoked:true});expect((await call({operation:'hero-save',character:{id:heroId}})).status).toBe(401);});
 it('ignores forged reward and locked-cosmetic fields on a saved hero',async()=>{
   const {call,writes}=harness();const result=await call({operation:'hero-save',character:{...createCharacterProfile('Pip','fighter'),id:heroId,user_id:'forged',xp:9999,inventory:['The guardian’s moonstone'],equipment:{hat:'moonstone'}}});
   expect(result.status).toBe(200);const saved=writes.find(w=>w.path.endsWith('/dropinn_save_hero'))!.body;
   expect(saved.p_account).toBe(owner);expect(saved.p_hero).toMatchObject({xp:320,inventory:['A silver river reed'],equipment:{hat:null},hp:14});expect(saved.p_hero).not.toHaveProperty('user_id');
 });
 it.each(['bad-id','__proto__'])('rejects malformed hero identifiers %s',async id=>{const {call}=harness();expect((await call({operation:'hero-save',character:{id}})).status).toBe(400);});
 it('issues an opaque guest proof and stores only its hash',async()=>{
   const {call,writes}=harness({guest:true});const result=await call({operation:'claim-prepare'});expect(result.claimToken).toMatch(/^[\w-]{43}$/);const record=writes.find(w=>w.path.endsWith('/player_claims'))!.body;expect(record.token_hash).toMatch(/^[a-f0-9]{64}$/);expect(JSON.stringify(record)).not.toContain(result.claimToken);expect(record.player_id).toBe(owner);
 });
 it('does not issue guest proofs to permanent accounts',async()=>{const {call,writes}=harness();expect((await call({operation:'claim-prepare'})).status).toBe(400);expect(writes).toEqual([]);});
 it('requires verified destination sign-in to redeem recovery',async()=>{const {call,writes}=harness({guest:true});expect((await call({operation:'claim-redeem',claimToken:'x'.repeat(43)})).status).toBe(401);expect(writes).toEqual([]);});
 it('uses the authenticated destination and hashed proof, never submitted ownership',async()=>{const {call,writes}=harness();const result=await call({operation:'claim-redeem',claimToken:'x'.repeat(43),accountId:'forged'});expect(result.status).toBe(200);expect(writes.find(w=>w.path.endsWith('/dropinn_redeem_claim'))?.body).toMatchObject({p_account:owner,p_hash:expect.stringMatching(/^[a-f0-9]{64}$/)});});
 it('requires a server-recognized class and defaults starting progress',()=>{expect(()=>validatedHero({...createCharacterProfile('Pip','wizard'),classKey:'__proto__'})).toThrow('valid hero');expect(validatedHero({...createCharacterProfile('Pip','wizard'),xp:9999,inventory:['forged']})).toMatchObject({xp:240,inventory:[]});});
});
