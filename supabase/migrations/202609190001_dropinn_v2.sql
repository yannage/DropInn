-- V2 coexists with the original rooms. Browsers may read their rooms through
-- Realtime, but all game mutations go through the authenticated server endpoint.
create table if not exists public.adventure_rooms (
  code text primary key check (code ~ '^[A-Z0-9]{4,6}$'),
  id uuid not null unique,
  revision bigint not null,
  status text not null check (status in ('active', 'parked', 'completed')),
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.adventure_members (
  room_code text not null references public.adventure_rooms(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (room_code, user_id)
);
create index if not exists adventure_members_user_idx on public.adventure_members(user_id);
create table if not exists public.adventure_commands (
  room_code text not null references public.adventure_rooms(code) on delete cascade,
  command_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_code, command_id)
);
create table if not exists public.adventure_events (
  room_code text not null references public.adventure_rooms(code) on delete cascade,
  event_id text not null,
  entry jsonb not null,
  created_at timestamptz not null default now(),
  primary key (room_code, event_id)
);
create table if not exists public.adventure_rewards (
  room_code text not null references public.adventure_rooms(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id),
  xp integer not null default 0 check (xp >= 0),
  keepsakes text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (room_code, user_id)
);
create table if not exists public.adventure_chat (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.adventure_rooms(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 18),
  text text not null check (char_length(text) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists adventure_chat_room_idx on public.adventure_chat(room_code, created_at desc);
create table if not exists public.adventure_reports (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.adventure_rooms(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create table if not exists public.adventure_prepared (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  variation jsonb not null,
  expires_at timestamptz not null
);
create table if not exists public.adventure_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  window_start bigint not null,
  hits integer not null,
  primary key (user_id, bucket, window_start)
);

alter table public.adventure_rooms enable row level security;
alter table public.adventure_members enable row level security;
alter table public.adventure_commands enable row level security;
alter table public.adventure_events enable row level security;
alter table public.adventure_rewards enable row level security;
alter table public.adventure_chat enable row level security;
alter table public.adventure_reports enable row level security;
alter table public.adventure_prepared enable row level security;
alter table public.adventure_rate_limits enable row level security;

-- Self-only membership policies avoid recursive room-policy lookups.
drop policy if exists adventure_members_self_read on public.adventure_members;
create policy adventure_members_self_read on public.adventure_members for select to authenticated using (user_id = auth.uid());
drop policy if exists adventure_rooms_member_read on public.adventure_rooms;
create policy adventure_rooms_member_read on public.adventure_rooms for select to authenticated using (
  exists (select 1 from public.adventure_members m where m.room_code = code and m.user_id = auth.uid())
);
drop policy if exists adventure_rewards_self_read on public.adventure_rewards;
create policy adventure_rewards_self_read on public.adventure_rewards for select to authenticated using (user_id = auth.uid());
revoke all on public.adventure_rooms, public.adventure_members, public.adventure_commands, public.adventure_events,
  public.adventure_rewards, public.adventure_chat, public.adventure_reports, public.adventure_prepared, public.adventure_rate_limits from anon, authenticated;
grant select on public.adventure_rooms, public.adventure_members, public.adventure_rewards to authenticated;
grant all on public.adventure_rooms, public.adventure_members, public.adventure_commands, public.adventure_events,
  public.adventure_rewards, public.adventure_chat, public.adventure_reports, public.adventure_prepared, public.adventure_rate_limits to service_role;

create or replace function public.dropinn_rate_limit(p_user_id uuid, p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_window bigint; v_hits integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then raise exception 'Invalid rate limit'; end if;
  v_window := floor(extract(epoch from now()) / p_window_seconds);
  insert into public.adventure_rate_limits(user_id, bucket, window_start, hits) values (p_user_id, p_bucket, v_window, 1)
  on conflict (user_id, bucket, window_start) do update set hits = adventure_rate_limits.hits + 1
  returning hits into v_hits;
  -- Bounded cleanup piggybacks on requests; no external scheduler is required.
  delete from public.adventure_rate_limits where user_id = p_user_id and bucket = p_bucket and window_start < v_window - 2;
  return v_hits <= p_limit;
end $$;

create or replace function public.dropinn_apply_snapshot(
  p_code text, p_expected_revision bigint, p_command_id text, p_user_id uuid, p_snapshot jsonb
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_revision bigint;
  v_actor uuid;
  v_player record;
  v_user uuid;
  v_character uuid;
  v_pinned_character uuid;
  v_total_xp integer;
  v_old_xp integer;
  v_delta integer;
  v_keepsakes text[];
begin
  if p_snapshot->>'code' is distinct from p_code or (p_snapshot->>'version')::integer <> 2 then
    raise exception 'Invalid adventure snapshot';
  end if;
  -- Room-scoped lock covers creation as well as existing-row transitions.
  perform pg_advisory_xact_lock(hashtextextended('dropinn:' || p_code, 0));
  select user_id into v_actor from public.adventure_commands where room_code = p_code and command_id = p_command_id;
  if found then
    if v_actor <> p_user_id then raise exception 'Command belongs to another player'; end if;
    return 'duplicate';
  end if;
  select revision into v_revision from public.adventure_rooms where code = p_code for update;
  if coalesce(v_revision, -1) <> p_expected_revision then return 'conflict'; end if;
  if p_expected_revision >= 0 and (p_snapshot->>'revision')::bigint <= p_expected_revision then
    raise exception 'Revision must advance';
  end if;
  if not (p_snapshot->'players' ? p_user_id::text) then raise exception 'Acting player must be a member'; end if;

  insert into public.adventure_rooms(code, id, revision, status, snapshot, updated_at)
  values (p_code, (p_snapshot->>'id')::uuid, (p_snapshot->>'revision')::bigint, p_snapshot->>'status', p_snapshot, now())
  on conflict (code) do update set revision = excluded.revision, status = excluded.status, snapshot = excluded.snapshot, updated_at = excluded.updated_at;
  insert into public.adventure_commands(room_code, command_id, user_id) values (p_code, p_command_id, p_user_id);

  for v_player in select key, value from jsonb_each(p_snapshot->'players') loop
    v_user := v_player.key::uuid;
    v_character := (v_player.value->'character'->>'id')::uuid;
    -- Character ownership and pinned identity are checked in the same transaction.
    perform 1 from public.characters where id = v_character and user_id = v_user for update;
    if not found then raise exception 'Character ownership mismatch'; end if;
    select character_id into v_pinned_character from public.adventure_members where room_code = p_code and user_id = v_user;
    if found and v_pinned_character <> v_character then raise exception 'Character is pinned for this adventure'; end if;
    insert into public.adventure_members(room_code, user_id, character_id, joined_at, left_at)
    values (p_code, v_user, v_character, to_timestamp((v_player.value->>'joinedAt')::double precision / 1000),
      case when v_player.value->>'leftAt' is null then null else to_timestamp((v_player.value->>'leftAt')::double precision / 1000) end)
    on conflict (room_code, user_id) do update set left_at = excluded.left_at;

    v_total_xp := greatest(0, coalesce((v_player.value->>'xp')::integer, 0));
    select xp into v_old_xp from public.adventure_rewards where room_code = p_code and user_id = v_user for update;
    v_delta := greatest(0, v_total_xp - coalesce(v_old_xp, 0));
    select coalesce(array_agg(distinct value), '{}') into v_keepsakes from jsonb_array_elements_text(coalesce(v_player.value->'keepsakes', '[]'::jsonb));
    update public.characters set
      xp = xp + v_delta,
      level = case when xp + v_delta >= 450 then greatest(level, 5) when xp + v_delta >= 300 then greatest(level, 4) else greatest(level, 3) end,
      inventory = array(select distinct unnest(inventory || v_keepsakes)),
      updated_at = now()
      where id = v_character and user_id = v_user;
    insert into public.adventure_rewards(room_code, user_id, character_id, xp, keepsakes, updated_at)
      values (p_code, v_user, v_character, greatest(v_total_xp, coalesce(v_old_xp, 0)), v_keepsakes, now())
    on conflict (room_code, user_id) do update set xp = excluded.xp, keepsakes = excluded.keepsakes, updated_at = excluded.updated_at;
  end loop;
  insert into public.adventure_events(room_code, event_id, entry)
    select p_code, item->>'id', item from jsonb_array_elements(coalesce(p_snapshot->'events', '[]'::jsonb)) item
    on conflict (room_code, event_id) do nothing;
  return 'applied';
end $$;

revoke all on function public.dropinn_apply_snapshot(text,bigint,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.dropinn_apply_snapshot(text,bigint,text,uuid,jsonb) to service_role;
revoke all on function public.dropinn_rate_limit(uuid,text,integer,integer) from public, anon, authenticated;
grant execute on function public.dropinn_rate_limit(uuid,text,integer,integer) to service_role;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'adventure_rooms') then
    alter publication supabase_realtime add table public.adventure_rooms;
  end if;
end $$;
