# Living tabletop acceptance record

2026-09-29. Checkout commit: `1f88867`; subsequent interaction and playback changes are uncommitted. Hosted rollout is separate. This record does **not** establish enjoyment parity with Balatro or Slay the Spire.

| Requirement | Current evidence | State |
| --- | --- | --- |
| Persistent scene, four-token hand, inspection, dock choices, immediate round parchment with dismissal/reopening | Scene and round-history browser runners | Locally verified |
| Tactile pickup/aim/return; dragging prepares, release commits | Real-pointer living-table checks, stable hit areas, cancellation, blur and keyboard recovery | Locally verified |
| Activity after choosing/committing | Hero play preserves actions; shared reactions appear on both clients with cooldown, mute and expiry | Implemented; enjoyment unverified |
| 60-second choosing, all-committed resolution, ten-second reveal/readiness | Engine/service tests and scene/history deadline and readiness checks | Locally verified |
| Confirmed action, progress, HP, protection and developed artwork | Projection tests and labeled scene rendering fixtures; progress is explicitly labeled, never enemy HP | Locally verified |
| Playback finishes by 5.85 seconds, including busy rounds | Regression cases at 1/4/7/9/10/30 events; browser stress fixture observes all nine event IDs | Locally verified; implemented ceiling 5.75 seconds |
| Late/repeated snapshots, reload, chapters, skipped reveals, reduced motion, missing art | Projection tests, scene fixtures, living-table reloads, history runner | Locally verified |
| Particle cap, decorative shake, stable hit areas | At most 16 result + 6 input particles; stress fixture observes 22 together; shake at most 6px per axis for 180ms | Locally verified |
| Effect performance | Nine-event headless Chromium fixture: 332 frames, p95 16.7ms, maximum 33.3ms | Local observation; physical-phone performance unverified |
| Sound preference, mute, narration ducking, one narrator | Web Audio tests and narrator bridge checks; effects duck to 30% | Functional checks pass; separate listening required |
| Three setups and six explicit payoffs | Combination tests and real two-player play through all three Briar Glen chapters | Locally verified |
| Two following turns, once/chapter, one accepted use/human, miss consumption, no same-round payoff or companion use | Combination reducer/service tests; ordinary moves remain default; no extra setup XP | Locally verified |
| Scaling/clamps, strongest cover, previews, order independence, duplicates, solo, late join, departures/rejoining, downed Help | Combination and engine/service tests; exact retry preserves selection, approach and release | Locally verified |
| Current Briar Glen v2 and pinned v1 lookup | `currentAdventure` versus `adventureFor`, version compatibility tests, existing JSON storage | Locally verified; deploy matching client/server together |
| Existing artwork alignment/IDs; all four adventures | Existing catalog retained; shared stage components and additional-adventure browser runner | Local functional coverage |
| Desktop, 390×844, 320×568, enlarged text, 44px controls | Scene/living-table screenshots and geometry assertions; mobile runner | Browser-viewport verified; assistive-technology review remains |
| README, design guidance, invariants, feel document, v2 story packet | `README.md`, `DESIGN.md`, `CLAUDE.md`, `AGENTS.md`, `docs/game-feel-direction.md`, `docs/stories/briar-glen-v2.md` | Present and inspected |
| Human comparison: explain move, consequence, combination and payoff choice; desire for another turn | First participant preferred B’s tactile interactions and A’s immediate scroll; the hybrid incorporates both. Move/consequence comprehension, combination reasoning and desire for another turn were not reported. | **Partial human evidence** |

## Reproduce local checks

With the local Vite command handler running:

```powershell
npm test
npm run build
npm run test:living-table -- --base-url http://127.0.0.1:5199
npm run test:scene -- --base-url http://127.0.0.1:5199
npm run test:round-scroll -- --base-url http://127.0.0.1:5199
npm run test:mobile -- http://127.0.0.1:5199
npm run test:adventures -- http://127.0.0.1:5199
```

The runners use isolated local repositories. The living-table busy-round stress section is a **rendering fixture**, not a service-outcome claim. Generated results and screenshots live in ignored `output/playwright/`. They establish local command/read behavior, not hosted Realtime. Frame measurements use a phone-sized viewport on the development computer, not a physical phone.

## Completion boundary

A [human comparison kit](playtests/living-table-comparison.md) is now prepared, including the pre-implementation baseline (`36849c1`) on port 5200, the revision on port 5199, and a local notes/download page. Real local-server smoke checks pass for both builds. The first human comparison favored B overall and A’s immediate scroll; see the linked record.

The implementation is locally reviewable. The broad enjoyment objective remains unproven beyond the first participant’s stated preference. Separate listening is also outstanding. Use those observations to change pacing or mechanics where needed; passing tests alone is not completion. Hosted rollout is outside this delivery.
