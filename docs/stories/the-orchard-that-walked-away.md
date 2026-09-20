# The Orchard That Walked Away

Status: locally verified playable baseline; not published · Definition ID: `orchard-walked-away` · Design version: 1

Playable scope: three chapters, authored outcomes and keepsakes, scene targets, and a server-resolved first-turn finale choice. Ordinary Help and developments carry the signature interactions; the optional extension below remains unimplemented. Proposed state names use the shared `storyBranch` and target flags. The art baseline uses one stage plate per story, neutral prop cutouts, explicit cost variants and a closing object with caption. Additional poses and the broader background/before-and-after wish list remain future art work. See [runtime scope and verification](../playable-adventures.md).

Baseline: [DropInn storytelling and pacing](../storytelling-guide.md).

## Promise

The village orchard pulls up its roots on harvest morning. Follow the moving trees and bring the harvest home before the valley dries.

Tone: autumn wonder and negotiation under pressure. Gardener Nella has always tended the village's finest walled orchard. She wants the trees returned; they need water the private mill has diverted. The ending changes how the village shares its land, with the opening harvest baskets returning in a new configuration.

## Circle

| Beat | Event | Visible evidence |
| --- | --- | --- |
| You | Nella arranges baskets for the annual harvest. | Full breakfast table beside a tidy orchard wall. |
| Need | The trees leave, carrying fruit and a child in a treehouse. | Root footprints cross empty planting circles. |
| Go | Players open the gate and follow the moving canopy. | A clear root trail leads out of the familiar enclosure. |
| Search | They rescue the passenger and compare dry soil with a diverted stream. | Dusty roots beside a wet mill channel. |
| Find | They discover the sluice that can bring water back. | A model channel shows water reaching thirsty roots. |
| Take | Restoring flow requires dismantling the prized orchard wall or retiring the water-hungry ornamental mill. | Two marked routes show what each removes. |
| Return | The party opens a route and guides trees and harvest toward the village. | Roots follow flowing water; baskets move home. |
| Change | Harvest becomes a shared system of care. | An open community grove or a retired mill used for gathering. |

## Chapter 1 — Empty Planting Circles

ID: `orchard-departure` · Beats: You/Need/Go · Noncombat.

Arrival: **“Follow the trees and reach the stranded treehouse.”** Highlight the root trail. Catch-up: “The orchard has left its wall behind. A child is safely in its moving treehouse but needs help down.”

| Target ID / label | Supported interactions | Developed image → next use |
| --- | --- | --- |
| `orchard-root-trail` / Root trail | Investigate: follow moisture marks; Help: clear path | Marked dry footprints → guide villagers |
| `orchard-nella` / Gardener Nella | Influence: organize search; Investigate: ask about watering; Help: carry basket | Nella holding old water map → compare changed stream |
| `orchard-gate` / Orchard gate | Fight: open jammed gate; Investigate: find root gap; Help: brace | Wide passage → move rescue equipment |
| `orchard-ladder` / Harvest ladder | Fight: free it from shed; Investigate: check joints; Help: lash rungs | Braced ladder on wheels → follow treehouse |

Success: reach the trees with the ladder prepared. Mixed: reach them after fruit spills along the trail. Setback: the trees pause beside a low bank, providing a climbable route even without the ladder. Every ending reveals dusty roots and Nella's map. Proposed fact: `orchard-ladder-ready` can acknowledge preparation but never gates rescue.

## Chapter 2 — Where the Water Went

ID: `orchard-dry-stream` · Beats: Search/Find/Take · Combat against a territorial bramble guardian defending the dry streambed. Its announced strike targets a hero; the trees and child are never surprise damage targets.

Arrival: **“Reach the treehouse and restore a path for water.”** Highlight the treehouse. Catch-up: “The trees stopped beside a dry stream. Water still runs through the ornamental mill uphill.”

| Target ID / label | Supported interactions | Developed image → next use |
| --- | --- | --- |
| `orchard-treehouse` / Moving treehouse | Influence: guide the child; Help: steady descent | Child on the bank, empty treehouse → use platform to signal trees |
| `orchard-elder` / Elder Apple | Influence: listen; Investigate: inspect thirsty roots; Help: wet root cloth | Relaxed branches showing water marks → guide the migration |
| `orchard-sluice` / Diverted sluice | Fight: move debris; Investigate: trace channels; Help: test gate | Both water routes outlined → compare their costs |
| `orchard-bramble` / Bramble guardian | Fight: interrupt; Influence: soothe; Investigate: find seed signals; Help: shield others | Thorns lowered around a damp patch → maintain safe passage |

Success: child safe, guardian calmed and routes understood. Mixed: everyone reaches the bank; the guardian stays wary. Setback: Elder Apple kneels to release the child and the sluice bursts enough to expose its channels. No outcome holds the child hostage to a moral choice. All routes reveal that the stream can bypass the mill through the wall or reclaim the mill's channel.

## Chapter 3 — A Place to Put Down Roots

ID: `orchard-shared-harvest` · Beats: resolve Take/Return/Change · Noncombat; pressure is falling water in the temporary pool.

Arrival: **“Open the water route and guide the harvest home.”** Highlight wall/channel before selection, then the chosen route. Catch-up: “Everyone is safe, but the roots still need water. Choose what the village will change to welcome them.”

| Target ID / label | Supported interactions | Developed image → next use |
| --- | --- | --- |
| `orchard-return-wall` / Orchard wall | Fight: lift stones; Investigate: mark spillway; Help: brace path | Open water corridor if chosen, intact wall otherwise → stabilize chosen route without reversing cost |
| `orchard-return-wheel` / Mill wheel | Fight: release brake; Investigate: redirect channel; Help: support mechanism | Retired decorative wheel if chosen, turning wheel otherwise → regulate water safely |
| `orchard-return-roots` / Waiting roots | Influence: call trees onward; Investigate: mark wet ground; Help: guide seedlings | Trees settled beside water → tend new grove |
| `orchard-return-baskets` / Harvest baskets | Influence: organize sharing; Help: carry fruit | Baskets distributed among neighbors → finish welcoming feast |

Cost options: **“Open the wall; share the old private grove”** or **“Retire the mill; keep the sheltered orchard.”** The mill is ornamental, not the village's food grinder; do not imply a hidden livelihood loss. Both routes sustain the trees. Branch-directed Help at wall/wheel uses the baseline one-turn resolution. Ties/no input open a small wall spillway that can later be widened; this reversible fallback is previewed. Proposed state: `orchard-water-route`, with `spillway` distinct from the full wall-opening choice.

Success: trees settle and a shared harvest begins; either open grove or retired-mill gathering space appears. Mixed: only the near trees settle this season; villagers build a watering rota for those further away. Setback: trees settle at the public riverside instead, and villagers carry baskets along a new path. All endings preserve the route's actual construction/loss, and all show reciprocal care rather than forcing the trees home.

Closing copy: “The baskets return. This year, everyone knows who watered the trees.” Keepsake: a small carved apple seed, using standard reward eligibility. Truthful recap example: “You steadied the ladder while the treehouse passenger climbed down.”

## Signature mechanic, art and verification

Proposed extension: a visible shared watering can earned through preparation can establish either root cover or a guiding wet trail. It is one consumable with two visible destinations, not a backpack system. Before implementation define a deterministic contention rule: resolve conflicting destinations to the previewed wet-trail fallback and consume once; duplicate commands cannot consume twice. Both destinations need equal caps and current-turn applicability. The story works with ordinary Help/developed targets while this tool remains unimplemented.

Art: empty orchard, dry stream with moving canopy, and returning harvest backgrounds; all twelve initial/developed target cutouts, reusing root/fruit forms where appropriate; bramble wind-up/reaction; child visibly safe after rescue; open-wall, spillway and retired-wheel states; distinct village/riverside closing compositions. Moving trees should use restrained poses, with static reduced-motion equivalents.

Verify that the water problem is legible before the cost appears; child rescue is guaranteed by chapter closure; the mill's purpose is clear; no outcome invents a chosen route after no input; the spillway fallback remains distinct in recaps; Protect grants normal contribution credit; downed and late-arriving players can help; competing can uses resolve once regardless of arrival order if that extension is built. Ask players why the trees left and what their selected route changed for the village.
