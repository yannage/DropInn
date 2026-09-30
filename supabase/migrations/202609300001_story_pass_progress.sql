-- Story pass evidence is independent of the Thread wallet. Never grant Thread or XP here.
create table if not exists public.story_pass_credits (
 player_id uuid not null references public.player_ownership(player_id),
 room_id uuid not null references public.adventure_rooms(id),
 chapter integer not null check(chapter between 0 and 2),
 adventure_id text not null,
 adventure_version integer not null,
 earned_at timestamptz not null,
 primary key(player_id,room_id,chapter)
);
create index if not exists story_pass_credits_room_idx on public.story_pass_credits(room_id,chapter);
alter table public.story_pass_credits enable row level security;
revoke all on public.story_pass_credits from public,anon,authenticated;
grant all on public.story_pass_credits to service_role;

-- The current four stories already produce transactional collection credits.
create or replace function public.story_pass_from_collection() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.adventure_id in ('briar-glen','last-flight-teacup','inn-misplaced-tomorrow','orchard-walked-away') then
  insert into story_pass_credits(player_id,room_id,chapter,adventure_id,adventure_version,earned_at)
  values(new.player_id,new.room_id,new.chapter,new.adventure_id,new.adventure_version,new.earned_at)
  on conflict do nothing;
 end if;
 return new;
end $$;
drop trigger if exists story_pass_collection_credit on public.collection_credits;
create trigger story_pass_collection_credit after insert on public.collection_credits
for each row execute function public.story_pass_from_collection();

insert into public.story_pass_credits(player_id,room_id,chapter,adventure_id,adventure_version,earned_at)
select player_id,room_id,chapter,adventure_id,adventure_version,earned_at from public.collection_credits
where adventure_id in ('briar-glen','last-flight-teacup','inn-misplaced-tomorrow','orchard-walked-away')
on conflict do nothing;

-- Before the collection pilot, room snapshots are the verifiable source of past play.
insert into public.story_pass_credits(player_id,room_id,chapter,adventure_id,adventure_version,earned_at)
select player.key::uuid, room.id, (ending.value->>'chapter')::integer,
 coalesce(room.snapshot->>'adventureId','briar-glen'),coalesce((room.snapshot->>'adventureVersion')::integer,1),
 to_timestamp((ending.value->>'at')::double precision/1000)
from public.adventure_rooms room
cross join lateral jsonb_each(coalesce(room.snapshot->'players','{}'::jsonb)) player
cross join lateral jsonb_array_elements(coalesce(room.snapshot->'outcomes','[]'::jsonb)) ending(value)
cross join public.player_ownership ownership
where coalesce(room.snapshot->>'adventureId','briar-glen') in
 ('briar-glen','last-flight-teacup','inn-misplaced-tomorrow','orchard-walked-away')
 and ownership.player_id=player.key::uuid
 and exists(select 1 from jsonb_array_elements(coalesce(room.snapshot->'events','[]'::jsonb)) action(value)
  where action.value->>'kind'='action' and action.value->>'actorId'=player.key
   and (action.value->>'chapter')::integer=(ending.value->>'chapter')::integer
   and (action.value->>'contribution'='true' or action.value ? 'roll'))
on conflict do nothing;

create or replace function public.dropinn_story_pass_credits(p_account uuid) returns jsonb
language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('roomId',room_id,'adventureId',adventure_id,
  'adventureVersion',adventure_version,'chapter',chapter,
  'at',floor(extract(epoch from earned_at)*1000)::bigint) order by earned_at),'[]'::jsonb)
 from (select distinct on(c.room_id,c.chapter) c.* from story_pass_credits c
   join player_ownership o using(player_id) where o.account_id=p_account
   order by c.room_id,c.chapter,c.earned_at) credited;
$$;
revoke all on function public.story_pass_from_collection(),public.dropinn_story_pass_credits(uuid) from public,anon,authenticated;
grant execute on function public.dropinn_story_pass_credits(uuid) to service_role;
