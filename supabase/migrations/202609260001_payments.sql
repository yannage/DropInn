-- Payment records are independent of the earned Thread ledger. Sandbox grants
-- can never become production grants. Only the command service can access these.
create sequence if not exists public.payment_revision_seq;
create table if not exists public.payment_orders (
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null references public.player_ownership(player_id),
 environment text not null check(environment in ('sandbox','production')),
 request_id uuid not null,
 bundle_id text not null check(bundle_id='supporter-pack-1'),
 bundle_version integer not null check(bundle_version=1),
 price_id text not null,
 transaction_id text,
 status text not null default 'creating' check(status in ('creating','ready','completed','refunded','disputed','canceled')),
 revision bigint not null default nextval('public.payment_revision_seq'),
 observed_at timestamptz,
 checked_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(environment,transaction_id), unique(player_id,environment,request_id)
);
create unique index if not exists payment_one_active_bundle on public.payment_orders(player_id,environment,bundle_id)
 where status in ('creating','ready','completed','disputed');
create index if not exists payment_reconcile_idx on public.payment_orders(environment,checked_at);
create table if not exists public.payment_events (
 environment text not null check(environment in ('sandbox','production')),
 event_id text not null,
 order_id uuid not null references public.payment_orders(id),
 received_at timestamptz not null default now(),
 primary key(environment,event_id)
);
alter table public.payment_orders enable row level security;
alter table public.payment_events enable row level security;
revoke all on public.payment_orders,public.payment_events,public.payment_revision_seq from public,anon,authenticated;
grant all on public.payment_orders,public.payment_events,public.payment_revision_seq to service_role;

create or replace function public.dropinn_payment_begin(p_account uuid,p_environment text,p_request_id uuid,p_price_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare receipt payment_orders;
begin
 perform pg_advisory_xact_lock(hashtextextended('account:'||p_account,0));
 if not exists(select 1 from player_ownership where player_id=p_account and account_id=p_account) then
  raise exception 'Account ownership changed. Sign in again.';
 end if;
 if p_environment not in ('sandbox','production') or p_request_id is null or p_price_id !~ '^pri_[a-z0-9]{26}$' then
  raise exception 'Invalid purchase configuration.';
 end if;
 select p.* into receipt from payment_orders p join player_ownership o using(player_id)
  where o.account_id=p_account and p.environment=p_environment and p.request_id=p_request_id;
 if found then return jsonb_build_object('order',to_jsonb(receipt),'create',false); end if;
 select p.* into receipt from payment_orders p join player_ownership o using(player_id)
  where o.account_id=p_account and p.environment=p_environment and p.bundle_id='supporter-pack-1'
   and p.status in ('creating','ready','completed','disputed') order by p.created_at desc limit 1;
 if found then return jsonb_build_object('order',to_jsonb(receipt),'create',false); end if;
 insert into payment_orders(player_id,environment,request_id,bundle_id,bundle_version,price_id)
  values(p_account,p_environment,p_request_id,'supporter-pack-1',1,p_price_id) returning * into receipt;
 return jsonb_build_object('order',to_jsonb(receipt),'create',true);
end $$;

-- Applying the current provider state and recording the callback are atomic.
-- A duplicate callback is harmless; older observations cannot undo newer ones.
create or replace function public.dropinn_payment_apply(p_order uuid,p_transaction text,p_status text,p_observed_at timestamptz,p_event_id text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare receipt payment_orders; owner_id uuid;
begin
 select o.account_id into owner_id from payment_orders p join player_ownership o using(player_id) where p.id=p_order;
 if owner_id is null then raise exception 'Unknown purchase.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('account:'||owner_id,0));
 select * into receipt from payment_orders where id=p_order for update;
 if not exists(select 1 from player_ownership where player_id=receipt.player_id and account_id=owner_id) then raise exception 'Account ownership changed. Retry payment confirmation.'; end if;
 if p_transaction !~ '^txn_[a-z0-9]{26}$' or p_status not in ('ready','completed','refunded','disputed','canceled') or p_observed_at is null then raise exception 'Invalid payment confirmation.'; end if;
 if receipt.transaction_id is not null and receipt.transaction_id<>p_transaction then raise exception 'Purchase already has a different transaction.'; end if;
 if p_event_id is not null and exists(select 1 from payment_events where environment=receipt.environment and event_id=p_event_id and order_id<>p_order) then raise exception 'Event belongs to another purchase.'; end if;
 if receipt.observed_at is null or p_observed_at>receipt.observed_at then
  -- A later callback cannot turn a paid/refunded/disputed purchase back into an unpaid checkout.
  if receipt.status in ('completed','refunded','disputed') and p_status in ('ready','canceled') then p_status:=receipt.status; end if;
  if receipt.status='refunded' then p_status:='refunded'; end if;
  update payment_orders set transaction_id=p_transaction,status=p_status,observed_at=p_observed_at,checked_at=now(),updated_at=now(),
   revision=case when receipt.status<>p_status then nextval('payment_revision_seq') else revision end
   where id=p_order returning * into receipt;
 end if;
 if p_event_id is not null then insert into payment_events(environment,event_id,order_id) values(receipt.environment,p_event_id,p_order) on conflict do nothing; end if;
 return to_jsonb(receipt);
end $$;

create or replace function public.dropinn_paid_collection(p_account uuid,p_environment text)
returns jsonb language sql stable security definer set search_path=public as $$
 with purchases as (select p.* from payment_orders p join player_ownership o using(player_id) where o.account_id=p_account and p.environment=p_environment),
 owned as (select 1 from purchases where status='completed' and bundle_id='supporter-pack-1' and bundle_version=1 limit 1)
 select jsonb_build_object('environment',p_environment,'revision',(select coalesce(max(revision),0) from purchases),
  'bundles',case when exists(select 1 from owned) then '["supporter-pack-1"]'::jsonb else '[]'::jsonb end,
  'hats',case when exists(select 1 from owned) then '["teacup","lantern"]'::jsonb else '[]'::jsonb end,
  'styles',case when exists(select 1 from owned) then '["teacup-rose","teacup-mint","lantern-plum","lantern-moss"]'::jsonb else '[]'::jsonb end);
$$;
revoke all on function public.dropinn_payment_begin(uuid,text,uuid,text),public.dropinn_payment_apply(uuid,text,text,timestamptz,text),public.dropinn_paid_collection(uuid,text) from public,anon,authenticated;
grant execute on function public.dropinn_payment_begin(uuid,text,uuid,text),public.dropinn_payment_apply(uuid,text,text,timestamptz,text),public.dropinn_paid_collection(uuid,text) to service_role;
