import {execFile} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
export async function checkCollectionDatabase({sql,args}) {
 const json=value=>`$json$${JSON.stringify(value)}$json$::jsonb`;
 const guest=randomUUID(),account=randomUUID(),stranger=randomUUID(),hero=randomUUID(),otherHero=randomUUID();
 const denied=statement=>assert.throws(()=>sql(statement));
 const parallel=statement=>new Promise((resolve,reject)=>{const child=execFile('docker',args,{encoding:'utf8'},(error,out,err)=>error?reject(new Error(err)):resolve(out.trim()));child.stdin.end(statement);});
 sql(`insert into auth.users values('${guest}'),('${account}'),('${stranger}');
  insert into player_ownership values('${guest}','${guest}'),('${account}','${account}'),('${stranger}','${stranger}');
  insert into player_accounts(account_id) values('${guest}'),('${account}');
  insert into characters(id,user_id,name,class_key,level,xp,hp,max_hp,inventory) values
   ('${hero}','${guest}','Guest','wizard',3,240,10,10,array['Mara’s copper bell']),('${otherHero}','${account}','Account','fighter',3,240,14,14,'{}');`);
 const snapshot=(code,id=randomUUID())=>({version:2,collectionVersion:1,adventureId:'briar-glen',adventureVersion:1,id,code,revision:0,status:'completed',flags:[],
  players:{[guest]:{character:{id:hero},joinedAt:1000,leftAt:2000,xp:10,keepsakes:['Mara’s copper bell']},[account]:{character:{id:otherHero},joinedAt:1000,leftAt:2000,xp:0,keepsakes:[]}},
  outcomes:[0,1,2].map(chapter=>({chapter,result:['success','mixed','setback'][chapter],text:'An ending.',at:2000})),
  events:[{id:`${code}-1`,chapter:0,kind:'action',actorId:guest,roll:1,success:false},{id:`${code}-2`,chapter:1,kind:'action',actorId:guest,contribution:true},{id:`${code}-3`,chapter:2,kind:'action',actorId:guest,contribution:false}]});
 const apply=(s,expected,cmd,actor=guest,owner=guest)=>`select dropinn_apply_account_snapshot('${s.code}',${expected},'${cmd}','${actor}',${json(s)},'${owner}');`;
 const get=id=>JSON.parse(sql(`select dropinn_collection('${id}');`));
 const craft=(id,command,recipe)=>`select dropinn_craft('${id}','${command}','${recipe}');`;
 assert.deepEqual(get(guest).hats,['shepherd'],'Existing keepsakes backfill without earning Thread');
 const first=snapshot('COLL01');
 assert.equal(sql(apply(first,-1,'first-collection')),'applied');
 assert.equal(sql(apply(first,-1,'first-collection')),'duplicate');
 assert.equal(get(guest).earned,2,'Failed and Protect contributions count; absent defense does not');
 assert.equal(get(account).earned,0,'Spectators receive no credit');
 first.revision++;
 assert.equal(sql(apply(first,0,'repeat-snapshot')),'applied');
 assert.equal(get(guest).earned,2);
 denied(craft(guest,'too-few-thread','shepherd-blue'));
 const second=snapshot('COLL02');second.adventureId='orchard-walked-away';second.events=second.events.slice(0,1);
 sql(apply(second,-1,'other-adventure'));
 assert.equal(get(guest).earned,3,'All pack adventures share Thread');
 const race=await Promise.allSettled([parallel(craft(guest,'concurrent-blue','shepherd-blue')),parallel(craft(guest,'concurrent-green','shepherd-green'))]);
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1,'Only one purchase can spend the last three Thread');
 const recipe=get(guest).styles[0],cmd=recipe==='shepherd-blue'?'concurrent-blue':'concurrent-green';
 sql(craft(guest,cmd,recipe));sql(craft(guest,'already-owned-retry',recipe));
 assert.equal(get(guest).spent,3,'Duplicate and already-owned purchases never double spend');
 denied(craft(guest,cmd,'shepherd-feather'));
 denied(craft(account,'locked-base-hat','shepherd-blue'));
 denied(craft(guest,'invalid-recipe','made-up-style'));
 for(const statement of [craft(guest,'forged-write','shepherd-red'),`insert into collection_crafts values('${guest}','forged-credit','shepherd-red',0,now());`,`select dropinn_collection('${guest}');`]) denied(`set role authenticated;${statement}`);
 sql(`insert into player_claims(token_hash,player_id,expires_at) values('collection-claim','${guest}',now()+interval '15 minutes');
  select dropinn_redeem_claim('${account}','collection-claim');`);
 assert.equal(get(account).earned,3);assert.equal(get(account).spent,3);assert.ok(get(account).styles.includes(recipe));
 assert.deepEqual(get(account).hats,['shepherd'],'Second hero can use account keepsakes');
 assert.equal(get(guest).earned,0,'Old guest loses collection ownership');
 denied(craft(guest,'revoked-craft',recipe));
 // A later result follows historical ownership; two historical identities cannot double credit one chapter.
 first.revision++;
 first.events.push({id:'late-protect',chapter:2,kind:'action',actorId:guest,contribution:true},{id:'other-identity',chapter:0,kind:'action',actorId:account,contribution:true});
 sql(apply(first,1,'late-collection',guest,account));
 assert.equal(get(account).earned,4);
 assert.equal(get(account).discoveries.length,4);
 sql(craft(account,cmd,recipe));assert.equal(get(account).spent,3,'Craft retries survive guest recovery');
 const old=snapshot('COLL03');delete old.collectionVersion;
 sql(apply(old,-1,'old-room',guest,account));assert.equal(get(account).earned,4,'Old rooms keep their original rewards');
 const expectedXp=sql(`select xp from characters where id='${hero}'`);
 const edited={id:hero,name:'Edited',classKey:'wizard',hp:10,maxHp:10,traits:{INT:3,ATH:1,ING:2,CHA:3},accent:'#A78BFA',appearance:{body:'bean',eyes:'dots',nose:'button',mouth:'smile'},equipment:{hat:'shepherd',hatColor:recipe}};
 await Promise.all([parallel(`select dropinn_save_hero('${account}',${json(edited)},false);`),parallel(craft(account,'concurrent-owned',recipe))]);
 assert.equal(sql(`select xp from characters where id='${hero}'`),expectedXp);assert.equal(get(account).earned-get(account).spent,1);
 console.log('PASS: collection migration rerun, shared pack credit, eligibility, double-spend race, craft retries, recovery, late rewards, old rooms, cosmetic saves and client-write denial.');
}
