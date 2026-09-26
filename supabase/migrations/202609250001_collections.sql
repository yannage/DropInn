-- The ledger follows historical player ownership, so guest recovery requires no
-- balance copying. Previously separate accounts keep legitimately earned credit.
create table if not exists public.collection_recipes (
 id text primary key, hat text not null, cost integer not null check(cost > 0)
);
insert into public.collection_recipes values
 ('shepherd-blue','shepherd',3),('shepherd-green','shepherd',3),
 ('shepherd-red','shepherd',3),('shepherd-gold','shepherd',3),('shepherd-feather','shepherd',6)
 on conflict do nothing;
create table if not exists public.collection_credits (
 player_id uuid not null references public.player_ownership(player_id),
 room_id uuid not null references public.adventure_rooms(id),
 chapter integer not null check(chapter between 0 and 2),
 adventure_id text not null, adventure_version integer not null,
 outcome text not null check(outcome in ('success','mixed','setback')),
 ending_id text not null, ending_text text not null,
 earned_at timestamptz not null,
 primary key(player_id,room_id,chapter)
);
create table if not exists public.collection_crafts (
 player_id uuid not null references public.player_ownership(player_id),
 command_id text not null, recipe_id text not null references public.collection_recipes(id),
 cost integer not null check(cost >= 0), created_at timestamptz not null default now(),
 primary key(player_id,command_id)
);
alter table public.collection_recipes enable row level security;
alter table public.collection_credits enable row level security;
alter table public.collection_crafts enable row level security;
revoke all on public.collection_recipes,public.collection_credits,public.collection_crafts from public,anon,authenticated;
grant all on public.collection_recipes,public.collection_credits,public.collection_crafts to service_role;

create or replace function public.dropinn_collection(p_account uuid) returns jsonb
language sql security definer set search_path=public as $$
 with owners as (select player_id from player_ownership where account_id=p_account),
 credits as (select c.* from collection_credits c join owners o using(player_id)),
 crafts as (select c.* from collection_crafts c join owners o using(player_id)),
 hats as (
  select distinct h.id from characters c join owners o on o.player_id=c.user_id
  join (values ('shepherd','Mara’s copper bell'),('reed','A silver river reed'),('moonstone','The guardian’s moonstone')) h(id,keepsake)
   on h.keepsake=any(c.inventory)
 ), discoveries as (
  select distinct on(adventure_id,adventure_version,chapter,outcome,ending_id) * from credits
  order by adventure_id,adventure_version,chapter,outcome,ending_id,earned_at
 )
 select jsonb_build_object(
  'earned',(select count(*) from credits), 'spent',(select coalesce(sum(cost),0) from crafts),
  'hats',(select coalesce(jsonb_agg(id order by id),'[]') from hats),
  'styles',(select coalesce(jsonb_agg(distinct recipe_id),'[]') from crafts),
  'discoveries',(select coalesce(jsonb_agg(jsonb_build_object('adventureId',adventure_id,'adventureVersion',adventure_version,
    'chapter',chapter,'outcome',outcome,'endingId',ending_id,'text',ending_text)),'[]') from discoveries)
 );
$$;

create or replace function public.dropinn_craft(p_account uuid,p_command_id text,p_recipe_id text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare receipt collection_crafts; recipe collection_recipes; collection jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('account:'||p_account,0));
 if not exists(select 1 from player_ownership where player_id=p_account and account_id=p_account) then raise exception 'Account ownership changed. Sign in again.'; end if;
 if p_command_id is null or p_command_id !~ '^[a-zA-Z0-9_-]{8,100}$' then raise exception 'Use a valid crafting identifier.'; end if;
 select c.* into receipt from collection_crafts c join player_ownership o using(player_id)
  where o.account_id=p_account and c.command_id=p_command_id;
 if found then
  if receipt.recipe_id<>p_recipe_id then raise exception 'That crafting identifier belongs to another style.'; end if;
  return dropinn_collection(p_account);
 end if;
 select * into recipe from collection_recipes where id=p_recipe_id;
 if not found then raise exception 'Choose an available style.'; end if;
 collection:=dropinn_collection(p_account);
 if not (collection->'hats' ? recipe.hat) then raise exception 'Earn the Shepherd’s floppy hat in The missing livestock first.'; end if;
 if collection->'styles' ? recipe.id then
  -- Record repeated ownership as a zero-cost receipt, still binding this ID.
  insert into collection_crafts values(p_account,p_command_id,recipe.id,0,now());
  return collection;
 end if;
 if (collection->>'earned')::int-(collection->>'spent')::int<recipe.cost then raise exception 'This style needs % Thread.',recipe.cost; end if;
 insert into collection_crafts values(p_account,p_command_id,recipe.id,recipe.cost,now());
 return dropinn_collection(p_account);
end $$;

create or replace function public.dropinn_apply_account_snapshot(p_code text,p_expected_revision bigint,p_command_id text,p_user_id uuid,p_snapshot jsonb,p_account_id uuid default null) returns text
language plpgsql security definer set search_path=public as $$
declare a uuid; locked_accounts uuid[]; result text; player record; ending jsonb; adventure text; ending_id text;
begin
 select array_agg(distinct o.account_id order by o.account_id) into locked_accounts
  from jsonb_object_keys(p_snapshot->'players') p join player_ownership o on o.player_id=p::uuid;
 foreach a in array coalesce(locked_accounts,'{}'::uuid[]) loop
  perform pg_advisory_xact_lock(hashtextextended('account:'||a,0));
 end loop;
 if locked_accounts is distinct from (select array_agg(distinct o.account_id order by o.account_id)
  from jsonb_object_keys(p_snapshot->'players') p join player_ownership o on o.player_id=p::uuid) then
  raise exception 'Account ownership changed. Please retry.';
 end if;
 if p_account_id is not null and not exists(select 1 from player_ownership where player_id=p_user_id and account_id=p_account_id) then raise exception 'Account ownership changed. Sign in again.'; end if;
 if exists(select o.account_id from jsonb_each(p_snapshot->'players') p join player_ownership o on o.player_id=p.key::uuid
   where p.value->>'leftAt' is null group by o.account_id having count(*)>1) then raise exception 'Your account already has a hero at this table.'; end if;
 result:=dropinn_apply_snapshot(p_code,p_expected_revision,p_command_id,p_user_id,p_snapshot);
 adventure:=coalesce(p_snapshot->>'adventureId','briar-glen');
 if result<>'applied' or coalesce(p_snapshot->>'collectionVersion','')<>'1'
  or adventure not in ('briar-glen','last-flight-teacup','inn-misplaced-tomorrow','orchard-walked-away') then return result; end if;
 for player in select p.key::uuid as id,o.account_id from jsonb_each(p_snapshot->'players') p join player_ownership o on o.player_id=p.key::uuid loop
  for ending in select value from jsonb_array_elements(coalesce(p_snapshot->'outcomes','[]')) loop
   if not exists(select 1 from jsonb_array_elements(p_snapshot->'events') e where e->>'kind'='action'
    and e->>'actorId'=player.id::text and e->>'chapter'=ending->>'chapter'
    and (e->>'contribution'='true' or e ? 'roll')) then continue; end if;
   -- Recovered identities at the same table cannot earn a second credit.
   if exists(select 1 from collection_credits c join player_ownership o using(player_id)
    where o.account_id=player.account_id and c.room_id=(p_snapshot->>'id')::uuid and c.chapter=(ending->>'chapter')::int) then continue; end if;
   ending_id:='';
   if ending->>'chapter'='2' then
    ending_id:=coalesce(p_snapshot->>'storyBranch',case when adventure='briar-glen' then
      case when ending->>'result'<>'success' then 'unresolved' when p_snapshot->'flags' ? 'ward-repaired' then 'restored' else 'driven-away' end else '' end);
   end if;
   insert into collection_credits values(player.id,(p_snapshot->>'id')::uuid,(ending->>'chapter')::int,
    adventure,coalesce((p_snapshot->>'adventureVersion')::int,1),ending->>'result',ending_id,ending->>'text',
    to_timestamp((ending->>'at')::double precision/1000)) on conflict do nothing;
  end loop;
 end loop;
 return result;
end $$;
revoke all on function public.dropinn_collection(uuid),public.dropinn_craft(uuid,text,text),public.dropinn_apply_account_snapshot(text,bigint,text,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.dropinn_collection(uuid),public.dropinn_craft(uuid,text,text),public.dropinn_apply_account_snapshot(text,bigint,text,uuid,jsonb,uuid) to service_role;
