# A story that stays on the table

Gemward v3 addresses two separate problems in the prior experience: routine actions could fill the same progress meter without changing the situation, and meaningful consequences could leave the screen before the player understood them. The new version makes concrete preparations determine readiness and keeps a causal account between turns. Existing v1/v2 rooms retain their rules.

The design hypothesis is that a short tabletop visit becomes more engaging when players can explain “we did this, so now we can do that.” This is a hypothesis to test with people, not a claim that passing automated checks proves enjoyment. The [mechanical exploration](design/gemward-pacing-agency-search.md) records eighteen candidates, rejected mechanisms and four distinct surviving hypotheses. This implementation develops its fact-based preparation/departure candidate, using the existing route structure and counter encounter.

## The first few minutes

The opening establishes a visible problem and someone affected: Gemward's beacon is dark, Iris's prism is missing, and neighbours on the evening ferry need a way home. Selecting a person or object brings concrete intentions into the same reading area as their consequence. Pricing and news at Iris now provide different information and benefits.

The first lead makes departure available on a later turn. The party can gather immediately or stay to help Oren, learn the watcher's habit or open another route. Gathering is an explicit prepared Help move, released through the ordinary controls. Everyone's accepted work resolves before the separate route vote begins. The party sees the remaining active rounds before fallback departure.

The story area keeps the last consequential change through the next choosing turn. Brief scene animation still comes first; a previous durable recap remains while a new live reveal plays. Reloaded or reduced-motion views can show confirmed facts immediately. The interface reads accepted history, never a draft or invented success.

## Concrete consequences

| Choice | Change in this run |
| --- | --- |
| Ask Iris about prices | A copied delivery record opens the warehouse route. |
| Ask Iris about the evening | A road lead permits gathering; watcher knowledge adds one starting party progress in a later battle. |
| Help Oren | Personal medicine follows the existing gift rule; one shared lantern prevents one damage from the first strike that penetrates other protection. It remains unused on a peaceful route. |
| Prepare the canal landing, then use it | A later distraction or investigation can recover the prism without a battle. |
| Repeat an established fact | The existing fact remains; the interface does not pretend another discovery occurred. |
| Prepare light and neighbours in the finale | The preparations unlock an explicit Finish move on a later turn and produce named world changes. |
| Arrange the repair crew | The ending records tools and volunteers ready for dawn while preserving the chosen sacrifice. |

The hill road now has a reachable, announced battle penalty. V3 Spark dust buys one extra preparation opportunity in town or the finale; its area limit and contextual description prevent the old double-progress promise from becoming misleading. It cannot be spent on the same move that leaves or finishes the area, and concurrent redundant doses are rejected before consumption. These changes are confined to v3.

## Story Circle without eight compulsory stops

The same community anchors You and Need. Finding a lead and choosing to depart establish Go. The chosen approach and encounter establish Search. Following the clues and recovering the prism earn Find; the full truth is confirmed before the final destination vote. The early warning foreshadows the cost without naming the hidden mover. The shared destination vote and explicit completion resolve Take. Returning to the town, preparing its light and bringing the ferry home express Return and Change.

Preparation order and optional assistance can vary. The two-fork map remains authored, with known consequences and versioned rules. The next useful experiment is whether meaningful preparation and durable storytelling are sufficient before investing in more route nodes, an obligation system or a wider procedural world.

## Boundaries and verification

Ordinary turns remain simultaneous and server-authoritative. The existing 60-second turns, up-to-ten-second reveals and 30-second route ballots keep their deadlines. Reading, inspecting and preparing never commits. No minimum wait, animation completion gate or absent player's acknowledgement is added. Source facts keep event IDs and turns for provenance; pending command envelopes and idempotent reward handling stay intact.

The new state is optional JSON inside the existing adventure snapshot; no database schema migration is introduced. Compatibility and local service tests must not be described as deployed Supabase or Realtime evidence. The new opening recording is generated through the existing local speech workflow and exact-text lookup; playback never substitutes the old opening for different words.

Initial v3 verification completed on October 3, 2026 (the follow-up below supersedes the current browser report):

- `rtk vitest run`: **784 passed, zero failed**, including 25 v3 rule/service cases and preserved v1/v2 coverage. Real local service journeys cover both motives × both endings, authoritative identity, snapshot round-trips and exact command retries without duplicate facts, final costs or rewards.
- `npm run test:story-table -- http://127.0.0.1:5205`: **63 checks, zero errors** through two independent identities and the real isolated local handler. Warehouse → Beacon and peaceful Canal → Lantern square cover persistent consequences, different preparations, explicit Gather/Finish, both route votes, lost-response/reload/retry, shared discoveries, rewards and confirmed animation behavior. Prepared conversation/Gather/Finish, enlarged text and Dust conflict/removal are checked at phone and desktop sizes. The final source/art fingerprint is `293e4ab0fe9f34413ac4ebbc86b22aa7547c157629e286ca68209573c2feca27`; report: `output/playwright/story-table-results.json`.
- `test:journey:v2`: **43 checks, zero errors** in the pinned-version compatibility run. The test-only isolated catalog creates v2 rooms without altering the production creation contract. Report: `output/playwright/journey-results.json`.
- Narration: **144 WAV clips** checked across all 13 registered versions and eight voices, totaling **24,920,736 bytes**; ten library tests and **five real-WAV browser scenarios** pass. Runtime requests the selected voice's current passage. The retained catalog uses a 32 MiB artifact budget, with unchanged 350 KiB first-segment and 768 KiB per-clip limits. The browser harness holds model transport and mocks initialization; it does not measure live model inference.
- Final `npm run build` and `git diff --check` passed. The build retains its existing large-chunk advisory. Screenshots were inspected at 320/390px, including enlarged narrative text, both route choices, exact final cost and the visible Dust removal path.

Maintained commands are `test:story-table` (also `test:journey` / `test:expedition`) for v3 and `test:journey:v2` for pinned v2. Browser artifacts are in ignored `output/playwright/`. This work has not been deployed; hosted API/Realtime, physical phones and human enjoyment remain unverified.

For the first human test, ask a newcomer after their first result: “What is wrong here? What did your action change? What can you do because of it?” After departure, ask why that path was available. At the ending, ask which preparation changed what happened to the neighbours and what the party gave up. Record answers and replay interest; do not coach from the implementation. Include a solo newcomer, a pair, a late arrival and one player leaving before completion.

## Playing the whole round

The October 3 follow-up makes the interval between choosing and resolving part of the tabletop experience. It develops two testable ideas: seeing accepted moves helps friends coordinate a useful contribution, and optional physical play makes waiting more pleasant without pulling attention away from the next consequence. Neither idea has been established as enjoyable by automated checks.

Once the server accepts a move, the player's intention stays in the story area even while they browse another location. A saved move awaiting confirmation has a different label and keeps the exact retry path. Previous consequences are explicitly marked **Last round**. Teammates' accepted tokens sit beside their chosen targets, with quiet threads connecting them to their heroes. **Moves on the table** opens a read-only list of who is doing what and where. Inspecting an intention cannot change the prepared action. Free-form Spotlight proposals and signatures are excluded from the public presentation.

While preparing, the story area explains when a friend is covering the same shared fact, when a different preparation complements theirs, and when an accepted Gather or Finish makes this the last move here. First personal gifts can still matter even when a shared discovery overlaps. Redundant Spark dust is stopped before release. Battle previews use the same pure class calculation as the reducer: counter progress, good-release protection, strongest existing cover, healing and next-round openings. The short preview stays on the table; the full explanation is available through **Read the current situation**. These are contributions to the unresolved round, not promises of victory or final damage.

Confirmed discoveries receive a brief ink-stamp accent within the existing scene playback. It follows the accepted event's contact time, fast-forwards late snapshots, and shows a settled stamp with reduced motion. Placed counters are static because accepted moves have no authoritative arrival timestamp. No extra particles, sounds or result delays are added.

After placing a move, **Cheers**, **Thanks** and **Clever** use the existing shared reaction channel. **Flick a counter** opens an optional coaster toy: pull back to choose angle and strength, or use arrows and Enter/Space. The deterministic slide offers feedback about the shot; **Move coaster** supplies a different target. This toy has no score, streak, XP, inventory, persistence or server command. It cancels on blur/hidden state and closes at the phase or turn boundary, restoring focus to the persistent story. It cannot extend the round or hold up the party. The existing painted characters and token art remain the visual reference; the lane and counter are functional native graphics.

For human review, watch a pair coordinate without coaching: can the second player describe the first player's accepted intention and choose a useful complement? Ask a combat player what their selected move adds and whether another hero already supplies cover. During waiting, observe whether people prefer reading, reacting, browsing or flicking, and whether they notice the next story consequence without prompting. Enjoyment, distraction and replay interest need observation with people.

### Whole-round verification

- `rtk vitest run`: **821 unit/service tests passed**. The 14 round-guidance cases include 720 comparisons against the actual combat reducer across classes, stances, tokens, release boundaries and all three pinned Gemward versions. Fourteen presentation cases cover accepted/private fields and confirmed stamp timing; nine toy cases cover deterministic aiming and controller cancellation.
- `npm run test:story-table -- http://127.0.0.1:5206`: **87 browser checks, zero errors**, through the real isolated local handler. Both full paths and endings pass, along with accepted/pending presentation, exact retry/reload, cross-location inspection preserving a prepared move and item, duplicate Dust prevention, contextual combat previews, shared reactions and gameplay-state preservation. The optional toy passes keyboard/touch, held Enter, pointer cancellation, blur, reduced motion and automatic closing/focus restoration on a real resolving commit. A four-human scenario verifies three accepted counters on one target, unchanged hit areas and stable marker nodes across repeated reads.
- Visually inspected 320/390px and desktop waiting states, intention drawers, toy, combat and stamp captures. The compact waiting view keeps the moves link, four-token hand and reactions visible. Crowded counters sit outside the painting and label. Final source/art fingerprint: `e1478d2c534661a06f466f4e2aeb215f87154b4d561202d4a35bd0eba6637b4f`. The latest evidence replaces `output/playwright/story-table-results.json`; companion screenshots and `story-table-run.log` are in the same ignored directory.
- TypeScript, final production build and diff checks pass. The existing large-chunk build advisory remains. This pass adds no generated raster assets, authored story content, persisted fields, rewards or hosted writes.

The local preview at port 5206 also reports the local backend. These checks do not establish deployed API/Realtime behaviour, physical-device accessibility or human enjoyment.
