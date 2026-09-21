-- Account ownership is separate from immutable historical player IDs.
create table if not exists public.player_ownership (
  player_id uuid primary key references auth.users(id) on delete restrict,
  account_id uuid not null references auth.users(id) on delete restrict
);
create index if not exists player_ownership_account_idx on public.player_ownership(account_id);
insert into public.player_ownership select id,id from auth.users on conflict do nothing;
create table if not exists public.player_accounts (
  account_id uuid primary key references auth.users(id) on delete restrict,
  selected_character_id uuid references public.characters(id) on delete set null
);
create table if not exists public.player_claims (
  token_hash text primary key,
  player_id uuid not null references public.player_ownership(player_id),
  expires_at timestamptz not null,
  redeemed_by uuid references auth.users(id),
  redeemed_at timestamptz
);
alter table public.player_ownership enable row level security;
alter table public.player_accounts enable row level security;
alter table public.player_claims enable row level security;
revoke all on public.player_ownership, public.player_accounts, public.player_claims from anon, authenticated;
grant all on public.player_ownership, public.player_accounts, public.player_claims to service_role;

create or replace function public.dropinn_owns_player(p_player uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from player_ownership where player_id=p_player and account_id=auth.uid())
$$;
revoke all on function public.dropinn_owns_player(uuid) from public, anon;
grant execute on function public.dropinn_owns_player(uuid) to authenticated;

-- Cloud heroes can be read by their account. All writes now use validated server operations.
drop policy if exists characters_owner_all on public.characters;
drop policy if exists characters_account_read on public.characters;
create policy characters_account_read on public.characters for select to authenticated using (dropinn_owns_player(user_id));
revoke insert, update, delete on public.characters from anon, authenticated;
grant select on public.characters to authenticated;
grant all on public.characters to service_role;
drop policy if exists adventure_members_self_read on public.adventure_members;
create policy adventure_members_self_read on public.adventure_members for select to authenticated using (dropinn_owns_player(user_id));
drop policy if exists adventure_rooms_member_read on public.adventure_rooms;
create policy adventure_rooms_member_read on public.adventure_rooms for select to authenticated using (
 exists(select 1 from public.adventure_members m where m.room_code=code and dropinn_owns_player(m.user_id))
);
drop policy if exists adventure_rewards_self_read on public.adventure_rewards;
create policy adventure_rewards_self_read on public.adventure_rewards for select to authenticated using (dropinn_owns_player(user_id));

create or replace function public.dropinn_bootstrap_account(p_account uuid, p_starter jsonb) returns void
language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('account:'||p_account,0));
 if exists(select 1 from player_ownership where player_id=p_account and account_id<>p_account) then
   raise exception 'This guest was recovered. Sign in to its account.';
 end if;
 insert into player_ownership values(p_account,p_account) on conflict do nothing;
 insert into player_accounts(account_id) values(p_account) on conflict do nothing;
 if not exists(select 1 from characters c join player_ownership o on o.player_id=c.user_id where o.account_id=p_account) then
   insert into characters(id,user_id,name,class_key,level,xp,hp,max_hp,traits,spotlight_tokens,inventory,accent,appearance,equipment)
   values((p_starter->>'id')::uuid,p_account,p_starter->>'name',p_starter->>'classKey',3,240,
     (p_starter->>'hp')::int,(p_starter->>'maxHp')::int,p_starter->'traits',2,'{}',p_starter->>'accent',p_starter->'appearance',p_starter->'equipment');
 end if;
end $$;

create or replace function public.dropinn_save_hero(p_account uuid,p_hero jsonb,p_create boolean default false) returns jsonb
language plpgsql security definer set search_path=public as $$
declare h public.characters; v_owner uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('account:'||p_account,0));
 if p_create then
   -- Idempotent retry of a creation; all pre-existing/imported heroes remain available.
   select c.* into h from characters c join player_ownership o on o.player_id=c.user_id where c.id=(p_hero->>'id')::uuid and o.account_id=p_account;
   if found then return to_jsonb(h); end if;
   if exists(select 1 from characters c join player_ownership o on o.player_id=c.user_id where o.account_id=p_account) then
     raise exception 'Your free hero is already saved. Edit or recover an existing hero.';
   end if;
   if not exists(select 1 from player_ownership where player_id=p_account and account_id=p_account) then raise exception 'Account unavailable'; end if;
   insert into characters(id,user_id,name,class_key,level,xp,hp,max_hp,traits,spotlight_tokens,inventory,accent,appearance,equipment)
   values((p_hero->>'id')::uuid,p_account,p_hero->>'name',p_hero->>'classKey',3,240,(p_hero->>'hp')::int,(p_hero->>'maxHp')::int,p_hero->'traits',2,'{}',p_hero->>'accent',p_hero->'appearance',p_hero->'equipment') returning * into h;
 else
   select c.* into h from characters c join player_ownership o on o.player_id=c.user_id where c.id=(p_hero->>'id')::uuid and o.account_id=p_account for update of c;
   if not found then raise exception 'That hero is not available to your account.'; end if;
   if exists(select 1 from adventure_members m join adventure_rooms r on r.code=m.room_code where m.character_id=h.id and m.left_at is null and m.last_seen_at>now()-interval '65 seconds' and r.status<>'completed') then
     raise exception 'Change your hero between visits.';
   end if;
   update characters set name=p_hero->>'name',class_key=p_hero->>'classKey',hp=(p_hero->>'hp')::int,
     max_hp=(p_hero->>'maxHp')::int,traits=p_hero->'traits',accent=p_hero->>'accent',appearance=p_hero->'appearance',equipment=p_hero->'equipment',updated_at=now()
     where id=h.id returning * into h;
 end if;
 return to_jsonb(h);
end $$;

create or replace function public.dropinn_select_hero(p_account uuid,p_character uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('account:'||p_account,0));
 if not exists(select 1 from characters c join player_ownership o on o.player_id=c.user_id where c.id=p_character and o.account_id=p_account) then raise exception 'That hero is not available to your account.'; end if;
 if exists(select 1 from adventure_members m join player_ownership o on o.player_id=m.user_id join adventure_rooms r on r.code=m.room_code where o.account_id=p_account and m.left_at is null and m.last_seen_at>now()-interval '65 seconds' and r.status<>'completed') then raise exception 'Choose your hero between visits.'; end if;
 update player_accounts set selected_character_id=p_character where account_id=p_account;
end $$;

create or replace function public.dropinn_redeem_claim(p_account uuid,p_hash text) returns void
language plpgsql security definer set search_path=public as $$
declare c public.player_claims; a uuid;
begin
 select * into c from player_claims where token_hash=p_hash;
 if not found then raise exception 'Recovery expired. Return to your guest browser and try again.'; end if;
 -- Same lock order as room writes; no snapshot/player/reward IDs change.
 for a in select distinct id from unnest(array[p_account,c.player_id]) id order by id loop
   perform pg_advisory_xact_lock(hashtextextended('account:'||a,0));
 end loop;
 select * into c from player_claims where token_hash=p_hash for update;
 if c.redeemed_by=p_account then return; end if;
 if c.redeemed_by is not null or c.expires_at<=now() then raise exception 'Recovery expired. Return to your guest browser and try again.'; end if;
 if not exists(select 1 from player_ownership where player_id=c.player_id and account_id=c.player_id) then raise exception 'This guest was already recovered.'; end if;
 if exists(select 1 from adventure_members m join player_ownership o on o.player_id=m.user_id join adventure_rooms r on r.code=m.room_code where o.account_id in(p_account,c.player_id) and m.left_at is null and m.last_seen_at>now()-interval '65 seconds' and r.status<>'completed') then raise exception 'Leave your table before recovering a guest hero.'; end if;
 update player_ownership set account_id=p_account where player_id=c.player_id;
 update player_claims set redeemed_by=p_account,redeemed_at=now() where token_hash=p_hash;
end $$;

create or replace function public.dropinn_apply_account_snapshot(p_code text,p_expected_revision bigint,p_command_id text,p_user_id uuid,p_snapshot jsonb,p_account_id uuid default null) returns text
language plpgsql security definer set search_path=public as $$
declare a uuid;
begin
 for a in select distinct o.account_id from jsonb_object_keys(p_snapshot->'players') p join player_ownership o on o.player_id=p::uuid order by o.account_id loop
   perform pg_advisory_xact_lock(hashtextextended('account:'||a,0));
 end loop;
 if p_account_id is not null and not exists(select 1 from player_ownership where player_id=p_user_id and account_id=p_account_id) then raise exception 'Account ownership changed. Sign in again.'; end if;
 if exists(select o.account_id from jsonb_each(p_snapshot->'players') p join player_ownership o on o.player_id=p.key::uuid
   where p.value->>'leftAt' is null group by o.account_id having count(*)>1) then raise exception 'Your account already has a hero at this table.'; end if;
 return dropinn_apply_snapshot(p_code,p_expected_revision,p_command_id,p_user_id,p_snapshot);
end $$;

revoke all on function public.dropinn_bootstrap_account(uuid,jsonb),public.dropinn_save_hero(uuid,jsonb,boolean),public.dropinn_select_hero(uuid,uuid),public.dropinn_redeem_claim(uuid,text),public.dropinn_apply_account_snapshot(text,bigint,text,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.dropinn_bootstrap_account(uuid,jsonb),public.dropinn_save_hero(uuid,jsonb,boolean),public.dropinn_select_hero(uuid,uuid),public.dropinn_redeem_claim(uuid,text),public.dropinn_apply_account_snapshot(text,bigint,text,uuid,jsonb,uuid) to service_role;
