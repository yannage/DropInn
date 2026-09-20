# Choose the affected scenario

For the maintained local scene integration run, start Vite (`npm run dev -- --host localhost --port 5198 --strictPort`), then run `npm run test:scene` or `npm run test:scene -- --base-url http://127.0.0.1:5198` to match its origin. The runner requires installed Playwright Chromium, accepts HTTP loopback origins only, intercepts the API with an isolated real local handler, advances its injected clock between scenarios, and blocks other browser origins. It covers two-player admission, three chapters, timing/Protect/Spotlight, interrupted delivery and reload, drag/focus/deadline behavior, and 390×844/320×568 layout. Reports and screenshots go to ignored `output/playwright/`; this is local browser evidence, not hosted persistence, Realtime, physical-phone, or live-model verification.

## Two players and a shared turn

Create an isolated private table with A and join B using the full invitation. Confirm B can inspect the scene while pending, cross a turn boundary with A, and confirm two human seats. Place currently valid tokens on illustrated targets; do not assume a developed target retains its old tokens. Use the stable bottom dock to inspect and commit; exact check details live in a drawer. Capture command responses for both submissions. Verify both commits resolve once and both clients converge on that resolved turn. For teamwork, use different human tokens on the same compatible scene target and inspect each result's capped bonus; hero-target Protect is a distinct target kind.

Verify both players see simultaneous target/hero effects during the existing six-second reveal. The personal result shows the authoritative die or a shield for guaranteed Protect, and a short consequence. Story keeps complete results after the animation. Check all three chapters: developed Mara, gate, tracks, herd, boat, reeds, ferryman, ward, bell and captives keep accurate artwork instead of disappearing or reverting.

Existing anchors: `server/dropinn.test.ts`, `src/lib/dropinn/teamwork.test.ts`, `src/lib/dropinn/engine.test.ts`.

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

Use desktop plus exactly 390×844 and 320×568. After joining, inspect all four scene targets and the threatened hero, select a compatible action, open/close details and commit without document scrolling. Confirm scene objects/hero targets and commitment controls are at least 44px, and the dock stays in place when targets change. Verify valid/invalid touch drop, tap and keyboard alternatives, selection marks and no horizontal clipping. Optional drawers may scroll; normal play should not.

Check Story, Party, Chat, Invite, action details and Spotlight drawers for tab order, focus trap/return and Escape. Enlarge text/zoom: allow reflow and scrolling where needed instead of hiding content. Reduced motion must keep target changes and results understandable; the journal remains readable after animations. Check all ten developed-state objects and small avatars. Desktop emulation does not verify a physical on-screen keyboard; record that separately.

Human acceptance is separate from automation: ask newcomers and experienced players who is threatened, what their token will do, and what changed after resolution without opening Story. Record first meaningful action time, unnecessary scrolling and whether Protect's tradeoff with objective progress is understood.

## Private invitations

Verify private tables are absent from discovery/matching, code-only joins fail for new members, full invitations work, previous members can return, and stale seats are reclaimed at the correct boundary. Do not expose full invitation URLs in screenshots or reports.

## Selectable stories and irreversible routes

Run `npm run test:adventures -- http://127.0.0.1:5198` with Vite running. This isolates the real local command handler, disables external calls and controls the shared clock. Its Vite SSR loader uses a separate dependency cache so it cannot invalidate the preview server's optimized modules. Use `STORY_ID` to focus one story during debugging; unset it for the complete report.

For Teacup, Tomorrow and Orchard, create a private table, admit a second browser, complete all three chapters and reconnect in chapter two. At 390×844 and 320×568 verify four loaded scene cutouts, 44px targets, no document overflow, route preview before committing Help and the retained journal ending. Verify both routes, tied/no-input fallbacks, downed/departing voters, duplicate receipts and solo companion completion in `adventures.test.ts`. Matchmaking must never mix adventure IDs or versions; old snapshots retain Briar Glen.

Human review: ask both players what each route sacrifices before they commit; ask late arrivals what was spent afterward. Confirm Tomorrow spends only a breakfast routine, Teacup never restores the sacrificed sail/ship, and Orchard's fallback is a small spillway. A passed automated completion does not establish narrative comprehension or pacing quality.
