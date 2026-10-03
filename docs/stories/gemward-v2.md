# Gemward: The Missing Light — branching journey

Status: implemented and locally verified · Definition ID: `gemward` · Design version: 2 · Not published

Required baseline: [storytelling and pacing](../storytelling-guide.md). This packet supersedes the [v1 packet](gemward.md) for **new v2 rooms only**. Existing v1 rooms keep their definition, embedded route votes and earlier presentation. Runtime content is in `journey.ts`, `journeyEngine.ts` and the shared expedition modules; this Markdown is an authoring review, not generated runtime data.

## Promise

Explore a small town with friends, follow a clue you helped discover, and decide what its recovered light should cost. Iris, Nella, Oren, Tess, Bram and the keeper give Gemward continuity when heroes come and go. The apparent want is the missing prism; the deeper community need is a sustainable relationship with its light. Heroes retain their own motives.

The intended experience combines discovery and fellowship. An interaction should visibly produce a shared clue, the clue should open a named path, and the next destination should feel like a consequence of the party's work. The persistent scene supports the immediate action loop; two explicit travel decisions shape the session. Another route or seeded truth supplies replay variety without adding permanent combat power. These are design hypotheses; automated checks cannot establish enjoyment.

## Circle

| Beat | Player-caused event or revealed fact | Visible evidence |
| --- | --- | --- |
| You | Arrive among Gemward's traders and neighbours. | Shop, inn and docks are places to inspect independently. |
| Need | The beacon is dark and the prism is missing. | Empty gem stand, delivery records and a repair estimate. |
| Go | Discover a lead and choose an available destination together. | Shared pouch acquisition, unlocked graph edge and first travel vote. |
| Search | Prepare a guarded warehouse, quiet canal or exposed road approach. | Route-specific interactions and, when needed, a bounded encounter. |
| Find | Recover the prism and learn why it moved. | Confirmed acquisition with sources; recovery closes the middle chapter. |
| Take | Choose restoration's cost or release's dark evenings. | Second travel decision previews both variant-specific consequences. |
| Return | Prepare the chosen destination while the prism remains intact. | Four practical targets at the tower or Lantern square. |
| Change | Complete the preparations and enact the recorded choice. | Restored beacon or shared lanterns; the ending and any prism spend enter history. |

## Coherent run truths

The saved seed selects one truth, then NPC knowledge, recovery and enemy follow it throughout the run.

| Truth | Why the prism moved | Encounter | Restore at completion | Release at completion |
| --- | --- | --- | --- | --- |
| `smugglers` | A smuggler arranged a late delivery to sell it. Its maker mark proves the theft. | Hired guard | Consume the prism to relight Gemward; destroy its maker-mark evidence. | Release the light, preserve the maker mark, and share lanterns until beacon repairs. |
| `ward` | Nella moved a failing prism to keep its living spark alive. | Frightened ward construct | Absorb the prism; the spark survives but is bound to the beacon again. | Free the living spark; share lanterns through dark evenings while repairs begin. |

The warehouse's generic label is “Trace the delivery mark,” not an accusation that contradicts the ward truth. Ordinary discussions of prices may expose the missing delivery; the warning targets explain the cost. Recovery repeats essential truth even if no one read the optional warning.

## Chapter 1 — A light goes missing

ID: `gemward-town`. Beats: You, Need, Go. Arrival objective: **Explore Gemward and prepare a lead together.** First opportunity: Iris's gem-pricing conversation. Two-sentence catch-up: “Gemward's beacon is dark and its prism is missing. Explore a town stop, then use the party's discoveries to choose a route.”

The canonical shop separates two NPCs from the board and empty stand. The inn and docks are alternative local scenes, each with four targets. Browsing does not move the party or spend a turn; each human can inspect a different place. Accepted actions resolve together within the ordinary 60-second turn. Town has no battle.

The middle development is an acquired clue with contributor provenance. `ledger-copy` opens the warehouse; `canal-key` opens the canal. A warning supplies context rather than blocking progress. Town requires at least two exploration rounds; goal 4 closes it, with a four-round cap. Its chapter reveal finishes before a separate 30-second travel decision opens.

| Target ID / label | Tokens and plausible interactions | Developed state and next use |
| --- | --- | --- |
| `iris` / Iris the jeweller | Influence: pricing or recent news. Investigate: compare delivery marks. Help: repair her scales; first help offers Local favour. | Record the ledger; keep Iris available for other intentions. |
| `nella` / Nella the apprentice | Influence: ask about the light. Investigate: examine her sketch. Help: sort gems; first help offers Spark dust. | Record the seeded warning; no invented confession in the smuggler run. |
| `price-board` / Gem price board | Influence: ask repair cost. Investigate: read estimate. Help: check figures. | Retain the board and recorded warning; do not show a repaired beacon yet. |
| `display-case` / Empty display case | Fight: lift the fallen stand. Influence: ask who packed it. Investigate: inspect seal. Help: repair stand. | A lead is marked; the stand stays empty. |

Other town scenes retain independent interaction meaning:

| Place / four targets | Supported token intentions and discoveries |
| --- | --- |
| Inn: `oren`, `tess`, `noticeboard`, `hearth` | Oren: Influence late visitors, Investigate chit, Help meal/Second wind. Tess: Influence delivery, Investigate mark/ledger, Help satchel/Binding thread. Noticeboard: Influence discuss, Investigate read, Help post the warning. Hearth: Fight kindling, Influence gather neighbours, Investigate fuel, Help warmth. |
| Docks: `bram`, `manifest`, `lock`, `reeds` | Bram: Influence passage or Help loading grants the key; Investigate water marks; first Help also offers Smoke flask. Manifest: Influence shipment or Investigate record grants ledger; Help sort. Lock: Influence ask for key, Investigate gate, Help prepare/key. Reeds: Fight clear, Influence call, Investigate satchel/Smoke flask, Help mark a path. |

Success records prepared leads and moves to travel. Mixed cap closure records the facts the party has; the road remains available. The authored setback equivalent is fewer options and road supply cost, not a blocked story; v2 classifies town closure as success or mixed, not a separate setback result.

### On-screen context

This review block describes the four canonical shop targets. Runtime derives developed context from recorded discoveries and supplies exact interaction labels.

```scene-context
{"situation":"Gemward's prism is missing. Follow a useful lead before choosing the party's route.","targets":{"iris":{"context":"Iris knows the missing delivery.","actionCues":{"influence":"Ask about gem prices","investigate":"Compare delivery marks","assist":"Repair the jeweller's scales"},"development":{"context":"The delivery lead is shared; Iris can still use practical help.","actionCues":{"influence":"Ask about recent news","investigate":"Compare delivery marks","assist":"Repair the jeweller's scales"}}},"nella":{"context":"Nella noticed the prism's unusual light.","actionCues":{"influence":"Ask about the fading light","investigate":"Examine Nella's sketch","assist":"Sort the scattered gems"},"development":{"context":"The warning is recorded; help prepare the next step.","actionCues":{"influence":"Ask about the fading light","investigate":"Examine Nella's sketch","assist":"Sort the scattered gems"}}},"price-board":{"context":"The repair estimate foreshadows the prism's lasting cost.","actionCues":{"influence":"Ask what repairs would cost","investigate":"Read the repair estimate","assist":"Check the keeper's figures"},"development":{"context":"The recorded estimate remains relevant to the final choice.","actionCues":{"influence":"Ask what repairs would cost","investigate":"Read the repair estimate","assist":"Check the keeper's figures"}}},"display-case":{"context":"A delivery seal lies beside an empty gem stand.","actionCues":{"fight":"Lift the fallen display stand","influence":"Ask who packed the case","investigate":"Inspect the delivery seal","assist":"Repair the display stand"},"development":{"context":"The lead is recorded; the prism is still missing.","actionCues":{"fight":"Lift the fallen display stand","influence":"Ask who packed the case","investigate":"Inspect the delivery seal","assist":"Repair the display stand"}}}}}
```

## Chapter 2 — Follow the light

ID: `gemward-route`. Beats: Search, Find, Take. Arrival objective: **Recover the prism along the party's chosen route.** First opportunity: warehouse delivery mark, canal landing, or road approach. Catch-up: “The party chose this path using its shared discoveries. Recover the prism, then choose the light's future together.”

Four target IDs remain stable while their scenery and action sequence change:

| Target ID / label | Tokens and plausible interactions | Developed state and next use |
| --- | --- | --- |
| `crate` / Marked crate, drifting crate or handcart | Fight brace; Influence shipment; Investigate seams/delivery; Help secure or moor. | The light identifies recovery; a confirmed prism acquisition closes the chapter. |
| `watcher` / Route watcher | Influence talk or distract; Investigate patrol; Help approach. No Fight against an NPC exploration target. | Warehouse evidence prompts its encounter; prepared canal distraction bypasses it. |
| `ramp` / Loading ramp, landing or winding path | Fight clear; Influence coordinate; Investigate footing; Help brace, moor or guide. | A secured canal landing enables a later quiet recovery; repeats do not duplicate a clue. |
| `prism-trail` / Trail of light | Fight clear debris; Influence call party; Investigate trace; Help mark route. | Warehouse investigation traces the delivery; canal investigation after mooring follows the sheltered light. |

Warehouse: acquire `buyer-evidence` through a qualifying investigation/conversation, then the next exploration batch queues a battle with one advantage. The third exploration round queues the fallback encounter if that preparation was missed.

Canal: Help at crate or ramp records `mooring-line`; on a later turn, Influence watcher or Investigate prism-trail records `quiet-passage` and recovers the prism without combat. These are sequential opportunities, not a two-human requirement. The third exploration round falls back to battle if the quiet passage was missed.

Road: always available; travel adds 1 danger and records lost supplies/time. Its first exploration batch queues a battle. Every accepted exploration action finishes before an encounter starts.

Combat is separate, with frozen announced intent and class moves over two to four rounds. Winning and escape both recover the prism; escape preserves injury/supply consequences rather than blocking access. V2 recovery closes chapter 2 directly, so it does not add v1's extra return-preparation turn. The essential truth and both ending costs appear in the recovery outcome before final travel.

Success means recovery through victory or bypass. Mixed means recovery after escape. The failure/setback fiction is recovery at a cost; it maps to mixed here, never a missing prism or restart.

### On-screen context

Canonical warehouse context; canal and road replace the labels, scenery and the route-specific cues described above.

```scene-context
{"situation":"The marked delivery leads to a guarded prism. Trace it before the encounter.","targets":{"crate":{"context":"A warm glow escapes the marked crate.","actionCues":{"fight":"Brace the prism crate","influence":"Ask about the shipment","investigate":"Trace the delivery mark","assist":"Secure the crate"},"development":{"context":"The delivery is traced; prepare for the guarded recovery.","actionCues":{"fight":"Brace the prism crate","influence":"Ask about the shipment","investigate":"Trace the delivery mark","assist":"Secure the crate"}}},"watcher":{"context":"The watcher stands between the party and the light.","actionCues":{"influence":"Trace the delivery mark","investigate":"Study the watcher's patrol","assist":"Prepare a safe approach"},"development":{"context":"The watcher has noticed the search.","actionCues":{"influence":"Trace the delivery mark","investigate":"Study the watcher's patrol","assist":"Prepare a safe approach"}}},"ramp":{"context":"The loading ramp offers a sheltered approach.","actionCues":{"fight":"Clear the approach","influence":"Coordinate the crossing","investigate":"Find firm footing","assist":"Brace the landing"},"development":{"context":"Use the prepared approach to support the recovery.","actionCues":{"fight":"Clear the approach","influence":"Coordinate the crossing","investigate":"Find firm footing","assist":"Brace the landing"}}},"prism-trail":{"context":"Follow the prism's glow through the delivery yard.","actionCues":{"fight":"Clear fallen debris","influence":"Call the party to the light","investigate":"Trace the delivery mark","assist":"Mark the way home"},"development":{"context":"The trail confirms the delivery and its guarded destination.","actionCues":{"fight":"Clear fallen debris","influence":"Call the party to the light","investigate":"Trace the delivery mark","assist":"Mark the way home"}}}}}
```

## Chapter 3 — An evening changed

ID: `gemward-return`. Beats: resolve Take, Return, Change. Arrival objective: **Carry out the party's decision and help the neighbours.** First opportunity: align the beacon lens or prepare shared lanterns. Catch-up: “The party chose restoration at the tower / release at Lantern square. Prepare it together; the prism stays intact until the final work is complete.” The actual scene appends the variant's lasting cost.

The second travel decision has already selected the ending. Actions now carry it out; Help and Influence do not recast that vote. The four-round cap and goal 4 apply after at least two exploration rounds. No new battle interrupts the finale.

| Tower target | Tokens and plausible interactions | Developed state and next use |
| --- | --- | --- |
| `beacon` / Beacon lens | Fight clear braces; Influence coordinate alignment; Investigate damage; Help align. | Preparations are marked; the lens stays dark until chapter completion. |
| `keeper` / Keeper at the tower | Influence confirm cost; Investigate repair plan; Help repair rota. | The recorded choice remains fixed; the keeper supports its practical consequences. |
| `cradle` / Prism cradle | Fight steady; Influence call fitting team; Investigate fit; Help prepare. | The prism remains in the shared pouch through preparations. |
| `town` / Waiting neighbours | Influence explain light; Investigate work route; Help safe work places. | Neighbours prepare; completion reopens the evening market under the restored light. |

| Lantern square target | Tokens and plausible interactions | Developed state and next use |
| --- | --- | --- |
| `lanterns` / Shared lanterns | Fight split stand wood; Influence sharing; Investigate shutters; Help light lanterns. | Safe lanterns are prepared; they do not imply the main beacon was restored. |
| `keeper` / Keeper in the square | Influence confirm cost; Investigate repair plans; Help rota. | Repairs have a shared plan; their completion is not invented. |
| `spark` / Sheltered prism | Fight clear release space; Influence reassure; Investigate maker mark; Help gentle release. | The prism stays intact until the finishing event. |
| `neighbours` / Neighbours at dusk | Influence repair rota; Investigate dark streets; Help distribute lanterns. | The community shares light; dark evenings remain the visible cost. |

Success completes preparations at goal; mixed reaches the cap with less preparation. The authored setback equivalent still carries out the recorded choice and supports the community. V2 classifies these as success/mixed and never reverses the branch to create a harsher outcome.

### On-screen context

Canonical tower; the square uses the equivalent four preparations above. The runtime appends the variant-specific cost to every target.

```scene-context
{"situation":"The party chose restoration. Prepare the beacon; the prism remains intact until completion.","targets":{"beacon":{"context":"The dark lens awaits the agreed restoration.","actionCues":{"fight":"Clear the lens braces","influence":"Coordinate the lens alignment","investigate":"Check the damaged lens","assist":"Align the beacon lens"},"development":{"context":"Preparations continue; the beacon has not yet absorbed the prism.","actionCues":{"fight":"Clear the lens braces","influence":"Coordinate the lens alignment","investigate":"Check the damaged lens","assist":"Align the beacon lens"}}},"keeper":{"context":"The keeper can repeat the lasting cost and prepare safe work.","actionCues":{"influence":"Confirm the lasting cost","investigate":"Review the repair plans","assist":"Prepare tomorrow's repair rota"},"development":{"context":"The recorded decision remains fixed; finish its preparations.","actionCues":{"influence":"Confirm the lasting cost","investigate":"Review the repair plans","assist":"Prepare tomorrow's repair rota"}}},"cradle":{"context":"Prepare the cradle while the prism stays in the shared pouch.","actionCues":{"fight":"Steady the stone cradle","influence":"Call for the fitting team","investigate":"Check the prism fitting","assist":"Prepare the prism cradle"},"development":{"context":"The cradle is being prepared; spending waits for completion.","actionCues":{"fight":"Steady the stone cradle","influence":"Call for the fitting team","investigate":"Check the prism fitting","assist":"Prepare the prism cradle"}}},"town":{"context":"Neighbours need safe working places before the light returns.","actionCues":{"influence":"Explain the returning light","investigate":"Check the evening work route","assist":"Prepare safe working places"},"development":{"context":"Neighbours are preparing for a changed evening.","actionCues":{"influence":"Explain the returning light","investigate":"Check the evening work route","assist":"Prepare safe working places"}}}}}
```

## Cost and branch contract

The connected graph has six nodes and nine directed edges: town → warehouse/canal/road; each middle node → beacon/Lantern square. Eight scene plates cover its three town places and five later destinations. Further finale nodes remain mysteries until their chapter is near.

Travel is a distinct authoritative `travel` phase, lasting at most 30 seconds and resolving early when all remaining eligible humans vote. Options, item provenance, fallback and electorate freeze at entry after the chapter reveal/admission boundary. Vote payloads contain only `decisionId` and `edgeId`; they do not consume a normal token or consumable. A unique plurality wins; ties and silence choose the open road at fork one, Lantern square/release at fork two. Both fallbacks display their actual cost.

One human can choose. Companions never vote. A departing voter's accepted vote remains recorded; uncommitted departure cannot hold the decision open. Arrivals during travel wait for the destination boundary. Travel grants no XP/chapter credit and no missed-turn penalty. Receipt retries cannot add a second vote or transition.

The final travel result stores `finaleChoice` and moves the party. It does **not** consume the prism, bind/free the spark, restore the beacon, or write the ending. Those irreversible changes happen once at chapter 3 completion. Restoration records a pouch spend linked to acquisition; release retains the object/mark as held history while its light is freed. That remaining pouch entry is not a reusable source of beacon light.

## Mechanics and scope

Town browsing, guaranteed authored exploration, seeded truth, short counter combat, class Help and the three-slot personal stash reuse expedition rules. Strike beats Trick, Trick beats Guard, Guard beats Strike. Fighter gains +1 for winning Strike, Rogue +1 for winning Trick before human scaling; Wizard Guard gives 3 protection; Cleric winning Strike heals 1 self HP. Class Help and downed Help retain their existing authored effects. Strongest cover wins.

Second wind restores up to 4 self HP; Smoke flask blocks 3 combat damage; Local favour chooses ledger/key during exploration; Spark dust doubles one exploration contribution; Binding thread adds 2 battle progress before scaling. One held item can accompany an accepted action. Fresh rewards cannot be spent in their acquisition batch; a full stash offers replace/decline. Quest objects occupy the separate shared pouch, with first acquisition, co-discoverers, spends, unlocked edges and confirmed transitions projected from structured events.

Authority and persistence remain in the existing command service and JSON snapshots. New rooms select `gemward@2`; `gemward@1` remains addressable. A malformed v2 state fails explicitly rather than silently becoming v1. Chronicle is optional reading, while Journey opens for travel. Only the accepted release commits a normal move; route voting is its own explicit confirm action. Exact pending action and travel commands survive uncertain responses/reload.

This is an authored graph with two coherent variations, not unrestricted procedural quest generation. Native accessible controls carry names and state; imagery is decorative. AI may interpret supported Spotlight intents and narrate confirmed facts, never select a route, spend a pouch object or change the truth.

## Closing image and keepsake

Restoration: “Gemward's beacon shines again.” The ending also states destroyed maker-mark evidence or the living spark bound again, then neighbours reopen the evening market. Release: preserved evidence or a free living spark, with safe shared lanterns and repairs beginning. These are the same lasting branches for success or mixed preparation; a setback cannot secretly grant both benefits.

Contribution recaps can truthfully say “You copied the delivery mark,” “You secured the canal landing,” “You protected the announced hero,” or “You prepared lanterns” only when those events exist. The travel result belongs to the party and retains actual votes. Keepsakes remain Iris's glass bead, a prism-thread bracelet and Gemward's little lantern under ordinary contribution eligibility; they confer no starting-power advantage. Gemward is outside the First Tales Thread/Story Pass catalog.

## Art and audio brief

Twenty bespoke raster assets are integrated as original PNG plus exact lossless WebP under `public/art/gemward-v2-*`. Eight opaque environment plates provide depth, architecture and quiet foreground without NPCs or interactive objects baked in. Twelve transparent cutouts depict five quest objects, two enemies and five consumables. Existing matching NPC illustrations remain separate pieces. Native icons remain appropriate for functional controls and missing-art fallback, not as replacements for the authored enemy.

The environment suffixes are `shop`, `inn`, `docks`, `warehouse`, `canal`, `road`, `beacon`, `lantern-square`; runtime location `tavern` maps to `inn`. Quest suffixes are `ledger`, `canal-key`, `prism`, `empty-gem-stand`, `price-board`; enemies `hired-guard`, `ward-construct`; supplies `second-wind`, `smoke`, `favour`, `dust`, `binding`.

[Exact prompts and provenance](../../.agents/skills/dropinn-art/references/gemward-v2-prompts.json) retain rejected drafts and targeted margin/inn revisions. The built-in image generator produced one asset per call. The encoder verifies complete alpha bounds and exact RGBA equality; the review script supplies portrait/landscape and 128/64/48px light/dark previews. No runtime image generation is added. The existing unchanged opening narration remains applicable; new spoken travel/finale variants are not claimed.

## Verification

- Story review: all eight beats, three bounded chapters, twelve canonical targets plus town/finale alternatives, both seeded truths and deferred costs are traced to the landed runtime.
- Art review: all twenty full outputs and the eight landscape/portrait crops plus twelve 128/64/48px cutouts on pale/dark surfaces were visually inspected. Transparent edges and exact PNG/WebP equality pass the encoder; `npm run art:check` passes. All three scene-context blocks parse as JSON. Live gameplay composition was reviewed in the shop, warehouse, beacon, canal and Lantern square; the eight-scene contact review is not a claim that all eight scenes received live browser layout review.
- Unit/service evidence: the full current Vitest suite passes all 746 tests. Journey coverage includes pinned v1/v2 behavior, frozen travel options/electorate, immutable and exact-retried votes, reversed arrivals, fallback/departure/parking, co-discoverer provenance, route dependencies and deferred finale effects. This is reducer/service evidence, not a completed browser playthrough.
- Final build/browser evidence: the production build passes after the final CSS, selected-map-memory and narrator-copy changes. On a fresh local server, the source-matched Journey runner passes 36 checks with zero errors through both actual two-player paths: Warehouse → Beacon and peaceful Canal → Lantern square. It covers shared discoveries, Spark dust/Local favour spending, both travel boundaries, lost vote acknowledgement/reload/exact duplicate, a two-round encounter without a filler return turn, completed branch consequences, three chapter rewards and recorded history after reload. On-demand Chronicle, selected map memories and 320×568, 390×844 and 1280×900 layouts were checked. Evidence: `output/playwright/journey-results.json` and the accompanying screenshots. These are isolated local command-handler/browser results.
- Narrator opening evidence: five browser scenarios pass with real opening WAV playback while model transfer is held or initialization is mocked. The 320/390 narrator settings layouts were visually checked. This verifies the bundled-opening/fallback interface, not live model inference latency. Evidence: `output/playwright/narrator-openings.json`.
- Earlier-adventure regression: the final full browser runner passes 102 checks with zero failures, browser errors or external/model calls, including automatic narration, failure fallback, retry and subtitles. Earlier fixture-binding timeouts were resolved in the harness without gameplay changes. Evidence: `output/playwright/scene-integration-results.json`. Historical v1 test totals remain separately scoped.
- Human questions: Can a newcomer point to the missing object, explain whose discovery opened a path, distinguish inspection from a spent move, identify why the next destination became available, and state both the chosen cost and when it happens? Ask what another player contributed and whether they want another turn; record observations rather than inferred fun.
- No hosted deployment, live Realtime, physical-device performance or uncoached enjoyment result is claimed.
