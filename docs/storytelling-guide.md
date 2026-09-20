# DropInn storytelling and pacing baseline

Version 1 · 2026-09-20 · Required reference for every new or substantially revised player-facing adventure, including community adaptations and AI-assisted drafts.

## Foundation

Use Dan Harmon's Story Circle as explained in [StudioBinder's storytelling guide](https://www.studiobinder.com/blog/dan-harmon-story-circle/), accessed 2026-09-20. Its eight stages trace a protagonist pursuing a need beyond familiar circumstances, obtaining something at a cost, and returning changed. The stage names below come from that framework. The gameplay requirements, pacing rules and examples in this document are DropInn's adaptation.

| Stage | Narrative purpose | DropInn authoring requirement |
| --- | --- | --- |
| You | Establish the familiar. | Show a community, routine or relationship worth caring about. |
| Need | Establish what is missing. | Give the arriving player one immediate, visible objective. |
| Go | Cross into the unfamiliar. | Let an action open a route, start a journey or disturb the situation. |
| Search | Learn through difficulty. | Offer actionable clues and an opportunity to cooperate. |
| Find | Obtain the apparent answer. | Give a genuine payoff, then expose an incomplete assumption. |
| Take | Face the cost. | Preview a sacrifice or tradeoff the party can influence. |
| Return | Bring the outcome back. | Make escape, delivery, reunion or restoration playable. |
| Change | Establish the new normal. | Show a specific difference caused by the adventure. |

The party acts collectively, while a recurring NPC or community provides continuity when players leave. Do not assign a player's hero an emotion, belief, sacrifice or personal transformation they did not choose. Show changes in relationships and the world; let players interpret their heroes.

## What players experience

Each adventure answers five questions: What is wrong? What can I touch? What might my move change? What must we give up? What is different when we leave?

Lead with an illustrated situation and one short objective. The ordinary loop stays **notice → place → release → consequence**. Introduce a story fact by changing an object, pose, route or interaction before explaining it in the journal. Use four scene targets, native accessible controls and the existing dock. Keep critical threat and consequence information visible. Optional background belongs in Story.

Suggested copy budgets for authoring review: objective up to 12 words, target label up to four words, immediate consequence up to 14 words. These are editing targets, not truncation rules; names, localization and accessibility can require more space. A player must be able to understand the next useful action without reading the whole story.

Every target specification needs an ID, visible state, supported tokens, plausible action, developed state and a follow-up use. Development must preserve accurate imagery. A freed person remains free; a launched boat does not become stranded again just because someone repeats a token.

## Pacing across three chapters

Eight stages do not mean eight screens, mandatory turns or dialogue pauses. Use this default distribution; a draft may shift a beat if it records why.

| Chapter | Beats | Emotional rhythm | Observable turning point |
| --- | --- | --- | --- |
| 1: invitation and departure | You, Need, Go | Curiosity → first useful contribution → commitment | The players open the way forward. |
| 2: discovery and complication | Search, Find, Take | Pressure → earned relief → understandable cost | The apparent solution reveals a choice. |
| 3: payoff and return | Resolve Take, Return, Change | Deliberate response → climax → release | A final action produces a changed familiar image. |

Keep the current 30-second simultaneous turns and six-second reveal. Ten rounds is the existing chapter cap: at the full allowance that is approximately six minutes, not a guaranteed duration. Early commitments shorten play. Do not add minimum waits to force a dramatic schedule. A five-to-ten-minute visit may cover only part of an adventure; each chapter needs its own satisfying contribution and payoff.

Author transitions around resolved state, not elapsed wall time. Specify what is discovered on ordinary progress, what early success reveals, and how the round-cap outcome still communicates essential facts. Fast parties must not skip the causal link between discovery and cost. Slow parties must not repeatedly roll for the same clue. Fold necessary information into the chapter outcome when its optional discovery was missed.

Give each chapter a distinct rhythm. Start with a legible action, develop or reframe an object in the middle, and end with a visible payoff. Introduce at most one unfamiliar mechanic in a chapter. Keep timed release as the shared dexterity interaction; its miss never becomes the narrative punishment.

## Choice, cost and fair consequences

The cost must follow from a fact foreshadowed earlier. Tell players what an irreversible branch changes before commitment. Examples: spend a beautiful sail to save the crew; surrender a private garden to keep a village supplied; lose a prestigious recipe to feed an excluded neighbor. Do not secretly revoke a success to manufacture drama.

Provide two reasonable routes when presenting a dilemma. Different outcomes may preserve different things; they should not conceal an objectively correct moral answer. Every route must keep the essential rescue or escape reachable. Avoid lethal coercion, forced player-versus-player conflict and permanent hero-stat penalties as default story stakes.

For any proposed party-wide branch, specify an order-independent rule before implementation. Suggested rule: collect branch-directed contributions during a clearly announced choosing turn; resolve together; ties and no branch input use a previewed, reversible fallback. A lone player can choose, companions cannot cast human preference votes, and departure does not retroactively erase a committed choice. If the story's safe fallback must sacrifice something, preview that exact cost rather than calling it reversible. Resolve this choice on chapter 3's first choosing boundary before objective completion can bypass it; ordinary actions still contribute under the usual rules. The versioned story runtime implements this rule through branch-directed Help and an explicit turn-bound route result.

Write success, mixed and setback outcomes for every chapter. All three carry the story onward and establish a changed condition. Failure can cost supplies, comfort, time within the fiction or a cleaner ending; it must not erase earned contributions or require restarting the story. Story outcomes use existing reward policy. A keepsake symbolizes what happened and never silently changes starting power.

## Mechanics serve the story

Use the existing four tokens first: Fight can move obstructions or interrupt; Influence builds cooperation; Investigate exposes relationships; Help advances supported plans or Protects the announced hero in combat. Keep downed Help, companions and signed Spotlight available under their existing rules.

An optional scene combo must have a visible setup, a visible payoff and a fallback if the setup is missed. A carried tool needs a clear source, at most two meaningful uses, a depletion indicator and duplicate-use resolution. A finishing move must work with one human and companions; it cannot demand two simultaneous humans or unanimous acknowledgement.

Mark new systems explicitly. Current V2 supports hero-targeted combat intent, progress/danger, authored development, bounded Spotlight effects and chapter outcomes. Cross-target combo bonuses, shared consumable tools, object-targeted enemy attacks and explicit branch voting are proposed extensions. Writing them into a story document does not implement them.

## Drop-in continuity and authored authority

Each chapter needs a standalone arrival sentence, one highlighted first opportunity and a two-sentence catch-up: the useful fact already established, then what matters now. Pending players may inspect. Missing turns and departed heroes never supply fictional consent. Parked rooms do not advance plot offscreen.

Name the narrative fact behind each state flag. Recaps should mention a player's actual contribution, including Protect, without crediting them for actions performed before arrival or after departure. Return and Change also need journal/recap versions so players who leave early can see the eventual result.

All essential beats must work without inference. Authored state owns facts, choices and consequences. AI may draft or rephrase within these boundaries; it cannot invent a completed beat, grant a tool, alter a threat or replace a confirmed consequence. Community submissions enter the same review process; publication remains governed by [community-stories.md](community-stories.md).

## Required story packet and release gate

Start with [the story template](stories/TEMPLATE.md). Every packet must link this baseline and include all eight beats, three chapter designs, twelve target specifications, chapter outcomes, foreshadowed cost, visible final change, arrival/catch-up copy, art requirements, runtime dependencies and task-specific playtests. Keep separate statuses: **design draft**, **implemented**, **locally verified**, **published**. A document alone is a design draft.

Before implementation, review the circle for causal links and routes for contradictions. Before release:

- Ask a newcomer to identify the goal, first action, cost and final change without opening Story. Record their answer rather than inferring understanding from clicks.
- Run one human plus companions, two humans, a late join and a departure at the choice boundary. Nobody should need an absent player's memory or consent.
- Exercise early completion, repeated failures and round-cap closure. Check that Find, Take and Change remain understandable in each outcome.
- Check every developed visual against state, and every advertised choice against actual effects. Verify duplicates and reversed commit arrival for any new branch/tool/combo rules.
- Use the existing mobile, keyboard, timing-assistance and reduced-motion scenarios. Record actual pacing; tune only after observation.

The current technical map is [CLAUDE.md](../CLAUDE.md). Story-specific data still lives in `src/lib/dropinn/content.ts`, `scene.ts` and `suggestions.ts`, with Briar Glen assumptions also in `engine.ts`, `SceneAdventure.tsx` and the artwork components. A versioned adventure registry is required before adding the new packets to discovery. Keep existing rooms on their original definition.

## Existing adventure adoption

Briar Glen is the migration reference: familiar village → missing herd → river crossing → investigate the ward-bound pack → discover a corrupted protector → risk the chapel or abandon its restoration → return with the animals → restored guardian or a new village beacon. Its code already supports several outcomes, but this mapping is an editorial reading, not evidence that every beat is clearly communicated. In particular, make the restoration-versus-evacuation cost visible before future branch work. Review it against the same gate before claiming conformance.

## Initial story library

Three playable story packets accompany this baseline: [The Last Flight of the Teacup](stories/the-last-flight-of-the-teacup.md), [The Inn That Misplaced Tomorrow](stories/the-inn-that-misplaced-tomorrow.md), and [The Orchard That Walked Away](stories/the-orchard-that-walked-away.md). All three are selectable alongside Briar Glen. See [runtime scope and verification](playable-adventures.md); optional signature extensions and the broader art wish lists remain separate from the implemented baseline.
