# Mosswater: The Well That Growled

Status: implemented and locally verified; uncoached human playtesting and hosted verification pending. Definition: `mosswater@1`. Runtime copy: [questRunContent.ts](../../src/lib/dropinn/questRunContent.ts). Required baseline: [storytelling guide](../storytelling-guide.md); structure adapted from the [story packet template](TEMPLATE.md).

## Promise

**Bring clean water back to Mosswater.** Mara catches a bucket before anyone drinks. The well tastes bitter, something growls below, and her kettle is empty. Players can investigate the pollution, meet the creature guarding its source, or reopen an older clean-water route.

The single cause is a cracked bitterroot-dye vat leaking into the well's feed. The displaced mossback guards it because its side shelters a dry nest. Its growl echoes through the pipe; defeating it does not clean the water. The deeper need is a dependable village supply, which can be met without discovering every fact. Mara and her kettle carry the community through departures and late arrivals. Do not assign a hero a feeling or a personal sacrifice.

The intended run is 10–15 minutes for one to four people, with optional fighting and preparation. This is a pacing target, not a measured duration or an enforced minimum. Six revisitable places replace a fixed procession of scenes. The three chapters are reward milestones, not rooms players must visit in order.

## First minute and play contract

Opening: “Mara catches your bucket before it reaches the well. ‘The water turned bitter overnight.’ A growl rolls up the rope. Her kettle is empty. Where will you start?”

The well is the suggested first target. Lowering its bucket produces a dye-stained scrap and confirms that the sound travels through a pipe. The same player may then trace that pipe toward the source or show the scrap to Mara and pursue another supply. Either choice gives the next player a useful lead. Asking Mara first or packing tools is also valid; the bucket is not mandatory.

This mode deliberately changes the baseline's simultaneous four-token turn. One hero receives up to two action beats within a 45-second focus. An accepted approach settles as a confirmed result for three seconds, advances the authoritative turn identity, and may offer a follow-up to that same hero. The follow-up uses the newly confirmed facts. Travel also spends an action beat; pass or expiry rotates the focus. Combat temporarily replaces exploration. This is the ordinary quest turn, distinct from the older AI Spotlight ability.

The story-circle and consequence-first presentation requirements remain. There is no timed dexterity release or automatic history parchment in this mode. The content has two or three interactables per place, not twelve mandatory token targets. These are explicit scope exceptions for the new quest loop; pinned older adventures retain their own rules.

## Circle

| Beat | Player-caused event or revealed fact | Visible evidence |
| --- | --- | --- |
| You | Arrive where neighbours normally draw their water. | Mara, the well and an empty kettle in the opening. |
| Need | Learn that the normal supply is unsafe. | Bitter water and a stained rope; objective remains clean water. |
| Go | Choose a source lead, an alternate route or useful preparation, then travel. | A confirmed discovery, shared item or available map exit. |
| Search | Compare dye, listen to the mossback, test the spring, or clear a useful passage. | Recorded facts, opened gate, supplies and encounter outcomes. |
| Find | Establish the poison source **or** verify a usable clean spring. | `dye-source` or `spring-tested`; a growl alone proves neither. |
| Take | Preview the particular cost of the chosen remedy. | Two supply packs, a promised habitat, displacement, or the longer carrying route. |
| Return | Commit the remedy that gets water home. | A final action seals/cleanses the feed, removes the vat, or opens the relay. |
| Change | Leave Mara supplied, with a specific consequence the village keeps. | The ending records clean well water, a protected new den, or a sealed well and spring carriers. |

These beats describe causal changes. They do not require eight turns or all six places. A spring-only ending must not reveal an unvisited creature's motive as if the party had discovered it.

## Three chapter milestones

### 1 — What happened to the water?

Stable chapter ID: `mosswater-investigate`; objective ID: `investigate`. Beats: You, Need, Go. Arrival objective: **Find a useful lead for clean water.** Suggested first target: `well`. Catch-up: “The village well has turned bitter. Follow its feed, or find another supply.”

The well yard has the well, Mara and a repair kit. No opening battle is required. A first discovery changes the shared facts or pouch; its follow-up identifies a useful route or preparation. A known route completes the milestone. A party that obtains a later solution directly receives the earlier milestone once as part of that progress; it is not sent back to perform a missed clue.

Success: a direct lead is found with supplies intact. Mixed: a risky bank search yields the spring lead but costs HP and no harvest. Setback: a pass, timeout or unhelpful detour leaves the objective open without deleting clues or forcing a fabricated discovery. There is no hidden chapter-round cap that substitutes a mandatory route.

### 2 — A way to clean water

Stable chapter ID: `mosswater-source`; objective ID: `source`. Beats: Search, Find, preview Take. Arrival objective: **Prove a remedy, then weigh its cost.** Suggested targets: `dye-vat` at the watercourse or `spring-pool` at the hill. Catch-up: “The vat may explain the poisoned feed; the hill spring may bypass it. A battle gives access, while water still needs fixing.”

Comparing dye confirms the source. Listening confirms the mossback's shelter need and offers a bargain. Testing the spring confirms an alternate supply; it does not confirm the source of the growl. Either line completes this milestone. Combat is optional at the watercourse or mill and returns to that location afterward.

Success: learn a cause or establish clean water without fighting. Mixed: gain access after a costly encounter or spend a supply to clear the gate. Setback: an unsuccessful shortcut attempt injures the acting hero while the safe route remains; a bounded combat escape still opens access, costs up to one remaining supply and grants no victory gear. Essential water solutions remain reachable.

### 3 — What the village keeps

Stable chapter ID: `mosswater-resolve`; objective ID: `resolve`. Beats: resolve Take, Return, Change. Arrival objective: **Bring clean water home.** Suggested target: the accessible vat, mossback or carrier's handline, according to discoveries. Catch-up: “Choose the remedy the party prepared. Its public preview states what the village and party give up.”

The ending action performs the remedy immediately and records its community cost. There is no compulsory finale room or vote window. Success, mixed and setback are narrative descriptions of actual costs, not three separately guaranteed engine grades: a supplied isolation can preserve the creature's shelter; an accepted bargain preserves the new den; force displaces it; the bypass leaves the old pollution for later disposal. Runtime reward grading must follow the actual implementation rather than this prose inventing penalties.

## Places, actions and developed states

| Place / optional targets | Meaningful choices | Changed state and next use |
| --- | --- | --- |
| Well yard: `well`, `mara`, `tool-cache` | Inspect a clue and follow it; ask for another supply; collect tools and choose a pack or sketch. | Stained cloth, route facts, tools or one-time supplies. Reopening a finished option cannot farm rewards. |
| Dye watercourse: `dye-vat`, `mossback` | Inspect then spend two supplies; listen then offer a den; fight then haul the vat clear; bypass it. | Poison isolated only by the ending action. A cleared encounter leaves a separate removal action. |
| Spring arch: `old-sluice`, `carry-rope` | Clear with shared tools or spend one supply; rig a relay after testing the spring; deliver or prepare a spare carrier first. | Open channel and ready relay persist across revisits. The last delivery action opens the village supply. |
| Derelict mill: `reed-pack`, `mill-cache` | Study and avoid the wolves, or fight for personal gear; recover the shared repair kit and two supplies afterward. | Encounter clearance opens the chest and direct watercourse exit. Victory gear and shared cache are distinct rewards. |
| Reed bank: `reed-patch`, `bram` | Take one safe supply or risk three; ask about the creature, take Bram's spare pack, or prepare the high-water crossing. | One harvest only. The spring lead survives a failed search. Prepared crossing shortens the high-water map. |
| Hill spring: `spring-pool`, `ridge-path` | Test then pack one flask or locate the gate; secure the ridge with a supply or a Might check. | Tested sample, jam location and secured shortcut persist. A flask helps the party but does not supply a village. |

The template's `scene-context` wire-token objects are not used by this mode. Its equivalent authoring contract is `QuestNode.targets[].{context, options}`: every option has a stable ID, an attempt label, a public `preview`, a confirmed `result`, prerequisites and explicit effects. Example chains are `well-inspect → well-trace-stain / well-show-mara`, `mossback-listen → mossback-bargain / mossback-challenge`, and `relay-rig → relay-open / relay-pack-spare`. The module is the authoritative exhaustive list; this packet does not add hidden interactions.

## Cost, map and replay contract

| Remedy | Prerequisite and visible cost | Lasting outcome |
| --- | --- | --- |
| Seal and cleanse (`isolate`) | Confirm the dye source; spend two shared supplies, leaving less for healing. | Clean well; mossback retains its shelter. |
| Haul clear after encounter (`isolate`) | Reach the vat after overcoming or slipping past the mossback; explicitly displace its shelter. | Clean well; creature loses that home. Winning alone does not complete this remedy. |
| Offer the washpond (`bargain`) | Learn the shelter need; commit the unused village washpond as an undisturbed den. Not available after the mossback encounter is cleared. | Creature removes the vat and helps flush the well; neighbours owe the habitat promise. |
| Open the spring relay (`repair`) | Test spring water, clear the channel and rig the handline. Tools avoid the one-supply brace cost. | Water reaches the village, but the poisoned well stays sealed and neighbours carry water farther. The leaking vat still needs disposal. |

The active hero commits the previewed community outcome. There is no additional majority vote, tie rule or invisible abstention default. Shared supply costs are public and validated; another person's private equipment is never spent. Duplicate commands or repeated finished options must not repeat costs, rewards or endings. One human uses the same contract. Leaving must not erase settled facts or undo an accepted remedy; a late joiner sees the present place, shared facts and current objective. Timeout rotates participation rather than choosing an ending for the party.

The seed records exactly one starting condition. High water opens a direct village approach to the spring arch and lets Bram prepare a bank-to-watercourse crossing. Low water opens the direct mill yard instead. Both begin with the reed-bank route, and learned routes and the ridge shortcut create useful backtracking. The seed also changes each hero's offered pair of gear from the three-item set. These are rule and option differences, not alternate explanations of the poison.

The bank's risk is **d6 + Wits ≥ 5**: three supplies on success, one HP lost and no harvest on failure; the spring lead is discovered either way. Its reliable alternative grants one supply. The ridge's **d6 + Might ≥ 5** opens a shortcut on success and costs one HP on failure; the reliable alternative spends one supply. Neither check gates all paths to clean water, and retries must not grant repeated XP or repeat a consumed harvest.

## Mechanics and state scope

The pinned `questRun` stores physical `nodeId` separately from chapter milestones, visited places, one-time facts and items, used options, shared supplies, current focus/follow-up, combat, per-hero upgrades, loot offers and the ending. Facts identify the actor, place and confirmed source event. An approach settles before its follow-up command can use the resulting state. Chapter completion is once per milestone, including catch-up when a later solution is reached early.

The initial supply pool is three, capped at six. It supports exploration costs and combat healing. Accepted meaningful actions and active combat moves contribute to run XP; every three raises the run level and grants a Might, Wits or Heart point, up to level four. These build changes last for the run and are separate from persisted character rewards. Departure, companion, timeout and once-only reward behavior remain backend verification responsibilities.

Combat has two authored enemy identities: an armored mossback and a reed-wolf pack with escalating attacks. Heroes choose Attack, Defend, a class spell or Mend. Public intent identifies the threatened hero. Defend protects that hero and restores mana; Mend spends one shared supply. The encounter is bounded to six exchanges, with access preserved after escape. Current class spell and enemy calculations live in `questRun.ts`; this packet does not duplicate changing balance formulas.

Victory offers each eligible participating hero two seeded choices from a reed shield (extra Defend protection), sluice hook (extra Attack damage) and amber focus (extra maximum mana plus one restored mana when equipped). The mill cache separately supplies a shared repair kit and two supplies. Revisit, repeat, reload and reward-claim commands must preserve each reward's once-only identity.

## Closing image and keepsakes

The familiar image is Mara filling the kettle that began empty. The delivered ending must say how the water arrived and what remains changed. Isolation keeps the well working at a supply or shelter cost. Bargain adds a new neighbour at the washpond. Repair keeps the original well closed while carriers bring tested spring water. Do not display an actively leaking vat as an already cleansed source, or suggest the sealed well is safe to draw from.

Truthful recaps include “Nell found the stained scrap; Orin sealed the leak with two supplies,” “Bram's crossing let the party reach the watercourse directly,” and “The party never confronted the mossback; they reopened the hill supply.” Only use names, paths and outcomes recorded in the run. A missed harvest or escaped encounter remains a setback the party worked around, not a secret victory.

Chapter keepsakes are Mosswater's marked cup, knotted reed and well token, under normal chapter reward eligibility. Receiving a keepsake does not imply that its illustrated object was an extra collected quest item.

## Art and audio brief

Use sparse, crooked MS Paint shapes, coarse uneven outlines and the established cream, moss, teal and brown palette. New raster work uses the project's sheep, shadow-pack and approved hero references. The six places reuse four existing environment plates; none requires a new polished scene illustration.

| Usage | Actual asset | Honest scope |
| --- | --- | --- |
| Well yard | `stage-village.webp`, `mara.png` | Village and continuity NPC. |
| Watercourse, bank, spring | `stage-river.webp` | Shared river plate; props and labels distinguish locations. |
| Spring arch / mill store | `gemward-v2-canal.webp`, `gemward-v2-warehouse.webp` | Repaired MS Paint plates; warehouse depicts the mill store, not invented machinery. |
| Tools, gate, reeds, spring path | `story-rope.webp`, `story-sluice.webp`, `tall-reeds.png`, `reeds-path.webp`, `gate.png` | Rope represents kit components; the fence is a ridge handline obstacle. No chest or bottle is claimed to be pictured. |
| Bram / optional pack | `ferryman.png`, `shadow-pack.png` | Existing ferryman and goofy canine pack. |
| New neutral well | `mosswater-well.webp` + PNG source | Roofless dark well and empty bucket; no baked poison or clean-water claim. |
| New mossback | `mosswater-mossback.webp` + PNG source | Same readable creature identity for conversation and combat. |
| New dye source | `mosswater-dye-vat.webp` + PNG source | Cracked vat with small mustard leak. Hide or clearly mark resolved pollution after isolation. |

The three new transparent cutouts are the entire new art scope. The musical-note `story-jar` is deliberately not reused as a water sample. State labels and accessible text carry developed meanings where no dedicated pose exists. Restrained confirmed-result motion must have a reduced-motion equivalent; motion is not evidence that a rule resolved.

Mosswater's opening is now present in the shared exact-text narration catalog: five segments for each of eight voices. The quest UI currently presents its results as text and does not mount the older adventure narrator controls; catalog coverage is not a claim that this mode plays narration. An older adventure's clip cannot substitute for this opening.

Generation reused the existing local speech worker and retained all 144 older clips. The forty additions bring the shipped catalog to 184 clips and 29,730,496 bytes, below the unchanged 32 MiB total cap. The 350 KiB first-segment and 768 KiB per-clip limits remain. The catalog is not a startup payload; narration consumers request only the selected voice's current cue.

## Verification

Content review completed: six places, thirteen optional interactables, thirty-seven unique option IDs; all fact/item/enemy references and same-target follow-up references resolve. Initial seed layouts each expose two starting routes. All current background, target and enemy asset URLs resolve to files after explicitly retaining `.png` for original PNG-only art. The author reviewed the three new cutouts at full size; the art agent separately reports 64-pixel pale/dark-background, transparency and lossless derivative checks.

Narration catalog validation passed for all 184 recordings, and all ten opening unit tests passed, including exact-text lookup, current/pinned version coverage, file hashes and size limits. The existing browser audio regression passed all five scenarios on an isolated local server: real shipped WAV playback with model transfer held and worker initialization mocked. This checks the Gemward v3 narrator's ready/failure/cancel behavior, not a Mosswater voice control or real inference latency. The report is `output/playwright/narrator-openings.json`. An earlier run on the actively edited development server lost its narrator panel mid-check; the isolated rerun completed without browser errors.

Local verification on 2026-10-04: all 863 Vitest checks passed, including 29 quest reducer/service checks and 12 exact-payload store recovery checks. The real local handler completed all three endings under both starting water conditions. Tests cover sequential focus, checks, class abilities, absence, four-human admission, parked combat recovery, one-time loot/builds and completed-room retries. Production TypeScript/Vite build and the asset inventory audit passed. The maintained browser runner (`npm run test:quest -- http://127.0.0.1:5207`) passed 54 checks with isolated player identities through the actual handler, including a lost acknowledgement/reload, the two-beat scene, map suggestions, battle, off-turn upgrades, gear, and the isolation ending. Controls and screenshots were reviewed at 320×568, 390×844 and 1280×900. Small phones scroll the decision panel normally; important controls remain reachable. Report and screenshots: `output/playwright/quest-results.json` and `output/playwright/quest-*.png`.

The new neutral cutouts retain their original alpha and lossless WebP derivatives. The scene uses confirmed discovery/encounter raster frames, cutout response motion, actual HP/mana changes and readable aftermath markers. Quiet/reduced-motion presentation keeps the same text and state. Source/art fingerprints in the browser report identify the tested revision. Hosted persistence, Realtime, physical-phone usability, measured run duration and uncoached human comprehension remain unverified.

Required checks: first approach/follow-up and stale-turn rejection; every ending and its previewed cost; both seed layouts; risky and reliable alternatives; optional fights and bounded escape; gear and XP once-only behavior; revisits without regenerated loot; late join, active departure, pass and timeout; solo and four-human turns; 320/390-pixel controls and keyboard access; cleanup of the polluted-source visual. Ask an uncoached player what is wrong, what their next action will change, why a battle did not fix the water, and what their chosen remedy costs. A player choosing the spring route need not identify an undiscovered culprit to have understood and completed the quest.
