# Player clarity

Status: implemented presentation; current local verification is tracked in [NEXT.md](../NEXT.md). Hosted and human comprehension checks remain separate. This pass changes hierarchy and guidance, not authored adventures, server rules or reward contracts.

## Intended behavior

The landing leads with a handmade invitation, a ready hero and one main Play action. The selected story appears as an illustrated postcard with its existing authored pitch and a Change story control; the four round steps follow the entrance. On phones, Play and Play with friends remain in the first viewport, while the postcard and round explanation are reached by scrolling. The illustration stays visible on mobile. Story Pass progress, public tables, collection goals and optional services sit below the entrance.

The last selected story is remembered in this browser and checked against the current registry; unavailable IDs or blocked storage fall back safely. Story selection does not begin play; the friends dialog separates starting a private table from entering an invitation. Landing motion is limited to a brief entrance and button feedback, and respects reduced motion.

During play, the shared goal explains why to act and the contextual dock explains what to do now. Inspecting a target shows authored moves; preparing a move reveals the hold/release control and its effect. Committed, uncertain, joining and resolving states explain why the player is waiting. **Show tokens** preserves the existing token-first shortcut. Recorded personal consequences connect the move to the party's result before the next round begins.

First-move teaching is optional and remembered in this browser. Suggested targets invite inspection without selecting an action; both routes receive equal treatment at branch choices. Teaching ends after a recorded personal contribution result or dismissal and can be replayed from action help. Persistent state guidance remains afterward.

## Mobile tabletop composition — October 2

The mobile table now reserves room for the scene before adding explanatory copy. Four pieces sit in a stable two-by-two arrangement, with artwork above a wrapping nameplate and separate room for shared state and teammate tokens. A selected nameplate uses one green edge and a small pin; keyboard focus remains visible over the full interaction target. Selecting a piece does not move its name.

Landscape uses artwork beside each nameplate and a compact hero row, keeping long developed-state captions inside their own piece. A short portrait scene also gives pieces with accepted teammate plans a side-by-side art/name layout, with a full-width party row below; a state badge plus party markers must not squeeze out the illustration. Short portrait screens use a smaller token hand and retain the combination's actionable prompt without a second decorative heading.

Prepared actions put the move and current odds above the approach cards, followed by one row containing hold/release, Roll now and Assist timing. Repeated instructions and arithmetic no longer take a second block above these controls; approach effects stay visible and Action details retains the full rules and support breakdown. The scene and all four heroes stay available while choosing, waiting and resolving.

On phones, confirmed personal dice and the current consequence occupy their own result tray below the scene. Inspecting a piece during playback keeps that result mounted. Round scroll and readiness controls remain reachable. Healing and damage badges sit over the portrait without covering the hero's name or current HP. An unresolved enemy strike shows an ellipsis until its recorded damage is known.

Short phones use a temporary subtitle peek beside the goal, with separate 44px voice and settings controls. The peek does not change the saved subtitle preference or restart narration. The live parchment still opens after on-table consequences, uses the same narrator, and respects View scene for that round. Gameplay, timing, saved commands and reward rules are unchanged.

Verification for this pass uses the local working tree based on `e6bcb59`, with a local Vite app at `127.0.0.1:5201`. The maintained composition runner uses explicitly controlled reducer fixtures and frozen presentation timestamps; scene and cooperation runners separately exercise independent browser identities through isolated real local command handlers. Hosted persistence, Realtime and physical-phone behavior are not established by these checks.

- All 652 unit tests and the production build passed.
- `test:mobile-composition` passed 98 presentation checks across 320×568, 390×700, 390×844, 412×780 and 1280×800 with zero violations or runtime errors and unchanged source throughout capture. In the 320×568 prepared-combat cases, the scene occupies 253px and the action dock 154px. River/chapel screenshots were visually reviewed, including recorded healing and damage together.
- A subsequent `test:mobile-composition -- --cooperation-only` run passed 25 checks against the final crowded-piece, compact ally-plan and selected-coin refinements. It verified at least 36px artwork, contained captions and party markers, coins clear of names, and no unexpected commits, store errors or visible alerts. Both composition reports retain their own source fingerprints.
- `test:scene` passed 102 checks, including 67 layouts, with zero browser errors or external calls. It covers admission, actual timed turns, exact uncertain-command retries, reconnects, narrated results, and developed river/chapel layouts at 844×390 and 740×360. The final focused composition run separately covers the coin adjustment made during this integration run.
- `test:chapter-choices` passed 110 checks, including every authored choice, enlarged text, three committed teammates, long names, confirmed consequences, recovery and reload. `test:cooperation` passed 14 checks through independent local browser identities, including updated teamwork odds, recorded credit and reload. The narrator-only scene run passed five speech/worker/fallback/subtitle checks, including small-phone settings. Browser runners made no external handler calls.

The new report is `output/playwright/composition-current-results.json`; screenshots and other browser reports remain local ignored artifacts. Player comprehension, one-handed use and enjoyment still need observation on real phones.

## Earlier responsive presentation

The October 1 landing refresh was checked locally at 320×568, 390×844, 412×844 and 1280×900 with the maintained mobile flow suite, including story/friend dialogs, keyboard focus, hero save/reload and entry into play. Desktop and phone screenshots were inspected; 150% text enlargement at 390px retained horizontal containment. The production build, two scene-art tests and asset integrity checks passed. These checks do not establish hosted or physical-phone behavior.

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
