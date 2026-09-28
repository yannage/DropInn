# Player clarity

Status: implemented presentation; current local verification is tracked in [NEXT.md](../NEXT.md). Hosted and human comprehension checks remain separate. This pass changes hierarchy and guidance, not authored adventures, server rules or reward contracts.

## Intended behavior

The landing answers what the game is and how a round works before asking the player to start. A ready hero and selected story support one main Play action, with that story's existing authored pitch visible at the entrance. The last selected story is remembered in this browser and checked against the current registry; unavailable IDs or blocked storage fall back safely. Story selection does not begin play; the friends dialog separates starting a private table from entering an invitation. Public tables, collection goals and optional services sit below the entrance.

During play, the shared goal explains why to act and the contextual dock explains what to do now. Inspecting a target shows authored moves; preparing a move reveals the hold/release control and its effect. Committed, uncertain, joining and resolving states explain why the player is waiting. **Show tokens** preserves the existing token-first shortcut. Recorded personal consequences connect the move to the party's result before the next round begins.

First-move teaching is optional and remembered in this browser. Suggested targets invite inspection without selecting an action; both routes receive equal treatment at branch choices. Teaching ends after a recorded personal contribution result or dismissal and can be replayed from action help. Persistent state guidance remains afterward.

## Responsive presentation

The follow-up presentation is implemented and locally verified. Its evidence is recorded separately from the initial onboarding pass below.

- Short scene areas use a two-by-two grid of compact illustrated cards, keeping each target's artwork beside its label. Larger scenes retain their spatial arrangement.
- Focused encounters place the hero, target, context and stakes in a grid that responds to the available stage area. Approach buttons keep their effects visible on phones, using the existing multiplayer-scaled values; the full description remains in accessible labels and the prepared-move preview.
- Wide landscape screens place the action dock beside the scene. The dock can scroll when needed, and compact Story stays over the scene. Smaller effective viewports retain accessible reflow.
- When recorded effects are available, results show personal benefit badges and narrative changes above the party ledger; older results retain their saved sentence. A fixed **Next round** or **Next chapter** control stays outside the scrolling results: it reveals all results and records the existing readiness vote. Everyone being ready can advance early; the server timer still advances the table. Complete results remain in Last round.

## Responsive pass verification

Verified on 2026-09-27 against working-tree changes based on `59f7d31`, using the existing local Vite app at `127.0.0.1:5198` and isolated local command handlers. No server mechanics, hosted data or inference changed.

- **82 focused tests and the production build passed.** These cover guidance, approaches, timed release, recorded results, reveal pacing, story history and uncertain-command recovery.
- **The expanded scene suite passed 96 checks across 62 layout cases**, with zero browser errors or external calls. It includes 320×568, 390×844, 1280×900, 844×390 landscape and the 740×360 landscape boundary; visible approach effects, actor/card/control separation, full target hit areas, fixed readiness while reading, compact/full Story, two- and four-player turns, all three Briar Glen chapters, and exact-action retry/reload. The prepared and pending instructions reserve the same space so receipt checking does not move the encounter.
- **Mobile and adventure suites passed.** Entry controls, customization and drawers work at the maintained four sizes. All three additional adventures complete with their route choices and reconnects; Story reading position and focus behavior remain intact.
- **Additional local presentation checks passed.** All four story pitches and entry controls fit at 320/390/1280 widths. Story choice survives reload and returning from a table; invalid IDs and blocked storage fall back safely. Compact encounters retain multiplayer-scaled effects and larger artwork; ordinary and chapter-ending results remain reachable inside the dock.

Evidence: `output/playwright/scene-integration-results.json`, `scene-loop-pass.log`, `experience-*-run.log`, `experience-build.log`, `continuity-results.json`, `integration-*.png`, `clarity-focus-*.png` and `clarity-final-*.png`. These are local browser and reducer-fixture results. Physical-device use, hosted Realtime and uncoached comprehension/enjoyment still need the human checks below.

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
