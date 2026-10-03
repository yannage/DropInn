# Choose the affected scenario

For the maintained local scene integration run, start Vite (`npm run dev -- --host localhost --port 5198 --strictPort`), then run `npm run test:scene` or `npm run test:scene -- --base-url http://127.0.0.1:5198` to match its origin. The runner requires installed Playwright Chromium, accepts HTTP loopback origins only, intercepts the API with an isolated real local handler, advances its injected clock between scenarios, and blocks other browser origins. It covers two-player admission, three chapters, timing/Protect/Spotlight, interrupted delivery and reload, drag/focus/deadline behavior, and 390×844/320×568 layout. Reports and screenshots go to ignored `output/playwright/`; this is local browser evidence, not hosted persistence, Realtime, physical-phone, or live-model verification.

## Two players and a shared turn

Create an isolated private table with A and join B using the full invitation. Confirm B can inspect the scene while pending, cross a turn boundary with A, and confirm two human seats. Place currently valid tokens on illustrated targets; do not assume a developed target retains its old tokens. Use the stable bottom dock to inspect and commit; exact check details live in a drawer. Capture command responses for both submissions. Verify both commits resolve once and both clients converge on that resolved turn. For teamwork, use different human tokens on the same compatible scene target and inspect each result's capped bonus; hero-target Protect is a distinct target kind.

Verify both players see simultaneous target/hero effects during the up-to-ten-second reveal. The personal result shows the authoritative die or a shield for guaranteed Protect, followed by paced recorded actions and consequences. Skip shows the complete recap immediately; the next turn begins early only after every seated human skips. Story keeps complete results afterward. Check all three chapters: developed Mara, gate, tracks, herd, boat, reeds, ferryman, ward, bell and captives keep accurate artwork instead of disappearing or reverting.

Existing anchors: `server/dropinn.test.ts`, `src/lib/dropinn/teamwork.test.ts`, `src/lib/dropinn/engine.test.ts`.

## Cooperation and risk previews

Run `npm run test:cooperation -- --base-url http://127.0.0.1:5201` against a local Vite server. It creates two named humans through an isolated real local handler and advances that handler's injected clock. The first hero prepares an opening, then commits a risky payoff; the second sees the accepted plan before choosing maintenance or a shared payoff. Check both screens, ordinary XP, named preparation/payoff credit, saved history and same-identity reload. Inspect an unrelated target after committing to ensure a retained selection cannot supply its cooperation hint. A later different-token action on the same target must increase current teamwork odds before the second commitment.

The runner separately labels client-clock expiry probes and held outbound delivery, verifying that fresh odds disappear while pending, committed or expired. It checks 320×568, 390×844 and desktop bounds with four scene targets, hero targets and reachable release controls. `test:chapter-choices` complements this with controlled three-teammate fixtures, long names, overlapping preparation/rescue/banking and final-turn preparation. Reports live in `output/playwright/cooperation-results.json` and `chapter-choices-results.json`. These establish local handler/browser behavior and controlled presentation, not hosted persistence, Realtime or human comprehension.

## Interruption, reload, retry, and rejoin

1. Establish A and B in an isolated table; record character IDs, table code, turn, and cumulative participant XP/actions/keepsakes.
2. Interrupt A's room reads using a removable route handler; reload while the API is unavailable. Check saved table retention and connection feedback. B should remain functional.
3. Remove the failure handler and trigger retry/network return. Check A recovers the same identity/table and clears background connection errors without clearing an unrelated action error.
4. Separately test uncertain delivery: allow A's timed action to reach the server but suppress its response. Record its command ID, turn, target kind/ID, token and release duration. Reload while room reads also fail, then restore reads. If synchronization confirms the commit/receipt/reveal/new turn, the pending move clears. If still unresolved in the same choosing turn, Retry move must send the same action and command ID; another timing attempt or target change is blocked. Compare cumulative rewards/action count before and after duplicate delivery, avoiding an intervening new resolution.
5. Leave and rejoin; check pinned identity and preserved contributions. Complete/leave QA seats through the UI, and close owned contexts in `finally`.

Distinguish aborted-before-send from response-lost-after-commit. A transport abort alone does not establish exactly-once server behavior. Realtime checks must observe subscription delivery separately from fallback polling; use test instrumentation rather than disabling a production recovery mechanism.

Existing anchors: `src/store/adventureStore.test.ts` and `.hosted.test.ts`. Physical airplane-mode/phone-keyboard tests remain a separate human check.

## Announced combat and Protect

Reach the river through normal local/service play, or use a clearly labeled reducer fixture for targeted UI checks. Capture `enemyIntent` when choosing starts: turn, source, target actor and base damage. Prefer healthy human victims, with healthy companions as fallback when all humans are down. Confirm the wind-up, threatened hero and damage pips agree across both clients.

1. Put Help on the threatened hero and confirm the dock says Protect; another token or hero must not be accepted. Compare this with Help on a scene object, which keeps its class effect and objective progress.
2. Commit normal Protect (2) and good-release Protect (3). Each contributes no objective progress, claims 3 XP, has `contribution: true` and a structured protection result without a fabricated roll. A downed hero can perform the same action.
3. With multiple humans, combine a successful cover action and multiple Protect moves. The strongest Protect/party cover applies, never their sum. Existing missed-input defense is separate. Reverse commit arrival order and compare resulting events/rewards at the same clock/revision boundary.
4. Have the announced victim leave before committing while another human remains. Retain the victim through that turn's resolution and never redirect the strike. Finish committed work once if everyone leaves; an empty uncommitted room releases seats and parks without unattended progress.
5. Finish a chapter with a Protect-only contributor. Confirm ordinary chapter XP/keepsake eligibility, personal recap and later history, including after departure; replay receipts cannot duplicate rewards.
6. Load a local test snapshot with no intent/results metadata. Its existing choosing turn remains readable; Protect is unavailable until a newly announced intent at the next choosing boundary. Old omitted target kind means scene and old omitted duration means no execution bonus. New optional fields use existing JSON persistence, so no migration is required.

Use focused `engine.test.ts`, `server/dropinn.test.ts` and `teamwork.test.ts` evidence for determinism/validation. A browser fixture alone is not a hosted persistence result.

## Timed commitment and Spotlight

After selecting a valid target, hold the fixed die control: a 1.2-second marker crosses an inclusive 650–950ms sweet spot. Good release grants +1 modifier (or extra Protect point); a missed/omitted duration is the ordinary move. Test below/at/above both boundaries in the deterministic controller/reducer tests, and ordinary plus assisted execution in the browser. Roll now skips timing. Holding through 1200ms submits once without bonus. Canceling a pointer gesture submits nothing; canceling or changing turn cannot leak a deferred commit into the next turn.

Test tap, pointer and keyboard hold/release, focus loss/cancellation, the assisted-release preference, and reduced motion. Selection cannot change mid-hold. Start just before turn expiry: the control and server must honor the existing deadline, without extending it. Duration is bounded integer client input, not anti-cheat proof of dexterity; assisted input intentionally receives the same maximum bonus.

In Spotlight, preview a supported current idea in its drawer, inspect the signed effect, and send it to the same dock. The preview alone spends nothing; release confirms it once. Repeat with expired/unsupported proposals, downed/spent states and an uncertain response. Preserve the signed proposal and duration on retries rather than requesting an unreviewed substitute.

Existing anchors: `src/components/DropInn/TimedRelease.test.tsx`, `src/lib/dropinn/engine.test.ts`, `server/dropinn.test.ts`, and `src/store/adventureStore.test.ts`.

## Hero lifecycle

Create a hero; choose current catalog IDs/labels, a color, face parts, and explicit no-hat. Save/reload and compare persisted values. Cancel a subsequent draft and confirm saved values remain unchanged. Fail one save and confirm the editor retains the draft and reports failure; retry successfully. Verify admission/rejoin preserves pinned appearance and normalized power. For reward-related changes, test an old hero with missing fields and a returning hero with keepsakes: unlock once, never auto-equip, preserve concurrent reward updates.

Use `src/lib/cosmetics.test.ts`, `src/lib/supabase/characters.test.ts`, and hosted store tests. Test injection into the local store establishes UI behavior only, not PostgREST/RLS behavior.

## Mobile interaction and accessibility

For the active tabletop, run `npm run test:mobile-composition -- --base-url http://127.0.0.1:5201`. This is a controlled presentation check, complementary to the real-handler scene/cooperation runners. It creates an initial table through the UI, then uses real reducer outcomes with frozen presentation timestamps for two/four-human fixtures. It covers 320×568, 390×700, 390×844, 412×780 and 1280×800 through attack, guarded selection, holding, waiting, rolling, result and settled states in the river and chapel, plus long teammate names and developed labels. Source fingerprints at the start and end reject a capture taken during source changes.

The runner checks four targets/four heroes, 44px hit areas, loaded art, wrapping labels inside their backing, labels clear of adjacent art and heroes, release controls clear of copy, and dedicated mobile dice space. Recorded healing-plus-damage fixtures must leave names/current HP readable. At 320px, verify subtitle peek and settings bounds and ensure inspecting a piece during personal dice playback retains both the dice and consequence. `--badges-only` runs the focused badge/settings/inspection checks without overwriting the full report. Evidence goes to `output/playwright/composition-current-results.json` and companion screenshots. `--baseline` records violations without failing; do not use it as an acceptance run or compare captures made while source was changing.

Use `--cooperation-only` for the 25-frame crowded-party matrix: an accepted teammate plan while choosing, four-human waiting, and a developed ward with Ready plus three helpers at all five sizes. It checks 36px artwork, caption/party-row containment and separation, and writes its own cooperation report. Normal fixture captures reject store errors, visible alerts and unexpected action requests; cancel the held release on the actual button with `pointercancel` before publishing a new room fixture.

For the lobby, hero editor and drawers, run `npm run test:mobile -- http://127.0.0.1:5198` against the local Vite server. It uses an isolated real handler, a fixed turn clock, phone/touch emulation at 320×568, 390×844 and 412×844, plus a desktop comparison. It checks the story scroller, first-screen shortcuts, hero save/reload, hats, help/account panels, five adventure drawers, and reaching a submit control with a reduced viewport. Screenshots wait for visible images to decode and mask invitation links. Reduced viewport space is not proof of physical keyboard behavior. Use the scene and adventure runners separately for timed play and story completion.

Use desktop plus exactly 390×844 and 320×568. After joining, inspect all four scene targets and the threatened hero, select a compatible action, open/close details and commit without document scrolling. Confirm scene objects/hero targets and commitment controls are at least 44px, and the dock stays in place when targets change. Verify valid/invalid touch drop, tap and keyboard alternatives, selection marks and no horizontal clipping. Optional drawers may scroll; normal play should not.

Check Story, Party, Chat, Invite, action details and Spotlight drawers for tab order, focus trap/return and Escape. Enlarge text/zoom: allow reflow and scrolling where needed instead of hiding content. Reduced motion must keep target changes and results understandable; the journal remains readable after animations. Check all ten developed-state objects and small avatars. Desktop emulation does not verify a physical on-screen keyboard; record that separately.

Human acceptance is separate from automation: ask newcomers and experienced players who is threatened, what their token will do, and what changed after resolution without opening Story. Record first meaningful action time, unnecessary scrolling and whether Protect's tradeoff with objective progress is understood.

Story now opens from the top-left cylinder. Check collapsed → compact → full and Escape back through both states. Compact is nonmodal and must stop above the action dock; full traps focus and makes the app background inert. Check at desktop and both phone sizes, with reduced motion and enlarged text. `scripts/check-story-scroll.mjs`, called by the adventure runner, verifies mode sizing, details/reading-position preservation, suspension for Party and real teammate results arriving while reading earlier entries. New events must offer a jump without moving the reader; story reading never pauses the server timer. Do not expect the removed bottom Story button or the old immediate modal opening.

## Private invitations

Verify private tables are absent from discovery/matching, code-only joins fail for new members, full invitations work, previous members can return, and stale seats are reclaimed at the correct boundary. Do not expose full invitation URLs in screenshots or reports.

## Selectable stories and irreversible routes

### Gemward v2 branching journey

Run `npm run test:journey -- http://127.0.0.1:5203` with Vite running. `test:expedition` also runs the current journey check; the older expedition runner describes the pinned v1 interface. The v2 runner uses independent browser identities, the real isolated local command handler, and a controlled shared clock, without injecting gameplay snapshots.

Check town exploration at separate local places, both route votes, warehouse combat and quiet canal recovery, and both finale destinations. Inspecting a map node must not send a command; confirming the route must. Ordinary reveals stay in the scene. Journey opens at the chapter boundary and records the actual trail, discovery sources, chapter highlights and the lasting finale cost. The shared quest pouch must agree on both screens and survive a reload; the prism stays held on arrival and is consumed only when restoration completes.

Interrupt a travel vote after server acceptance, suppress reads, and reload. The uncertain vote must keep its exact command ID, decision, edge and turn. Restore reads and compare command receipts and rewards; no travel decision earns action XP or chapter credit. Reducer/service tests separately cover tied and absent votes, frozen eligibility, departures, late admission and parked travel. Inspect shop, map, encounter and completion captures at 320×568, 390×844 and desktop. Verify keyboard selection and explicit release, four tokens, loaded artwork and 44px controls. Save the local report in `output/playwright/journey-results.json`; do not describe it as hosted persistence, Realtime or physical-phone evidence.

The journey runner also checks the painted discovery and encounter atlases against recorded result windows. Drafts, repeated synchronization and reload must not replay them. Reduced motion must preserve discovery receipts and battle progress. Keep source and artwork stable while capturing: the runner fingerprints both.

### Painted loading and event frames

Run `npm run test:flipbooks` against local Vite on port 5204, or set `FLIPBOOK_TEST_URL` to another HTTP loopback origin. The runner holds the actual lazy game module to inspect its Suspense loading state, then releases it; it does not add a production delay. Verify eight discrete cell positions, a readable poster at 320/390px with reduced motion, hidden-tab recovery, no stale one-shot replay after delayed loading, and static fallback when the atlas request fails. Evidence is `output/playwright/flipbook-loading.json`. Use the journey runner separately for actual confirmed event integration.

### Earlier authored adventures

Run `npm run test:adventures -- http://127.0.0.1:5198` with Vite running. This isolates the real local command handler, disables external calls and controls the shared clock. Its Vite SSR loader uses a separate dependency cache so it cannot invalidate the preview server's optimized modules. Use `STORY_ID` to focus one story during debugging; unset it for the complete report.

For Teacup, Tomorrow and Orchard, create a private table, admit a second browser, complete all three chapters and reconnect in chapter two. At 390×844 and 320×568 verify four loaded scene cutouts, 44px targets, no document overflow, route preview before committing Help and the retained journal ending. Verify both routes, tied/no-input fallbacks, downed/departing voters, duplicate receipts and solo companion completion in `adventures.test.ts`. Matchmaking must never mix adventure IDs or versions; old snapshots retain Briar Glen.

Human review: ask both players what each route sacrifices before they commit; ask late arrivals what was spent afterward. Confirm Tomorrow spends only a breakfast routine, Teacup never restores the sacrificed sail/ship, and Orchard's fallback is a small spillway. A passed automated completion does not establish narrative comprehension or pacing quality.
