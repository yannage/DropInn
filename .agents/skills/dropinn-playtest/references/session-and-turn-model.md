# Sessions and turns

Paths below are repository-relative.

- `src/lib/dropinn/api.ts`: local backend selection, request timeout, and hosted subscription. Local `subscribeAdventure` is a no-op. Local polling cannot prove hosted Realtime.
- `src/lib/supabase/client.ts`: auth storage is namespaced by the `session` query. For hosted checks prefer separate browser contexts and verify distinct authenticated users; two tabs alone do not prove isolation.
- `src/store/adventureStore.ts`: local player storage, ownership refresh, pending command IDs, snapshot acceptance and reconnect. Query namespaces are sanitized/truncated; use short distinct alphanumeric QA names.
- `src/lib/dropinn/types.ts`, `engine.ts`, and `server/dropinn.ts`: authoritative room, commands, and admission. Observe `pendingJoins` until a human seat is assigned at a boundary. A visible table is not proof that the guest can commit yet.
- A choosing turn can resolve before its deadline when all humans commit. Read the returned phase/turn after each response. Wait for the next choosing phase before issuing another turn's action.
- Same-turn revision lag is supported; stale turn IDs are rejected. Preserve a pending action's command ID when testing uncertain delivery. Creating a fresh ID tests a new command instead of an idempotent retry.
- Compare selected fields at a captured turn/revision, not two entire room objects fetched at different times. Presence, events, chat, and timers can advance independently.

`npm run dev` supplies `/api/dropinn`; static preview does not. The Vite plugin caches the server module. Inspect/restart after server dependency changes, then create new QA rooms. Do not switch to legacy multiplayer to work around a V2 failure.
