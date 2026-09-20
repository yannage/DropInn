# Choose the affected scenario

## Two players and a shared turn

Create an isolated private table with A and join B using the full invitation. Confirm B is pending, cross a turn boundary with A, and confirm two human seats. Select currently valid actions using the scene; do not assume a target retains its old tokens after a development. Capture command responses for both submissions. Verify both commits resolve once and both clients converge on that resolved turn. For teamwork, use different human tokens on the same compatible target and inspect each result's capped bonus.

Existing anchors: `server/dropinn.test.ts`, `src/lib/dropinn/teamwork.test.ts`, `src/lib/dropinn/engine.test.ts`.

## Interruption, reload, retry, and rejoin

1. Establish A and B in an isolated table; record character IDs, table code, turn, and cumulative participant XP/actions/keepsakes.
2. Interrupt A's room reads using a removable route handler; reload while the API is unavailable. Check saved table retention and connection feedback. B should remain functional.
3. Remove the failure handler and trigger retry/network return. Check A recovers the same identity/table and clears background connection errors without clearing an unrelated action error.
4. Separately test uncertain delivery: allow an A action to reach the server but suppress its response. Retry the pending action with the original command ID. Compare cumulative rewards/action count before and after duplicate delivery, avoiding an intervening new resolution.
5. Leave and rejoin; check pinned identity and preserved contributions. Complete/leave QA seats through the UI, and close owned contexts in `finally`.

Distinguish aborted-before-send from response-lost-after-commit. A transport abort alone does not establish exactly-once server behavior. Realtime checks must observe subscription delivery separately from fallback polling; use test instrumentation rather than disabling a production recovery mechanism.

Existing anchors: `src/store/adventureStore.test.ts` and `.hosted.test.ts`. Physical airplane-mode/phone-keyboard tests remain a separate human check.

## Hero lifecycle

Create a hero; choose current catalog IDs/labels, a color, face parts, and explicit no-hat. Save/reload and compare persisted values. Cancel a subsequent draft and confirm saved values remain unchanged. Fail one save and confirm the editor retains the draft and reports failure; retry successfully. Verify admission/rejoin preserves pinned appearance and normalized power. For reward-related changes, test an old hero with missing fields and a returning hero with keepsakes: unlock once, never auto-equip, preserve concurrent reward updates.

Use `src/lib/cosmetics.test.ts`, `src/lib/supabase/characters.test.ts`, and hosted store tests. Test injection into the local store establishes UI behavior only, not PostgREST/RLS behavior.

## Mobile interaction and accessibility

Use desktop plus 390px and, for crowded layouts, 320px. Verify valid/invalid touch drop, tap and keyboard alternatives, confirmation, selection marks, and horizontal overflow. For dialogs: tab order, focus trap/return, Escape, Save, Cancel. Check reduced motion and small-avatar readability when changed. Desktop emulation does not verify a physical on-screen keyboard.

## Private invitations

Verify private tables are absent from discovery/matching, code-only joins fail for new members, full invitations work, previous members can return, and stale seats are reclaimed at the correct boundary. Do not expose full invitation URLs in screenshots or reports.
