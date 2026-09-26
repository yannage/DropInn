import { describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { handlePaddleWebhook, handlePayment, paymentConfig, reconcileOrder, validateTransaction, verifyPaddleSignature } from './payments';
import { collectionUnlocks, emptyCollection, mergeCollection } from '../src/lib/dropinn/collection';
import { createCharacterProfile } from '../src/lib/character';
import { normalizeHero } from '../src/lib/cosmetics';
import type { SupabaseClient, User } from '@supabase/supabase-js';

const order = {id:'11111111-1111-4111-8111-111111111111',player_id:'22222222-2222-4222-8222-222222222222',request_id:'33333333-3333-4333-8333-333333333333',environment:'sandbox' as const,bundle_id:'supporter-pack-1',bundle_version:1,price_id:`pri_${'a'.repeat(26)}`,discount_id:null as string|null,transaction_id:`txn_${'b'.repeat(26)}`,status:'ready' as const,created_at:'2026-09-26T00:00:00Z'};
const transaction = () => ({id:order.transaction_id,status:'completed',currency_code:'USD',collection_mode:'automatic',subscription_id:null,discount_id:null,custom_data:{dropinn_order_id:order.id,dropinn_bundle_id:order.bundle_id,dropinn_bundle_version:1},items:[{quantity:1,price:{id:order.price_id,billing_cycle:null,unit_price:{amount:'1000',currency_code:'USD'}}}],adjustments:[] as any[]});
const env={PADDLE_ENVIRONMENT:'sandbox',PADDLE_API_KEY:'pdl_sdbx_apikey_test',PADDLE_CLIENT_TOKEN:'test_public',PADDLE_WEBHOOK_SECRET:'webhook-secret',PADDLE_SUPPORTER_PRICE_ID:order.price_id,DROPINN_PAYMENTS_ENABLED:'1'};

describe('payment authority',()=>{
 it('authenticates the exact callback body, tolerates rotated signatures, and rejects replay windows',()=>{
  const raw='{"event_id":"example"}',time=1000000;
  const signature=createHmac('sha256',env.PADDLE_WEBHOOK_SECRET).update(`1000:${raw}`).digest('hex');
  expect(verifyPaddleSignature(raw,`ts=1000;h1=${signature}`,env.PADDLE_WEBHOOK_SECRET,time)).toBe(true);
  expect(verifyPaddleSignature(raw,`ts=1000;h1=${'0'.repeat(64)};h1=${signature}`,env.PADDLE_WEBHOOK_SECRET,time)).toBe(true);
  expect(verifyPaddleSignature(raw+' ',`ts=1000;h1=${signature}`,env.PADDLE_WEBHOOK_SECRET,time)).toBe(false);
  expect(verifyPaddleSignature(raw,`ts=1000;h1=${signature}`,env.PADDLE_WEBHOOK_SECRET,time+301000)).toBe(false);
  expect(verifyPaddleSignature(raw,'ts=x;h1=bad',env.PADDLE_WEBHOOK_SECRET,time)).toBe(false);
 });
 it('only grants a completed matching one-time order and honors refunds and chargeback reversal',()=>{
  const t=transaction();expect(validateTransaction(order,t)).toBe('completed');
  t.status='paid';expect(validateTransaction(order,t)).toBe('ready');
  t.status='completed';t.adjustments=[{action:'refund',status:'pending_approval'}];expect(validateTransaction(order,t)).toBe('completed');
  t.adjustments=[{action:'refund',status:'approved'}];expect(validateTransaction(order,t)).toBe('refunded');
  t.adjustments=[{action:'chargeback',status:'approved'}];expect(validateTransaction(order,t)).toBe('disputed');
  t.adjustments.push({action:'chargeback_reverse',status:'approved'});expect(validateTransaction(order,t)).toBe('completed');
 });
 it.each(['account','quantity','price','recurring','amount','currency','discount','adjustments'])('rejects forged or incomplete %s data',field=>{
  const t:any=transaction();
  if(field==='account')t.custom_data.dropinn_order_id=crypto.randomUUID();
  if(field==='quantity')t.items[0].quantity=2;
  if(field==='price')t.items[0].price.id=`pri_${'c'.repeat(26)}`;
  if(field==='recurring')t.items[0].price.billing_cycle={interval:'month'};
  if(field==='amount')t.items[0].price.unit_price.amount='1';
  if(field==='currency')t.currency_code='EUR';
  if(field==='discount')t.discount_id='discount';
  if(field==='adjustments')delete t.adjustments;
  expect(()=>validateTransaction(order,t)).toThrow();
 });
 it('accepts only the launch discount recorded for the order, including after the offer ends',()=>{
  const discounted={...order,discount_id:`dsc_${'c'.repeat(26)}`};
  const t={...transaction(),discount_id:discounted.discount_id,discount:{id:discounted.discount_id,type:'percentage',amount:'50'}};
  expect(validateTransaction(discounted,t)).toBe('completed');
  expect(()=>validateTransaction(discounted,{...t,discount_id:null})).toThrow();
  expect(()=>validateTransaction(discounted,{...t,discount_id:`dsc_${'d'.repeat(26)}`})).toThrow();
  expect(()=>validateTransaction(discounted,{...t,discount:{...t.discount,amount:'20'}})).toThrow();
 });
 it('advertises the 50% launch price only inside a valid seven-day window',()=>{
  const start=new Date(Date.now()-60_000).toISOString();
  const end=new Date(Date.now()+60_000).toISOString();
  const offerEnv={...env,PADDLE_LAUNCH_DISCOUNT_ID:`dsc_${'c'.repeat(26)}`,PADDLE_LAUNCH_STARTS_AT:start,PADDLE_LAUNCH_ENDS_AT:end};
  expect(paymentConfig(offerEnv)?.launchOffer).toEqual({endsAt:end,percent:50});
  expect(paymentConfig({...offerEnv,PADDLE_LAUNCH_ENDS_AT:start})?.enabled).toBe(false);
  expect(paymentConfig({...offerEnv,PADDLE_LAUNCH_STARTS_AT:new Date(Date.now()+120_000).toISOString(),PADDLE_LAUNCH_ENDS_AT:new Date(Date.now()+180_000).toISOString()})?.launchOffer).toBeUndefined();
 });
 it('pins the verified launch discount before creating a checkout transaction',async()=>{
  const discountId=`dsc_${'c'.repeat(26)}`;
  const endsAt=new Date(Date.now()+60_000).toISOString();
  const offerEnv={...env,PADDLE_LAUNCH_DISCOUNT_ID:discountId,PADDLE_LAUNCH_STARTS_AT:new Date(Date.now()-60_000).toISOString(),PADDLE_LAUNCH_ENDS_AT:endsAt};
  const owner=order.player_id;
  const prepared={...order,transaction_id:null,status:'creating' as const};
  let persisted=prepared;
  const db={
    from:(table:string)=>{
      if(table==='player_ownership') return {select:()=>({eq:async()=>({data:[{player_id:owner,account_id:owner}],error:null})})};
      if(table==='payment_orders') return {update:(patch:{discount_id:string})=>({eq:()=>({eq:()=>({is:()=>({select:()=>({single:async()=>{persisted={...prepared,discount_id:patch.discount_id};return {data:persisted,error:null};}})})})})})};
      throw new Error(`Unexpected table ${table}`);
    },
    rpc:vi.fn(async(name:string,args:any)=>name==='dropinn_payment_begin'
      ? {data:{order:prepared,create:true},error:null}
      : {data:{...persisted,transaction_id:order.transaction_id,status:args.p_status},error:null}),
  };
  const requests:string[]=[];
  const fetcher=vi.fn<typeof fetch>(async(input,init)=>{
    const path=new URL(String(input)).pathname;requests.push(path);
    if(path.startsWith('/prices/')) return new Response(JSON.stringify({data:{status:'active',billing_cycle:null,trial_period:null,unit_price:{amount:'1000',currency_code:'USD'}}}));
    if(path.startsWith('/discounts/')) return new Response(JSON.stringify({data:{status:'active',type:'percentage',amount:'50',recur:false,enabled_for_checkout:true,restrict_to:[order.price_id],expires_at:endsAt}}));
    if(path==='/transactions') {
      const payload=JSON.parse(String(init?.body));
      expect(payload.discount_id).toBe(discountId);
      expect(persisted.discount_id).toBe(discountId);
      return new Response(JSON.stringify({data:{...transaction(),status:'ready',discount_id:discountId}}));
    }
    throw new Error(`Unexpected request ${path}`);
  });
  const result=await handlePayment(db as unknown as SupabaseClient,{id:owner,email:'buyer@example.com',is_anonymous:false} as User,
    {operation:'checkout',commandId:order.request_id,bundleId:order.bundle_id,expectLaunchOffer:true},offerEnv,fetcher);
  expect(result.purchase).toMatchObject({status:'ready',launchDiscounted:true,transactionId:order.transaction_id});
  expect(requests).toEqual([`/prices/${order.price_id}`,`/discounts/${discountId}`,'/transactions']);
 });
 it('rejects unsigned callbacks before touching the database or provider',async()=>{
  const fetcher=vi.fn();const result=await handlePaddleWebhook(new Request('https://example.test/webhook',{method:'POST',body:JSON.stringify({data:transaction()})}),env,{fetch:fetcher});
  expect(result.status).toBe(401);expect(fetcher).not.toHaveBeenCalled();
 });
 it('requires a permanent authenticated account and matching provider environment',async()=>{
  await expect(handlePayment({} as SupabaseClient,{is_anonymous:true} as User,{operation:'checkout'},env)).rejects.toThrow('Sign in');
  await expect(handlePayment({} as SupabaseClient,{is_anonymous:false,email:'a@example.com'} as User,{operation:'checkout'},{...env,PADDLE_ENVIRONMENT:'production'})).rejects.toThrow('credentials');
  await expect(handlePayment({} as SupabaseClient,{is_anonymous:false,email:'a@example.com'} as User,{operation:'checkout'},{...env,PADDLE_ENVIRONMENT:''})).rejects.toThrow('explicit sandbox or production');
  expect(()=>paymentConfig({...env,PADDLE_ENVIRONMENT:'unexpected'})).toThrow('explicit sandbox or production');
  expect(paymentConfig({...env,DROPINN_PAYMENTS_ENABLED:'0'})?.enabled).toBe(false);
  expect(paymentConfig({...env,PADDLE_WEBHOOK_SECRET:''})?.enabled).toBe(false);
 });
 it('requires distinct live credentials and price before enabling live checkout',()=>{
  const live={...env,PADDLE_ENVIRONMENT:'production',PADDLE_LIVE_API_KEY:'pdl_live_apikey_test',
    PADDLE_LIVE_CLIENT_TOKEN:'live_public',PADDLE_LIVE_WEBHOOK_SECRET:'live-secret',
    PADDLE_LIVE_SUPPORTER_PRICE_ID:`pri_${'c'.repeat(26)}`};
  expect(paymentConfig(live)).toMatchObject({environment:'production',enabled:true,clientToken:'live_public'});
  expect(paymentConfig({...live,PADDLE_LIVE_API_KEY:''})?.enabled).toBe(false);
  expect(paymentConfig({...live,PADDLE_LIVE_CLIENT_TOKEN:'test_public'})?.enabled).toBe(false);
  expect(paymentConfig({...live,PADDLE_LIVE_SUPPORTER_PRICE_ID:''})?.enabled).toBe(false);
 });
 it('reconciles an uncertain create without sending another create request',async()=>{
  const fetcher=vi.fn<typeof fetch>(async()=>new Response(JSON.stringify({data:[],meta:{pagination:{has_more:false}}}),{status:200}));
  const unknown={...order,transaction_id:null,status:'creating' as const};
  expect(await reconcileOrder({} as SupabaseClient,env,unknown,fetcher)).toEqual(unknown);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toContain('/transactions?');
  expect(fetcher.mock.calls[0][1]?.method).toBeUndefined();
 });
 it('applies current provider state, not callback ordering',async()=>{
  const t=transaction();t.adjustments=[{action:'refund',status:'approved'}];
  const rpc=vi.fn(async(_name,args)=>({data:{...order,status:args.p_status},error:null}));
  const db={rpc} as unknown as SupabaseClient;
  const fetcher=vi.fn(async()=>new Response(JSON.stringify({data:t}),{status:200}));
  expect((await reconcileOrder(db,env,order,fetcher,'older-completion')).status).toBe('refunded');
  expect(rpc.mock.calls[0][1].p_status).toBe('refunded');
 });
 it('confirms omitted empty adjustments through the adjustments endpoint',async()=>{
  const t=transaction(); Reflect.deleteProperty(t,'adjustments');
  const rpc=vi.fn(async(_name,args)=>({data:{...order,status:args.p_status},error:null}));
  const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({data:t}))).mockResolvedValueOnce(new Response(JSON.stringify({data:[],meta:{pagination:{has_more:false}}})));
  expect((await reconcileOrder({rpc} as unknown as SupabaseClient,env,order,fetcher)).status).toBe('completed');
  expect(fetcher.mock.calls[1][0]).toContain('/adjustments?transaction_id=');
 });
 it('never restores revoked paid ownership from a late collection response and keeps earned ownership',()=>{
  const paid={environment:'sandbox' as const,revision:2,bundles:['supporter-pack-1'],hats:['teacup'],styles:['teacup-rose']};
  const owned={...emptyCollection(),hats:['shepherd'],paid};
  const refunded={...emptyCollection(),paid:{...paid,revision:3,bundles:[],hats:[],styles:[]}};
  const latest=mergeCollection(owned,refunded);
  expect(collectionUnlocks(latest).hats).toEqual(['shepherd']);
  expect(collectionUnlocks(mergeCollection(latest,owned)).hats).toEqual(['shepherd']);
  const hero={...createCharacterProfile('Tea','wizard'),equipment:{hat:'teacup',hatColor:'teacup-rose'}};
  expect(normalizeHero({...hero,cosmeticUnlocks:collectionUnlocks(owned)}).equipment.hat).toBe('teacup');
  expect(normalizeHero({...hero,cosmeticUnlocks:collectionUnlocks(latest)}).equipment.hat).toBe(null);
 });
});
