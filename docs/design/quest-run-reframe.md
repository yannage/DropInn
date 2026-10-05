# Quest Run: a new mechanical starting point

Status: design hypothesis and implementation handoff, not an implemented mode or human playtest result. Written 2026-10-04. The user has authorized building the next iteration; no additional preference or approval gate is required before the bounded implementation below.

## Decision for this iteration

Build **QR01-B, Torch Run**: a shared quest through a small room map, with one player holding the focus for a short sequence of consequential actions. Investigating a room can reveal people; talking to one can produce a lead; that lead opens a route. The two actions belong to the same focus, rather than making the player wait an entire party rotation between discovering a person and speaking to them.

Combat has enemy health and actual **Attack, Defend, class Spell, and Mend** actions. Loot changes those actions during the run. The important mechanical contrast with Gemward is that a choice changes a specific person, object, enemy, resource, or route; an ordinary action does not also advance an invisible general chapter meter.

This recommendation selects a feasible implementation hypothesis against the brief. It is not a ranking of speculative fun. Four substantially different hypotheses survive below; human play is still needed to distinguish whether the new focus, decisions and rewards are engaging.

## Brief and boundaries

The user wants to preserve the MS Paint art style and permits replacing chapters, universal tokens, timing and the old action loop. They describe a turn with room to complete an intention: investigate a tavern, discover its occupants, then choose whom to talk to. The desired combat actions are explicit; useful loot, growing strength, harder encounters and replay variation are part of the requested loop. Less story and more game is acceptable.

Implementation assumptions supplied by the parent brief: React on phones and desktop; authoritative multiplayer; one to four human players; drop-in/leave support; a target visit of 10–15 minutes; existing artwork; older modes stay addressable. The target duration is a design target, not measured evidence or a promised maximum. The user did not settle the exact number of actions or focus duration. Two consequential beats under one 45-second focus is the bounded choice for this implementation.

Hard constraints for this search:

- One visible shared quest; the current player can complete a short, intelligible action sequence.
- Sequential player focus, while others can inspect and follow the common state.
- A room map; explicit Attack/Defend/class Spell/Mend combat; useful run loot and progression.
- One human must be sufficient. A departed person cannot take the sole quest key or block a required action.
- No authoritative browser snapshots, invented automatic consent, or dependency on generated prose.
- Mobile input, keyboard operation, reduced motion, clear pending/retry state, and preserved old modes.

Preferences rather than hard proof: discovery, fellowship, a clear short quest, a first useful action quickly, and choices that produce a visible consequence. No new art quantity, elaborate metaprogression, or narration can establish whether the core loop works.

Sources and provenance: the user's instructions as relayed by the parent; current `CLAUDE.md`; the local [storytelling baseline](../storytelling-guide.md) and [story template](../stories/TEMPLATE.md); the [exploration skill](../../.agents/skills/exploring-game-design-space/SKILL.md) and its four references; and [game-design fundamentals](../../.agents/skills/game-design-fundamentals/SKILL.md). All candidate evidence below is a cheap verbal rule trace from this document, not simulated or observed human behavior. Skill heuristics about engagement are used as questions, not as guarantees.

## Search coverage and notation

The obvious first tuple is **commit → build quest state → opportunity cost** (QR01). Roots QR02–QR18 do not use that complete tuple. Coverage was assigned before elaboration across operations (allocation, prediction, delivery, combination, inference, trading, construction, transformation), topology (graph, queue, slots, network, grid), information (visible, local, hidden, predictive), and pressure (resource depletion, adversary, delayed debt, irreversible choice).

Every root uses the same normalized fields. `Auto` describes what changes without a fresh choice, not permission to advance an unattended room. Automatic dynamics occur only at an authoritative action/round boundary, except active-seat timeout. Empty rooms park. Every candidate retains the required combat action vocabulary; the record describes its distinguishing recurring decision, not a different coat of fiction.

Signature order is always **time / control / state / operation / progress / risk / information / failure / skill**. All roots have `lineage: root`. `Root—deferred` means retained but outside the six-candidate elaboration budget; it is not a mechanical rejection. `Survives` means it passed only the stated cheap guards and received elaboration. No root was removed merely for sounding less appealing.

## Eighteen root concepts

### QR01 — Torch circuit

- **Core / goal:** complete small room objectives under rotating focus to recover and return the quest object.
- **Decision / actions:** use the current focus to reveal, interact, prepare or move; choose a useful next step rather than clicking every target.
- **Read / auto:** visible room targets, learned facts, open exits, party condition; focus advances after its action allowance or deadline.
- **Progress / risk:** named facts and object states satisfy routes; an action uses an opportunity that could have prepared the party or found another route.
- **Expert / learning:** recognize when a lead is sufficient and when a detour supports the party's current build; learn alternate uses of familiar room objects.
- **Signature:** turn / cursor-target / graph / commit / build-state / opportunity-cost / local / opportunity-loss / prioritization.
- **Guard evidence:** idle cannot produce a lead; talking to a revealed person and preparing a useful supply change different future options. Repeating known information does not earn another reward.
- **Unknown / status:** a fixed scene allowance could encourage menu clearing or make one player monopolize a room. **Survives.**

### QR02 — Provision expedition

- **Core / goal:** spend a finite shared provision pool to reach and return from the objective.
- **Decision / actions:** allocate the active player's effort to food, medicine, scouting or forward travel; choose a shorter dangerous room or longer supplied route.
- **Read / auto:** stock, route length, visible hazards, hero wounds; travel consumes the displayed provision cost.
- **Progress / risk:** distance becomes delivered quest progress; every forward edge reduces the reserve needed to return.
- **Expert / learning:** route against present stock instead of always taking the shortest path; learn which detours replenish the bottleneck.
- **Signature:** turn / allocation / graph+gauges / allocate / deliver / reward-consumes-safety / local / depletion / planning.
- **Guard evidence:** the cheapest outward path can leave too little stock for its return, while a replenishing detour reverses that preference.
- **Unknown / status:** a convincing return budget may consume too much of a short session; provision tuning is unspecified. **Root—deferred.**

### QR03 — Forecast expedition

- **Core / goal:** learn and prepare for an announced future threat before reaching the final room.
- **Decision / actions:** scout an upcoming attack, acquire a counter, or take immediate equipment; during combat choose the action matching the forecast and current health.
- **Read / auto:** known future attack order, incomplete forecast, counters and mana; the forecast advances when an enemy phase resolves.
- **Progress / risk:** correct preparation preserves the party through an encounter sequence; immediate strength competes with later protection.
- **Expert / learning:** value a counter to the next dangerous phase over a larger generic number; learn recurring patterns without requiring memorization of hidden rules.
- **Signature:** turn / selection / queue / predict / survive / adversarial / predictive / opponent / prediction.
- **Guard evidence:** a ward is useful before its matching attack and wasteful after it; Attack cannot answer every lethal announced threat.
- **Unknown / status:** if the forecast directly names the unique answer, decisions collapse into matching icons. **Root—deferred.**

### QR04 — Courier chain

- **Core / goal:** transport several quest components through rooms that can alter or endanger the carried load.
- **Decision / actions:** pick up, deliver, exchange or protect one shared cargo slot; choose a route by the current cargo, not just its endpoint.
- **Read / auto:** cargo slots, delivery needs, fragility, next-room hazards; a traversal applies its declared cargo effect.
- **Progress / risk:** fulfilled deliveries open the final objective; taking a valuable fragile component limits safe routes and other cargo.
- **Expert / learning:** order pickups and deliveries to reduce exposure; learn when an apparently weak component completes an efficient delivery chain.
- **Signature:** turn / routing / graph+slots / route / deliver / delayed-debt / local / depletion / planning.
- **Guard evidence:** filling every slot can block the component required by a nearer delivery; empty travel preserves options but provides no delivery reward.
- **Unknown / status:** transport bookkeeping and backtracking may dominate character interaction. **Root—deferred.**

### QR05 — Handoff openings

- **Core / goal:** create useful short-lived opportunities that another focused hero can exploit to clear rooms and fights.
- **Decision / actions:** take a small immediate result, establish a named opening, or spend an existing opening with an appropriate action.
- **Read / auto:** active openings, next hero, class and remaining resources; an opening expires after the next eligible focus.
- **Progress / risk:** linked actions convert into stronger concrete outcomes; a setup forgoes immediate output and can expire unused.
- **Expert / learning:** prepare for the next hero's available action rather than maximizing one's own immediate output; learn cross-class routes.
- **Signature:** turn / cursor-target / queue+slots / combine / chain / opportunity-cost / perfect / opportunity-loss / planning.
- **Guard evidence:** an opening for an absent or mana-empty next hero can be worse than an immediate action; a reachable matching hero reverses that choice.
- **Unknown / status:** strangers may feel compelled to follow a predecessor's prescription; setup value depends on class and queue composition. **Survives.**

### QR06 — Evidence commitment

- **Core / goal:** obtain enough evidence to choose an approach to the quest, then live with the revealed result.
- **Decision / actions:** investigate one of several clues, question a person, spend a lead on an approach, or prepare for an uncertain attempt.
- **Read / auto:** observed evidence, competing explanations, clue costs and approach consequences; choosing an approach reveals its hidden authored condition.
- **Progress / risk:** evidence selects a concrete path to the objective; acting early saves preparation opportunities but risks a harder encounter or missed optional reward.
- **Expert / learning:** ask a question that discriminates between explanations instead of reading every available clue; learn what evidence is decisive.
- **Signature:** turn / selection / network / predict / solve / opportunity-cost / hidden / opportunity-loss / inference.
- **Guard evidence:** one discriminating clue can change the preferred approach; a second equivalent clue adds certainty but not a new route.
- **Unknown / status:** content production and remembering prose may become the actual game; hidden conditions must not secretly invalidate earned success. **Survives.**

### QR07 — Bargain builds

- **Core / goal:** assemble a useful run build by accepting equipment contracts with visible burdens.
- **Decision / actions:** keep current gear, trade it, or accept stronger gear paired with a restriction until its condition is paid.
- **Read / auto:** equipped effects, open slots, burden, next encounter and party roles; contract effects trigger on named actions or room completion.
- **Progress / risk:** equipment makes later combat and access possible; power consumes flexibility or commits a future resource.
- **Expert / learning:** take a drawback the current party can cover, rather than selecting the biggest damage number; learn effect combinations.
- **Signature:** turn / selection / slots / trade / convert / delayed-debt / perfect / depletion / planning.
- **Guard evidence:** a heavy weapon is useful against one armored enemy but can be costly when the party needs repeated Mend; keeping old gear remains meaningful.
- **Unknown / status:** enough legible contracts for replay may create excessive rule text; malicious burden assignment must be impossible. **Survives.**

### QR08 — Build the route

- **Core / goal:** construct a temporary route through disconnected rooms and preserve a way home.
- **Decision / actions:** place a limited bridge, recover one behind the party, or take a dangerous natural connection.
- **Read / auto:** graph connectivity, remaining bridge pieces, known rooms and current position; a recovered bridge closes its edge.
- **Progress / risk:** graph construction makes objectives reachable; forward construction can remove a safe retreat or spend the last connector.
- **Expert / learning:** preserve optional connections until their information is useful; learn layouts in which a temporary loop saves a scarce piece.
- **Signature:** turn / placement / graph / construct / territory / same-action-creates-risk / local / deadlock / planning.
- **Guard evidence:** using the last piece on an optional branch can block the required route under the literal rules; a permanent baseline exit is needed to meet fail-forward scope.
- **Unknown / status:** without that fallback some seeds may be unsolvable; fallback strength may make bridge decisions irrelevant. **Root—deferred, reachability unproven.**

### QR09 — Initiative queue

- **Core / goal:** order the party's forthcoming actions so effects land before the threats they answer.
- **Decision / actions:** execute now, defer to a later queue slot, or spend a resource to move an action ahead of an enemy.
- **Read / auto:** visible initiative queue, promised enemy attacks and current status; the next queued entry resolves after the current choice.
- **Progress / risk:** correct ordering removes opponents or preserves heroes; deferring power may let a threat resolve first.
- **Expert / learning:** recognize when Mend must precede a strike or an armor break must precede Attack; learn action dependency patterns.
- **Signature:** turn / allocation / queue / allocate / exhaust-opponent / delayed-debt / predictive / opponent / planning.
- **Guard evidence:** the same damage action has different value before and after a lethal enemy slot; always using the first slot is not necessarily dominant.
- **Unknown / status:** queue manipulation may obscure whose turn it is and requires more visible state on phones. **Root—deferred.**

### QR10 — Wounded power

- **Core / goal:** use a dangerous temporary power reserve earned by absorbing or accepting harm to finish the quest.
- **Decision / actions:** spend stored strain on a stronger class action, preserve it, or Mend and relinquish some reserve.
- **Read / auto:** health, strain, enemy damage and healing availability; incoming damage creates bounded strain and healing reduces it.
- **Progress / risk:** danger converts into offensive power; maximizing power narrows the survival margin.
- **Expert / learning:** spend before an impending knockout and heal before a low-payoff risk; learn thresholds that suit different classes.
- **Signature:** turn / selection / gauges / convert / exhaust-opponent / danger-enables-reward / perfect / depletion / prioritization.
- **Guard evidence:** at high health a small hit can finance a useful spell; near knockout the same hit prevents using that reserve.
- **Unknown / status:** encouraging deliberate damage may contradict newcomer instincts, and mandatory damage risks replacing choice with a tax. **Root—deferred.**

### QR11 — Borrow the hazard

- **Core / goal:** redirect enemies or environmental hazards to remove obstacles the party cannot efficiently break alone.
- **Decision / actions:** Attack normally, Defend the threatened target, or lure an announced strike toward a selected obstacle.
- **Read / auto:** attack line, obstacle state, hero exposure and enemy position; a committed enemy strike hits the frozen target or declared redirect.
- **Progress / risk:** a hostile effect becomes a quest tool; useful redirection exposes a hero or leaves an attack unblocked.
- **Expert / learning:** exploit a dangerous attack when its environmental payoff exceeds a normal action; learn which obstacles have alternative safe solutions.
- **Signature:** turn / cursor-target / graph+slots / transform / build-state / adversarial / predictive / opponent / prediction.
- **Guard evidence:** killing a hazard source can remove a cheap way through a barrier, while preserving it risks more damage.
- **Unknown / status:** room-specific interaction logic and truthful art may exceed the fixed-asset implementation budget. **Root—deferred.**

### QR12 — Backpack geometry

- **Core / goal:** fit useful gear and quest objects into a small shared arrangement whose adjacency changes their effects.
- **Decision / actions:** carry, rotate, replace or connect equipment; trade immediate capacity for an action synergy.
- **Read / auto:** occupied cells, item footprints, adjacency rules, expected encounter; triggered effects apply when the corresponding action is committed.
- **Progress / risk:** arrangements strengthen the party enough to overcome encounters; carrying one item excludes another shape or combination.
- **Expert / learning:** value an ordinary piece that completes an interaction over a larger standalone bonus; learn a limited set of adjacency rules.
- **Signature:** turn / placement / grid / combine / convert / opportunity-cost / perfect / opportunity-loss / planning.
- **Guard evidence:** two small cooperating pieces can outperform one large piece in one encounter, but leave no space for a required quest object under naive rules.
- **Unknown / status:** quest objects need separate storage; touch editing and geometry can become a second game that overwhelms room play. **Root—deferred.**

### QR13 — Depth and cash-out

- **Core / goal:** secure the quest, then decide how much optional treasure to risk before returning.
- **Decision / actions:** bank current spoils, enter a harder branch, spend a supply to scout, or retreat from a declared encounter.
- **Read / auto:** secured versus unsecured rewards, remaining health/mana, visible next threat and return path; forward depth increases encounter pressure.
- **Progress / risk:** surviving and exiting converts unbanked finds into kept run value; chasing another reward risks the unsecured portion.
- **Expert / learning:** stop when the marginal risk exceeds the build's capacity, rather than always pushing or returning immediately; learn estimates from past encounters.
- **Signature:** turn / routing / graph+gauges / commit / collect / same-action-creates-risk / local / depletion / prioritization.
- **Guard evidence:** a healthy specialized build and a wounded depleted build can prefer different decisions at the same branch; exit must preserve something already earned.
- **Unknown / status:** repeated retreat may feel anticlimactic, and a 10–15-minute target can conflict with uncapped extra depth. **Survives.**

### QR14 — Promises network

- **Core / goal:** recruit the help needed for the quest while honoring a small number of public promises.
- **Decision / actions:** accept a request, fulfill an existing promise, trade a favor, or choose a slower independent route.
- **Read / auto:** people reached, public promises, mutually exclusive needs and available tools; fulfilling a named condition changes the relevant NPC's aid.
- **Progress / risk:** relationships open assistance and access; accepting quick help commits a later resource or route.
- **Expert / learning:** combine compatible promises and decline conflicting ones; learn which relationships provide alternatives rather than mandatory keys.
- **Signature:** turn / selection / network / transform / solve / delayed-debt / local / opportunity-loss / inference.
- **Guard evidence:** two requests can need the same one-use item, making indiscriminate acceptance worse than a selective route.
- **Unknown / status:** distinction from a checklist depends on authored opportunity conflicts; content and memory burden are high. **Root—deferred.**

### QR15 — Shared action draw

- **Core / goal:** allocate a small visible draw of limited action resources to the heroes who can use it best.
- **Decision / actions:** spend a die/token on Attack, Spell, Mend or a room action, pass a resource to the next focus, or accept a weaker universal fallback.
- **Read / auto:** current draw, class conversion rules, remaining enemy intentions and next hero; a depleted draw refills at the round boundary.
- **Progress / risk:** limited resources convert into progress and survival; using a high-value resource now removes it from another hero's options.
- **Expert / learning:** place a scarce resource where it changes the outcome rather than always maximizing the current hero's number; learn bag composition from gear.
- **Signature:** turn / allocation / cards-hand / allocate / convert / opportunity-cost / stochastic / depletion / prioritization.
- **Guard evidence:** a resource that barely adds damage can prevent a knockout when allocated to Mend; every hero must retain a legal fallback.
- **Unknown / status:** shared allocation invites quarterbacking and a poor draw could make a player's featured turn feel empty. **Root—deferred.**

### QR16 — Traveling workshop

- **Core / goal:** build a small set of shared tools from encountered materials, choosing the tools that will support the final quest.
- **Decision / actions:** gather a material, assemble a recipe, repair a tool, or spend that material directly in the room.
- **Read / auto:** recipe graph, material stocks, durability and known next requirements; using a tool consumes its declared durability.
- **Progress / risk:** constructed capabilities replace or improve future actions; gathering and assembly displace immediate exploration and consume flexible materials.
- **Expert / learning:** build the capability that removes repeated costs, or conserve materials when only one use remains; learn recipe dependencies.
- **Signature:** turn / selection / network+slots / combine / build-state / opportunity-cost / perfect / depletion / planning.
- **Guard evidence:** a reusable tool can dominate direct spending only when enough uses remain; near the ending direct use can be better.
- **Unknown / status:** the minimum satisfying crafting horizon may be longer than the target session. **Root—deferred.**

### QR17 — Pay for the map

- **Core / goal:** select routes using limited information while deciding how much preparation to spend on reconnaissance.
- **Decision / actions:** scout one room, buy a reliable route report, follow a partial hint, or commit to an unknown connection.
- **Read / auto:** known room distributions, reports, current build, scouting budget; entry reveals the chosen room's authored content.
- **Progress / risk:** information changes route selection; scouting consumes resources that could have answered the encountered threat.
- **Expert / learning:** scout only where information can change the choice, rather than always revealing everything; learn readable content tags.
- **Signature:** turn / routing / graph / predict / deliver / reward-consumes-safety / hidden / opportunity-loss / inference.
- **Guard evidence:** scouting two routes is wasteful when both lead to the same required capability; it matters when the build has one clear weakness.
- **Unknown / status:** if revealed routes differ only cosmetically, information has no mechanical value; authored distribution is unspecified. **Root—deferred.**

### QR18 — Formation quest

- **Core / goal:** maintain a useful party formation while moving through rooms and defeating enemies that threaten particular positions.
- **Decision / actions:** attack or cast from the current position, Defend a lane, Mend a hero, or exchange positions at a real action cost.
- **Read / auto:** front/rear slots, reach, incoming target, armor and health; enemy intentions resolve against the declared positional contract.
- **Progress / risk:** positioning creates safe damage and protection opportunities; moving forfeits output and changes who faces future danger.
- **Expert / learning:** move before a dangerous pattern or exploit an exposed rear enemy instead of always prioritizing damage; learn class/gear positioning effects.
- **Signature:** turn / placement / slots / allocate / exhaust-opponent / adversarial / predictive / opponent / planning.
- **Guard evidence:** protecting a fragile caster before a sweep can beat another attack; with the enemy nearly defeated the extra attack can prevent the sweep entirely.
- **Unknown / status:** additional position rules may crowd a small screen and confuse explicit intended-victim messaging. **Survives.**

## Guard results and neighbor collapse

No root has demonstrated superiority in human play. No hard rejection was needed to reduce the elaboration set: twelve roots remain documented and deferred under the search budget. QR08 has a specific unresolved reachability defect under naive procedural generation; it is not silently declared safe. A solver or authored fallback is required before implementation.

The anti-reskin comparison strips all people, place and theme names and compares state read, transformation, conversion, pressure and expert behavior. Nearest pairs were checked explicitly:

| Pair | Why they remain distinct under the four-of-five test |
| --- | --- |
| QR01 / QR06 | Named state completion versus discriminating between hidden explanations; perfect/local opportunity choice versus committing under uncertainty. They share room selection but not the knowledge test or preferred expert behavior. |
| QR02 / QR04 | A fungible reserve funds traversals versus individually transformed cargo satisfying destinations. Cargo order and constraints cannot be replaced with one provision number without changing the decisions. |
| QR03 / QR09 | Acquiring counters to a fixed forecast versus rearranging the temporal ordering itself. Knowing the next attack and changing its place are different operations. |
| QR05 / QR09 | The first changes what a later action can do; the second changes when existing actions occur. Setup expiration is not an initiative reorder. |
| QR07 / QR14 | Equipment contracts alter action math through explicit burdens; relationship promises change network access and resource obligations. If NPC promises were merely gear shops, QR14 would be a duplicate and should be collapsed. |
| QR12 / QR16 | Spatial packing and adjacency versus a material/recipe dependency network. Removing positions deletes QR12's decision but not QR16's. |
| QR06 / QR17 | Select evidence to identify an approach versus buy information to choose between mechanically different routes. If both reduce to paying once to reveal a guaranteed best exit, collapse the weaker implementation. |
| QR01 / QR13 | Required quest completion versus risk-sensitive conversion of unsecured loot through a chosen exit. QR13 requires a meaningful stop decision absent from QR01. |

First-round elaboration set: **QR01, QR05, QR06, QR07, QR13, QR18**. It spans completion, cooperation, inference, contracts, cash-out and positional tactics. This is coverage-based investment allocation, not six winners on a fun score.

Across that set, idle never acquires progress. Repeating known facts does not farm gifts. Always Attack is challenged only when enemy intent, mitigation, mana or future capacity actually changes its payoff; naming four buttons is insufficient. Always hoard and always spend need counterexamples in reachable builds. An unlimited safe rest that restores everything would remove many of these decisions and is excluded from the first bounded implementation.

## Mechanism mutations

Mutations inherit all parent fields except the changes below; each specifies the causal change and new uncertainty. These are cheap rule traces, not a second source of empirical evidence.

| ID / lineage | Operator and exact change | Expected behavior difference | New risk / guard result |
| --- | --- | --- | --- |
| **QR01-A ← QR01** | Commitment: focus holds exactly two consequential beats with one shared 45-second deadline. An initial Search can reveal targets and a second interaction can act on one before focus passes. Inspection of already known information is free. | A player can complete a small intention without waiting a whole party rotation; the second choice reads the first result. | Four-person wait can still reach 135 seconds between focuses. The deadline must not reset after a substep. Survives; attention during others' turns is unobserved. |
| **QR01-B ← QR01-A** | Reduction: delete generic chapter progress and compulsory four-target/token coverage. Every paid action changes an explicit local state/resource; repeat information is a free read. Combat switches to damage, mana, cover and healing. | Removes the rational habit of clicking any safe progress contribution; decisions depend on the room and build. | Authoring must provide real alternatives and truthful no-progress outcomes. Survives; recommended bounded build. |
| **QR05-A ← QR05** | Commitment: an opening lasts until one eligible hero uses it or the party leaves the room; it does not expire solely because a disconnected next seat was skipped. | Supports drop-in continuity without forcing the immediately next player into a prescribed move. | Too-long storage can make setup universally correct. Cap one opening per source and make competing immediate action useful. Survives, tuning unknown. |
| **QR06-A ← QR06** | Information: give two visible hypotheses and make one optional clue distinguish them. A wrong approach opens a harder but valid route; it never erases the quest. | Rewards selecting useful evidence while keeping an early commitment legitimate. | Familiar runs may solve the same inference from memory. Seed must change the hidden condition and truthful clues together. Survives. |
| **QR07-A ← QR07** | Delay consequence: a contract burden lasts exactly until the next completed encounter, then the gear becomes ordinary; refusing keeps current gear. | Makes a short-run cost assessable and avoids carrying paragraphs of debt into the ending. | If the next fight cannot exploit the burden, the upgraded item dominates. Need at least two relevant reachable encounter types. Survives provisionally. |
| **QR13-A ← QR13** | Cash-out: the required quest payoff becomes secured before an optional single danger branch. Only declared bonus loot is unsecured; no further endless branches. | Creates an honest stop/push decision without letting a greedy vote destroy the shared quest or session bound. | Many parties may always skip if bonus loot has no immediate use. The optional branch must precede one remaining use of its reward or grant a clearly chosen run result. Survives. |
| **QR18-A ← QR18** | Topology reduction: use two labeled positions, exposed and sheltered, instead of a grid. A hero may switch as their action; Defend can protect a named ally regardless of position. | Retains a position/opportunity tradeoff with less phone state and a universal rescue fallback. | A dominant fixed formation is possible. The enemy must sometimes value a different arrangement without silently changing its announced strike. Survives. |

No second mutation was applied to every candidate merely to fill a quota. QR01's second mutation attacks its main similarity to the existing implementation. Other outstanding uncertainties require numbers, a working state trace or people playing; more adjectives or content would not resolve them.

## Final four-hypothesis slate

These records inherit the complete normalized parent/mutation fields above. They are intentionally unequal in implementation cost and equal in evidential status: design hypotheses.

| Hypothesis | Why retained / strongest evidence and provenance | Main risk / unresolved question | Smallest discriminating test |
| --- | --- | --- | --- |
| **QR01-B — Torch Run** | Directly changes the requested recurring decision: a revealed room affordance can be used within the same focus. Verbal trace: Search → choose person → obtain lead → alternate route; no generic progress required. | Does two-beat focus create ownership, or does four-player waiting overwhelm it? The 45-second limit is untested. | Two rooms, one fight, one gear choice, four players. Record focus length, off-turn attention, and whether an uncoached player can state what their two-step action changed. |
| **QR06-A — Evidence Run** | The preferred investigation changes between two authored hidden conditions. Verbal two-state trace demonstrates information value and a viable costly wrong route. | Will newcomers infer a useful question rather than guess, read everything or rely on a veteran? | Two conditions with the same visible start, three clues, two approaches and the same final encounter. Observe question selection and explanations without coaching. |
| **QR13-A — Secured Quest, Risky Return** | The preferred push/exit choice changes between healthy and depleted builds while earned quest success remains secure. Verbal counterexamples defeat automatic always-push and always-exit claims if rewards are tuned. | Is a bounded optional risk worth taking, and does the party accept the focus owner's decision? | One secured reward, one optional branch, two starting resource states. Record choices and whether players correctly predict what can be lost. |
| **QR18-A — Formation Run** | A near-dead enemy and an imminent lethal attack prefer different damage/protection choices. Two-position topology preserves a spatial decision with minimal stage changes. | Does position create useful tactical variety beyond Defend, or only another obligatory setup click? | One room, two enemy patterns, two positions, no loot. Compare actions and explanation against a fixed-front/fixed-rear policy over three encounters. |

QR05-A and QR07-A remain surviving candidates outside the four-slot slate. Cooperation openings and contract burdens could later answer observed weaknesses. They are not automatically added to QR01-B: combining all survivors would conceal which mechanism improved or harmed play. Plain gear effects are required by the brief; contract debt and chaining systems are not required for this iteration.

Stop conditions met: the four candidates cover the meaningful feasible neighborhoods selected for the brief, and remaining uncertainty needs implementation or human play. The search did not prove a best concept.

## Bounded implementation hypothesis: QR01-B

### The first minute and recurring loop

Open on a room with a short, visible shared objective, a visible obstacle or missing object, and a clear current-player marker. Keep the purpose on screen while inspecting. Example mechanic sequence, not a final authored story packet:

1. **Read:** the room contains a trail worth investigating; the player sees what Search can reveal and that it costs one of two beats.
2. **Commit Search:** occupants or an important object become available; the confirmed change is shown in the scene. The same player remains active and the existing deadline continues.
3. **Choose a follow-up:** inspect the revealed possibilities freely; talk to one person or act on the object. The preview names the plausible benefit or cost, not a guaranteed secret revelation.
4. **Commit the follow-up:** a clue, useful item, relationship or explicit setback is recorded. Focus passes to the next present human. The result remains readable during that person's choice.

Do not turn every room into exactly Search then Talk. An already visible threat may need immediate Defend or a practical action. A person may be directly available. Search may reveal information that justifies leaving the room with the second beat. A failed or unproductive attempt is legitimate when the player had a reason to try and the result explains what was learned; it does not silently award an unrelated chapter-progress point.

Free inspection reads known people, labels, inventory and route facts. Revealing unknown facts or earning supplies requires a committed action. This distinction prevents a nominally multi-step interaction from becoming a row of free menu clicks followed by the old single generic contribution.

### Focus and social continuity

- One active human owns two exploration beats with one **45-second combined** deadline, explicit beats remaining and an always available Pass. Presentation never extends this deadline.
- Every consequential substep increments the authoritative command boundary, even when the same person retains focus. Keep separate focus ID, owner, remaining beats and fixed deadline. Exact retry repeats the original ID and payload; it cannot replay a first beat as a new second beat.
- Only the active seat can consume a beat. Others can inspect the common room, read the result, manage non-authoritative drafts and send suggestions through ordinary chat. Their waiting UI says whose focus it is and who follows. Do not add a second compulsory spectator mini-game or pretend their drafts are accepted actions.
- An active player can Pass early. Timeout spends no item, invents no discovery and passes the remaining exploration beats. Combat timeout uses an explicit safe defense for the current actor. Missed-focus handling applies only to the active human, never the waiting party.
- Preserve the rotation across room changes so choosing an exit does not award its chooser the next room's first focus again. After a disconnect, skip or finish accepted work under a bounded rule; the missing player cannot hold an entire room hostage.
- A newly joined hero enters at a focus/encounter boundary with a visible catch-up and appropriate baseline strength. Quest facts and tools belong to the run. With no humans, finish accepted work once and park.

The main technical warning comes from the runtime agent's source review, not playtesting: the existing engine waits for every human and applies missed-turn handling collectively. Sequential focus requires a pinned mode-specific lifecycle. Disabling other players' buttons over the old simultaneous reducer would be incorrect.

### Rooms and routes

Use a small authored graph with a required quest path, two mechanically different side choices and a guaranteed baseline route. A first implementation can visit roughly five to seven nodes, including the final return. Avoid a large procedural map until rooms have useful decisions.

Each room definition supplies visible starting state, possible reveals, 2–3 consequential interactions, exits, one concrete objective/final state, and a fail-forward exit. The scene can show more people if revealed; do not force a four-card grid or require every universal token to be valid on every object. A compact list is acceptable for selecting among five occupants after the discovery, with the selected person grounded in the illustration.

Use existing plates and cutouts truthfully. The map shows visited/current/available rooms, their useful tags (fight, rest, trade, lead) and only known costs. A key opens a route; it does not imply every locked node is mandatory. A required key is shared, persistent across departures, and reachable by a documented fallback. Store generated room contents and reward offers with the run seed so reconnecting cannot reroll them.

The active focus can propose and explicitly commit an exit when its displayed requirements are met; the exact party choice rule must be visible and pinned for this mode. Prefer one understandable rule throughout the first build. Avoid adding a separate unanimous vote after every room. For a costly irreversible shared exit, either use an explicit short vote already supported by the implementation or give the active player clearly advertised leadership; do not conceal a cost behind an ordinary movement click.

### Combat that is mechanically different

Combat temporarily replaces exploration focus with one action per hero, then resolves the announced enemy phase. It uses separate state and UI, not a recolored chapter meter. A dead enemy no longer attacks; healing restores a named hero's actual HP; cover prevents a named amount of incoming damage; mana pays for a class effect. Display those quantities before commitment.

| Action | Required role in the decision | Prototype constraint |
| --- | --- | --- |
| **Attack** | Reliable damage to a chosen living enemy. Finishing it can prevent its pending attack. | Show damage and armor interaction; do not hide a rock-paper-scissors stance underneath. |
| **Defend** | Protect self or a selected ally from the announced threat; may restore a bounded amount of mana. | Protection expires at the declared enemy phase; state whether it stacks. A stale victim must not redirect silently after departure. |
| **Class Spell** | Spend mana on a class-specific effect: burst/mark, exploit, armor break, or healing/protection combined with pressure. | Give it an exact effect and cost. A changed icon on identical progress is insufficient. Every class has an understandable use case. |
| **Mend** | Universal targeted healing that trades immediate offense or spell resources for survival. | Show amount, target and finite cost; cannot restore beyond maximum HP or farm rewards. |

Initial numbers should be data, not assertions of balance. Use a small mana cap, bounded gear bonuses, one or two enemies with visible intentions, and ordinary encounters designed to end in approximately two to three enemy phases. One harder final encounter demonstrates the acquired build. Explicitly test states where Attack, Defend, Spell and Mend each change the preferred choice. A safe option may be viable; it must not strictly dominate every alternative.

The first build should not implement grid movement, card draws, positional lanes, dice drafting, random hit tables, multi-layer status stacks and timed dexterity together. The requested action vocabulary plus equipment, intent, mana and health is enough to expose whether tactical choices exist. Animation and sound report the accepted action; they never hold the simulation or substitute for its effect.

### Loot and run growth

After a meaningful room outcome or encounter, offer one of two understandable upgrades, a useful consumable, or a quest object with an explicit next use. Do not pay identical gifts for repeating a solved interaction. A choice should connect to the next decision: a weapon improves Attack, a charm changes a class Spell or Defend, a limited supply supports Mend or recovery.

Keep quest inventory separate from personal equipment. Start with at most two equipment slots and a three-item consumable stash, using actual illustrated existing items where their meaning matches. Full-stash rewards become explicit keep/replace/decline choices, not silent loss. A consumable is attached to a committed action or used through an explicit item command; inspection does not spend it. Failures and exact retries cannot duplicate or destroy the offer.

Favor sidegrades or narrow bonuses over multiplying every stat. At least one available reward should be better for a different current build, not merely a larger number. Upgrades persist for the run and reset for a new run; existing cosmetic/keepsake progress remains separately governed. Do not introduce permanent paid or saved-stat advantages to support this prototype.

Optional run attribute allocation can be a single clear opening or mid-run choice after the core loop works. It is not needed to prove loot progression. Three menus of stat points before the first room would delay the question the prototype needs to answer.

### Replay variation with authored authority

Vary a small number of causal dimensions: which lead is available, which optional room lies on a branch, which of two enemy intentions/builds is present, and which upgrade pair is offered. Seed combinations must remain solvable with one human and the weakest legal starting build. The evidence and dialogue must agree with the chosen condition; random NPC names alone do not create a new decision.

Do not hide an essential clue behind a repeated chance roll. Do not make all keys random independent drops. If an objective needs one of several tools, guarantee at least one complete acquisition path. Record the condition and generated offers once on the server. A replay claim requires exercising distinct reachable seeds, not changing only narration.

### Story Circle supports the run

The local storytelling baseline remains useful as an authoring test; its old simultaneous turns and universal four-token interface are not constraints on this explicitly authorized new mode. The new story packet must record the intentional departure from those mechanics and stay separate from published definitions.

| Circle beat | Mechanical responsibility |
| --- | --- |
| You / Need | The first screen establishes what belongs here, what is wrong, and the shared quest. |
| Go | A player's short interaction sequence earns a lead/tool or opens the first route. |
| Search | Room selection, investigation and combat expose different costs and opportunities. |
| Find | The party actually obtains the sought object or capability, visible in shared inventory. |
| Take | A foreshadowed cost or harder return challenge changes the next decision; it does not revoke the acquisition. |
| Return | Players use the acquired power/tool to deliver, rescue, restore or escape. |
| Change | The final illustrated state, recap and reward identify what this party accomplished. |

These are causal beats, not eight required screens, timers, chapter bars or dialogue gates. Required story copy should be short enough that the active choice and incoming threat remain legible. The durable record keeps the previous consequence and the next opportunity visible without reopening a modal after each action.

### Mobile budget and feedback

At 390×844, reserve a compact top quest/focus strip, an illustrated scene, a readable current result/intention area, and four large combat actions or 2–3 contextual exploration choices. Use a drawer for full inventory, map detail and history; the next useful choice does not live only in a drawer. At 320×568, scroll the optional choice/result region rather than shrinking essential prose below approximately 13px or hiding the commit control. Keep 44px hit regions and keyboard order.

The screen answers: whose focus, what is wrong, what can I do now, what it costs, what changed, and what follows. A multi-step focus needs a visible first result and updated second options, not an automatically closed tooltip. Other players see the same accepted change with the actor's name.

Use the existing painted frames and stage feedback for confirmed item acquisition, attacks, damage, protection, healing and defeat. Preserve the original target through the final hit. Reduced motion shows the same state and facts immediately; failed/slow optional art never delays input or the clock. One narrator may voice confirmed information, with text always present.

### Time and fairness budget

Ten to fifteen minutes is plausible only if room count, action count and player thinking time are bounded together. Do not infer a session duration from a 45-second deadline alone.

Illustrative planning arithmetic, not measurements: eight exploration focuses at an assumed 25-second median consume 200 seconds; two encounters with four humans and two phases at an assumed 12 seconds per action consume 192 seconds; room transitions, reading, loot and ending could add 180–300 seconds. That spans roughly 9.5–11.5 minutes. Full 45-second exploration focuses plus longer three-phase encounters can exceed 15 minutes. Capture actual distributions before presenting a duration promise.

Do not solve that uncertainty by silently auto-completing NPC choices. Bound authored room work, allow early Pass, resolve companions without idle waits, keep action feedback brief, and make exits clear. Test four people and a distracted/disconnected active player first: the solo path cannot reveal the largest waiting cost.

### Minimal releaseable slice and acceptance

Implement one new pinned mode with one complete quest, a small graph, a discover-then-act room, one alternate route, one recovery/trade opportunity, one ordinary encounter, one harder encounter, one ending and a handful of action-changing rewards. Add a second causal seed before claiming replay variation. Preserve all old modes and saved command contracts. A component showcase or standalone mockup does not meet this handoff.

Mechanical/local verification:

- Only the focus owner acts; a committed first beat preserves owner/deadline and changes second-step choices. Exact retries and reload cannot repeat it.
- Two players observe the same reveal/lead/item. Four-player rotation, late join, active-player leave, timeout, downed state and empty-room parking work without phantom actions.
- Every required quest path remains reachable under each authored seed and departures. Repeating a solved interaction cannot farm rewards.
- Attack removes real enemy HP; killing prevents that enemy's strike; Defend/Mend/class effects and gear alter their named quantities. Test cheap always-Attack/always-Defend/always-Mend counterexamples.
- Loot changes subsequent combat outcomes, full-stash decisions survive reconnect, and offered choices are not identical under every reachable build.
- Both branches and a setback ending produce truthful quest/return state. Item costs and irreversible outcomes are shown before the relevant commit.
- At both phone sizes and enlarged text, the active choice, named threat, focus timer and explicit commitment remain operable by touch and keyboard. Reduced motion and art failure preserve facts and input.

Human evidence still needed after implementation:

- Before coaching, ask the player to name the shared quest and next useful action. Record their actual answer.
- After the two-beat focus, ask what changed because of their sequence and what another player can now do.
- Before an encounter action, ask why they chose it; observe whether a different state changes that choice.
- After loot, ask which next move changes and why the rejected item was less useful for this run.
- Record focus durations, unprompted passes, off-turn attention, repeated default actions, and whether four-player waiting is acceptable. Browser clicking proves neither comprehension nor enjoyment.

## Review and handoff record

```yaml
human_review:
  checkpoint: pre_investment
  status: completed
  concept_ids: [QR01-B, QR06-A, QR13-A, QR18-A]
  entries:
    - kind: preference
      statement: Preserve the MS Paint art style; replace the current game structure if useful; provide sequential multi-step interaction, clear quest, actual combat actions, useful loot and replay variation.
    - kind: approval
      statement: The user authorized building the entire next iteration. The parent may choose the bounded implementation hypothesis without another approval question.
  observed_human_evidence: []
```

Approval is permission to invest, not evidence that QR01-B is correct. The recommendation is **implement QR01-B, preserve the other three as distinct alternatives, then test ownership, state-dependent choice and waiting with humans**. If those questions fail, change the mechanical hypothesis before adding more prose, art, polish or progression layers.
