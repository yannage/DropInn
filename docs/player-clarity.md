# Player clarity

Status: implemented presentation; current local verification is tracked in [NEXT.md](../NEXT.md). Hosted and human comprehension checks remain separate. This pass changes hierarchy and guidance, not authored adventures, server rules or reward contracts.

## Intended behavior

The landing answers what the game is and how a round works before asking the player to start. A ready hero and selected story support one main Play action. Story selection does not begin play; the friends dialog separates starting a private table from entering an invitation. Public tables, collection goals and optional services sit below the entrance.

During play, the shared goal explains why to act and the contextual dock explains what to do now. Inspecting a target shows authored moves; preparing a move reveals the hold/release control and its effect. Committed, uncertain, joining and resolving states explain why the player is waiting. **Show tokens** preserves the existing token-first shortcut. Recorded personal consequences connect the move to the party's result before the next round begins.

First-move teaching is optional and remembered in this browser. Suggested targets invite inspection without selecting an action; both routes receive equal treatment at branch choices. Teaching ends after a recorded personal contribution result or dismissal and can be replayed from action help. Persistent state guidance remains afterward.

## Local verification

Verified on 2026-09-27 against working-tree changes based on `8f456d4`, using the local Vite app at `127.0.0.1:5198`. Browser integration suites use isolated real local handlers and controlled clocks, with backend identity checked in responses. No hosted writes or live inference were used.

- **85 focused tests and production build passed.** Coverage includes guidance state precedence, legal suggestions and neutral route choices, contextual action labels, departing-recipient restrictions, timed-release cancellation/deadlines, approaches, scene projection, recorded summaries and store recovery.
- **Scene integration passed.** Two-player admission and three Briar Glen chapters, inspect without submitting, contextual Protect/Mend, optional token dragging, guide completion/replay, exact receipt retries after response loss/reload, keyboard cancellation, Spotlight confirmation, missed deadlines, four-player result skipping, narrator controls and completed adventure presentation. Separate client-snapshot cases cover downed/departing heroes and older result formats.
- **Mobile suite passed at 320×568, 390×844, 412×844 and 1280×900.** Essential landing explanation and entry controls fit, all four story selections update the Play action without starting, and hero customization, friend/story dialogs, focus restoration and adventure drawers remain usable. Additional scene checks cover short/tall viewports and enlarged-text reflow.
- **Adventure and collection suites passed.** All three additional adventures reached their ending with route choices and reconnects; rewards, collection links, crafting and saved appearance retained their existing behavior.
- **Result containment checked separately at both phone sizes.** Ordinary and chapter-ending results scroll inside the dock, keep the instruction visible, and let the player reach the last result and reward without content crossing the toolbar. The initial 320px recommendation also remains visible. These are local reducer-backed presentation fixtures, not additional service or hosted evidence.

Evidence is in ignored `output/playwright/`: `scene-integration-results.json`, `clarity-*-run.log`, `clarity-build.log`, `mobile-lobby-*.png`, `integration-*.png`, `clarity-final-*.png`, and `clarity-lobby-desktop.png`. The maintained browser scripts now follow the story/friend dialogs and optional token hand. Local browser checks do not establish hosted Realtime, physical-device behavior, screen-reader usability or newcomer comprehension.

## Uncoached player checks

Start with a fresh browser profile and give no explanation beyond “try the game.” Ask players to think aloud; record assistance and hesitation before offering help.

| Moment | Observe or ask |
| --- | --- |
| Landing | Can the player describe the cooperative activity, use the ready hero and predict what Play will do? |
| First scene | Can they name the shared goal, inspect a target and explain how their chosen move could help? |
| Commitment | Do they understand that choosing a move prepares it, holding/releasing commits it, and ordinary moves still work without the timing bonus? |
| Waiting | Can they distinguish joining next round, checking delivery, waiting for teammates and watching results? |
| Consequence | Can they describe what their move changed and how it relates to the shared goal without opening the journal? |
| Next visit | Can a returning player act without teaching, find Show tokens, replay help and start or join a friend table? |

Time page arrival to the first resolved contribution and seat admission to that contribution separately. Record missed turns, repeated clicks during waiting, opened help, scrolling and any facilitator instruction. Acceptance target: at least four of five uncoached newcomers can explain the activity, enter with the ready hero, commit within their first full choosing window, recognize when they are waiting, and explain one resulting change. This target has not yet been evaluated with people.

Include 320×568 and 390×844 layouts, keyboard/reduced-motion play, real phones, a mid-round arrival and a route choice. Testers should not infer a preferred route from the tutorial. Automated checks establish interface behavior and layout; they do not replace these observations.
