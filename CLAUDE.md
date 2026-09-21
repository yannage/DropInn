# DropInn — drop-in tabletop adventures

DropInn’s default experience is V2: discover a live table, join with a ready hero, contribute to a short fantasy chapter, and leave whenever needed. Briar Glen has three linked chapters: the missing livestock, the riverside hunt, and the chapel. The older battle/story prototype remains available at `/?legacy=1`; it is not the main product flow.

## Code map

All adventure authoring follows [the storytelling and pacing baseline](docs/storytelling-guide.md). Start new stories from [the packet template](docs/stories/TEMPLATE.md). Briar Glen and the three Story Circle adventures are selectable through the versioned registry; see [runtime scope and verification](docs/playable-adventures.md).

| Area | Source |
| --- | --- |
| Default entry and legacy switch | `src/App.tsx` |
| Discovery, hero builder, chat and recaps | `src/components/DropInn/DropInn.tsx` |
| Active adventure stage, drawers and action dock | `src/components/DropInn/SceneAdventure.tsx`, `scene-adventure.css` |
| Focused attacks, token approaches and opposed dice | `src/components/DropInn/FocusedAction.tsx`, `src/lib/dropinn/approaches.ts`, [mechanics and verification](docs/focused-actions.md) |
| Three-state parchment story reader and chronological projection | `src/components/DropInn/StoryScroll.tsx`, `src/lib/dropinn/storyLog.ts` |
| Timed commitment gesture and accessible alternatives | `src/components/DropInn/TimedRelease.tsx` |
| Authored scene backgrounds, targets and developed states | `src/components/DropInn/SceneStageArt.tsx`, `TargetArtwork.tsx` |
| Client session, sync, proposals and reward receipts | `src/store/adventureStore.ts` |
| Shared types, authored chapters and pure reducer | `src/lib/dropinn/` |
| Adventure identity, versions and authored definitions | `src/lib/dropinn/registry.ts`, `adventures.ts` |
| Rebuild reviewed story packets into static definitions | `npm run stories:build` (`scripts/build-story-data.mjs`) |
| Authenticated command service and persistence | `server/dropinn.ts` |
| Optional OpenAI/Ollama adapters | `server/ai.ts` |
| Hosted function and development adapter | `netlify/functions/dropinn.ts`, `vite.config.ts` |
| V2 tables and transactional command/reward application | `supabase/migrations/202609190001_dropinn_v2.sql` |

React 18, TypeScript, Zustand, Vite, Supabase and Netlify remain the stack. Legacy battle modules and tables coexist with V2; do not route new features through the old snapshot-writing multiplayer client. `_archive/` is reference material, not application code.

## Invariants

- The server validates identity, character ownership, actions and room revisions. Browsers send commands, not authoritative room snapshots. Presence updates are separate from gameplay writes.
- A room has four seats, including labeled rules-based companions. New humans replace companions at a turn boundary. Character identity is pinned for the adventure.
- Adventure ID/version are pinned too. Missing identity means legacy Briar Glen v1; unavailable versions fail explicitly. Match only the same adventure/version. Keep released versions addressable when revising definitions.
- Chapter 3's first turn resolves branch-directed human Help votes together. Unique most votes wins; ties/no votes use the displayed authored fallback. Companions cannot vote. Committed votes survive departure, timing never changes preference, and the chosen cost cannot be reversed by later actions.
- Turns allow 30 seconds, resolve early when all active humans commit, and show results for six seconds. There is no host-only start or unanimous Continue requirement.
- New rooms pin `mechanicsVersion: 1`. An optional validated `action.approach` selects focused mechanics; omitted approaches retain standard action behavior, and old rooms retain their original rules. Enemy-targeted Fight can use Quick (+2, 2 progress), Heavy (−1, 6 progress), or Guarded (2 progress, 3 cover). Both sides roll d20; the player must strictly beat the frozen enemy modifier plus its shared turn roll. Progress divides by human count. No approach rerolls either die. Study grants nonstacking +2 next-turn insight; Distract grants +1 opening. Mend is guaranteed 2/3 healing with no progress; retain an accepted Mend's departing recipient until resolution. These optional fields live in existing room/event JSON.
- Normal adventure play uses a viewport stage: four illustrated scene targets, visible heroes/threat, a fixed token hand and commitment control. Put extended prose, odds, chat, party details and invitations in drawers. Target 390×844 and 320×568 without document scrolling; allow accessible reflow at enlarged text sizes. Preserve tap and keyboard alternatives to dragging.
- Assist remains the wire token `assist`, displayed as **Help**. In combat, Help on the announced victim (`targetKind: 'hero'`) is Protect: guaranteed 2 protection, or 3 with a good release; no objective progress and 3 contribution XP. Strongest Protect and existing party cover win rather than stack. Existing absent-player defense remains separate. Downed heroes can Protect.
- Enemy intent freezes source, intended actor and base damage at the choosing boundary. Prefer upright humans, then upright companions. Retain a departing threatened seat through resolution without redirecting its strike; an empty uncommitted room releases seats and parks. Old snapshots without intent finish the current turn under their existing targeting rule; the next choosing boundary announces intent.
- Release input is an optional whole number from 0–1200 ms. Inclusive 650–950 ms grants +1 to the server-computed modifier, or the extra Protect point. Missing/missed timing gives the ordinary move. Assisted release has the same cap; Roll now skips timing. Timing is client input, not proof of human dexterity or an anti-cheat mechanism. The server deadline still applies, including signed Spotlight confirmation.
- Structured `StoryEvent.result` fields drive progress, target-change, protection, healing and damage visuals. `contribution: true` marks real actions including Protect without inventing a roll. Reward/recap/metrics readers also recognize old events with a roll. Room snapshots and event entries are already JSON; these optional fields require no SQL migration.
- Missing input abstains in social scenes and defends in combat. Two missed turns release the seat. Empty rooms finish committed work and park; companions do not generate unattended progress.
- Current turn identifiers reject stale actions. Same-turn submissions may use older revisions; the server retries transaction conflicts against fresh state. Command receipts and reward deltas are idempotent.
- Uncertain moves persist their complete action, release timing and command ID with the local saved table. Freeze edits until retry or synchronization settles the command. Reload must not manufacture a new timing attempt or duplicate rewards.
- Each hero has one Spotlight attempt per chapter. Leaving and returning preserves its use, HP and contributions. Validated previews are signed and bound to the user, room, target and turn.
- Class presets determine starting power regardless of saved XP. Downed heroes can Help. Progress and danger contributions scale with human count; every chapter closes by ten rounds.
- Authored mechanics own outcomes. Optional AI can prepare cosmetic variations, interpret supported scene interactions, and narrate resolved events. It cannot grant arbitrary rewards or revise a resolved turn.

## Development and deployment

`npm run dev` provides both Vite and the local command service. The local repository is server memory: rooms and chat disappear when the development server restarts; browser hero data remains. Use `?session=host` and `?session=guest` for separate local identities.

**Restart Vite after changing the server handler or its server-side dependencies.** The development plugin caches the loaded handler. `npm run preview` serves static assets only and does not provide `/api/dropinn`.

Hosted multiplayer requires Supabase Auth, migrations, browser Supabase configuration, and server-only credentials in the Netlify function. Never place service-role, signing, or model API secrets in `VITE_*` variables. See [service setup](server/DROPINN.md) and [Supabase setup](SUPABASE_SETUP.md).

The new scene-stage mechanics still need a separately authorized hosted rollout. Earlier hosted API checks do not verify this working-tree version, browser Realtime, or physical-phone play. Actual model evaluation and friend-group playtesting remain follow-ups. [NEXT.md](NEXT.md) records verification boundaries; [DESIGN.md](DESIGN.md) describes the product behavior.
