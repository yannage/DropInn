# DropInn — drop-in tabletop adventures

DropInn’s default experience is V2: discover a live table, join with a ready hero, contribute to a short fantasy chapter, and leave whenever needed. Briar Glen has three linked chapters: the missing livestock, the riverside hunt, and the chapel. The older battle/story prototype remains available at `/?legacy=1`; it is not the main product flow.

## Code map

| Area | Source |
| --- | --- |
| Default entry and legacy switch | `src/App.tsx` |
| Discovery, play, token actions, chat and recaps | `src/components/DropInn/DropInn.tsx` |
| Authored responsive scene artwork | `src/components/DropInn/SceneArt.tsx`, `src/dropinn.css` |
| Client session, sync, proposals and reward receipts | `src/store/adventureStore.ts` |
| Shared types, authored chapters and pure reducer | `src/lib/dropinn/` |
| Authenticated command service and persistence | `server/dropinn.ts` |
| Optional OpenAI/Ollama adapters | `server/ai.ts` |
| Hosted function and development adapter | `netlify/functions/dropinn.ts`, `vite.config.ts` |
| V2 tables and transactional command/reward application | `supabase/migrations/202609190001_dropinn_v2.sql` |

React 18, TypeScript, Zustand, Vite, Supabase and Netlify remain the stack. Legacy battle modules and tables coexist with V2; do not route new features through the old snapshot-writing multiplayer client. `_archive/` is reference material, not application code.

## Invariants

- The server validates identity, character ownership, actions and room revisions. Browsers send commands, not authoritative room snapshots. Presence updates are separate from gameplay writes.
- A room has four seats, including labeled rules-based companions. New humans replace companions at a turn boundary. Character identity is pinned for the adventure.
- Turns allow 30 seconds, resolve early when all active humans commit, and show results for six seconds. There is no host-only start or unanimous Continue requirement.
- Missing input abstains in social scenes and defends in combat. Two missed turns release the seat. Empty rooms finish committed work and park; companions do not generate unattended progress.
- Current turn identifiers reject stale actions. Same-turn submissions may use older revisions; the server retries transaction conflicts against fresh state. Command receipts and reward deltas are idempotent.
- Each hero has one Spotlight attempt per chapter. Leaving and returning preserves its use, HP and contributions. Validated previews are signed and bound to the user, room, target and turn.
- Class presets determine starting power regardless of saved XP. Downed heroes can Assist. Progress and danger contributions scale with human count; every chapter closes by ten rounds.
- Authored mechanics own outcomes. Optional AI can prepare cosmetic variations, interpret supported scene interactions, and narrate resolved events. It cannot grant arbitrary rewards or revise a resolved turn.

## Development and deployment

`npm run dev` provides both Vite and the local command service. The local repository is server memory: rooms and chat disappear when the development server restarts; browser hero data remains. Use `?session=host` and `?session=guest` for separate local identities.

**Restart Vite after changing the server handler or its server-side dependencies.** The development plugin caches the loaded handler. `npm run preview` serves static assets only and does not provide `/api/dropinn`.

Hosted multiplayer requires Supabase Auth, migrations, browser Supabase configuration, and server-only credentials in the Netlify function. Never place service-role, signing, or model API secrets in `VITE_*` variables. See [service setup](server/DROPINN.md) and [Supabase setup](SUPABASE_SETUP.md).

Hosted rollout, actual model evaluation, and friend-group playtesting remain unfinished. Keep these distinct from the implemented local experience. [NEXT.md](NEXT.md) records those follow-ups; [DESIGN.md](DESIGN.md) describes the product behavior.
