# A living, playful tabletop

Implemented locally · 2026-09-29 · Hosted rollout and human enjoyment evaluation remain separate.

**Show the consequence on the table before explaining it in history.**

The core loop is **pick up a piece → aim → commit → watch the world react → spot the next opportunity**. Keep quiet intervals so ordinary actions, combinations and chapter endings have distinct weight. Preserve cooperative stories and handmade artwork.

## Interaction and pacing

Four tokens are visible by default. Lift, pointer tilt, compatible targets, placement squash and invalid-drop return support selection. Dragging prepares a move; the existing hold/release control commits it. Target-first inspection, tap, keyboard, assisted timing and Roll now remain. Approach and explicit combination choices stay in the dock with benefit/risk information. Tokens park at committed targets; uncertain delivery keeps the saved-action retry path.

Keep all four scene pieces and lower-edge heroes visible. Desktop targets are staggered; phones use two columns. The live round parchment opens automatically after the on-table result has had breathing room, following the human A/B preference. View scene dismisses it for that round, even across confirmation; history can be reopened explicitly. Waiting/readiness and a persistent consequence caption keep ordinary play on the table. Developed objects keep their changed artwork.

Choosing lasts at most 60 seconds and resolves when everyone commits. The ten-second reveal/readiness contract is unchanged. `stagePlayback.ts` projects confirmed results using the resolution timestamp: first anticipation at 150ms, impact 300ms later, subsequent starts at most 1050ms apart, compressed to finish by 5750ms. Presentation caches the last choosing snapshot without modifying room state. Late snapshots project elapsed beats; reloads without that cache show the resolved board. Repeated events are deduplicated, and sound IDs survive component remounts. Reduced motion/effects show the complete outcome immediately.

Fight lunges and recoils, Influence sends speech marks, Investigate reveals sparks/clues, and Help draws a connection. Display recorded objective progress, damage, healing and protection accurately; combat objective progress is never enemy HP. Credit the setup actor in combination results without awarding extra XP.

## Effect budget and access

Busy rounds compress the entire beat to its spacing, including contact, dice, travel, recoil and the sound window. This prevents an earlier active event from hiding a later one while preserving the 5.75-second playback ceiling.

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
- Round history: 10 checks for immediate opening, waiting, dismissal/reopening, cumulative reading, retries, rejection recovery, reduced motion and readiness.
- Mobile: entry, story choice, hero save/reload, touch input, drawers and keyboard-space emulation at 320×568, 390×844, 412×844 and 1280×900.
- Adventures: the other three authored adventures completed their three chapters through the real local handler, with branching, reconnect and history checks.
- Living tabletop: real setup/payoff turns in all three Briar Glen chapters, explicit opposite two-player payoffs, spent-use reload persistence, lost-response exact combination retry, missing artwork fallback, enlarged target/action text at 390px, and selected-combination/release geometry on phone and desktop.

Raw results and screenshots: `output/playwright/*-results.json`, `living-combo-*.png`, `living-payoff-*.png`, and `integration-*.png` (generated, ignored artifacts). Desktop and phone screenshots were visually inspected. The runners use isolated local repositories and controlled round clocks; no hosted writes or live model calls occurred.

Remaining acceptance evidence: unaided human comparison, separate sound listening, assistive-technology review, and physical-device performance. A live local sample observed a maximum of 16 transient particles (281 samples), within the 24-particle cap. Timing is also bounded by implementation; this is not a measured mobile frame-rate claim.

### Human comparison worksheet

Record baseline and revised build, participant familiarity, device/input, and story/chapter. After the first action ask “What did you choose, and what changed?” After setup ask “What can you do next?” After payoff ask “Why did you choose that benefit?” Record whether they spontaneously ask for another turn, confusion or missed consequences, and the observed time to first meaningful action. Keep literal observations separate from design interpretation. No participants have been recruited or results invented for this pass.

## Contact feedback follow-up

Table buttons and native checkbox/radio activations now acknowledge input with one short contact ring and six colored chips. Only one input burst can exist, so it can overlap a sixteen-particle result without exceeding the 24-particle ceiling. These marks acknowledge input, never server success. Disabled controls and canceled/dragged gestures do not create a click burst. Pointer release, cancellation, keyboard release and window blur clear the pressed decoration.

Token hover/press now moves the artwork inside a stationary button. Approach and contextual choices gain pressed shading; scene pieces and heroes compress inside stable hit areas. Keyboard activation receives the same contact marks. Reduced effects suppress these marks, and a live system reduced-motion listener immediately updates the table without requiring a reload (the installed Motion hook snapshots the preference at mount).

Verification: production build and the real local living-table browser runner passed, including unchanged token hit rectangles, six-particle pointer/keyboard acknowledgement, no commands from those interactions, live reduced-motion suppression, missing artwork, enlarged text, exact combination retries and all three chapters. Screenshot: `output/playwright/living-contact-press.png`. This is additional interaction evidence, not proof of enjoyment parity with the reference games.


## Play between decisions

Preparing a move now draws a token-colored thread from the player's hero to the destination. Dragging follows the pointer until a compatible target is found; the target gains a ring. This is an aim preview, not a forecast of success. It disappears when the move is submitted.

Tapping your hero cycles a hop, twirl and bow, with a short caption and the existing opt-in pick sound. It works with keyboard activation too, including while a move is prepared or committed. Armed Help keeps its normal targeting behavior; inspecting an injured or threatened hero remains available before preparing a move. Party details remain in the Party drawer. The toy is local, sends no command, grants no reward, and never extends a deadline or replaces a saved action. Reduced effects keep the caption but suppress the movement. One hero drawing remains mounted visually after repeated taps.

Confirmed dice now have a brief wind-up followed by the recorded value, modifier, total and outcome; opposed rolls show both sides. No invented intermediate numbers are shown. The existing timestamp drives the sequence, with late arrivals fast-forwarding it. Dice and consequence captions share the available stage space; very short stages use the dock consequence caption.

Verification: the real local living-table runner passed prepared and committed hero play, pointer/keyboard equivalence, unchanged commands and room state, exact retry preservation, aim visibility, and 320×568 waiting geometry. Repeated-tap screenshots exposed a duplicate React key; distinct avatar/caption keys fixed it and an assertion now requires exactly one hero drawing. Revised 390×844 and 320×568 screenshots were inspected. All three authored combinations and recorded dice landing checks passed; sampled result particles peaked at 16. These checks establish interaction integrity, not enjoyment. A shared minion challenge or party cosmetic reward remains a separate mechanic to design and playtest.

Regression verification also passed the production build, all 387 unit/service tests, and the full local scene runner (including assisted timing, Protect/Mend, pointer cancellation, deadlines, exact lost-response retries, three chapters, four-player history and narrator bridges). Contact feedback uses click bubbling so native checkbox changes are processed normally. Legacy whole-card hover/press transforms are overridden; the stable-hit-area assertion waits through the former transition to catch movement.


## Pickup and aiming follow-up

A dragged token leaves a dim impression in its stationary hand slot. Its lifted piece tilts with horizontal pointer movement, gains a brighter rim over a legal destination, and names the authored action in a small “Drop to prepare” caption. The caption stays within narrow phone widths; Help previews distinguish Protect from Mend. Entering a new legal target plays a quiet, throttled aim tick when sound is enabled. Invalid drops play a soft return cue and spring to the center of the original slot. These are input cues, not resolved outcomes.

Pointer cancellation, lost capture and window blur clear the held piece. Keyboard activation still works after cancellation. Reduced motion removes tilt, scaling and the return animation while keeping the target/action cue. Dragging never sends a command; dropping only prepares the action for the existing release control.

The maintained living-table runner exercises actual pointer pickup, legal hover, invalid return, valid preparation, cancellation, blur, keyboard recovery and reduced motion against the real local handler. New screenshots: `output/playwright/living-drag-aim-390.png` and `living-drag-aim-320.png`. Sound-envelope/disposal and release-controller tests passed (25 checks); new cues retain the existing mute and narration ducking behavior. Separate listening remains outstanding.

After the pickup changes, the production build, living-table runner and full scene runner passed again, including three real chapters, four-player history, assisted release, recovery and narrator bridges. No hosted deployment or human enjoyment claim is implied.


## Shared play while waiting

After a confirmed commitment, the choosing-phase waiting dock exposes the existing Cheers, Thanks and Clever reactions. They retain the existing seated-human requirement, server cooldown and command validation. A visible cooldown explains when another reaction is available. Pending/uncertain moves keep their recovery flow; the quick reaction row appears only after confirmation.

Confirmed reactions appear above the sending hero on every client's stage for the remainder of their eight-second lifetime. Each hero shows their latest reaction. Muted players are hidden. A short entrance uses the recorded timestamp: repeated snapshots keep the same node and late mounts skip elapsed animation. Reduced effects keep a stationary readable bubble. Reactions add no particles or remote sound; the sender gets the existing optional input cue. Local hero play temporarily takes priority over their speech bubble.

The existing Party drawer keeps its reaction controls and readable stream. The waiting controls use 44px targets and a compact short-phone layout. This social play does not grant rewards, add objective progress, replace a committed action or extend a deadline. It reuses the existing reaction command and JSON data; no server or storage change is needed.

Local evidence: the living-table runner sends a real cheer after one of two players commits, verifies both clients display the same confirmed reaction, checks the cooldown, stable nodes across repeated reads, expiry, reduced motion and muted-player presentation, and asserts unchanged turn, phase, deadline, commits, progress, danger, players and outcomes. The mute check changes only the receiver's local presentation preference. Screenshots: `output/playwright/living-shared-cheer-320.png` and `living-received-cheer-390.png`. Engine/store regression tests passed (83 checks). Human enjoyment and separate sound listening remain unverified.

The final production build and both maintained local living-table and round-history browser runners passed. The revised 320×568 waiting layout and receiving 390×844 choosing view were visually inspected. This verifies local command/read synchronization; hosted Realtime and physical-device performance are not established by these checks.

## Busy-round playback audit

The previous scheduler compressed start times but left every beat 900ms long. With seven or more structured events, windows overlapped and the first matching beat hid later events. Regression cases reproduced this at 7, 9 and 30 events, then passed after compressing durations and contact points together. Normal rounds retain their pacing; server deadlines and readiness are unchanged.

The production build and all 390 unit/service tests passed. The living-table runner completed all three chapters through the real local handler, then ran a separately labeled nine-event rendering stress fixture. All nine event IDs appeared. Combined result/input particles peaked at 22; earlier sampling counted only result particles. Across 332 animation frames, the observed 95th-percentile interval was 16.7ms and the maximum was 33.3ms. These headless Chromium measurements use a phone-sized viewport on the development computer, not a physical phone. Mobile checks and all three additional adventure playthroughs also passed.

The [acceptance record](living-table-acceptance.md) maps the full plan to implementation evidence and explicitly records the human-comparison observations and remaining listening evidence. Passing automated checks does not establish enjoyment.

## Human-selected hybrid (2026-09-29)

The first A/B participant preferred B overall, particularly click selection, hovering characters, and the bottom tokens’ sizing and animation. They preferred A’s immediate scroll. The live parchment therefore opens as soon as a move is submitted, including while its receipt is pending. Dismissing it returns to the scene and persists through confirmation for that round; the next round opens normally. B’s tactile interactions, local hero play and shared reactions remain. Token throwing remains unchanged pending further feedback. See [the observation record](playtests/living-table-comparison.md).

Hybrid verification: production build and all 391 unit/service tests passed. Round-scroll checks cover immediate pending opening, dismissal through confirmation, exact retry, rejection recovery, cumulative reading, keyboard focus, reduced motion and unanimous readiness. Living-table checks cover all three chapters with two humans, tactile controls, local/shared play and bounded busy-round playback. The complete scene runner, mobile runner and additional-adventure runner passed. Both live comparison servers resolved real local turns with automatic parchment and no browser errors.

### Follow-up pacing refinement

The participant found immediate parchment opening too abrupt. Submission now stays on the scene for 1.8 seconds before waiting history opens. On resolution, automatic history waits at least 1.8 seconds from the confirmed event timestamp and until the player’s action has settled plus 650 ms, capped at 5.85 seconds. Waiting history yields to that result beat. Manual opening remains immediate; dismissal still persists for the round. Reduced motion and skipped pacing bypass the delay. These are presentation delays only: choosing deadlines, immediate all-player resolution, and the ten-second reveal ceiling are unchanged. Late snapshots use the existing timestamps rather than restarting the pause.

Pacing refinement verification: 13 stage-playback tests, production build, round-scroll browser checks, and the three-chapter two-player living-table runner passed locally. Browser assertions verify that both submission and the confirmed result remain uncovered before automatic opening; recovery, manual reading, reduced motion and readiness still pass. Human assessment of the new pause remains the next feedback point.

### Release animation (2026-09-30)

A timer alone still felt immediate to the participant. Local submission now starts a visible token lift, turn, landing and settling sequence at the selected piece. It lasts 2.1 seconds with a 300 ms resting beat before automatic history may open. This runs even with Pace turn results disabled; automatic next-turn readiness waits for it too. Reduced motion uses a static token acknowledgement for 800 ms. It represents releasing the move, not a successful hit or fabricated die result. Confirmed outcomes retain their existing stage playback and rules. Manual history remains available.

Verification: production build and the local round-scroll integration runner passed. The added real pointer-hold/release check disables paced results, verifies the token animation and uncovered scene beyond the first second, then verifies automatic parchment after the animation. Screenshot reviewed at 390×844; retries, dismissal, reduced motion and readiness checks still pass.
