# Expedition adventures

Status: implemented and locally verified; not published. The story packet is [Gemward: The Missing Light](stories/gemward.md). The runtime contract below describes the new `gemward` version 1 definition, not a migration of existing rooms. Local verification establishes the scopes below; human pacing remains unmeasured.

## Design purpose

The intended improvement is causal clarity: a player should be able to say, “Because I did that, we can now do this.” A useful conversation exposes a clue, the clue makes a destination available, and the party's chosen route changes the next situation. This is a testable design hypothesis, not a measured improvement in enjoyment.

## Compact design document

| Field | Direction |
| --- | --- |
| Fantasy | Drop into a small party's adventure and make a discovery that matters. |
| Format | React tabletop with authoritative simultaneous turns, playable on desktop and mobile. |
| Pitch | Explore a town, discover a route, face its encounter and choose what to bring home. |
| Primary motivations | Discovery and fellowship; achievement supports both through visible contribution. |
| Session | A five-to-ten-minute visit can cover part of a run; no whole-run duration is promised. |
| Core loop | Notice a target → prepare a token action → release → see a confirmed change → choose what that change enables. |
| Session loop | Discover leads → choose a route → handle its complication → enact an ending. |
| Longer-term appeal | Try another coherent setup, class or route; retain ordinary cosmetic keepsakes under existing reward rules. |

The thirty-second design target concerns understanding and preparing an action, not a guarantee that a simultaneous turn resolves within thirty seconds. Existing turn deadlines, early completion and reveal controls remain authoritative.

## Motivation and pacing review

| Need | Supporting choice | Risk to observe |
| --- | --- | --- |
| Autonomy | Inspect different town locations; discover optional routes; choose useful consumables. | One route or item becomes obviously best, reducing the choice to a routine. |
| Competence | Learn how token intentions reveal leads and how class moves respond to enemy intent. | A visible counter makes every battle decision automatic. |
| Relatedness | Share quest discoveries, see accepted teammate actions and preserve contributions after departure. | One player unlocks and chooses everything before others can contribute. |
| Discovery | A fixed run setup keeps NPC knowledge, clues and encounters coherent. | Variation changes names without changing useful decisions. |
| Achievement | Chapter progress, route unlocks, outcomes and contribution rewards. | Rewards feel interchangeable or players hoard consumables until the run ends. |

Competitive dominance is not a target. No population percentages or motivation scores are asserted without player evidence. No daily attendance requirement or social obligation is added; leaving remains a supported part of play.

Early play should teach one useful interaction before asking for a route choice. The middle changes the kind of decision through a short separate encounter. The ending makes the accumulated information relevant to a visible cost. Failure must preserve a way forward; optional evidence must not become a mandatory repeated roll.

Gemward introduces several connected systems, so the arrival must teach their connection through one action: “This clue opens that place.” Consumables remain optional alongside it. Do not interrupt the first useful interaction with separate lessons for every system. Treat first-turn confusion or unread stash rewards as evidence to simplify the presentation.

## Decisions, resources and boundaries

| Resource or decision | Source | Use | Persistence boundary |
| --- | --- | --- | --- |
| Shared quest discovery | Confirmed relevant interaction or authored closure | Makes a route or later story fact available | Belongs to the room; its discoverer's departure does not remove it. |
| Route preference | A human's committed intent | Selects an available route under the authored fallback | Belongs to that decision; it cannot rewrite a resolved earlier route. |
| Personal consumable | Bounded NPC and encounter rewards | One authored temporary benefit when deliberately attached to an action | Belongs to that participant in this adventure, separate from permanent hero power. |
| Ordinary progress | Accepted action resolution | Advances the current objective | Bounded by the current objective, with no duplicate quest payout. |
| Keepsake and ordinary contribution credit | Existing chapter reward policy | Marks a contributed chapter | Existing persistent reward rules continue to own it. |

Quest discoveries are knowledge and access, not a currency that must be spent. Their limited set is the bound. Consumable capacity supplies a spending decision; it should not become a reason to hide ordinary rewards or force a long inventory detour. There is no new purchasable advantage or escalating stat economy in this feature.

The intended resource rhythm is an early useful lead, occasional single-use help, a route payoff, then a consequential return. The implementation uses authored reward sources and a seeded story setup. It does not require a random reward schedule, daily attendance or adaptive difficulty to justify the loop. Balance values remain in the runtime definition, not this prose.

## Runtime contract

| Source | Responsibility |
| --- | --- |
| `src/lib/dropinn/expedition.ts` | Gemward definition, seeded setup, locations, route requirements, interaction topics, supplies, class move descriptions and scene projection. |
| `src/lib/dropinn/expeditionTypes.ts` | Serializable room state, action intent and confirmed result metadata. |
| `src/lib/dropinn/expeditionEngine.ts` | Validation, frozen-turn resolution, shared discoveries, votes, item spending, battle and chapter transitions. |
| `src/lib/dropinn/registry.ts` | Selectable version-pinned definition; previously released adventures retain their existing rules. |
| `src/components/DropInn/ExpeditionCombat.tsx` | The standalone encounter presentation inside the normal table. |
| `src/lib/dropinn/narrator-openings.json` and `public/audio/narrator-openings/` | Exact-prose opening recordings generated through the existing local narrator pipeline. |

Local browsing prepares a choice; commands submit intent; the reducer resolves shared state; recorded events drive consequences. Story prose and optional AI cannot grant inventory, decide a route or revise a confirmed ending. The Markdown story packet is editorial documentation. `scripts/build-story-data.mjs` still builds the older three story packets; Gemward is authored in its explicit TypeScript definition.

`AdventureRoom.expedition` stores the seed, variant, location, discovered quest items, recorded interactions, visited locations, pending/resolved travel route, exploration turn count, battle state, per-user stashes and pending offers, granted reward keys, costs and finale decision/ending. These optional fields travel in the existing JSON room snapshot. They require no new SQL columns by code-path inspection; this is not evidence of a hosted persistence check.

The client action's optional `expedition` object carries `locationId`, `interactionId`, `routeId`, `consumableId`, `favourChoice` and `rewardChoice`. Ownership, phase, location, target, topic, item and route eligibility are validated against the choosing snapshot. A clue found by another player in this batch cannot authorize a route in the same batch. A stash reward received in this batch cannot be spent immediately. Confirmed `ActionResult.expedition` records the relevant discovery, use, reward, route, battle progress or finale result for presentation and history.

Browsing another place must not consume a shared turn or move a teammate's camera. Accepted exploration actions finish before the encounter transition. The encounter owns its temporary battle state and returns control to exploration after its result. Preserve the shared table, four tokens, explicit release controls, ordinary deadline and readable confirmed-event sequence through that transition.

### Locations, routes and the finale

The town has three freely inspectable locations with four targets each. Ordinary exploration intentions are guaranteed contributions; relevant topics also grant their authored quest discovery. The town ends after a committed route preference or its fourth exploration turn. Unique most human preferences wins; ties and no preferences use the always-open hill road. Every accepted town interaction resolves before travel.

| Route | Requirement | Chapter pattern |
| --- | --- | --- |
| Warehouse | `ledger-copy` | Trace the delivery record; a later turn queues the encounter. The route supplies one initial battle progress. A three-turn exploration cap still opens the encounter. |
| Canal | `canal-key` | Help prepare a mooring, then use a later distraction or investigation to recover quietly. A three-turn cap falls back to an encounter, with one route cover. |
| Hill road | None | The first exploration round queues the encounter. Travel adds one danger and records lost time/supplies. |

All routes recover the prism and expose the seeded truth. Recovery includes a subsequent exploration turn to prepare the return, so the encounter result is not itself an immediate skip to the finale. The chapter closes with the motive and the exact coming cost, even when a player missed the earlier warning.

The finale collects Help/Restore and Influence/Release votes on the beacon on its first choosing turn. Unique greater Restore count chooses Restore; otherwise Release wins, including ties and no votes. Companions do not vote. The accepted choice is permanent. The party then helps the town through its changed evening; the chapter ends after at least two exploration turns with enough progress, or its fourth turn cap.

### Separate encounter

The initial counter system is deliberately small. Strike beats Trick; Trick beats Guard; Guard beats Strike. A winning counter supplies 3 base progress, a tie 2 and a losing exchange 1. Guard also provides 2 protection, or 3 with good release timing. Progress contributions are divided by the human seat count; this includes class progress and Binding thread. Protection uses the strongest contribution rather than stacking.

Class signatures modify the common moves: a Fighter's winning Strike and a Rogue's winning Trick each add 1 base progress before scaling; a Wizard's Guard provides 3 protection without a timing requirement; a Cleric's winning Strike restores up to 1 of their own HP. These apply to upright heroes using the corresponding move, alongside the separate class Help choices below.

| Class Help | Effect before progress scaling |
| --- | --- |
| Fighter — Shield wall | 1 progress and 4 protection. |
| Rogue — Expose weakness | 2 progress and a nonstacking 1-point party opening next round. |
| Wizard — Unravel ward | 3 progress against Guard, otherwise 2. |
| Cleric — Guiding light | 1 progress and up to 3 HP to the most wounded human, selected from the choosing snapshot. |

The battle's goal is 6 shared progress; the warehouse supplies its initial point. A battle can be won after its second round, and closes after its fourth round with escape if not won. Escape adds danger and records abandoned travel supplies but preserves the prism and a way forward. Enemy stance is seeded and displayed before action commitment. A frozen announced victim keeps the ordinary protection/departure contract. Downed Help protects; it does not invoke an upright class move. A second-wind use may heal a downed hero, but the accepted downed action remains the Help they were allowed to commit.

The quality target is deciding whether to counter the announced enemy, protect a teammate, recover or spend a tool. Count how often players choose the same move and whether an alternative ever has a practical purpose before expanding the move list. The counter relationship is common to all four classes; signatures and Help provide their first differences. This release is not a large class ability tree.

### Personal three-slot stash

| Item | Use | Source examples |
| --- | --- | --- |
| Second wind | Recover up to 4 of the user's HP, including while downed. | First Help for Oren; escaped encounter reward. |
| Smoke flask | 3 cover against this battle's announced strike; strongest cover wins. | First Help for Bram; first inspection of the reeds. |
| Local favour | Choose `ledger-copy` or `canal-key` in town; the route becomes usable next turn. | First Help for Iris. |
| Spark dust | Double this action's exploration progress, without duplicating discoveries or rewards. | First Help for Nella; quiet recovery reward. |
| Binding thread | Add 2 base battle progress, divided by the human seat count. | First Help for Tess; won encounter reward. |

An action can spend one already-owned item. The item is consumed by the accepted resolution, including a Spotlight complication. Phase restrictions prevent battle tools in exploration and exploration tools in battle. Local favour is specifically town-only. Second wind is allowed in either phase.

Each reward source grants once per participant under a durable source key. Available space receives it directly; a full stash records a pending offer. Accepting a replacement or declining an offer accompanies an ordinary committed action. Replacing and consuming the same item is invalid; receiving a new item does not make it usable in that same action. Pending offers and the stash remain in the adventure when a participant leaves and returns. Quest discoveries occupy the shared pouch and never consume one of the three personal slots.

No item trading or permanent cross-adventure consumable inventory is implemented. The round's existing contribution and chapter reward policies remain responsible for XP and keepsakes; an extra tool effect does not mint duplicate quest rewards.

Gemward is outside the four-story First tales Thread and Story Pass catalogs. Its XP, chapter keepsakes and adventure-local consumables do not imply Thread credit, a new pass track or a free cosmetic hat.

## Authoring checklist

Start with the [story packet template](stories/TEMPLATE.md) and [storytelling baseline](storytelling-guide.md). Author all eight circle beats, three macro chapters, four canonical targets per scene, all chapter outcomes and two-sentence catch-ups. Every optional location needs the same supported-token, developed-state and follow-up-use review as a chapter target.

Name the narrative truth behind each flag. A run variant must keep its cause, clues, NPC knowledge, encounter and resolution in agreement. A discovery unlocks a possibility; it must not silently express party consent. Essential information belongs in closure text on fast, slow and failed paths.

Preview irreversible costs before the choice. Document the actual fallback, including its cost, and resolve human preferences together. Companions do not decide a player's preference. A departing player's accepted contribution remains real; an absent player's missing action is not fictional consent.

Separate quest discoveries from personal consumables. A quest item cannot be displaced by a full stash or disappear when its discoverer leaves. Every consumable needs a bounded source, explicit spending rule, duplicate-delivery behavior and a visible consequence. Do not turn a consumable into a second unbounded reward economy.

## Verification status

On 2026-10-03, the opening-audio build added sixteen Gemward clips and preserved all existing exact-prose recordings. The library check passed for 112 files at 20,094,928 bytes, below its 20 MiB cap; all ten `narratorOpenings.test.ts` tests passed. A structured packet check matched all twelve canonical target IDs and supported-token cues in the three JSON blocks to `GEMWARD_DEFINITION`.

Local implementation verification on 2026-10-03:

- `rtk vitest run`: all 695 unit/service tests passed, including expedition rules and preservation of existing adventure contracts. Production build and `npm run art:check` passed.
- `node scripts/playtest-expedition.mjs http://127.0.0.1:5203`: 21 checks passed with zero browser errors. Two independent players completed all three chapters through Warehouse and Restore, with separate town interactions, normal route commitment, reload recovery, Spark dust and Smoke spending, a two-round battle, return to exploration, signed authored Spotlight preparation/confirmation and chapter keepsakes. Town, discovered, battle and prepared-move layouts were checked at 390×844, 320×568 and 1280×900, including four visible targets/tokens, control sizing and caption clearance. Report: [expedition-results.json](../output/playwright/expedition-results.json).
- `node scripts/playtest-scene.mjs --base-url http://127.0.0.1:5203`: the earlier scene regression passed 102 checks, zero errors and zero external calls. It includes exact lost-response/reload/retry behavior and labels its injected client-snapshot presentation fixtures separately from real local-handler/browser interaction checks. Report: [scene-integration-results.json](../output/playwright/scene-integration-results.json).

The Gemward browser runner uses the real isolated local command handler, independent browser identities and a synchronized test clock; it does not inject room snapshots or call external inference. Canal/road alternatives, escape, other classes and Release/fallback behavior have reducer/service evidence rather than a claim that every combination was driven through this browser run. Screenshot review found a battle-caption overlap; the corrected layout passed the final rerun and its added clearance assertion.

A final copy-only change expanded pending-finale catch-up and nonvoting action previews with variant costs and the abstention fallback after those browser runs. The complete 695-test suite and production build passed again afterwards; no rules or layout changed in that final copy pass.

Human comprehension, observed pacing, physical phones, screen readers and hosted persistence/Realtime are not established by these checks. No publication is claimed. Automated play proves reachable states and contract behavior, not whether a player understands the choices or finds the pacing rewarding.
