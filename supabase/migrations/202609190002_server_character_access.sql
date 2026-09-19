-- The original character migration defines owner RLS but relies on project
-- default grants. V2's server must also be able to load the owned hero before
-- admitting a player. BYPASSRLS alone does not grant table access.
grant select on table public.characters to service_role;
