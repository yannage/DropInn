-- Apply before deploying the character builder. Existing heroes use application defaults.
alter table public.characters add column if not exists appearance jsonb;
alter table public.characters add column if not exists equipment jsonb;

comment on column public.characters.appearance is 'Cosmetic body, eyes, nose and mouth catalog IDs. NULL uses starter defaults.';
comment on column public.characters.equipment is 'Cosmetic equipment slots. hat is a catalog ID or JSON null for unequipped.';
