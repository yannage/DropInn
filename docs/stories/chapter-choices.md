# Chapter choices across the story library

Status: locally implemented and verified; this task has not published a deployment. Human comprehension and enjoyment remain unmeasured.

Definition releases: `briar-glen` version 4; `last-flight-teacup`, `inn-misplaced-tomorrow`, and `orchard-walked-away` version 2. Authored choices live in `src/lib/dropinn/chapterChoiceContent.ts`; `registry.ts` applies version overlays. This supplement follows the [storytelling baseline](../storytelling-guide.md) and [story packet template](TEMPLATE.md), with the compact GDD and motivation worksheet below adapted from Game Design Fundamentals.

## Inherited packets and release scope

The existing packets remain the source for all 12 chapters and 48 targets: [Briar Glen v2](briar-glen-v2.md), its [v3 river revision](briar-glen-v3.md), [Teacup](the-last-flight-of-the-teacup.md), [Tomorrow](the-inn-that-misplaced-tomorrow.md), and [Orchard](the-orchard-that-walked-away.md). Their arrival objectives, two-sentence catch-ups, supported ordinary interactions, developed images, essential clues, chapter success/mixed/setback outcomes, keepsakes, and closing images are inherited except for the explicit choice contexts and actions below. No new scene target or fifth token is added.

Released Briar versions 1–3 and the other stories’ version 1 definitions keep their original behavior. New rooms select the appended versions; pinned rooms retain their version. Briar v4 copies the entire v3 river chapter, including its supplies decision, unchanged. The old Briar combinations are disabled only in v4 chapters 1 and 3, where the new preparation choice replaces them. The river retains its existing combination. Generated `adventures.ts` is not rewritten.

The original progress goals, 60-second simultaneous turns, ten-round chapter cap, release controls, rewards, class presets, four seats, and departure rules stay in force. The three existing finale votes retain their target IDs, first-turn collective resolution, exact costs, and fallback rules. Finale choices below use the other two targets. They do not change the selected branch or invent a second sacrifice.

## Compact game design document

**Promise:** read a changing situation, choose how much to risk, and see what your contribution makes possible next.

The platform remains browser/tablet/phone. A useful short visit, including arriving or leaving mid-chapter, is the unit of value. The primary experiences sought are discovery, fellowship, and readable challenge. The 30-second interaction loop is inspect state → choose an ordinary or authored move → release → see the confirmed consequence → reconsider the next move. A chapter supplies a beginning, a recoverable complication, and a local payoff. Continued play is motivated by learning when to prepare, bank, recover, or accept a cost; these are hypotheses rather than measured retention claims.

The three patterns share the same visible controls but have different state transitions. All progress and danger action values below are divided by the human count, `N`; cover and chapter carry-forward values use the shared rules rather than dividing again. Numeric previews expose the scaled effects; the reducer caps progress at the chapter goal and danger at zero. Special Help replaces the ordinary class Help effect on that particular action, as the preview explains. Hero Protect/Mend and ordinary actions elsewhere remain available.

| Pattern | Recurring decision and transition | Opportunity cost and failure |
| --- | --- | --- |
| **Prepare** | Help at the primary target guarantees `1/N` progress and readies the following turn. At the secondary target, Help guarantees `3/N` progress plus 2 cover in combat, or up to `2/N` danger relief outside combat. The authored risky token earns `7/N` progress and `1/N` danger on success. | Spending consumes the preparation. A miss gives `1/N` progress and `1/N` danger and needs repair unless another simultaneous payoff succeeds. Help at the source repairs it for another turn. Repeat preparation is allowed, but ordinary moves can be better near completion or when protection would be redundant. |
| **Press** | The primary risky token earns `2/N` progress and one shared potential level on success, capped at two. Help at the secondary target banks the turn’s starting level for `3 × level/N` progress and closes this choice. Empty Help gives `1/N` progress; Help can also settle a setback. | Any failed unbanked push loses the shared potential and gives `1/N` progress plus `1/N` danger. Banking protects the starting level even if someone pushes in the same turn; it cannot bank that turn’s new gain. Leaving potential unbanked at chapter closure loses it. Already-earned objective progress never disappears. |
| **Rescue** | Primary Help guarantees `1/N` progress and saves the optional resource completely. The primary risky token offers `4/N` progress and the same full rescue on success. After a miss, primary Help guarantees a partial salvage, while Investigate at the secondary target offers `2/N` progress and full recovery on success. | A miss gives `1/N` progress and `1/N` danger and creates the recovery choice. Resolve before round 3 ends or the chapter closes. Full rescue adds 2 next-chapter progress, partial adds 1, and loss adds 1 next-chapter danger; the same effects would apply immediately in a finale. This release places rescue only in chapters 1 or 2. People and essential story facts are never the lost resource. |

Prepare creates a shared opportunity; press creates a bank-or-risk decision; rescue changes the available recovery options after a failure. None requires a second human, chat, a particular class, an extra timer, a random reward schedule, or a permanent stat advantage. Ordinary play can finish every chapter. The ten-round closure delivers essential facts even when a choice is ignored or fails.

## Chapter override matrix

Each row adds one unfamiliar pattern at most. All four ordinary targets remain visible. The exact context and full/partial/lost copy are authored in `chapterChoiceContent.ts`; they supplement, rather than replace, the inherited chapter ending.

| Story/chapter and stable choice ID | Actions on existing targets | Visible stakes, recovery, and continuation |
| --- | --- | --- |
| Briar 1 — `briar-shelter` / prepare | Help **gate** braces the shelter. Help **herd** guides animals safely; Influence **herd** risks a swift roundup. | A shelter marker becomes ready, spent, or in need of repair. Help gate rebraces loose timbers. A successful use helps Mara gather animals; an unfinished roundup leaves the river lead available without claiming an ordinarily repaired gate became broken. |
| Briar 2 — inherited v3 river supplies | Existing Help/Fight **boat** and existing recovery at **reeds**; all v3 rules retained. | The loaded boat, secured/spilled/salvaged/lost supplies, three-round opportunity, and chapel carry-forward remain the v3 implementation. No second new choice is layered onto it. |
| Briar 3 — `briar-bell-rhythm` / prepare | Help **bell** holds a steady note. Help **ward** sustains the light safely; Investigate **ward** tries a faster pattern. | The bell rhythm becomes ready or needs repair; Help bell finds it again. The same ordinary restored-ward and captive states remain true. Finale progress/protection supports the current resolution without forcing a guardian ending. |
| Teacup 1 — `teacup-spare-cord` / rescue | Help **teacup-mooring** secures a spare coil; Fight there tries a quicker haul. After a spill, Help salvages a short length; Investigate **teacup-parcels** traces the loose end. | The optional spare cord is whole, partly salvaged, or lost. It supplies the next chapter’s bounded advantage/cost. It is not the only boarding line: all endings still get everyone aboard and reveal both escape facts. |
| Teacup 2 — `teacup-steam` / press | Investigate **teacup-engine** builds steam. Help **teacup-lifeboat** puts the stored pressure to work at the winch. | Show 0/1/2 heads of usable steam. A failed push vents unused pressure; Help steadies the equipment. Banking moves work forward; loss never disables the engine’s final burst or either route home. |
| Teacup 3 — `teacup-home-signal` / prepare | Help **teacup-return-beacon** holds the signal. Help **teacup-return-guests** guides the line carefully; Influence guests attempts a swift arrival. | A clear or wavering signal gives the next decision a visible cause. Help beacon repairs the opening. Everyone’s eventual arrival and the chosen ship/sail loss remain those of the inherited ending and vote. |
| Tomorrow 1 — `tomorrow-repeat-pattern` / press | Investigate **tomorrow-spoon** traces another repeat. Help **tomorrow-brindle** shares the accumulated pattern. | A 0/1/2 pattern marker records unshared observations. A miss loses those observations, never real turns. Brindle’s literal instruction and the workshop entrance still appear on every chapter outcome. |
| Tomorrow 2 — `tomorrow-chime-cushion` / rescue | Help **tomorrow-jars** secures a padded wrap; Investigate jars attempts a quicker lift. After a slip, Help saves a folded corner; Investigate **tomorrow-helper** traces its trailing ribbon. | A full cushion, useful corner, or lost wrap changes the next chapter’s starting condition. The dawn jar itself is never lost, broken, or held behind a check. Neither sustaining pattern is spent before the finale vote. |
| Tomorrow 3 — `tomorrow-shared-rhythm` / prepare | Help **tomorrow-return-clock** steadies the chime. Help **tomorrow-return-table** shares breakfast carefully; Influence table calls for a bigger coordinated response. | A steady rhythm or echo marks readiness and repair. Help clock dampens the echo. The shared meal and moving sunrise still close the story; the recipe or breakfast-memory cost is not reversed. |
| Orchard 1 — `orchard-trail-marks` / press | Investigate **orchard-root-trail** reads farther ahead. Help **orchard-ladder** commits the route for the rescue equipment. | Show 0/1/2 unmarked root signs. A scuff obscures an unbanked route; Help regroups. Marked work advances the chapter, but the low bank remains reachable even when no route is banked. |
| Orchard 2 — `orchard-welcome-ribbon` / rescue | Help **orchard-treehouse** ties a homemade welcome ribbon; Influence there asks the branches to lift it faster. After a snag, Help saves ribbon ends; Investigate **orchard-sluice** traces the loose ribbon. | The ribbon, not the child, has a deadline. Whole, partial, or lost ribbon changes the finale’s starting condition. The child reaches the bank on every outcome; both water routes remain discoverable. |
| Orchard 3 — `orchard-welcome-trail` / prepare | Help **orchard-return-roots** marks wet ground. Help **orchard-return-baskets** carries harvest carefully; Influence baskets organizes a larger gathering. | A marked welcome trail supports a follow-up or needs remarking. Its outcome does not claim that all trees settled, move them to the riverside, or reverse the selected wall/mill construction. Those facts remain owned by the chapter ending and route. |

Required special tokens are restored by choice projection after ordinary target development. In particular, a developed ward can still receive the authored Investigate payoff, and a developed mooring can still receive the spare-cord Fight attempt while that choice is open. This adds no perpetual combat action to an already-resolved person or object. Settled choices return to ordinary legal moves.

### On-screen context and presentation

The existing arrival sentence, objective, and two-sentence catch-up still establish the immediate problem. The new `context` field explains the optional opportunity and names its stakes. Rescue context names the spare cord, cushion, or ribbon explicitly; it also states the safety guarantee for people or the dawn. Press context names what is unbanked and what a miss loses. Prepare context names the source and follow-up relationship.

The scene keeps the four targets and token hand visible. A target-linked marker and concise status identify readiness, 0–2 potential, trouble, or the final outcome. Target action cues describe the currently legal authored move; the dock shows guaranteed/rolled results, risk, scaling, and expiry before release. Recorded consequences appear on the table before history. Initial and developed artwork remain accurate; no new generated art, sound puzzle, or false success animation is required. Reduced motion and text equivalents show the complete confirmed state.

## Story Circle continuity

The supplement makes local choices more explicit without adding chapters or moving the inherited irreversible decisions.

| Beat | Briar Glen | Teacup | Tomorrow | Orchard |
| --- | --- | --- | --- | --- |
| You | Mara’s pen and bell anchor the village. | Pella’s ship and festival guests anchor the dock. | Brindle’s immaculate breakfast repeats. | Nella’s orchard has left its planting circles. |
| Need | Gather animals and find the missing herd. | Board the drifting ship and save everyone. | Find the missing morning. | Reach the trees and help the treehouse passenger. |
| Go | A braced shelter or discovered track opens the river lead. | Boarding always succeeds; the optional spare cord changes preparation. | Traced repeats or the clock’s fallback reveal the workshop. | Marked root signs or the low bank bring the party to the trees. |
| Search | Cross the threatened river and decide what supplies to save. | Put useful steam to work while handling the gull. | Recover the dawn and optionally its cushion. | Rescue the child and optionally the welcome ribbon while understanding the dry stream. |
| Find | The ward-bound guardian’s former purpose becomes clear. | Both descent and evacuation remain possible. | The recovered dawn is still bound to two sustaining patterns. | Both water routes are revealed without making the child a bargaining chip. |
| Take | River supplies and the chapel’s progress/protection decisions have visible costs. | The first finale vote chooses ship or sail, with its exact loss previewed. | The first finale vote spends the recipe or only the learned breakfast routine. | The first finale vote opens the grove, retires the ornamental wheel, or uses the spillway fallback. |
| Return | Bell/ward coordination supports freeing the captives. | Beacon/passenger coordination supports the selected arrival. | Chime/table coordination turns a decision into a shared morning. | Root/basket coordination makes reciprocal care visible. |
| Change | The existing guardian outcome, bell, and village recap persist. | The battered ship or salvaged-sail shelter repeats the familiar dock. | The moving sun and imperfect meal show that tomorrow can happen. | Settled trees or the riverside path show a changed relationship to the harvest. |

## Outcomes, closing images, and truthful recaps

Full/partial/lost choice outcomes are separate from chapter success/mixed/setback. A lost optional resource can coexist with a successful chapter. A full resource rescue cannot claim a precise landing, a repaired clock, or all trees settled if the chapter ending says otherwise. Carry-forward is applied once from confirmed state, including when early chapter completion precedes a rescue deadline.

Preparation closes as full if a payoff succeeded, partial if it remains ready but unused, or lost if neither is true. Its closing copy describes the planned handoff, not an undone ordinary development: a gate may still be braced, a beacon still lit, or wet ground still marked after the special sequence goes unused. Rescue can expire before chapter closure, so its immediate loss copy promises a continuing safe route rather than claiming the child has already reached the bank or the dawn has already reached the clock.

**Briar:** success still returns the bell and captives; mixed still leaves the ward waiting for further work; setback still establishes evacuation and a new beacon. Choice copy records whether shelter or bell rhythm was put to use. A valid personal recap can say, “You braced the shelter before the herd’s next move.” It cannot credit a departed player for a later payoff.

**Teacup:** success retains the precise arrival and new rescue service; mixed retains scattered parcels; setback retains emergency nets and temporary shelter. The selected vent route still tears the sail; evacuation still loses the airship and salvages the sail as shelter. Saving the spare coil does not save the sacrificed ship or sail. A valid recap can say, “You saved a short cord that steadied the next chapter.”

**Tomorrow:** success retains a warm uneven meal, mixed the shared replacement food, and setback ordinary sunrise with the hand bell. The chosen recipe or breakfast-memory cost persists across all three. Losing the cushion never loses the dawn or Tock’s identity. A valid recap can say, “You banked the repeated pattern by sharing it with Brindle.”

**Orchard:** success retains settled trees and shared harvest; mixed the watering rota; setback the riverside settlement and new path. Wall, wheel, and spillway outcomes remain distinct. The mill remains ornamental. Losing the welcome ribbon never implies losing the child, the water routes, or the earned carved-seed keepsake. A valid recap can say, “You recovered ribbon ends for the village’s welcome.”

## Motivation worksheet and design hypotheses

| Area | Intended support | Observation still needed |
| --- | --- | --- |
| Explorers — primary | Learn three different state transitions and their authored contexts. | Can a player explain what changed and choose differently in a second state? |
| Socializers — primary | Prepare a follow-up another person can use, bank a shared gain, or repair a setback. | Do players notice an ally’s contribution without needing to negotiate every move? |
| Achievers — secondary | Finish bounded chapters and preserve existing contribution rewards and cosmetics. | Does a partial rescue feel like an earned result instead of a concealed failure? |
| Player domination — not targeted | No PvP, rankings, power advantage, or mandatory class composition. | No claim about serving competitive motivations. |
| Autonomy | Guaranteed help, a risky alternative, recovery, and ordinary progress remain legible. | Can newcomers name two reasonable options rather than hunt for the single highlighted answer? |
| Competence | Risk becomes readable through state, banked value, and recorded consequences. | Does a practiced player bank near closure, avoid redundant cover, and distinguish salvage from full recovery? |
| Relatedness | Shared state outlives a contributor’s departure; setup and recovery remain usable. | Do players identify who enabled a payoff and still feel free to leave? |
| Flow and access | Existing timing and controls; one unfamiliar pattern per chapter; complete text equivalents. | Do the previews fit mobile/enlarged text and remain understandable inside the existing allowance? |
| Continued play | Learn another pattern, try another tactical responsibility, or see another authored route. | Do players voluntarily choose another visit? No retention or enjoyment increase is asserted. |

The main balance risks are automatic preparation cycles, press choices that always favor banking one level, and rescue choices that always favor guaranteed Help. A viable simple policy is acceptable; it must not dominate every meaningful state. Compare near-completion versus ample-time states, already-covered versus exposed threats, and full-rescue versus post-miss recovery. More content or rewards cannot establish that these decisions matter.

## Runtime and verification record

### Cooperation and informed choices follow-up

The next pass develops the same fellowship and discovery goals without adding another mechanic. Players see accepted teammates' named plans in the existing inspection and action dock. A short contextual note explains overlap: preparing cannot refresh an opening being spent, a bank uses the starting level, and a second rescue cannot save extra supplies. Ordinary actions retain their exact chosen approach in the party view. These are intentions awaiting resolution; rolled attempts can still miss. Drafts, uncertain submissions and Spotlight proposal text are never inferred or exposed.

Inspection buttons and prepared moves show current success odds. The calculation includes hero traits, insight, opening, committed teamwork and the chosen approach. Standard checks enumerate 20 possible rolls; opposed checks enumerate 400 pairs and preserve the enemy's advantage on ties. A good or assisted release is shown separately. Guaranteed actions are labeled as such, while a rolled move at 100% still uses its normal roll. A route vote is never presented as depending on that roll. Unknown or unavailable actions have no odds; pending delivery and expired input do not invite new decisions.

Confirmed preparation, successful payoffs, resource building/banking and rescues name the humans who actually contributed. Optional `sources` and recorded `credit` metadata retain the original names and action-event references. Same-turn maintenance cannot take credit for an older opening, misses receive no invented success, and old snapshots without provenance remain readable. Table captions show the credit when the confirmed consequence lands; the saved sentence retains it in history. Existing values, rewards, timers and adventure versions are unchanged.

Motivation hypothesis: explorers can compare a risk before choosing it, and social players can explain how one person's move helped another. The acceptance question is still an uncoached one: “What did your teammate do that changed your decision?” Automated coverage establishes correctness and legibility, not an increase in enjoyment.

Follow-up verification on 2026-10-02, same local working tree:

- `rtk vitest run`: **652 tests passed**, including 93 chapter-choice, 40 party-intent and 20 exact-odds tests. New regressions cover actual credited contributors, departed preparers, frozen setup sources, failed attempts, exact retries, overlapping plans, terminal preparation and legal standard/opposed probabilities.
- `npm run build` and `git diff --check` passed. The existing Vite bundle-size advisory remains.
- `npm run test:cooperation -- --base-url http://127.0.0.1:5201`: **14 checks passed** with two independent named browser identities and the real isolated local handler. Confirmed credit reaches both clients and survives history/reload with ordinary XP. Accepted teamwork changes the displayed chance from 70% to 75% before release. Pending, committed and expired inputs hide fresh odds; inspecting an unrelated object uses its own context. Both payoff/preparation views fit 320×568, 390×844 and desktop. Report: `output/playwright/cooperation-results.json`.
- The focused crowded-table presentation run (`CHOICE_COOP_ONLY=1`) passed **17 checks** with three accepted teammates, long names, scaled effects and enlarged text. Duplicate preparation, terminal preparation, shared rescue and bank-versus-push notes fit above the release controls. Numeric support details remain in the action drawer; the compact view uses current odds and the teammate note. This is a controlled fixture, not additional multiplayer transport evidence.
- The final full `test:chapter-choices` run passed **110 checks**, including all original choice scenarios and the crowded-table additions. Report: `output/playwright/chapter-choices-results.json`.
- The final full `test:scene` run passed **97 checks** across three chapters, four-player admission, timing, retries/reload, layouts and narrator bridges. An earlier mock automatic-narration fallback timed out; the unchanged isolated narrator checks and final full run passed. Report: `output/playwright/scene-integration-results.json`.

Representative 320px and 390px screenshots were visually reviewed. All follow-up browser work uses loopback and isolated local state; no hosted writes, live model calls or physical-phone results are claimed. This follow-up is implemented locally and has not been pushed or deployed.

### Original chapter-choice rollout checks

Runtime ownership: authored definitions and version selection, pure shared choice state, server-authoritative command resolution, confirmed-event presentation, and client previews. No migration is needed for optional room/event JSON fields. Pinned version lookup, exact pending-command retries, idempotent rewards, signed Spotlight, and collective branch votes remain required contracts.

Implementation status: authored overlays, server resolution, previews, target markers and confirmed-state animations are implemented locally. Do not interpret this document as a published release or a human playtest result.

Local verification on 2026-10-02, working tree based on `8ffaba9`:

- `rtk vitest run`: **584 tests passed**, including 85 chapter-choice tests and 30 playback tests. Coverage includes all 11 new definitions, 1/2/4-player scaling, frozen shared opportunities, competing moves, deadline/early closure, exact retries, downed/departing contributors, Spotlight boundaries, ward restoration, and preserved branch costs. Solo route completion and pinned older versions are also covered.
- `npm run build`: TypeScript and production build passed. Vite retains its bundle-size advisory.
- `npm run test:chapter-choices -- http://127.0.0.1:5201`: **93 checks passed** with reducer-backed browser fixtures. Every new choice was selected, committed, and shown before history; representative risk, recovery, banking, expiry and final-turn states were exercised. Layout checks passed at 320×568, 390×844 and 1280×800, plus enlarged preview text. Reduced motion and reload preserved settled state. Report: `output/playwright/chapter-choices-results.json`.
- `npm run test:scene -- --base-url http://127.0.0.1:5201`: **97 checks passed** on current Briar v4. The real isolated local handler completed three chapters with two browser identities, plus four-player arrival/readiness, pointer/keyboard/assisted release, reviewed Spotlight, and identical lost-response/reload retries. Controlled presentation fixtures are separately labeled in `output/playwright/scene-integration-results.json`.
- `npm run test:living-table -- --base-url http://127.0.0.1:5201`: **25 checks passed**. Its isolated discovery catalog is explicitly pinned to Briar v3 to verify old combinations, recorded effects and exact retries under the new client. It does not change production selection. Report: `output/playwright/living-table-results.json`.
- Two-browser local-handler playthroughs completed all three chapters of Teacup v2, Tomorrow v2 and Orchard v2, including chapter-two reconnect, route review, ending and small-phone layout. The full runner waits for the rendered turn and matching command receipt; automatic history opening is accepted when it wins the race with a manual open. No product behavior was changed to accommodate these test races.
- Representative 320px/390px screenshots were visually reviewed for target/hero separation, readable stakes, visible release controls and state markers. `git diff --check` passed. Existing raster artwork is reused; state markers and brief confirmation animation are native UI.

All browser checks used loopback, Chromium and isolated local handlers or explicitly controlled reducer fixtures. There were no hosted writes or model calls. Existing room/event JSON holds the optional fields; no migration was introduced. New-room selection uses the new versions while existing rooms retain their pinned definitions.

Ongoing acceptance scope:

- Exercise all 12 current chapters with one human plus companions and two humans; confirm ordinary actions always permit closure.
- Prove released definitions retain their prior mechanics, all current chapter choice targets/tokens are legal, and v4 river behavior is inherited unchanged.
- For prepare, verify guaranteed setup, both payoffs, a miss and repair, simultaneous payoffs, source plus payoff in the same turn, and developed-target legality.
- For press, verify levels 0/1/2, the shared per-turn cap, failure loss, bank-versus-push ordering, duplicate commands, departure, and closure with unbanked potential.
- For rescue, verify guaranteed full rescue, failed rush, partial salvage, investigated recovery, full-over-partial precedence, round-3 expiry, early closure, and exact-once carry-forward.
- At each finale, reverse route command arrival, test ties/no votes and departure after commitment, and confirm the new choice does not consume or change the route vote.
- Keep 320×568, 390×844, enlarged text, keyboard/tap, timing assistance, reduced motion, retry/reload, and late joining in regression coverage. Every possible shared state has not been exercised through a separate browser late-join session; state serialization and admission have complementary reducer coverage.
- Ask an uncoached player to identify what is at risk, why they chose their move, what failure changed, and what the party sacrificed at the ending. Record literal observations and named builds; automated checks do not measure enjoyment.

Hosted rollout, browser Realtime, physical-device behavior, and human enjoyment require their own evidence. The current task’s implementation authorization is sufficient for local development and its necessary verification; this supplement adds no separate approval requirement.
