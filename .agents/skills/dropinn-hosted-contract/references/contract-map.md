# Contract map and diagnosis

Paths are relative to the repository root; current definitions are authoritative.

| Boundary | Inspect | Common failure / decision |
| --- | --- | --- |
| Backend and HTTP | `vite.config.ts`, `netlify.toml`, `src/lib/dropinn/api.ts` | `vite preview` is static; Vite caches server imports. Verify `backend` in responses. |
| Runtime | `package.json`, `server/DROPINN.md`, `server/dropinn.ts` | Node 22 and explicit server WebSocket transport. A Netlify runtime override belongs in deployment settings. |
| Auth and ownership | `src/lib/supabase/client.ts`, `src/store/adventureStore.ts`, `server/dropinn.ts` | Browser storage can outlive anonymous auth; refresh ownership before admission. |
| Saved hero conversion | `src/lib/supabase/characters.ts`, `src/lib/cosmetics.ts` | Plain-object PostgREST errors need message preservation. `PGRST204`/`42703` mentioning appearance/equipment means inspect customization schema. |
| Permissions | `supabase/migrations/202609190002_server_character_access.sql` | Service-role RLS bypass does not grant table SELECT. Test table grants as well as RLS. |
| Transaction and rewards | `supabase/migrations/202609190001_dropinn_v2.sql`, `server/dropinn.ts` | `dropinn_apply_snapshot` atomically applies revision, receipt, events, membership, and reward deltas. Conflict retries must reload room state. |
| Hero compatibility | `supabase/migrations/202609200001_hero_customization.sql`, `docs/hero-art.md` | Nullable old fields get defaults; explicit no-hat survives; owned hats derive from keepsake strings; appearance is pinned per visit. |
| Realtime | `src/lib/dropinn/api.ts` | Subscription to `adventure_rooms` updates triggers sync. Polling success alone does not verify delivery. |

Browser configuration uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Service-role/signing/model secrets stay server-only. Inspect presence/names rather than printing secrets. Local Vite can target hosted persistence with `DROPINN_BACKEND=supabase`; loopback hosting alone does not mean local data.

For a persisted field, trace: UI draft -> store save -> row writer/reader -> migration/grants -> owned server load -> room snapshot -> reload/rejoin. Keep identity updates separate from reward updates. Use existing tests for failed saves and rewards arriving during identity saves.

The V2 command reducer and transaction path coexist with a legacy snapshot-writing client. Do not route a V2 fix through legacy tables or multiplayer stores.
