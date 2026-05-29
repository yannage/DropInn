alter table public.rooms
  add column if not exists room_mode text not null default 'battle',
  add column if not exists story_arc_state jsonb;

alter table public.rooms
  alter column battle_state drop not null;

update public.rooms
set room_mode = 'battle'
where room_mode is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rooms_room_mode_check'
  ) then
    alter table public.rooms
      add constraint rooms_room_mode_check
      check (room_mode in ('battle', 'story'));
  end if;
end $$;
