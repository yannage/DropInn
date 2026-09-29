# A living, playful tabletop

Implemented locally · 2026-09-29 · Hosted rollout and human enjoyment evaluation remain separate.

**Show the consequence on the table before explaining it in history.**

The core loop is **pick up a piece → aim → commit → watch the world react → spot the next opportunity**. Keep quiet intervals so ordinary actions, combinations and chapter endings have distinct weight. Preserve cooperative stories and handmade artwork.

## Interaction and pacing

Four tokens are visible by default. Lift, pointer tilt, compatible targets, placement squash and invalid-drop return support selection. Dragging prepares a move; the existing hold/release control commits it. Target-first inspection, tap, keyboard, assisted timing and Roll now remain. Approach and explicit combination choices stay in the dock with benefit/risk information. Tokens park at committed targets; uncertain delivery keeps the saved-action retry path.

Keep all four scene pieces and lower-edge heroes visible. Desktop targets are staggered; phones use two columns. History is opened explicitly. Waiting/readiness and a persistent consequence caption keep ordinary play on the table. Developed objects keep their changed artwork.

Choosing lasts at most 60 seconds and resolves when everyone commits. The ten-second reveal/readiness contract is unchanged. `stagePlayback.ts` projects confirmed results using the resolution timestamp: first anticipation at 150ms, impact 300ms later, subsequent starts at most 1050ms apart, compressed to finish by 5750ms. Presentation caches the last choosing snapshot without modifying room state. Late snapshots project elapsed beats; reloads without that cache show the resolved board. Repeated events are deduplicated, and sound IDs survive component remounts. Reduced motion/effects show the complete outcome immediately.

Fight lunges and recoils, Influence sends speech marks, Investigate reveals sparks/clues, and Help draws a connection. Display recorded objective progress, damage, healing and protection accurately; combat objective progress is never enemy HP. Credit the setup actor in combination results without awarding extra XP.

## Effect budget and access

Use installed React/Framer Motion, CSS/SVG and Web Audio; no additional engine/package. Animate transforms where practical, never hit areas. Ordinary bursts use six particles and stronger bursts sixteen (below the 24-particle ceiling). Impact shake is confined to decoration, at most 6px for 180ms. Remember reduce-effects, shake and opt-in sound preferences; honor system reduced motion. Keep one narrator and duck effects to 30% beneath enabled narration. Reduced effects must preserve numbers, outcomes and usable controls.

## Briar Glen version 2

| Chapter setup: first matching success | Objective payoff | Safety payoff |
| --- | --- | --- |
| Fight or Help at gate | Influence herd: Gather into shelter, +3 extra progress | Help Mara: Secure the shelter, extra 2 danger reduction |
| Investigate or Help at reeds | Fight pack: Spring the ambush, +3 extra progress | Help boat: Hidden crossing, 3 party cover |
| Fight or Help at bell | Help ward: Resonant repair, +3 extra progress | Help captives: Cover the escape, 3 party cover |

Setup opens the **following two choosing turns**, once per chapter. Repeating setup cannot refresh it. Each human explicitly chooses one payoff attempt; ordinary moves remain the default. Accepted attempts consume the use even on a miss. Payoffs retain the ordinary roll, approach, timing and effects; only success adds benefits. Progress and danger use existing human-count scaling and clamps. Cover uses the strongest value, never sums. Preview the current ceiling and existing cover.

Source links, remaining turns and availability identify the opening. Solo players can prepare their own combination. Late arrivals can use a remaining opening; departures and rejoining never restore a spent use. Downed heroes retain legal Help. Companions never activate or consume combinations. Same-round setup/payoff is impossible, independent of command arrival order.

New tables select current Briar Glen v2; `adventureFor` resolves pinned versions for existing rooms. Optional definitions, selection, room usage and structured result metadata use existing JSON storage without a migration. Deploy the matching client and command service together.

## Verification and remaining evidence

Run `npm test`, `npm run build`, and local handler browser runners `test:scene`, `test:round-scroll`, `test:mobile`, `test:adventures`, and `test:living-table` with `--base-url http://127.0.0.1:5199` when that preview is running. The mobile and adventures runners take a positional URL instead, for example: `npm run test:mobile -- http://127.0.0.1:5199`. Browser evidence lives in ignored `output/playwright`.

Unit coverage includes eligibility, every payoff, failure consumption, expiry, scaling, strongest cover, reversed arrivals, duplicates, late joins, departures/rejoining, pinned versions, and timestamp/reload/reduced playback. The living-table runner plays all three chapters with two humans through the real isolated local command handler, explicitly choosing different payoffs and reloading spent uses. Existing runners cover solo play, release controls, retry/recovery, keyboard/touch, history and all four adventures.

Automated checks establish behavior, not enjoyment. Human comparison must ask players to explain their move, identify its consequence, discover a combination, explain their payoff choice and say whether they want another turn. Record observations rather than asserting improved fun. A separate listening session, assistive-technology review and real-device performance check are still needed; no hosted rollout is implied.

Animation reference: [Motion drag documentation](https://motion.dev/docs/react-drag). The installed version remains unchanged; existing pointer capture/drop targeting is retained and Motion supplies lift/return/presentation animation.

## Local evidence record (2026-09-29)

- Production TypeScript/Vite build passed. The full unit/service suite passed 387 tests.
- Scene integration: 96 checks, including solo/two/four-player flows, pointer and keyboard timing, cancellation, exact retries/reload, deadlines, chapter progression, manual history, and narrator bridges. Authored rendering fixtures are labeled separately from real commands.
- Round history: 10 checks for waiting, explicit opening, cumulative reading, retries, rejection recovery, reduced motion and readiness.
- Mobile: entry, story choice, hero save/reload, touch input, drawers and keyboard-space emulation at 320×568, 390×844, 412×844 and 1280×900.
- Adventures: the other three authored adventures completed their three chapters through the real local handler, with branching, reconnect and history checks.
- Living tabletop: real setup/payoff turns in all three Briar Glen chapters, explicit opposite two-player payoffs, spent-use reload persistence, lost-response exact combination retry, missing artwork fallback, enlarged target/action text at 390px, and selected-combination/release geometry on phone and desktop.

Raw results and screenshots: `output/playwright/*-results.json`, `living-combo-*.png`, `living-payoff-*.png`, and `integration-*.png` (generated, ignored artifacts). Desktop and phone screenshots were visually inspected. The runners use isolated local repositories and controlled round clocks; no hosted writes or live model calls occurred.

Remaining acceptance evidence: unaided human comparison, separate sound listening, assistive-technology review, and physical-device performance. A live local sample observed a maximum of 16 transient particles (281 samples), within the 24-particle cap. Timing is also bounded by implementation; this is not a measured mobile frame-rate claim.

### Human comparison worksheet

Record baseline and revised build, participant familiarity, device/input, and story/chapter. After the first action ask “What did you choose, and what changed?” After setup ask “What can you do next?” After payoff ask “Why did you choose that benefit?” Record whether they spontaneously ask for another turn, confusion or missed consequences, and the observed time to first meaningful action. Keep literal observations separate from design interpretation. No participants have been recruited or results invented for this pass.
