# Gemward pacing and agency search

Status: design exploration, not playtest evidence · 2026-10-03

Scope: a short, server-authoritative, drop-in tabletop experience. The user reports that actions and story pass too quickly, consequences are unclear, and choices feel rigid. This is observed user feedback about the current experience, not a measured diagnosis of which rule caused it. Source inspection below identifies testable mechanisms. No new human playtest has been run.

Sources: [game-design fundamentals](../../.agents/skills/game-design-fundamentals/SKILL.md), [design-space search](../../.agents/skills/exploring-game-design-space/SKILL.md), [storytelling baseline](../storytelling-guide.md), [project invariants](../../CLAUDE.md). Story Circle is used as a causal authoring test, not eight mandatory screens.

## Brief and constraints

The core fantasy is a small party noticing a problem, trying a plausible approach, and seeing the world answer. Target aesthetics: discovery, agency and fellowship. Exact total session duration remains unspecified; preserve satisfying short visits and bounded chapters rather than claiming a new minute target.

Keep four tokens, explicit release, simultaneous ordinary turns, one human plus companions, downed Help, signed bounded Spotlight, three macro reward chapters, immutable accepted actions, exact retry envelopes, late admission, departure and parked-room rules. New rules must be a separately pinned Gemward version; existing stories do not change in place. Do not solve rushed play by longer clocks, mandatory reading waits, or simply more dialogue branches. No AI authority over facts, costs or rewards.

## Actual current behavior

These are source observations, not claims that every player notices them.

| Observation | Source | Practical implication |
| --- | --- | --- |
| Every ordinary exploration action adds the same human-scaled progress, even if its discovery already exists. Every such event reports changed=true and usually “Your intention is recorded.” | expeditionEngine.ts:172–195 | “Repair scales,” “ask again,” and finding a new lead can be equivalent for completion. Repetition can look consequential without changing future options. |
| Town and finale close at four exploration rounds regardless of which preparations happened; early closure requires two rounds and four progress. | expeditionEngine.ts:229–231,266–267 | Normal actions produce one total party progress per full round, so the ordinary path is a four-round countdown wearing a progress meter. |
| Finale intentions are different labels/context with no unique mechanical effect; the ending follows the earlier travel choice once generic completion fires. | journey.ts:149–167; journeyEngine.ts:52–66 | The final choice has a real narrative cost, but the subsequent preparation actions cannot shape how it is carried out. |
| All accepted actions resolve immediately once all active humans commit. Reveal advances after ten seconds or unanimous skip. Travel lasts at most thirty seconds and resolves sooner when all eligible humans vote. | engine.ts:476,625–635,643–651,708–714; journeyEngine.ts:7,74–100 | There is no guaranteed reflection interval. A fast solo player can burn through nominal chapter beats rapidly; increasing text would make this worse. |
| Four active exploration rounds force town departure; warehouse queues battle after prior-round evidence or by its third exploration; canal queues battle by its third exploration if quiet recovery failed; road queues battle after its first exploration. | expeditionEngine.ts:231–264 | Some deadlines are round-count fallbacks, not wall-clock transitions. Their pressure should be explicit and tied to a visible event. |
| Nella, price board, noticeboard or keeper can expose the complete seeded truth and ending sacrifice on the first interaction. | expedition.ts:72,121 | The missing prism can be a delivery task after the first click: Search and Find are compressed before the actual recovery. Early foreshadowing is useful; revealing the complete answer is different. |
| Road and escape add danger one at a time, but damage changes at four danger. A normal fresh Gemward run has at most those two increases. “Supplies lost” does not remove a carried consumable. | journeyEngine.ts:117; expeditionEngine.ts:218; engine.ts:70 | The advertised road cost is mostly a recorded fictional cost. A preparation advertised as helping later needs a reachable numerical or structural consequence. |
| Canal really has a prior-turn setup and a second action that avoids battle. Quest acquisition has causal sources; map transitions and ending costs are recorded. | expedition.ts:86–91; expeditionEngine.ts:246–256; journeyEngine.ts:21–49 | Reuse this causal scaffold. The system is not wholly flat; it already supports meaningful different sequences. |

Town, battle and travel fallbacks must be distinguished from unattended simulation: empty rooms park; companions do not drive offscreen progress. This search does not propose weakening that rule.

## Structural coverage and compact root records

The first obvious idea was P01, a larger dialogue tree. At least half the roots avoid its operation/select + conversion/unlock-next-node + opportunity-cost tuple.

Record compression: every root below shares simultaneous server turns, explicit release, no autonomous progression while parked, one-human solvability, authored deterministic consequences and unknown human engagement evidence. “State / decision” names the state read, goal and competing actions. “Dynamics / conversion / cost” names automatic change, progress conversion and risk coupling. “Policy attack / learning” supplies expert-versus-simple-policy behavior, cheap-guard result and the new distinction learnable over repeated play. All statuses are source or verbal reasoning, not empirical fun scores.

| ID / neighborhood | State / recurring decision and goal | Dynamics / conversion / cost | Policy attack / learning / status |
| --- | --- | --- | --- |
| P01 Dialogue forest | Read current conversation node; pick one reply to reveal the next lead. | Fixed tree; select; next-node unlock; lost alternative dialogue. | More branches alone leaves current uniform progress intact. Weak: its agency claim depends on large new authored content. |
| P02 Situation milestones | Read distinct unfinished object states; choose a state-changing action or depart with what is known. | Unordered fact set; transform; build-state then commit; foregone preparation. | Repeating a finished action cannot satisfy another milestone. Learn which missing state changes the route. Survives. |
| P03 Contradiction board | Read two conflicting clue relations; investigate or commit to a hypothesis. | Evidence graph; infer; solve; a mistaken claim changes approach, not access to rescue. | A fixed interrogation order may dominate a tiny fixed mystery. Weak until two seeded counterexamples exist. No hard rejection. |
| P04 Bigger progress bars | Read scalar progress; repeat the easiest supported action. | Accumulate; same generic gain; independent time cost. | Every supported action remains equivalent for completion; adding required clicks demonstrably adds no decision under these rules. Hard reject this stated model. |
| P05 Tool–target affordances | Read target properties and known tools; combine a useful tool with a token or investigate another target. | Typed object graph; combine; transform affordances; limited uses. | Must expose two genuinely different consequences, not hidden password recipes. Survives first pass; represented in P06-M1 after mutation. |
| P06 Multi-use scarce kit | Read two pending needs and personal finite items; spend now or preserve an item for later. | Inventory; allocate; convert resource to world change; consumption removes a later option. | Always-spend and always-hoard prefer different states if two valuable uses exist. Learn cross-scene opportunity cost. Survives. |
| P07 Threatened-object slots | Read one announced object threat and rescue slots; stop it or pursue the main lead. | Threat queue; intercept; preserve objects; opportunity cost. | Fixed “save everything first” dominates if threats never overlap. Weak as stated; stronger bounded successor explored in P18. |
| P08 Heat opens an opportunity | Read alarm and watcher position; risk attracting attention or cool the area. | Risk gauge; provoke; danger unlocks an alternate route; same action creates risk and opportunity. | “Always cool” cannot access the decoy route, but numerical balance and legibility are unknown. Weak within current content budget. |
| P09 Push-your-luck departure | Read safe lead and known next consequence; gather another benefit or cash out by leaving. | Banked opportunity; commit; preserved preparation; optional action risks exposed loss. | A risk-free repeat would dominate; require diminishing opportunities and visible consequence. Survives; its cash-out operation is retained in P18-M1. |
| P10 Return promises | Read one concrete NPC request and current lead; promise aid, fulfill it or leave without a promise. | Obligation queue; trade; deliver later; delayed debt. | Promising all must not grant free rewards. Promise consumes a bounded commitment slot and is optional. Learn which future cost the promise can change. Survives. |
| P11 Drafted approach hand | Read three dealt approaches and target; draft one and reserve another. | Card hand; draft; limited recipe access; opportunity cost. | Random deals can remove a plausible action from the visible four-token language. Weak: extra UI/rules before first contribution. |
| P12 Party resource auction | Read shared supply and proposed bids; allocate to route or protection. | Allocation slots; bid; pooled spend; contention. | Richer tactical state but a dominant voter can consume others' intended resource; arbitration overhead unresolved. Weak for short drop-in play. |
| P13 Rotating scene lead | Read whose lead turn and prepared support; lead a plan or support another player. | Role ring; commit; plan resolution; deadline handoff. | Idle leader needs automatic handoff; newcomers may watch too long. Weak, not rejected: requires social play evidence. |
| P14 Two-job party plan | Read distinct ready jobs; prepare one or execute a ready combination. | Job slots; combine; build-state; duplicate effort. | Requiring two humans breaks solo; allowing sequential completion preserves solvability. Duplicate of P02 after that repair. |
| P15 Wider procedural route web | Read nearby nodes; choose route, scout or return. | World graph; route; exploration; travel opportunity cost. | More nodes do not change current action equivalence. Weak: substantial content cost; keep existing two forks for prototype. |
| P16 Unbounded AI adjudication | Describe any act; model invents what changes and grants progress. | Unrestricted hidden state; transform; model-selected effects. | Violates authored outcome, reward and deterministic replay constraints. Hard reject this authority model, not bounded language interpretation. |
| P17 Player-set chapter contract | Read feasible ends; commit to a promise then satisfy it. | Goal checklist; commit; fulfill contract; abandoned goal costs trust. | Same obligation/return mechanism as P10 once decorative nouns are removed. Duplicate; fold player-selected commitment into P10. |
| P18 Redirectable aftershock | Read an exposed opportunity and next threatened object; exploit, shield, redirect or leave. | Causal threat queue; transform/intercept; change world state; progress causes a future problem. | Idle does not gain anything; always-shield fails to complete the objective. Different threatened objects can justify different moves. Survives. |

First-round survivors: P02, P05, P06, P09, P10, P18. Weak roots remain weak because the missing evidence is not a demonstrated impossibility. Only P04 and P16 have named hard defects under their stated rules.

## Mutations and final normalized records

| ID / lineage | Rule mutation | Expected behavioral change | New risk |
| --- | --- | --- | --- |
| P02-M1 / P02, commitment | A lead found in an earlier round unlocks “Gather / set out.” Discovering a lead no longer closes the area. Preparations each transform a specific state once. | Players choose whether another preparation is worth staying for; repeated clicks cannot substitute for the task. | One person's Gather can surprise friends unless its end-of-round scope is visible before release. |
| P06-M1 / P06, topology | An existing personal consumable has two explicitly offered authored target uses, replacing generic +progress. A shared quest tool supplies reusable affordances, not a silently consumable shared charge. | Known items let a player alter the problem's solution without authoring a separate scene tree for every combination. | Too many item–target combinations recreate a hidden recipe puzzle; only show meaningful supported uses. |
| P10-M1 / P10, delayed consequence | At most one optional party promise per area; accepting it grants no immediate reward. A concrete preparation fulfills it and changes a later resource/approach or closing condition. | Players see an NPC remember what they actually did, and can decline commitments rather than being assigned hero motives. | Extra bookkeeping; a late arrival must see source and current obligation in one sentence. |
| P18-M1 / P18, cash-out | Show a bounded two-step trouble queue driven only by relevant resolved actions. A safe lead permits departure before the next optional disturbance; shielding preserves a benefit but does not repeat objective progress. | Players infer and redirect cause/effect rather than race an unrelated timer. | Too much urgency can worsen the reported rushed feeling; needs a calm opening beat and explicit warning. |

The final slate is structurally distinct, not ranked by predicted fun:

| Field | P02-M1: situation + departure | P06-M1: tool affordances | P10-M1: promises + return | P18-M1: aftershock |
| --- | --- | --- | --- | --- |
| Goal | Reach a ready objective while deciding what preparation to retain | Solve a problem with a useful allocation of known tools | Complete the journey while honoring a chosen local commitment | Obtain the objective while preserving a threatened benefit |
| Key decision / actions | Transform unfinished state, support, or gather for departure | Use a finite personal item here, reserve it, or take the ordinary route | Accept/decline a promise, fulfill it, or depart with an honest unfinished record | Advance, redirect trouble, protect, or depart |
| State read | Unfinished named milestones, prior-turn lead, remaining opportunities | Current properties, item uses, known later need | Promise source, required act, feasible later cost | Announced next threat, protected objects, safe exit |
| Automatic dynamics | No mandatory plot movement from clue acquisition; bounded active-round fallback | Ordinary deadline only; inventory changes on accepted use | Promise persists through area changes and departures | Relevant committed act advances one announced trouble step |
| Conversion | Build-state → explicit commit | Resource → affordance/state change | Commitment → later fulfillment/payoff | Cause/redirect → changed scene |
| Risk coupling | Opportunity cost of leaving | Reward consumes a later option | Delayed debt / lost future benefit | Same action creates risk |
| Information | Perfect current state, local future preview | Known uses, limited future uncertainty | Explicit obligation and cost | Predictive threat |
| Expert distinction | Picks a preparation that helps chosen route; avoids finished tasks | Changes spending between safe and endangered states | Accepts only promises compatible with intended route, or changes plan to honor one | Redirects a useful threat instead of always shielding |
| Learning | Understand which facts make departure ready | Learn reusable tool properties | Recognize the consequence of a commitment across chapters | Infer the small causal system |
| Main uncertainty | Is choosing when to leave satisfying or merely another button? | Does this feel expressive without requiring combinatorial memorization? | Is a promise memorable within a short visit? | Does visible pressure clarify agency or rush reading? |
| Smallest useful test | Existing shop + two meaningful preparations + one departure action | One item, two useful applications, one solo and one pair route | One NPC request, one practical fulfillment and one changed return | Two objects, two queued consequences, one safe exit |
| Evidence / provenance | Directly removes the repeated-click completion observed in source | Verbal two-state policy trace; no human evidence | Verbal delayed-cause trace; existing quest provenance can carry source | Verbal fixed-policy attacks; existing announced intent offers a technical pattern |
| Status | Survives; bounded prototype recommended for lowest integration uncertainty | Survives; separate future experiment | Survives; one bounded promise can complement P02-M1 | Survives; defer if current reading pressure remains unclear |

## First-minutes hook and Story Circle

A stronger opening is a playable visible need, not a longer explanation: Iris is trying to keep an evening stall lit while an empty display reveals the missing prism. The first act should change something unmistakable: steady the failing lamp, expose the empty stand's delivery mark, or get a witness to point out a route. This is a proposed situation, not a claim that new art/state already exists.

- You / Need: show the familiar activity at risk and one reachable contribution immediately.
- Go: the party's explicit departure uses a lead it caused.
- Search: the selected route creates a different practical problem, as the existing canal setup already does.
- Find: recovering the actual prism reveals evidence of motive; earlier town talk foreshadows uncertainty/cost without giving the full answer.
- Take: retain the explicit permanent restore/release choice with the exact cost.
- Return: preparations are distinct jobs whose consequences survive completion, rather than four interchangeable clicks after voting.
- Change: display the resulting beacon/lantern scene and the specific optional help the party gave. Do not invent player feelings, promise fulfillment or a perfect preparation.

A fact appearing in prose is insufficient: the state and subsequent offered actions must agree. Do not gate necessary understanding behind a side topic or an AI response.

## Recommended bounded implementation seam

The immediate implementable candidate is P02-M1, with one tightly scoped P10-M1 preparation only if its later consequence is implemented. This recommendation follows source fit and reduced integration uncertainty, not proof of superior fun. It matches the parent's proposed Gemward v3 direction.

1. Register a new pinned Gemward v3 definition; keep v1/v2 predicates and resolution branches unchanged. Current registry already separates current selection from pinned lookup.
2. Add optional version-specific situation state: typed facts/milestones, acquisition turn/event IDs, active round count and completion request. Do not parse prose, generic progress, or array order to decide readiness.
3. Extend authored interaction output with explicit effects: fact transition, preparation, request departure/finish, and repeat behavior. The pure validator and resolver must read the same frozen choosing state. Do not allow a same-batch clue or consumable reward to satisfy the next step.
4. Group identical same-round effects so each world transition applies once, retain all legitimate contributors, and report duplicates as support/already done. Personal action credit can remain under existing reward policy; do not fabricate repeated discoveries or repeatedly pay one-shot item rewards.
5. A Gather intention must plainly state “After everyone acts, leave this area and choose a route.” It changes flow after all accepted actions settle, including accepted actions from leaving players. The map vote remains the party destination decision. If “stay” is not offered, do not suggest the vote can cancel departure.
6. At the announced active-round limit, produce the authored fallback after settling accepted work. Abstention does not create facts or promises. Count active rounds consistently, park empty rooms, and make the fallback say what was left unfinished.
7. Finale: a prior-turn practical milestone unlocks an explicit Finish action. Optional neighbour/repair preparations affect a reachable later condition or the material closing state; each has a distinct result. If the bounded cap completes emergency work, credit the keeper/neighbours honestly and record what was missing. Preserve the already chosen sacrifice.
8. Keep the existing three chapter reward calls and status boundary in finishChapter; do not make preparation, travel, or promise acceptance a fourth credit chapter.
9. Extend structured event metadata for facts/preparations/completion source. Existing journey quest provenance, map highlights, stage playback and personal recap are reusable consumers. The UI should show “You did X → Y changed → Z is now possible,” with a durable current consequence accessible after the ten-second reveal. Merely lengthening narration does not supply causality.
10. Do not refactor every adventure to adopt the experiment. A small optional situation-effect interface can later be authored into other versioned chapters; current stories retain their outcomes and saved payloads.

Relevant seams: expeditionTypes.ts interaction/result interfaces; expeditionEngine.ts selectedInteraction/validation/resolve loop; journeyEngine.ts event provenance and chapter outcome; journey.ts interaction/scene/projection; registry.ts version registration; engine.ts dispatch and unchanged receipt/admission/reveal/reward shell. Persisted JSON can carry optional fields without changing database schema, but server validation, reload/exact retries and old-version service tests remain required.

## Falsifiable checks before broadening scope

Technical proof: same action repeated cannot satisfy a distinct milestone; all accepted same-round effects settle once in reversed arrival order; no same-round fact chaining; a new chapter opens only by an explicit completion request or documented active-round fallback; one human can reach every outcome; empty/abstaining/departed players never grant missing preparation; duplicate command cannot duplicate facts/items/XP; v1/v2 snapshots retain old rules.

Human check, not currently performed: give first-time players the opening without explanation. After one resolution ask what changed and what became possible; at departure ask why they left then; on return ask which earlier choice mattered. Record their actual words, number of repeated unchanged actions, time spent deciding versus searching UI, and which optional work they chose. A quicker chapter with a clear decision may beat a longer chapter; elapsed duration alone is not success.

Stop broadening if players still cannot state action → consequence → next option in the two-target prototype. That would call for better state presentation or clearer consequences before more branches, content or mechanics.

Review state: human engagement evidence unknown. User has authorized continued design/prototyping; no new approval gate is inferred by this exploration.

