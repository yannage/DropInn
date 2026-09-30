-- Keep old supporter receipts, and allow separate one-time pass products.
alter table public.payment_orders drop constraint if exists payment_orders_bundle_id_check;
alter table public.payment_orders add constraint payment_orders_bundle_id_check
 check(bundle_id in ('supporter-pack-1','first-tales-standard','first-tales-super','first-tales-upgrade'));
alter table public.payment_orders drop constraint if exists payment_orders_bundle_version_check;
alter table public.payment_orders add constraint payment_orders_bundle_version_check check(bundle_version=1);

create or replace function public.dropinn_payment_begin_pass(p_account uuid,p_environment text,p_request_id uuid,
 p_bundle_id text,p_price_id text) returns jsonb language plpgsql security definer set search_path=public as $$
declare receipt payment_orders; has_standard boolean; has_super boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended('account:'||p_account,0));
 if not exists(select 1 from player_ownership where player_id=p_account and account_id=p_account)
  then raise exception 'Account ownership changed. Sign in again.'; end if;
 if p_environment not in ('sandbox','production') or p_request_id is null
  or p_bundle_id not in ('first-tales-standard','first-tales-super','first-tales-upgrade')
  or p_price_id !~ '^pri_[a-z0-9]{26}$' then raise exception 'Invalid Story Pass purchase.'; end if;
 select p.* into receipt from payment_orders p join player_ownership o using(player_id)
  where o.account_id=p_account and p.environment=p_environment and p.request_id=p_request_id;
 if found then
  if receipt.bundle_id<>p_bundle_id then raise exception 'Purchase identifier belongs to another product.'; end if;
  return jsonb_build_object('order',to_jsonb(receipt),'create',false);
 end if;
 select p.* into receipt from payment_orders p join player_ownership o using(player_id)
  where o.account_id=p_account and p.environment=p_environment and p.bundle_id=p_bundle_id
   and p.status in ('creating','ready','completed','disputed') order by p.created_at desc limit 1;
 if found then return jsonb_build_object('order',to_jsonb(receipt),'create',false); end if;
 select exists(select 1 from payment_orders p join player_ownership o using(player_id)
  where o.account_id=p_account and p.environment=p_environment and p.bundle_id='first-tales-standard'
   and p.status='completed') into has_standard;
 select exists(select 1 from payment_orders p join player_ownership o using(player_id)
  where o.account_id=p_account and p.environment=p_environment
   and (p.bundle_id='first-tales-super' or (has_standard and p.bundle_id='first-tales-upgrade'))
   and p.status in ('creating','ready','completed','disputed')) into has_super;
 if p_bundle_id='first-tales-upgrade' then
  if not has_standard or has_super then raise exception 'An upgrade requires a paid standard pass without an active Super Supporter order.'; end if;
 else
  if has_standard or has_super or exists(select 1 from payment_orders p join player_ownership o using(player_id)
    where o.account_id=p_account and p.environment=p_environment
     and p.bundle_id in ('first-tales-standard','first-tales-super')
     and p.status in ('creating','ready','disputed')) then raise exception 'A Story Pass purchase is already active. Check or restore it.'; end if;
 end if;
 insert into payment_orders(player_id,environment,request_id,bundle_id,bundle_version,price_id)
 values(p_account,p_environment,p_request_id,p_bundle_id,1,p_price_id) returning * into receipt;
 return jsonb_build_object('order',to_jsonb(receipt),'create',true);
end $$;

create or replace function public.dropinn_paid_collection(p_account uuid,p_environment text)
returns jsonb language sql stable security definer set search_path=public as $$
 with purchases as (select p.* from payment_orders p join player_ownership o using(player_id)
  where o.account_id=p_account and p.environment=p_environment),
 owned as (select
  exists(select 1 from purchases where status='completed' and bundle_id='supporter-pack-1') legacy,
  exists(select 1 from purchases where status='completed' and bundle_id='first-tales-standard') standard,
  exists(select 1 from purchases where status='completed' and bundle_id='first-tales-super') super,
  exists(select 1 from purchases where status='completed' and bundle_id='first-tales-upgrade') upgrade)
 select jsonb_build_object('environment',p_environment,'revision',(select coalesce(max(revision),0) from purchases),
  'bundles',to_jsonb(array_remove(array[
   case when legacy then 'supporter-pack-1' end,
   case when standard then 'first-tales-standard' end,
   case when super then 'first-tales-super' end,
   case when standard and upgrade then 'first-tales-upgrade' end],null)),
  'hats',case when legacy then '["teacup","lantern"]'::jsonb else '[]'::jsonb end,
  'styles',case when legacy then '["teacup-rose","teacup-mint","lantern-plum","lantern-moss"]'::jsonb else '[]'::jsonb end)
 from owned;
$$;
revoke all on function public.dropinn_payment_begin_pass(uuid,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.dropinn_payment_begin_pass(uuid,text,uuid,text,text) to service_role;
