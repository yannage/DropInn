import assert from 'node:assert/strict';

export async function checkStoryPassDatabase({sql,user,other}) {
  const price='pri_aaaaaaaaaaaaaaaaaaaaaaaaaa';
  const account='cc000000-0000-4000-8000-000000000001';
  sql(`insert into auth.users(id) values('${account}'); insert into player_ownership(player_id,account_id) values('${account}','${account}');`);
  const oldCredits=Number(sql(`select count(*) from collection_credits where adventure_id in ('briar-glen','last-flight-teacup','inn-misplaced-tomorrow','orchard-walked-away');`));
  assert.ok(oldCredits>0 && Number(sql('select count(*) from story_pass_credits;'))>=oldCredits,'Prior verified credits backfill into the pass ledger');
  const begin=(product,request)=>JSON.parse(sql(`select dropinn_payment_begin_pass('${account}','sandbox','${request}','${product}','${price}');`));
  const standard=begin('first-tales-standard','11111111-1111-4111-8111-111111111111');
  assert.equal(standard.create,true);
  assert.equal(begin('first-tales-standard','11111111-1111-4111-8111-111111111111').order.id,standard.order.id);
  assert.throws(()=>begin('first-tales-super','22222222-2222-4222-8222-222222222222'));
  assert.throws(()=>begin('first-tales-upgrade','33333333-3333-4333-8333-333333333333'));
  sql(`select dropinn_payment_apply('${standard.order.id}','txn_cccccccccccccccccccccccccc','completed','2026-09-30T12:00:00Z',null);`);
  const upgrade=begin('first-tales-upgrade','44444444-4444-4444-8444-444444444444');
  assert.equal(upgrade.create,true);
  sql(`select dropinn_payment_apply('${upgrade.order.id}','txn_dddddddddddddddddddddddddd','completed','2026-09-30T12:01:00Z',null);`);
  const collection=()=>JSON.parse(sql(`select dropinn_paid_collection('${account}','sandbox');`));
  assert.deepEqual(collection().bundles.sort(),['first-tales-standard','first-tales-upgrade']);
  sql(`select dropinn_payment_apply('${standard.order.id}','txn_cccccccccccccccccccccccccc','refunded','2026-09-30T12:02:00Z',null);`);
  assert.deepEqual(collection().bundles,[]);
  const room='cc000000-0000-4000-8000-000000000002';
  sql(`insert into adventure_rooms(code,id,revision,status,snapshot) values('PASSQA','${room}',0,'completed','{}');
   insert into collection_credits(player_id,room_id,chapter,adventure_id,adventure_version,outcome,ending_id,ending_text,earned_at)
   values('${account}','${room}',2,'last-flight-teacup',1,'mixed','qa','Finished together',now());`);
  const progress=JSON.parse(sql(`select dropinn_story_pass_credits('${account}');`));
  assert.equal(progress.length,1);
  assert.equal(progress[0].chapter,2);
  assert.equal(progress[0].adventureId,'last-flight-teacup');
  assert.equal(JSON.parse(sql(`select dropinn_paid_collection('${account}','sandbox');`)).bundles.length,0,'Refund keeps verified progress but removes paid access');
  for(const query of [`select * from story_pass_credits`,`select dropinn_story_pass_credits('${account}');`,`select dropinn_payment_begin_pass('${account}','sandbox','55555555-5555-4555-8555-555555555555','first-tales-standard','${price}');`]) {
    let denied=false;try{sql(`set role authenticated; ${query}`);}catch{denied=true;}
    assert.equal(denied,true);
  }
  assert.ok(user&&other);
  console.log('PASS: Story Pass backfill, trigger, orders, upgrade eligibility, refunds and service-only progress.');
}
