# DropInn: stronger play, feedback and pacing

2026-09-20 · Skill research and first implementation pass.

The current game has useful foundations: a scene to act on, four action tokens, a timed commitment, simultaneous party play, announced threats, and authored consequences. The opportunity is to make a player's decision, its setup, and its payoff legible at the table. The references supplied by the player—Slay the Spire and Balatro—suggest a direction of tactile pieces, readable combinations and consequential choices. This is a design interpretation, not a claim of equivalent depth or quality.

## Skills worth using

These are community skills whose primary-source instructions were reviewed. They have not been installed. Recommendations concern their workflows, not endorsement of every claim, example, engine version or linked dependency in their repositories. Install individual skills if wanted; DropInn already has specialized art, story and multiplayer guidance.

| Skill and source | Where it helps DropInn | Fit and limits |
| --- | --- | --- |
| [Game feel](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/game-feel/SKILL.md) | Selection, placement, release and outcome feedback; proportional motion and sound; keeping animation separate from simulation. | Best immediate fit. Its engine examples need adapting to React/CSS. Choose a few feedback channels; constant camera shake would obscure this tabletop game. |
| [Game Design Fundamentals](https://github.com/fcsouza/agent-skills/blob/main/plugins/game-dev/design/game-design-fundamentals/SKILL.md) | Review the recurring decision, setup/payoff loop, challenge curve and reasons to cooperate. | Best companion to game feel. Use the core-loop review; do not introduce variable-reward retention mechanics or treat its attributed quotations as verified research. |
| [Exploring Game Design Space](https://github.com/abagames/agentic-gamedev-skills/blob/main/.agents/skills/exploring-game-design-space/SKILL.md) | Develop mechanically different prototypes for tools, combinations and session choices, with a testable question for each. | Useful for the next mechanics exploration. It is explicitly for generating alternatives, not auditing a single existing implementation. |
| [Audio Design](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/audio-design/SKILL.md) | Eventually mix exploration, threat, release and reward cues so the sound follows the chapter's tension. | A later pass: its full mixing/music workflow exceeds the current small Web Audio cues. Requires listening on real output. |

Suggested starting pair: **Game feel + Game Design Fundamentals**. For actual implementation and verification, keep using [dropinn-playtest](../.agents/skills/dropinn-playtest/SKILL.md), [dropinn-art](../.agents/skills/dropinn-art/SKILL.md), and the [storytelling baseline](storytelling-guide.md). Those already encode constraints a generic game skill will not know.

The current official `openai/skills` curated listing was also checked with the skill installer. `develop-web-game` appeared in indexed search results but was absent from the live curated listing, so it is not recommended here as a currently installable curated option. The existing Playwright installation and DropInn runner already cover this project's browser workflow.

## Findings from the current play flow

1. **The action hand read as a toolbar.** Small tokens, uniform surfaces and a disabled submit control gave ordinary input the same weight as reading details.
2. **Useful setup was easy to miss.** Existing insight/opening/teamwork bonuses affect play, but their causes were mainly explained in a drawer. A plain total does not teach a player how to cooperate again.
3. **Six seconds of reveal had little progression.** The old result displayed a small die and sentence, with limited distinction between anticipation, calculation and consequence.
4. **A miss obscured the bargain.** The reducer advances progress even on a failed move and also raises danger. Both values should appear together so the party understands the cost.
5. **Longer-term choices still need more differentiation.** Many target/action combinations share progress and support effects. Changing their appearance does not itself create a new decision. Repeating an efficient move can remain reasonable across several turns.

## Implemented locally

- A fanned, raised hand on a felt-like dock; visible selection, press, token landing and charging feedback. Existing artwork, drag/tap/keyboard paths and token IDs are retained.
- A small turn-phase label, active insight/opening/teamwork callouts, and a +1 teamwork marker on compatible targets with a different committed human token.
- A result presentation that stages the actual die at 0ms, bonuses at 450ms, and payoff at 1100ms, measured from the authoritative event time. No random cosmetic numbers, new simulation pauses or additional waiting gates.
- Progress, danger, protection and healing labels derive from structured result fields. Protect goes straight to its guaranteed result and never gets a fictional die roll.
- A chapter completion/earned keepsake beat after 2200ms. On a small phone it takes the space of the calculation, retaining the consequence. Completed adventures retain the existing finale and recap.
- A party readiness display during commitment/reveal, using the existing server deadline. The next choosing turn becomes available on its normal schedule.
- Distinct optional selection, roll, bonus, success and complication tones. Sound remains off until enabled; this pass has not had a listening review.
- Reduced-motion users receive the complete payoff immediately. Late snapshots skip elapsed reveal stages. Only the current turn/chapter supplies result visuals.

These are presentation and interaction changes. The probability model, 30-second choosing period, six-second reveal, chapter cap, XP policy, persisted data and multiplayer authority are unchanged. No new story, tool, build system or public deployment is included.

## Next mechanics prototypes — design proposals only

Prototype one at a time using the [storytelling baseline](storytelling-guide.md). Do not merge them into a bigger feature set before observing play.

| Prototype | Recurring decision | Smallest useful test | Main risk |
| --- | --- | --- | --- |
| A two-use chapter tool | Spend a charge for an immediate advantage, or keep it for a visible upcoming need. Give the tool a visible source, two clearly described uses, and one charge display. | One existing chapter; one human with companions, then two humans. Can players explain why they spent or saved it? | A shared tool needs an order-independent duplicate-use rule; extra inventory could turn into another menu. |
| A target setup and payoff | Set up an object now, then choose between cashing in that setup or addressing the current threat. Advertise the setup before commitment and leave an ordinary-action fallback. | Two connected targets, one setup flag and two uses. Does the preferred action change with state, or do players repeat a dominant sequence? | Automatic bonus chains could create spectacle with no additional decision. |
| A chapter-end preparation choice | Choose a temporary approach that changes what is attractive in the next chapter. Offer two understandable tradeoffs with equal access to essential story beats. | A single boundary and two alternatives; test late arrival and departure as well as solo play. | A mandatory voting screen could undermine drop-in play. Use a disclosed boundary rule without unanimous acknowledgement. |

Start with the **two-use tool** if the intent is deeper choices. It provides a concrete spend/save decision and a visible payoff with a smaller rule surface than a deck or permanent skill tree. Its storage/ownership and transaction work must use the hosted-contract guidance. These proposed systems require implementation and verification before any player-facing story advertises them.

## Verification and remaining evidence

Base revision: `d4d037d`, with this pass uncommitted. Local Vite at `127.0.0.1:5198`; a direct list response returned `backend: local`. The integration runner uses the real local command handler with an injected clock, independent Chromium contexts and blocked external requests. Its explicitly labeled final snapshots test presentation only.

- Production build passed. Vite reports a bundle-size advisory above 500kB.
- 82 focused tests passed: turn presentation, teamwork, timed release and the game reducer.
- Two-browser local integration passed: private pending admission, real pointer/keyboard/assisted release, teamwork and exact displayed result total, three-chapter traversal, Protect, reviewed authored Spotlight, duplicate retry after lost response/reload, target dragging and drawer focus, and cancellation at the deadline.
- 390×844 and 320×568 layouts retained four scene targets, 44px active controls and no document overflow. Screenshots were inspected.
- Client fixtures verified payoff after late delivery, reduced-motion presentation, guaranteed Protect, progress/danger on a miss, chapter keepsake presentation and small-phone fit.
- Generated evidence: `output/playwright/scene-integration-results.json`, `game-feel-desktop-payoff.png`, `game-feel-phone-payoff.png`, `game-feel-chapter-fixture.png`, and the `integration-*.png` screenshots. The phone payoff and chapter screenshots are labeled client fixtures, not hosted gameplay.

Not established: that people find the game more enjoyable, physical-phone/screen-reader behavior, audio quality by listening, or hosted Supabase/Realtime behavior for this change. No external model calls or hosted writes were needed.

For the next human playtest, give a newcomer one chapter without coaching. Record time to the first committed move, whether they can explain the selected action, whether they notice and use a teammate setup, what they think a miss changed, and whether they want another turn. Compare observed behavior before and after; do not replace these observations with an automated completion rate.
