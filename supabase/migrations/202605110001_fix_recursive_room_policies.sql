-- Fixes PostgREST 500 / 42P17 errors caused by rooms and room_participants
-- policies referencing each other. These policies intentionally keep room
-- state readable/writable by authenticated anonymous users for the V1 room-code
-- MVP; character ownership remains user-scoped.

alter table public.characters enable row level security;
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.turn_actions enable row level security;
alter table public.battle_logs enable row level security;

drop policy if exists rooms_visible_to_party on public.rooms;
drop policy if exists rooms_create_by_host on public.rooms;
drop policy if exists rooms_update_by_party on public.rooms;

create policy rooms_authenticated_select on public.rooms
  for select to authenticated
  using (true);

create policy rooms_authenticated_insert_own_host on public.rooms
  for insert to authenticated
  with check (host_user_id = auth.uid());

create policy rooms_authenticated_update on public.rooms
  for update to authenticated
  using (true)
  with check (true);

drop policy if exists room_participants_party_select on public.room_participants;
drop policy if exists room_participants_self_insert on public.room_participants;
drop policy if exists room_participants_self_update on public.room_participants;

create policy room_participants_authenticated_select on public.room_participants
  for select to authenticated
  using (true);

create policy room_participants_self_insert on public.room_participants
  for insert to authenticated
  with check (user_id = auth.uid());

create policy room_participants_self_update on public.room_participants
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists turn_actions_party_select on public.turn_actions;
drop policy if exists turn_actions_self_insert on public.turn_actions;

create policy turn_actions_authenticated_select on public.turn_actions
  for select to authenticated
  using (true);

create policy turn_actions_self_insert on public.turn_actions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists battle_logs_party_all on public.battle_logs;

create policy battle_logs_authenticated_select on public.battle_logs
  for select to authenticated
  using (true);

create policy battle_logs_authenticated_insert on public.battle_logs
  for insert to authenticated
  with check (true);

