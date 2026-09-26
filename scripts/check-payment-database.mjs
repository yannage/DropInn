import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';

export async function checkPaymentDatabase({sql,args}) {
 const user='aa000000-0000-4000-8000-000000000001',other='aa000000-0000-4000-8000-000000000002';
 sql(`insert into auth.users(id) values('${user}'),('${other}'); insert into player_ownership(player_id,account_id) values('${user}','${user}'),('${other}','${other}');`);
 const price='pri_aaaaaaaaaaaaaaaaaaaaaaaaaa',txn='txn_bbbbbbbbbbbbbbbbbbbbbbbbbb';
 const begin=(account,request,environment='sandbox')=>`select dropinn_payment_begin('${account}','${environment}','${request}','${price}');`;
 const command='abababab-abab-4bab-8bab-abababababab';
 const first=JSON.parse(sql(begin(user,command)));
 assert.equal(first.create,true);
 assert.equal(JSON.parse(sql(begin(user,command))).order.id,first.order.id);
 const competing=await Promise.all([1,2].map(n=>new Promise((resolve,reject)=>{
  const child=execFile('docker',args,{encoding:'utf8'},(error,stdout,stderr)=>error?reject(new Error(stderr)):resolve(JSON.parse(stdout.trim())));
  child.stdin.end(begin(other,`${n}${'c'.repeat(7)}-cccc-4ccc-8ccc-cccccccccccc`));
 })));
 assert.equal(competing.filter(x=>x.create).length,1);
 assert.equal(competing[0].order.id,competing[1].order.id);
 const discount='dsc_cccccccccccccccccccccccccc';
 sql(`update payment_orders set discount_id='${discount}' where id='${competing[0].order.id}';`);
 assert.equal(sql(`select discount_id from payment_orders where id='${competing[0].order.id}'`),discount);
 let invalidDiscount=false;try{sql(`update payment_orders set discount_id='invalid' where id='${competing[0].order.id}';`);}catch{invalidDiscount=true;}
 assert.equal(invalidDiscount,true);
 const apply=(status,time,event='evt_aaaaaaaaaaaaaaaaaaaaaaaaaa')=>`select dropinn_payment_apply('${first.order.id}','${txn}','${status}','2026-09-26T00:${time}:00Z','${event}');`;
 sql(apply('completed','01'));sql(apply('completed','01'));
 const collection=environment=>JSON.parse(sql(`select dropinn_paid_collection('${user}','${environment}');`));
 const paid=collection('sandbox');assert.deepEqual(paid.hats,['teacup','lantern']);assert.equal(collection('production').hats.length,0);
 assert.equal(sql(`select count(*) from payment_events where order_id='${first.order.id}'`),'1');
 const different=JSON.parse(sql(begin(user,'dddddddd-dddd-4ddd-8ddd-dddddddddddd')));assert.equal(different.create,false);
 sql(apply('refunded','03','evt_cccccccccccccccccccccccccc'));
 sql(apply('completed','02','evt_dddddddddddddddddddddddddd'));
 const revoked=collection('sandbox');assert.equal(revoked.hats.length,0);assert.ok(revoked.revision>paid.revision);
 sql(apply('completed','04','evt_eeeeeeeeeeeeeeeeeeeeeeeeee'));assert.equal(collection('sandbox').hats.length,0);
 assert.equal(collection('production').hats.length,0);
 for(const query of [`select * from payment_orders`, `select * from payment_events`,begin(user,command),`select dropinn_paid_collection('${user}','sandbox');`,apply('completed','05')]) {
  let denied=false;try {sql(`set role authenticated; ${query}`);} catch {denied=true;}assert.equal(denied,true,'Client payment access denied');
 }
 console.log('PASS: payment migrations, duplicate/concurrent checkout, atomic receipts/grants, refund ordering, environment isolation, and client-write denial.');
}
