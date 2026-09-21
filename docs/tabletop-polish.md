# Illustrated tabletop and action feedback

This presentation iteration gives DropInn's existing explore → prepare → commit → party payoff loop physical objects and stronger consequences. It keeps the authored adventures, action rules, 30-second choices and six-second results unchanged. The visual intent takes cues from readable card-game hands and staged score reveals; it does not copy another game's assets or introduce its mechanics.

## Card direction revision

The first painted border looked noisy when repeated and stretched across broad panels. The current UI uses clean cream cardstock, a fine warm outline, small color accents and a restrained paper-edge shadow. Illustrated tokens, journal and dice cup carry the hand-painted character; quiet structural frames let them read. The generated frame is retained as a source experiment, but is no longer loaded by the interface. Press/lift feedback remains.

## Art resources

Four original assets were generated with Codex's built-in `image_gen`, one per call, using DropInn's primitive MS Paint direction. Source PNGs and lossless WebP runtime copies are in `public/art/`:

| Asset | Used for |
| --- | --- |
| `ui-card-frame-v1` | Retained source experiment; superseded by clean native cardstock frames |
| `ui-spotlight-charm-v1` | Spotlight hand/context controls and placed coin |
| `ui-journal-v1` | Party recap and Last round affordance |
| `ui-dice-cup-v1` | Preparing a selected action and entering an adventure |

Clean native frames scale without distorting the outline. Labels, arithmetic, focus outlines and input remain HTML. Functional back, close, mute and accessibility controls retain familiar symbols. Failed illustrations keep an icon fallback. Existing authored keepsake images accompany actual earned chapter rewards; missing keepsake art keeps the named fallback.

Exact prompts and source filenames: `.agents/skills/dropinn-art/references/ui-tabletop-prompts.json`. Inventory records hashes, dimensions, review status and runtime provenance. `encode-ui-art.py` preserves every RGBA pixel and original canvas; it performs format conversion only. `review-ui-art.mjs` generates paper/felt thumbnail and nine-slice examples.

## Feedback and motivation

| Player need | Change | Observable acceptance |
| --- | --- | --- |
| Understand the next choice | No action is highlighted until armed; contextual cards keep authored cues | Inspecting explains a target without selecting a move |
| Feel an action being prepared | Physical card lift, pressed hold, winding die and marked +1 zone | Pointer, keyboard and assistance produce the same existing payload |
| Recognize what happened | Actual totals appear at 450ms, within the 1.1-second personal reveal; recorded effects get distinct benefit/cost badges | A complication retains its progress and danger cost; no invented success |
| Notice teammates | Attributed ledger cards, companion/inactivity labels, separate shared consequences | Same authoritative recap for every party member |
| Feel closure and return | Illustrated journal, numeric chapter progress, earned keepsake strip | Last round reopens without replaying a move or delaying the timer |

Routine input gets a short contact sound and a small press/lift. Dice get a brief rattle and readable arithmetic. Outcomes get restrained success or complication cues, meaningful effect badges and a short landing. Sounds are opt-in, can be muted immediately, and never block input. Motion is cosmetic and reduced-motion users retain static readable outcomes. No whole-screen shake or flashing is required for ordinary moves.

Animations follow recorded event timestamps and do not restart old results. The shared recap remains readable after movement ends, includes the original dice arithmetic, and owns one consolidated live announcement. Missed/legacy turns cannot acquire a fabricated shield or roll.

## Verification

Use the maintained local command service with `npm run dev`, then:

```text
npm test
npm run test:tabletop -- http://127.0.0.1:5206
npm run test:scene -- --base-url http://127.0.0.1:5206
npm run test:adventures -- http://127.0.0.1:5206
npm run art:check
npm run build
```

The tabletop runner covers 1280×900, 390×844 and 320×568, real local actions, recorded payoff, journal reopening, and deliberate illustration failures. The existing scene runner covers gestures, retries, multiplayer and focused combat; the adventure runner covers all three additional stories and routes. Generated evidence belongs in `output/playwright/`.

These are local Chromium and code checks, not hosted Realtime or physical-device evidence. The changes make input and consequences more legible and tactile; whether players find the loop more fun still needs actual player feedback.
