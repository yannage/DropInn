# Gemward: The Missing Light — the party sets the pace

Status: implemented locally · Definition ID: `gemward` · Version: 3 · Not published

Required baseline: [DropInn storytelling and pacing](../storytelling-guide.md). This packet describes the new pinned v3 contract. It does not migrate rooms from [v1](gemward.md) or [v2](gemward-v2.md). Authored copy belongs in `src/lib/dropinn/storyTableContent.ts`; authoritative actions and state remain in the versioned runtime. Local verification and its limits are recorded below.

## Promise

Gemward's evening ferry is coming home, but the beacon has gone dark. Help the people who depend on it, follow a lead to its missing prism, then choose what the restored light should cost. The first minute gives the party a person to care about, an empty object to investigate and a choice whose result can be named.

Iris provides the continuity relationship. The apparent want is to recover a missing prism; the deeper need is to decide how Gemward will live with its light. The changed familiar image is either the restored beacon above an altered town or neighbours sharing small lanterns below a dark tower. The ferry is a human stake, not a hidden countdown: without prepared quay guides it can wait safely until morning.

Discovery and fellowship remain the intended experience. The immediate loop is notice a concrete need → choose an attempt → release → see the fact or preparation it changed. The party can follow its first useful lead or spend more turns helping people. These are design hypotheses about agency and pacing; automated checks cannot establish that the game is fun.

## Circle

| Beat | Player-caused event or revealed fact | Visible evidence |
| --- | --- | --- |
| You | Meet Iris while neighbours expect the evening ferry. | The little shop, the dark beacon and an empty gem stand. |
| Need | Learn that the beacon's prism is missing. | A plain objective: find a lead to the prism. |
| Go | Find a lead, then explicitly gather the party to set out. | A named shared fact followed by a later-turn Set out intention and route decision. |
| Search | Investigate the warehouse, prepare a quiet canal passage or take the open road. | Consequential route preparations and a separate encounter when needed. |
| Find | Recover the prism and understand why it moved. | Accepted investigation can reveal the mover earlier; recovery confirms the full truth and the cost of the light. |
| Take | Choose restoration's irreversible cost or release's dark evenings. | Both exact consequences appear before the second travel vote. |
| Return | Prepare the light and the people who will depend on it. | Two named preparation categories, with optional additional community help. |
| Change | Explicitly finish together after preparation. | The chosen light changes, the ferry or repair crew receives its earned callback, and the lasting cost remains. |

The eight beats do not impose eight screens or minimum waits. Three macro chapters and two travel decisions retain a short, legible structure; players choose how much optional work fills it.

## Coherent run truths

The saved seed selects one truth. Town warnings foreshadow its cost without revealing the culprit or motive that recovery must earn.

| Truth | Town warning | Find | Restoration at completion | Release at completion |
| --- | --- | --- | --- | --- |
| `smugglers` | A used prism loses its identifying mark inside the beacon. | A smuggler arranged the delivery; the recovered maker mark proves the theft. | Consume the prism and relight Gemward; destroy its maker-mark evidence. | Release the light and retain the maker mark; share lanterns through dark evenings until repairs. |
| `ward` | The light inside a prism is alive; returning it binds it again. | Nella moved the failing prism to save its living spark. | The spark survives and protects Gemward, bound to the beacon again. | Free the spark; share lanterns while neighbours repair their beacon. |

A copied delivery ledger opens a route; it is not a duplicate of the prism's unique maker-mark evidence. No preparation, Spotlight interpretation or closing paragraph grants both sides of the final tradeoff.

## Chapter 1 — The light that brings them home

Stable ID: `gemward-town`. Beats: You, Need, Go. Arrival objective: **Find a lead to the missing prism.** Highlighted first target: **Iris**. Opening: “Gemward's beacon goes dark as the evening ferry approaches. Iris shows you an empty velvet stand. ‘That light brings our neighbours home. Can you help us find it?’”

Catch-up: “Gemward's beacon is dark and its prism is missing. Follow a lead, or help the neighbours before setting out.” Once a lead exists, the next useful instruction becomes “You have a lead. Set out together, or make another preparation.”

The shop has two NPCs and two props. The inn and docks remain alternative places to inspect locally, each with four targets. Browsing is free and individual; a released intention spends the ordinary turn. There is no town battle. Pressure comes from the visible problem and a bounded active-action cap, not an undisclosed ferry deadline.

| Target / label | Supported attempts | Developed state and next use |
| --- | --- | --- |
| `iris` / Iris the jeweller | Influence offers separate pricing and news topics. Investigate compares delivery marks. Help repairs her scales. | Pricing produces the delivery lead; news identifies the open road and a watcher's habit. Help can earn Local favour. Distinct topics must not both pretend to reveal the same new fact. |
| `nella` / Nella the apprentice | Influence asks about the light; Investigate examines the sketch; Help sorts scattered gems. | The warning remains available without a premature confession. First Help offers Spark dust under the v3 consumable contract. |
| `price-board` / Gem price board | Influence asks about repair cost; Investigate reads the estimate; Help checks the figures. | The cost is understood; the board remains a board, not a repaired beacon. |
| `display-case` / Empty gem stand | Fight lifts the fallen stand; Influence asks about packing; Investigate inspects the seal; Help repairs the stand. | A real clue can open the warehouse path. The stand stays empty until the story accounts for the prism. |

Alternative local scenes:

| Place / four targets | Useful intentions and consequence |
| --- | --- |
| Inn: `oren`, `tess`, `noticeboard`, `hearth` | Oren's practical help prepares the party and offers Second wind. Tess's delivery conversation or investigation can supply the ledger; Help offers Binding thread. Noticeboard explains the warning. Hearth actions support local conversation; they must not claim to uncover a fresh clue when none is authored. |
| Docks: `bram`, `manifest`, `lock`, `reeds` | Bram or the lock can supply the canal key; Bram's first Help offers Smoke flask. Manifest conversation/investigation supplies the ledger. Reeds investigation offers Smoke flask. Other attempts retain truthful practical or conversational results. |

The middle development is a named fact or preparation. A ledger, canal key or road lead established by an earlier resolved turn makes **Set out together** available through Help on Iris (`story-plan:gather`). Every accepted action in that batch settles before departure, so one player's decision to gather the party does not discard another player's promised help. The subsequent 30-second vote selects the destination. Repeating an established fact does not award a second discovery or invent further progress.

Success is an explicit departure with a known lead. Mixed is an emergency departure after six active action rounds with whatever facts the party actually found. The setback equivalent carries essential information into the departure and keeps the open road available; the story never locks because a particular NPC was missed. Ordinary choosing remains 60 seconds and may finish early; the cap is not a compulsory six-round stay.

### On-screen context

```scene-context
{"situation":"The beacon is dark. Help Iris find a lead to its missing prism.","targets":{"iris":{"context":"Iris's empty gem stand should hold the beacon's prism.","actionCues":{"influence":"Ask about prices or recent news","investigate":"Compare the delivery marks","assist":"Repair Iris's scales"},"development":{"context":"Your lead is shared. Iris still welcomes practical help.","actionCues":{"influence":"Follow up on a known lead","investigate":"Check the delivery marks","assist":"Repair Iris's scales"}}},"nella":{"context":"Nella knows how the prism's light behaves.","actionCues":{"influence":"Ask about the fading light","investigate":"Examine Nella's sketch","assist":"Sort the scattered gems"},"development":{"context":"Her warning is recorded; the prism's disappearance remains unexplained.","actionCues":{"influence":"Hear the warning again","investigate":"Review the sketch","assist":"Sort the scattered gems"}}},"price-board":{"context":"An old estimate explains what the beacon does to a prism.","actionCues":{"influence":"Ask about the repair cost","investigate":"Read the estimate","assist":"Check the figures"},"development":{"context":"The estimate helps explain a future choice; no repairs are complete.","actionCues":{"influence":"Confirm the cost","investigate":"Review the estimate","assist":"Check the figures"}}},"display-case":{"context":"A delivery seal lies beside the empty stand.","actionCues":{"fight":"Lift the fallen stand","influence":"Ask who packed it","investigate":"Inspect the delivery seal","assist":"Repair the empty stand"},"development":{"context":"The delivery lead is shared. The stand is still empty.","actionCues":{"fight":"Steady the stand","influence":"Confirm the packing story","investigate":"Review the delivery seal","assist":"Repair the empty stand"}}}}}
```

## Chapter 2 — Find the reason

Stable ID: `gemward-route`. Beats: Search, Find, Take. Arrival objective: **Recover the prism along the party's chosen route.** Highlight the marked crate at the warehouse, landing on the canal or trail on the road. Catch-up: “The party followed its lead here. Recover the prism, then choose what its light should cost.”

| Target / label | Supported attempts | Developed state and next use |
| --- | --- | --- |
| `crate` / Marked crate, drifting crate or handcart | Fight braces; Influence asks about delivery; Investigate traces marks; Help secures or moors. | Warehouse evidence prepares the guarded recovery; a canal mooring opens a later quiet approach. |
| `watcher` / Route watcher | Influence speaks or distracts; Investigate studies; Help approaches carefully. | A prepared canal distraction can avoid the encounter. The watcher never becomes a friendly NPC merely because a generic token was used. |
| `ramp` / Ramp, landing or path | Fight clears; Influence coordinates; Investigate checks footing; Help braces or moors. | Canal preparation is visibly recorded before quiet recovery becomes available on a later turn. |
| `prism-trail` / Trail of light | Fight clears debris; Influence gathers the party; Investigate follows the light; Help marks the way. | A qualifying route investigation earns the next state; confirmed recovery closes this chapter. |

Warehouse investigations lead to a bounded encounter. Canal mooring followed by a later quiet passage can recover the prism without fighting. The always-open road leads directly to an encounter. Every route retains a fallback, and both combat victory and escape recover the essential object. The route's actual mechanical cost and any used town preparation must appear honestly in the preview and result.

Combat remains a standalone component with announced enemy intent and class-specific choices, lasting two to four rounds. Exploration resumes only after combat resolution; recovery then closes the middle chapter without a filler progress turn. The outcome states the seeded truth and both lasting ending costs even if the town warning was missed.

Success means a victory or peaceful recovery. Mixed means an escape with the prism and recorded injury or supply consequences. The setback route preserves Find and Take; it does not demand another search for an object already recovered.

### On-screen context

```scene-context
{"situation":"The party's lead reaches a guarded light. Recover the prism and learn why it moved.","targets":{"crate":{"context":"Light escapes the marked delivery.","actionCues":{"fight":"Brace the crate","influence":"Ask about the delivery","investigate":"Trace the delivery mark","assist":"Secure the crate"},"development":{"context":"The delivery is traced; the guarded recovery lies ahead.","actionCues":{"fight":"Brace the crate","influence":"Confirm the delivery","investigate":"Review the delivery mark","assist":"Secure the crate"}}},"watcher":{"context":"The watcher stands between the party and the prism.","actionCues":{"influence":"Speak to the watcher","investigate":"Study the patrol","assist":"Prepare a safe approach"},"development":{"context":"Use the approach the party actually prepared.","actionCues":{"influence":"Distract the watcher","investigate":"Check the patrol","assist":"Support the approach"}}},"ramp":{"context":"The landing offers a way toward the light.","actionCues":{"fight":"Clear the approach","influence":"Coordinate the crossing","investigate":"Check the footing","assist":"Secure the landing"},"development":{"context":"The landing is prepared; the next useful attempt is visible.","actionCues":{"fight":"Keep the approach clear","influence":"Coordinate the crossing","investigate":"Check the footing","assist":"Check the prepared landing"}}},"prism-trail":{"context":"A thin glow connects the delivery to the prism.","actionCues":{"fight":"Clear fallen debris","influence":"Gather by the light","investigate":"Follow the prism's glow","assist":"Mark the way home"},"development":{"context":"The trail is recorded. Recovery will reveal the missing truth.","actionCues":{"fight":"Keep the trail clear","influence":"Gather by the light","investigate":"Review the trail","assist":"Mark the way home"}}}}}
```

## Chapter 3 — A light to live with

Stable ID: `gemward-return`. Beats: resolve Take, Return, Change. Arrival objective: **Prepare the light and neighbours, then finish together.** Highlight the beacon lens or shared lanterns. Catch-up: “The party chose restoration at the tower / release at Lantern square. Prepare the light and the neighbours before finishing together.” Append the exact seeded branch cost; a late joiner must not need another player's memory.

The two required categories are tangible work on the **light** and preparation for the **people**. An optional specific community plan earns its own lasting callback. Finish together becomes available only after the required facts exist in the turn's initial state. An action can finish the party's work but cannot recast the earlier travel vote. No battle interrupts this chapter.

| Tower target | Supported attempts | Developed state and next use |
| --- | --- | --- |
| `beacon` / Beacon lens | Fight clears braces or Help aligns, recording `light-ready`. Influence discusses alignment; Investigate checks damage. | Practical work records light preparation. Discussion and inspection explain the plan without creating a second fact. The lens stays dark until completion. |
| `keeper` / Keeper at the tower | Influence confirms the lasting cost; Investigate or Help prepares practical community follow-through. | A recorded repair plan produces its own ending callback. Eligible Help also offers the explicit finishing intention. |
| `cradle` / Prism cradle | Fight steadies or Help prepares, recording `light-ready`. Influence discusses the fitting; Investigate checks it. | Another practical way to prepare the light, not a second required progress bar. The prism remains intact. |
| `town` / Waiting neighbours | Influence organizes guides or Help prepares safe work, recording `people-ready`. Investigate inspects the route. | The prepared quay guides bring the evening ferry home. Inspection alone does not arrange them. |

| Square target | Supported attempts | Developed state and next use |
| --- | --- | --- |
| `lanterns` / Shared lanterns | Fight makes stands or Help prepares lamps, recording `light-ready`. Influence discusses sharing; Investigate checks shutters. | Practical work prepares light for a dark evening; it does not restore the beacon. |
| `keeper` / Keeper in the square | Influence confirms the cost; Investigate or Help prepares repairs. | A repair plan earns a distinct community callback; finishing remains an explicit separate intention. |
| `spark` / Sheltered prism | Fight clears a release space or Help prepares a gentle release, recording `light-ready`. Influence discusses the plan; Investigate checks the prism. | Practical work prepares the chosen light while preserving the object until completion. |
| `neighbours` / Neighbours at dusk | Influence agrees a guide plan or Help organizes guides, recording `people-ready`. Investigate inspects the streets. | The guides bring the ferry home. Successful work is not erased by another player's Finish action in the same batch. |

The preferred completion is **Finish together**, a separate Help intention on the keeper (`story-plan:finish`). Both required preparations earn a success result, including if the announced cap closes a fully prepared finale. After four active action rounds, an emergency completion with missing preparation is mixed: its result names missing light work (a hurried fitting by the keeper) or missing people work (the ferry waits safely offshore until morning). The setback equivalent still enacts the chosen branch, communicates its cost and records help actually completed. It must not invent a total failure or silently undo a prepared fact.

### On-screen context

```scene-context
{"situation":"Prepare the chosen light and the people who will depend on it. Then finish together.","targets":{"beacon":{"context":"The lens is dark; alignment will prepare the light.","actionCues":{"fight":"Clear the lens braces","influence":"Discuss the alignment","investigate":"Check the damaged lens","assist":"Align the beacon lens"},"development":{"context":"The light is prepared. The prism has not been spent.","actionCues":{"fight":"Check the cleared braces","influence":"Confirm the alignment","investigate":"Inspect the prepared lens","assist":"Check the prepared lens"}}},"keeper":{"context":"The keeper can explain the lasting cost and organize what follows.","actionCues":{"influence":"Confirm the lasting cost","investigate":"Plan tomorrow's repairs","assist":"Help the repair crew"},"development":{"context":"The recorded plan will shape tomorrow; the party may finish once its required work is ready.","actionCues":{"influence":"Confirm the lasting cost","investigate":"Review the repair plan","assist":"Finish together when ready"}}},"cradle":{"context":"Prepare the fitting while the prism stays in the pouch.","actionCues":{"fight":"Steady the cradle","influence":"Discuss the fitting","investigate":"Check the fitting","assist":"Prepare the cradle"},"development":{"context":"The light's fitting is prepared; completion will enact the chosen cost.","actionCues":{"fight":"Check the cradle","influence":"Review the fitting","investigate":"Check the prepared fitting","assist":"Check the prepared cradle"}}},"town":{"context":"Neighbours need a safe plan for tonight's work and arrivals.","actionCues":{"influence":"Organize the quay guides","investigate":"Check the evening route","assist":"Prepare the neighbours"},"development":{"context":"The people are prepared; their work will be remembered in the ending.","actionCues":{"influence":"Confirm the quay guides","investigate":"Review the evening route","assist":"Check the prepared plan"}}}}}
```

## Cost and branch contract

V3 keeps the six-node graph: town → warehouse/canal/road → beacon/Lantern square. Local shop, inn and docks browsing is not a party transition. The two party forks remain distinct 30-second travel phases after chapter resolution; options and electorate freeze at entry. A unique plurality wins, while tied or absent votes use road at the first fork and Lantern square/release at the second. Display those costs before voting.

One human can choose or finish. Companions never cast preference votes. Accepted actions and votes survive their author's departure. Late arrivals observe the current confirmed state and enter at the supported boundary. Exact retries must not duplicate facts, rewards, finishing work or irreversible costs. Empty rooms park; fiction does not complete unattended.

The second fork stores the choice and destination only. The prism is consumed, its spark bound or released, the beacon relit and the final ending written once at chapter completion. Optional preparations change the community's practical experience; they do not cancel evidence destruction, binding or dark evenings.

## Mechanics and scope

The signature v3 change is a fact-driven town and finale with explicit departure and completion intentions. It replaces generic exploration progress there. The separate encounter, class moves, three-slot personal stash, shared quest provenance, server command authority and 60-second choosing / up-to-ten-second reveal timing remain. V1 and v2 stay addressable without migration.

The new saved `storyTable` state records facts with their acquisition turn and source event IDs, active action rounds, whether the area's extra opportunity was used, and whether the packed lantern was spent. The ordinary action result records before/after/next copy, new fact IDs, repeat status and any finishing or item effect. Facts survive the contributing player's departure. Ledger/key facts also remain in the existing shared quest pouch; no private stash slot is consumed by a shared discovery.

| Fact | Acquisition / requirement | Concrete effect |
| --- | --- | --- |
| `ledger-copy` | Delivery pricing or another qualifying ledger source | Opens warehouse and qualifies a later Set out. |
| `canal-key` | Qualifying dock help/conversation or Local favour | Opens canal and qualifies a later Set out. |
| `road-lead` | Iris's news topic | Qualifies a later Set out; the road itself is always open. |
| `watcher-tell` | Iris's news topic | Adds 1 party battle progress once when the encounter begins; no combat benefit is invented on a peaceful canal recovery. |
| `packed-lantern` | Help Oren | Prevents 1 damage from the first strike that gets through existing protection, once. Fully blocked strikes preserve it; remains unused if the party avoids battle. |
| `ward-warning` | A qualifying warning source | Records non-spoiling cost context; it is not a route lead. |
| `light-ready` | Finale Fight/Help on beacon, cradle, lanterns or spark | Required before Finish; earns a prepared-light callback. |
| `people-ready` | Finale Influence/Help on town or neighbours | Required before Finish; earns the quay-guides/ferry callback. |
| `repair-plan` | Finale Investigate/Help on keeper | Optional: tools and volunteers will meet at dawn. Does not negate the selected branch cost. |

Town's base cap is six active action rounds and finale's is four. An active round contains accepted human work; empty waiting does not secretly finish the story. A prior-turn lead enables departure, while both prior-turn required finale facts enable completion. One human can therefore finish through sequential work; two humans can prepare separate needs in the same batch. The finishing intention is a normal released action, not a second preference vote or a demand for unanimous acknowledgement. All accepted work settles first.

V3 gives **Spark dust** a purpose that matches fact-driven play: it adds one active preparation opportunity to the current town or finale. The party can extend each area once; additional doses do not stack, and the item is unavailable on the middle route or during combat. It never duplicates a fact or bypasses a prior-turn gate. **Local favour** supplies a chosen ledger or canal key in town, also qualifying a later departure. Second wind heals up to 4 self HP; Smoke flask supplies 3 combat protection under strongest-cover rules; Binding thread adds 2 battle contribution before human scaling. Personal stash capacity remains three, with one held consumable per accepted action and persistent replace/decline offers; fresh rewards cannot be spent in the same acquisition batch.

Authored exports are `GEMWARD_STORY_COPY`, `GEMWARD_STORY_FACT_COPY`, `storyTableWarning`, `storyTableCost` and `storyTableEnding`. They provide text; reducer state determines whether a fact, item effect, callback or final cost actually happened. Numeric mechanics belong in the runtime and its tests, not this prose module.

Every preview distinguishes a new fact, a repeated fact, optional help, an explanation and a finishing intention. An explanation may be useful without changing state; its result must say so. Extra copy cannot substitute for a real effect. Signed Spotlight remains bounded by authored effects and cannot choose the party's future or bypass a prior-turn prerequisite.

## Closing image and keepsake

Restoration shows the beacon shining again and states the evidence destroyed or spark bound. Release shows the dark tower over shared lanterns and states the free light/preserved mark and unfinished repairs. Prepared people or optional community work add only the callbacks actually earned. Missing preparation has a humane consequence, such as a ferry waiting safely until morning, rather than an invented death or erased recovery.

Truthful recaps name contributions such as finding the delivery lead, preparing the canal landing, protecting a hero, readying the light or organizing neighbours. They do not call repeat questions new discoveries. The party's branch and individual votes remain distinguishable. Iris's glass bead, a prism-thread bracelet and Gemward's little lantern retain ordinary contribution eligibility and no starting-power advantage; this adventure remains outside the First Tales Thread/Story Pass catalog.

## Art and audio brief

Reuse the eight repaired MS Paint environment plates and separate matching NPC, quest, enemy and supply cutouts under `public/art/gemward-v2-*`. The art filename prefix is not the room's rules version. Keep four interaction zones and quiet foreground. The empty stand stays empty, a prepared lens stays dark, and a freed spark is not depicted as still bound. No new raster generation is part of v3's story change.

Confirmed scene changes appear before optional Chronicle explanation. Journey opens for the two explicit travel decisions. Existing bounded discovery/contact animation and reduced-motion equivalents remain appropriate. V3's opening has four sentence segments across eight supported natural voices. Prerecorded lookup requires an exact text/voice/speed match; an older v2 recording cannot stand in for changed words. Pinned earlier openings remain in the catalog.

The retained narration catalog has a 32 MiB total artifact budget, increased to keep old room versions while adding the new opening. This is not a startup download: playback requests only the selected voice's current passage. The 350 KiB first-segment and 768 KiB per-clip limits remain. The local browser worker creates the recordings without an inference service; this does not establish ordinary runtime inference latency or subjective voice quality.

## Verification

Design review: the eight beats connect a familiar community problem, earned truth, explicit cost and changed return. The visible two-category finale and voluntary departure address the identified generic-progress problem. This remains a design assessment, not a human comprehension result.

Implemented as the default Gemward version; v1/v2 remain pinned. The full local unit/service suite passes 784 tests, including 25 v3 rule/service checks. The service journeys cover both motives × both endings with persisted snapshot readback, forged-identity handling, stale-revision exact retries, and no duplicate facts, final costs or keepsakes. Automated coverage includes:

- Distinct Iris pricing/news results; non-spoiling warning; source attribution and truthful repeats.
- One human plus companions and two humans leaving on the first prior-turn lead or staying for optional preparation.
- Both sequential canal facts, guarded warehouse and road; actual consumption of any town preparation; win/escape/bypass all recover the prism.
- Both required finale categories, optional callback, explicit finish, and same-turn accepted actions resolved before finishing.
- Prior-turn gate, active-action emergency cap, missing-preparation text, both variants and both irreversible costs.
- Duplicate/reordered commands, departure, late arrival, empty-room parking and restored saved version identity.
- New opening narration, mobile 320/390, keyboard/release alternatives, enlarged text and reduced motion.

Newcomer observation remains open: ask what is wrong, what their selected move changes, why they can depart, what finishing costs and what is different afterward. Record observed answers and visit lengths. The final browser/build evidence is maintained in [story-table verification](../story-table.md#boundaries-and-verification).

Hosted API/Realtime, physical phones and uncoached enjoyment require separate evidence. No publication or deployment is claimed.

Opening-audio verification on 2026-10-03: the local worker generated 32 v3 clips and reused all 112 earlier clips. `build-narrator-openings.mjs --check` verified 144 recordings across 13 registered story versions and all eight voices, totaling 24,920,736 bytes within the 32 MiB catalog budget. All ten `narratorOpenings.test.ts` tests passed, including exact lookup, pinned-version coverage, PCM/hash validation and unchanged per-clip limits.

The browser audio runner explicitly selected Gemward v3 and passed all five scenarios with zero browser errors: complete four-segment playback with late/early model readiness, continued prepared audio after model initialization failure, playback failure and cancellation. It requested only exact current-opening files; the first Bella segment is 278,044 bytes. The final report is `output/playwright/narrator-openings.json`. These scenarios use real shipped WAVs and AudioContext with held model transport and mocked initialization; they do not establish dynamic inference latency, physical-phone behavior or subjective voice quality. An initial run during active source editing timed out; the unchanged product passed the stable-source rerun.
