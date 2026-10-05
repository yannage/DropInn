# Avalon: A Visit to the Larch Hills

Status: implemented; authored generator locally verified · Definition ID: `avalon` · Definition, world, generator and content versions: 1 · Not published

Required baseline: [DropInn storytelling and pacing](../storytelling-guide.md). This packet records an explicit extension of that baseline: Avalon uses the Mosswater sequential quest lifecycle, rather than the four-token, three-scene simultaneous loop. Three reward milestones recognize discovered leads, established causes and a played return; they do not move the party or require a particular chapter route. Human comprehension and perceived fun remain playtest questions, not automated-test claims.

## Promise

Arrive somewhere new in a familiar landscape, decide which local troubles deserve attention, and return with a result that belongs to this party. The tone is approachable, slightly odd woodland fantasy. Wren and the Larch Inn provide continuity. The apparent want is to follow a useful lead; the deeper need is to choose a workable response to people, animals and shared resources. The closing familiar image is an inn with the party's specific news, fulfilled or outstanding promises, and honest unresolved business.

The intended pleasures are discovery, cooperation and expression. A small decision produces an observable fact, a useful item, a route to another place or a changed situation. Different interests can coexist as two live threads. The director reads explicit follow choices and accepted actions; it never treats silence, absence or a companion as consent.

## A stable world, a saved visit

`AVALON_WORLD` in `src/lib/dropinn/avalonContent.ts` fixes six places and their paths:

| Place | What stays true | Residents and plausible visitors |
| --- | --- | --- |
| The Larch Inn | Wren's common store and the party's return point stand above Merewater. | Wren lives here; a visiting tinker or warden can bring news. |
| Old Ford | The road crosses Larch Run; a dry footpath remains beside the cart crossing. | Road travelers, a tinker or warden. |
| The mill yard | A small dye mill drains into Larch Run below the spring. | Workers; a mossback may shelter beside a vat. |
| Merewater reeds | Reed Brook meets the lake beside a safe shore path. | Visiting wardens and tinkers; marsh wildlife. |
| Hill Spring | Larch Run rises here, above the mill; a grazing shelf has two downhill approaches. | The hill flock; reed wolves can occupy the lower approach. |
| Green Quarry | The abandoned limestone clearing lies above Reed Brook on the cart road. | Carters; scrub-dwelling reed wolves nearby. |

There are exactly **two named streams and one named lake**: Larch Run flows from Hill Spring through the mill and ford into Merewater; Reed Brook flows from Green Quarry through the reed bank into Merewater. Weather never rewrites geography. Seven bidirectional paths keep all six places reachable without guessing a secret item.

At creation, a deterministic seed chooses one of the inn, ford or reed bank as the arrival, two of three conflict families, a weather description and eligible witness assignments. Wren always remains at the inn. Nim the tinker and Sedge the warden receive distinct, eligible locations; a person cannot appear twice. Pip is at the quarry whenever the missing-carter thread exists. Each selected thread has a named witness **and at least two physical sources**, so unavailable social context cannot block an essential lead.

The saved manifest pins the world, generator and content versions, seed, cast, starting point, conflict pair, clue assignments and any causal link. Loading, joining and reconnecting read it; player interest cannot reroll an inconvenient cause. The runtime rejects a changed manifest. The visible episode tracks discoveries, explicit interests, resolutions, pressure and one promise separately from that immutable setup.

### Three conflict families

| Thread | Established cause | Meaningfully different outcomes |
| --- | --- | --- |
| Bitter water | A cracked dye vat leaks into Larch Run. A mossback uses it as a dry shelter. | Spend two supplies sealing and flushing it while preserving shelter; promise a reed bed at Wren's unused washpond and let the creature haul it away; or fight, then haul it clear at the cost of the old shelter. |
| The missing carter | Pip is unhurt, but the cart axle broke at Green Quarry. | Fetch and use the reusable repair kit; spend two supply packs on a skid; or walk Pip home now and leave the marked cargo for another day. |
| Bells above the spring | The flock is safe on the grazing shelf; reed wolves occupy its lower trail. | Spend two supplies luring the pack away; use tools and one supply to make the upper gate a lasting second path; or fight, then explicitly guide the flock through the opening. |

Only a seeded water/carter pair can share a cause. In that visit, Pip was carrying the replacement vat seal, and the broken cart delayed its delivery. Confirming this evidence reveals both leads, but does not solve either problem. In an independent visit, Pip was delivering flour and the axle accident has no causal connection to the other thread. The director never retroactively makes all rumors part of a hidden master plot.

## Circle

| Beat | Player-caused event or revealed fact | Visible evidence |
| --- | --- | --- |
| You | The party arrives at one of three recognizable places. | Fixed map, local people and one immediately usable object. |
| Need | A note, stream stain or distant bell gives a concrete local question. | A new lead with the actual discovering player's event provenance. |
| Go | A player explicitly follows a thread and takes the party along a known path. | Active thread and highlighted map path; other known leads remain. |
| Search | The party compares physical evidence or speaks to an eligible witness. | Shared clue/item, named destination and an immediate follow-up. |
| Find | Inspecting the vat, axle or flock establishes the cause and available methods. | Actual source facts; a linked episode exposes its preexisting connection. |
| Take | A player confirms a previewed supply, promise, cargo or shelter cost. | Shared supply change, outstanding promise or chosen resolution. |
| Return | After settling at least one thread, the party returns to Wren and confirms the visit's close. | A distinct return action at the inn; unused routes do not auto-complete anything. |
| Change | Wren records exactly what the party changed and what remains. | Resolved props, thread history, return text and earned keepsakes. |

## Chapter 1: Something worth following

Stable milestone ID: `avalon-lead`. Beats: You, Need, Go. Objective: **Find a lead worth following.** The arrival's first local clue has no item or fact prerequisite. Inn arrivals can read an urgent delivery note; ford arrivals can inspect water or a waybill; reed-bank arrivals can inspect the water or delivery notice, hear bells or first gather a useful bundle. The opening hook is derived from the lead physically present at the starting place.

Catch-up: “This is the Larch Hills: six connected places around two streams and a lake. The party can inspect what is here, then choose which lead to follow.” Combat is optional, never an arrival ambush. Ordinary supplies can be acquired before any investigation. The middle development is a named lead with a practical destination. The milestone pays out once when a real lead is established.

Success: establish a local question and choose a direction. Mixed: gather supplies or a tool first, then investigate. Setback: an expired focus hands play onward without inventing a clue or interest. No timer forces the party onto a route.

## Chapter 2: What is happening here

Stable milestone ID: `avalon-truth`. Beats: Search, Find, Take. Objective: **Find a workable response.** Inspect the source of either thread; further investigation of the other remains available after this reward milestone.

Catch-up: “The party has followed a real lead to this place. Check what caused the problem, then choose which cost the party can accept.” The scene shows the actual vat, flock or cart; the interaction explains a cause before offering an irreversible response. A battle suspends exploration, gives each human a combat move and then returns to the unresolved local task. Winning or escaping a battle does not itself bring water, sheep or a person home.

Success: confirm the cause, then perform a chosen resolution. Mixed: resolve one thread while the other still needs attention, or use a costlier method because supplies have gone elsewhere. Setback: after the bounded combat escape, the approach is usable and the final action remains available. No essential clue depends on winning a random check.

### Targets and truthful developments

These are explicit quest interactions, not new meanings for the older stories' four wire tokens. Inspecting a target is local; the release control alone sends a command. Only the listed actions exist. Each scene holds at most three touch targets.

| Target ID / label | Plausible actions | Developed state and next use |
| --- | --- | --- |
| `wren` / Wren | Borrow the reusable repair kit; pack the one common-store lunch; deliver promised reeds. | Empty lunch reserve or shared tools are recorded once; a kept promise appears at the inn. |
| `inn-notice` / Today's deliveries | Read the first local lead. | Lead remains in the shared record; follow its actual destination. |
| `ford-waymark` / Ford markers | Compare the yellow water; read Pip's waybill; hear the hill bells, as selected by the episode. | Physical clue records name the mill, quarry or spring. |
| `ford-kit` / Bridge keeper's kit | Borrow the lever and rope if the party has no repair kit. | The same shared tool fact prevents a second acquisition elsewhere. |
| `bank-reeds` / Safe reed shelf | Gather two supply bundles and bed reeds once; examine physical leads. | Harvest stays spent. Reeds can fulfill the washpond promise. |
| `mill-vat` / Cracked dye vat | Trace the leak; seal and flush it; or haul it clear after combat. | Sealing retains a contained vat; removal shows the clear feed. No leaking vat persists after restoration. |
| `mill-mossback` / Mossback | Listen; offer the promised home; or challenge it. | A peaceful seal keeps the creature present. Combat, relocation and hauling show tracks. |
| `mill-stock` / Dry work shelf | When no water conflict exists, collect one spare supply. | Quiet mill stays quiet; no absent problem is invented. |
| `spring-pool` / Clear spring | Fill one travel flask and keep a comparison sample. | Flask reward cannot repeat; clean water above the mill remains established. |
| `spring-flock` / Waiting flock | Survey both paths; choose food, repaired gate or combat; guide the flock after battle. | Sheep remain until the final guide action. A repaired gate appears only for the repair outcome; other outcomes show the emptied shelf. |
| `quarry-cart` / Tilted cart | Inspect the axle; use tools; spend supplies on a skid; or mark it for later recovery. | Pip is safe after all three outcomes. Cargo recovery is claimed only for repair or brace. |
| `pip` / Pip | Ask what happened; learn the axle cause independently of inspecting the cart. | Pip leaves the quarry after being brought home. |
| `quarry-cairn` / Quarry cairn | Take its single dry reserve. | Empty reserve remains recorded; the road stays open. |
| `witness-<thread>` / Nim or Sedge | Ask about the witness's assigned, plausible observation. | Provides a redundant lead, never a newly randomized cause. |

### On-screen context contract

Avalon uses the versioned `QuestTarget.context` and `QuestOption.preview/result` fields rather than the older `scene-context` token JSON. The table above is implemented by `avalonContent(savedEpisode, confirmedFactIds)`. Contexts read resolved thread state and confirmed combat facts: a cleared approach no longer claims a creature is blocking it; Pip does not remain stranded after rescue; only a repaired upper gate is pictured as repaired. The immutable atlas description remains independent of these episode developments. Critical prices and requirements appear before release. Flavor text is not a state transition.

## Chapter 3: The hills after your visit

Stable milestone ID: `avalon-return`. Beats: resolve Take, Return, Change. Objective: **Bring your news back to Wren.** At least one thread must be resolved. Returning home is player-chosen rather than an automatic consequence of a last interaction. The other thread can still be pursued before the party leaves.

Catch-up: “Your choices have changed at least one local trouble. Return to the Larch Inn when the party is ready; the record will preserve unfinished work.” The inn is reachable from every area. The finishing event records each chosen resolution and cost, untouched or unresolved threads, and any promise still owed.

Success: both threads settled and any offered reed bed delivered. Mixed: one thread settled, or a promise remains owed; the return explicitly records it. Setback: an exploration timeout never claims a completed visit. A player can leave and later rejoin the same saved episode without losing evidence. There is no auto-success round cap; pressure is bounded and a return is available after one resolution. This is a deliberate pacing exception to the three-chapter baseline.

## Cost and branch contract

Exploration is sequential and server-authoritative. A resolving action is a party action by the currently focused human, with its effect and cost visible before release. The prototype does not claim a unanimous vote; companions never choose a branch and absence does not record preference. Exact retries cannot spend a resource twice. Once resolved, a thread cannot take a contradictory resolution. Departures do not undo accepted actions or remove shared knowledge.

Every thread offers a resource-efficient alternative whose cost is legible: extra travel for tools, accepting cargo left behind, making a promise or taking combat risk. Supplies serve both local solutions and combat Mend, so spending them competes with another real use. Combat at the vat explicitly gives up the peaceful shelter-preserving responses; the ensuing haul remains possible without supplies.

One promise can be outstanding. Offering the unused washpond solves the immediate water problem but creates a visible obligation. The party gathers reeds at the bank and delivers them at the inn. Delivery removes the physical bundle and records the kept promise. Returning with the promise owed records that debt; it does not silently forgive it or claim a new den was fully prepared.

After a full cycle of current human focuses containing at least one meaningful action, the director considers the explicit active threads. Timeouts and passes supply no interest; absent-only cycles do not advance pressure. The first two pressure stages warn. At the third, each active unresolved thread can spend **one** shared supply on its previewed local need, once. At zero supplies, it records an unmet request and does not claim aid was sent. Pressure caps at three, leaves every path open and never changes the original cause. Known opportunities stay available while explicit follow choices determine which thread becomes active.

## Mechanics and scope

Implemented on the existing authoritative room JSON: seeded manifest, fixed atlas, random eligible arrival/witnesses, two authored quest threads, redundant evidence, optional preexisting shared cause, explicit follow commands, pressure at meaningful party boundaries, a promise and fulfillment, and an explicit return. Mosswater's two-action 45-second focus, short confirmed consequence, separate class battle, personal loot, shared kit and run attributes remain the underlying game loop. Existing stories and their pins are unchanged.

The director selects authored opportunities from actual saved facts. It is not a language-model world simulator, does not generate arbitrary new quests at runtime and does not infer a player's personality. The three conflict families are a bounded first authored library. Testing whether those combinations create sufficiently different play remains necessary before expanding the library.

## Closing image and keepsakes

The returned tableau belongs at Wren's inn. The return text names actual resolved changes, with no inferred player emotion. An unfinished second thread is recorded as open; a hidden thread is called an uninvestigated local trouble instead of revealing its secret. The party's washpond promise is either ready or explicitly owed.

Keepsakes preserve the existing contribution and receipt policy:

- **Avalon's trail knot** (`Avalon’s trail knot` in the catalog): the party established a lead.
- **Avalon's copper leaf** (`Avalon’s copper leaf`): the party established what was happening.
- **Avalon's return cup** (`Avalon’s return cup`): the party played its return.

These are symbols, not new starting power. Recaps should credit the actual actor and source event: “Nim's news gave the party the quarry lead; Alice repaired Pip's axle with the borrowed kit.” A player arriving after that repair must not receive credit for performing it. Unresolved copy never grants a resolution reward.

## Art and audio brief

Keep DropInn's approved sparse MS Paint linework, flat color and awkward friendly silhouettes. New scene plates: Larch Inn, Old Ford, Green Quarry. Reuse the matching Mosswater mill, hill spring and river/reed scene plates. Place NPCs and quest objects separately so saved assignments do not create duplicate people or imply a resolved state too soon.

New cutouts: Wren, Nim, Sedge, Pip, waybill, tilted cart, quarry lantern marker, and three keepsakes. Reuse approved mossback, sheep, wolf pack, spring pool, repair kit, reeds, sample, gate and tracks. Developed art uses contained vat for a peaceful seal, clear feed after removal, tracks after a creature leaves, the repaired gate only after repair, and removes Pip after a safe return. Confirmed discovery, reward and encounter animation reuse the existing frame atlases. Reduced motion displays the full developed state immediately. No auto-narration was added.

All thirteen new raster assets preserve their generated PNG originals and exact RGBA lossless WebP derivatives. Provenance, reference hashes and small-size/crop reviews are recorded in `.agents/skills/dropinn-art/references/avalon-world-prompts.json`; the shared inventory includes them. Short inn banners use a top-aligned crop to preserve the roof.

The existing optional narration library now includes all seeded opening variants in its eight voices: 48 new locally generated clips, 232 retained clips total, 39,290,608 bytes. The retained catalog budget is 48 MiB; the 350 KiB first-segment and 768 KiB per-clip limits remain. Playback requests the selected sentence and voice, not the whole library. Exact lookup, decoded PCM and hashes are verified; no subjective voice-quality claim is made.

## Verification

`avalonContent.test.ts` covers 160 deterministic episodes: three arrivals, all conflict pairs, both linked/independent water-carter visits, varied eligible casts, stable connected geography, immediate local leads, unique option IDs, at most three stage targets, redundant physical evidence, truthful resolved art, cost alternatives, visible unresolved return and zero-supply pressure wording. Runtime and service tests cover all nine resolutions, bounded pressure, two identities, promise consumption, capped supply receipts, parked resumption and exact retries. The full local suite passes 926 tests; the production build and retained audio-library check pass.

The maintained `scripts/playtest-avalon.mjs` uses independent browser identities and the real isolated local handler with controlled time. It exercises explicit prepare/release, lost-response recovery, the shared pouch and leads, two active threads, idle turns, rejoining, supplied/full-pack reed collection, a kept promise, different resolutions and an explicit return. All six place previews and thirteen new illustrations are inspected at 320, 390 and 1280 pixels, including non-overlapping map controls. Generated reports/screenshots live in `output/playwright/`. These are local browser results, not hosted API, hosted Realtime or physical-device evidence.

Final October 5 local browser runs: **59 Avalon checks, 99 Mosswater regression checks and 50 story-selection checks passed**, each with no errors and unchanged source/art fingerprints during capture. Map controls, phone promise text, all artwork and the changed return state were visually reviewed. These establish behavior and presentation, not a claim of player enjoyment.

Before release, obtain uncoached answers to: Where are you? What local action could reveal a lead? Which of the party's two problems is being pursued? What would each available fix cost? What changed after your action? Can you finish the visit now, and what would remain unresolved? Record answers rather than interpreting clicks as comprehension.

Exercise solo with labeled companions, two humans favoring different threads, late join, departure before a return, an outstanding promise, all supply counts at a pressure boundary, each combat resolution/escape, and reconnect with an unchanged manifest. Verify all three starts and each returned state at 320×568, 390×844 and desktop sizes; keyboard release, uncertain command retries and reduced-motion playback must retain their existing guarantees. Measure actual time-to-first-understood-choice and visit length before claiming improved pacing or replay value.
