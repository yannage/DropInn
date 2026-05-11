create extension if not exists pgcrypto;

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 18),
  class_key text not null check (class_key in ('wizard', 'fighter', 'rogue', 'cleric')),
  level integer not null default 3 check (level between 1 and 20),
  xp integer not null default 240 check (xp >= 0),
  hp integer not null check (hp >= 0),
  max_hp integer not null check (max_hp > 0),
  traits jsonb not null default '{}'::jsonb,
  spotlight_tokens integer not null default 2 check (spotlight_tokens >= 0),
  inventory text[] not null default '{}',
  accent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique check (room_code ~ '^[A-Z0-9]{4,6}$'),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  campaign_title text not null,
  status text not null check (status in ('lobby', 'active', 'completed')),
  scene_round integer not null default 1,
  turn integer not null default 1,
  turn_started_at timestamptz,
  round_duration_ms integer not null default 30000,
  battle_state jsonb not null default '{}'::jsonb,
  current_story_text text not null default '',
  story_log jsonb not null default '[]'::jsonb,
  action_commits jsonb not null default '{}'::jsonb,
  continue_votes jsonb not null default '{}'::jsonb,
  reward_claims jsonb not null default '{}'::jsonb,
  last_results jsonb not null default '[]'::jsonb,
  last_resolved_turn_key text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  character_snapshot jsonb not null,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  left_at timestamptz,
  unique (room_id, user_id)
);

create table if not exists public.turn_actions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  scene_round integer not null,
  turn integer not null,
  action_id text not null,
  committed_at timestamptz not null default now(),
  unique (room_id, user_id, turn)
);

create table if not exists public.battle_logs (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  turn integer not null,
  entry jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists characters_user_id_idx on public.characters (user_id);
create index if not exists rooms_room_code_idx on public.rooms (room_code);
create index if not exists rooms_host_user_id_idx on public.rooms (host_user_id);
create index if not exists room_participants_room_id_idx on public.room_participants (room_id);
create index if not exists room_participants_user_id_idx on public.room_participants (user_id);
create index if not exists turn_actions_room_turn_idx on public.turn_actions (room_id, turn);
create index if not exists turn_actions_user_id_idx on public.turn_actions (user_id);
create index if not exists battle_logs_room_turn_idx on public.battle_logs (room_id, turn);

alter table public.characters enable row level security;
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.turn_actions enable row level security;
alter table public.battle_logs enable row level security;

drop policy if exists characters_owner_all on public.characters;
create policy characters_owner_all on public.characters
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists rooms_visible_to_party on public.rooms;
create policy rooms_visible_to_party on public.rooms
  for select to authenticated
  using (
    host_user_id = auth.uid()
    or status = 'lobby'
    or exists (
      select 1 from public.room_participants rp
      where rp.room_id = rooms.id
      and rp.user_id = auth.uid()
      and rp.left_at is null
    )
  );

drop policy if exists rooms_create_by_host on public.rooms;
create policy rooms_create_by_host on public.rooms
  for insert to authenticated
  with check (host_user_id = auth.uid());

drop policy if exists rooms_update_by_party on public.rooms;
create policy rooms_update_by_party on public.rooms
  for update to authenticated
  using (
    host_user_id = auth.uid()
    or exists (
      select 1 from public.room_participants rp
      where rp.room_id = rooms.id
      and rp.user_id = auth.uid()
      and rp.left_at is null
    )
  )
  with check (
    host_user_id = auth.uid()
    or exists (
      select 1 from public.room_participants rp
      where rp.room_id = rooms.id
      and rp.user_id = auth.uid()
      and rp.left_at is null
    )
  );

drop policy if exists room_participants_party_select on public.room_participants;
create policy room_participants_party_select on public.room_participants
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.rooms r
      where r.id = room_participants.room_id
      and (r.host_user_id = auth.uid() or r.status in ('lobby', 'active', 'completed'))
    )
  );

drop policy if exists room_participants_self_insert on public.room_participants;
create policy room_participants_self_insert on public.room_participants
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists room_participants_self_update on public.room_participants;
create policy room_participants_self_update on public.room_participants
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists turn_actions_party_select on public.turn_actions;
create policy turn_actions_party_select on public.turn_actions
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.room_participants rp
      where rp.room_id = turn_actions.room_id
      and rp.user_id = auth.uid()
      and rp.left_at is null
    )
  );

drop policy if exists turn_actions_self_insert on public.turn_actions;
create policy turn_actions_self_insert on public.turn_actions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists battle_logs_party_all on public.battle_logs;
create policy battle_logs_party_all on public.battle_logs
  for all to authenticated
  using (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = battle_logs.room_id
      and rp.user_id = auth.uid()
      and rp.left_at is null
    )
  )
  with check (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = battle_logs.room_id
      and rp.user_id = auth.uid()
      and rp.left_at is null
    )
  );

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms') then
    execute 'alter publication supabase_realtime add table public.rooms';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_participants') then
    execute 'alter publication supabase_realtime add table public.room_participants';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'turn_actions') then
    execute 'alter publication supabase_realtime add table public.turn_actions';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'battle_logs') then
    execute 'alter publication supabase_realtime add table public.battle_logs';
  end if;
end $$;
