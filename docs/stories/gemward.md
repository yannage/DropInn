# Gemward: The Missing Light

Status: implemented and locally verified · Definition ID: `gemward` · Design version: 1 · Not published

Required baseline: [DropInn storytelling and pacing](../storytelling-guide.md). Runtime and authoring scope: [Expedition adventures](../expedition-adventures.md).

## Promise

A town's missing light prism becomes useful leads, then routes the party can choose. The party explores the shop, tavern and docks without waiting for each other to inspect a place. A committed interaction advances the shared adventure; a discovery gives the party something concrete it can do next. The recurring community is Gemward, whose familiar lights establish both the stakes and the final changed image.

The tone is a small, approachable mystery with a consequential ending. The apparent want is to recover the missing prism. The deeper community need is to decide what its light should cost. Jeweller Iris and apprentice Nella anchor the shop; innkeeper Oren, courier Tess and ferryman Bram supply other perspectives. Their knowledge follows the run's chosen truth. No hero is assigned guilt, forgiveness or a personal sacrifice.

The packet documents the authored definition and reducer. Its scene-context blocks are an editorial review of interaction meaning; the runtime uses `src/lib/dropinn/expedition.ts`, not Markdown. Local automated and human evidence are tracked separately below.

## Circle

| Beat | Player-caused event or revealed fact | Visible evidence |
| --- | --- | --- |
| You | Gemward's ordinary trade depends on its lights and gem workers. | Iris's shop, Oren's tavern and Bram's docks are available to inspect. |
| Need | The light prism is missing and the party can discover where it went. | The shop's empty display, pricing records and worried workers give immediate leads. |
| Go | Evidence opens optional routes; the party chooses a way forward. | New destinations appear beside the always-available road. |
| Search | The chosen destination reveals a different part of the seeded situation. | Warehouse investigation, a prepared canal bypass, or an immediate road encounter. |
| Find | The prism is found, together with the reason it was moved. | A confirmed discovery changes the shared quest pouch. |
| Take | Recovering the gems leaves a visible, previously foreshadowed cost. | The finale displays the alternatives before commitment. |
| Return | The party works together to bring light back to the community. | Finale actions enact the selected route. |
| Change | Gemward's lights show what the party preserved and what it surrendered. | A branch-specific closing image and recorded ending. |

## Chapter 1 — Town

ID: `gemward-town`. Beats: You, Need, Go. Arrival: **“Discover a lead, then choose the party’s route.”** Highlighted first opportunity: Iris's gem prices. Catch-up: “The evening beacon has gone dark. Talk, investigate or help at any town stop; discoveries can open routes.”

The shop is the canonical starting scene, with Iris and Nella separated from the price board and empty display. The tavern and docks are freely inspectable alternative places in the same chapter. Choosing a place or topic prepares an action; release commits it. Each human can inspect a different place. There is no combat in town.

The middle development is a confirmed useful lead in the shared pouch. Iris's pricing conversation and relevant shipping inspections grant `ledger-copy`; Bram's conversation or Help grants `canal-key`. Relevant warning targets grant `ward-warning`. These are authored discoveries, not clues withheld behind repeated failed rolls. The finishing event is the party taking an available route. Four exploration turns cap this chapter; the open hill road prevents a stalled search.

| Target ID / label | Tokens and plausible interactions | Developed image and next use |
| --- | --- | --- |
| `iris` / Iris the jeweller | Influence: ask about gem prices or recent news and record the marked delivery. Investigate: inspect the missing delivery's details. Help: assist Iris's work; her first thank-you supplies Local favour. | Iris remains visible with a confirmed discovery marker. The ledger stays in the pouch; other intentions remain available. |
| `nella` / Nella the apprentice | Influence: ask about the prism's light. Investigate: follow the warning about its future. Help: assist the work and receive first-time Spark dust. | Nella remains present; the warning is recorded. Follow-up actions support preparation without rewriting the run's motive. |
| `price-board` / Gem price board | Influence: ask about the cost represented there. Investigate: examine restoration's cost. Help: make the information useful to the party. | The board remains readable with the warning recorded. Its cost remains relevant when the prism returns. |
| `display-case` / Empty display case | Fight: clear access to the case. Influence: ask about the missing stock and delivery. Investigate: inspect the delivery seal. Help: assist the shared search. | The case stays empty; a discovery marker confirms the lead. Its image does not falsely show a recovered prism. |

### Other town places

Each alternative location replaces the visible four-target composition locally. It does not create a new chapter or require the other players to move there.

| Target ID / label | Tokens and plausible interactions | Developed image and next use |
| --- | --- | --- |
| `oren` / Oren the innkeeper | Influence: ask what has changed. Investigate: inspect a useful detail. Help: help Oren and receive first-time Second wind. | Oren remains at the inn. Recorded help is acknowledged; the party can spend its supply later. |
| `tess` / Tess the courier | Influence: ask about the late delivery. Investigate: follow the marked delivery. Help: assist Tess and receive first-time Binding thread. | Tess remains available; the recorded delivery opens the warehouse and does not need rediscovering. |
| `noticeboard` / Town noticeboard | Influence: ask about the keeper's warning. Investigate: examine the beacon's cost. Help: share useful information. | The warning remains recorded and available for the finale. |
| `hearth` / Dwindling hearth | Fight: move an obstruction safely. Influence: ask neighbours for news. Investigate: follow a useful detail. Help: tend the shared warmth. | The hearth remains a place to contribute; repeated use does not invent another quest reward. |
| `bram` / Bram the ferryman | Influence: ask for passage and obtain the canal key. Investigate: inspect a useful detail. Help: help Bram, obtain the key and receive first-time Smoke flask. | Bram remains at the dock; the key is in the shared pouch. The canal can be chosen on a later turn. |
| `manifest` / Shipping manifest | Influence: ask about the shipment. Investigate: copy the marked delivery. Help: assist the shared search. | The copied mark opens the warehouse; the manifest remains available for follow-up contributions. |
| `lock` / Canal lock | Influence: arrange Bram's key. Investigate: inspect its details. Help: obtain the key and prepare passage. | The acquired key opens a map option. The party has not travelled until its route resolves. |
| `reeds` / Sheltered reeds | Fight: clear an obstruction safely. Influence: ask about local changes. Investigate: find a Smoke flask in the dropped satchel. Help: prepare the shared approach. | The supply discovery is recorded. Repeating the same source cannot farm flasks. |

Authored outcomes: success opens a useful route through discovered evidence; mixed follows the open road with the facts gathered; setback exposes the clear hill-road trail so the party can continue. The reducer currently classifies any open-road departure as mixed, including a cap with no preferences, and a selected warehouse/canal departure as success. The authored setback is fallback copy, not a third currently reachable town grade. All carry discoveries and supplies forward. Every actual town closure states the seeded truth and finale cost, even when the party leaves before inspecting a warning target.

### On-screen context

These blocks document the canonical scene's interaction meaning. The TypeScript definition supplies runtime copy; Markdown is not loaded by the game.

```scene-context
{
  "situation": "The evening beacon is dark. Two people in Iris’s shop know different parts of the missing-prism story.",
  "targets": {
    "iris": {
      "context": "Iris prices gems and knows the missing delivery.",
      "actionCues": { "influence": "Ask about gem prices or recent news", "investigate": "Follow the delivery details", "assist": "Offer Iris practical help" },
      "development": { "context": "Your discovery is recorded. Iris can still help the party prepare.", "actionCues": { "influence": "Ask what else changed", "investigate": "Compare the useful details", "assist": "Help with the remaining work" } }
    },
    "nella": {
      "context": "Nella last handled the prism and knows its unusual light.",
      "actionCues": { "influence": "Ask about the prism’s light", "investigate": "Follow the warning", "assist": "Help the apprentice prepare" },
      "development": { "context": "The warning is recorded. Consider what it means for the light’s future.", "actionCues": { "influence": "Discuss what the warning changes", "investigate": "Compare the known details", "assist": "Help with the remaining work" } }
    },
    "price-board": {
      "context": "The repair prices explain why restoring the beacon has a cost.",
      "actionCues": { "influence": "Ask about the repair cost", "investigate": "Examine the restoration warning", "assist": "Help make the information useful" },
      "development": { "context": "The warning is recorded; the cost still matters when the prism returns.", "actionCues": { "influence": "Discuss the stated cost", "investigate": "Compare the available information", "assist": "Help prepare the party" } }
    },
    "display-case": {
      "context": "A delivery seal lies beside the empty velvet stand.",
      "actionCues": { "fight": "Clear access to the case", "influence": "Ask about the missing delivery", "investigate": "Inspect the delivery seal", "assist": "Help with the search" },
      "development": { "context": "The lead is recorded, but the prism has not returned to the case.", "actionCues": { "fight": "Clear a practical obstruction", "influence": "Discuss the delivery lead", "investigate": "Compare the recorded details", "assist": "Help prepare the next step" } }
    }
  }
}
```

## Chapter 2 — Follow the lead

ID: `gemward-route`. Beats: Search, Find, Take. Arrival: **“Recover the prism and bring everyone home.”** Highlighted first opportunity: the crate or handcart's warm glow. Catch-up: “The missing prism lies ahead. The party’s earlier route determines the approach, and every route can recover it.”

The open road is the canonical fallback composition. Warehouse and canal substitute their own location, target names and existing art while retaining the same four functional target IDs. The warehouse stages an investigation before its encounter and starts that encounter with one progress. The canal can avoid combat through a prepared quiet recovery; a fallback encounter receives one cover. The road is always open, adds one danger and queues combat after its first exploration round. Each route has the prism, a watcher, a practical approach and a visible connection to the beacon.

| Target ID / label | Tokens and plausible interactions | Developed image and next use |
| --- | --- | --- |
| `crate` / Abandoned handcart | Fight: clear access safely. Influence: ask about its passage. Investigate: follow the glow beneath the cloth. Help: prepare recovery. | The lead is recorded without duplicating the prism. After the encounter, a recovery action brings the prism home. Warehouse: Marked crate. Canal: Drifting crate. |
| `watcher` / Roadside watcher | Influence: ask what has changed. Investigate: examine the obstruction. Help: prepare the shared approach. | The watcher belongs to the seeded situation; resolution records the encounter's result. Warehouse: Restless watcher. Canal: Waterway watcher. |
| `ramp` / Winding path | Fight: clear a practical obstacle. Influence: organise passage. Investigate: inspect the approach. Help: bring the party through safely. | The approach remains usable for follow-up preparation and recovery. Warehouse: Loading ramp. Canal: Sheltered landing. |
| `prism-trail` / Faint beacon light | Fight: clear an obstruction along the trail. Influence: discuss the light. Investigate: follow it toward the beacon. Help: prepare the return. | The beacon connection stays recorded. Warehouse: Trail of light. Canal: Light on water. |

At the warehouse, Investigate on `crate` or `prism-trail`, or Influence on `watcher`, records `buyer-evidence`: the identity behind the movement, interpreted according to the seeded truth. The following exploration turn can queue combat. With no evidence, the third exploration turn queues it anyway. At the canal, Help on `ramp` or `crate` secures `mooring-line`; on a later turn, Influence on `watcher` or Investigate on `prism-trail`/`crate` records `quiet-passage` and recovers the prism without battle. Missing that sequence by the third exploration turn queues the fallback encounter. Simultaneous setup and payoff cannot collapse the canal sequence into one turn.

When a battle is needed, resolve every accepted exploration action before activating it. The encounter projection exposes `encounter`, `cover`, `opening` and `allies`; the dedicated component presents the four battle moves. The enemy is a hired guard in the smugglers variant and a frightened ward construct in the ward variant. It announces Strike, Trick or Guard. Class Help, a counter, protection and relevant consumables supply the choices. A two-to-four-round bound prevents an endless interruption; a forced escape keeps the prism reachable at a cost.

The return is playable after either combat or quiet recovery: the party resumes exploration and completes an action to prepare the journey home. Authored success brings the prism back safely; mixed and setback bring it back at a cost. The reducer currently grades a four-round escape as mixed and other recoveries as success; setback remains fallback copy. Every actual closure retains Find and Take: why the prism moved, what the evidence or living spark means, and what each finale route sacrifices. Combat changes how costly recovery was, but does not erase clues or block the finale.

### On-screen context

```scene-context
{
  "situation": "The open hill road leads to the prism, though the exposed journey costs supplies.",
  "targets": {
    "crate": {
      "context": "The prism’s light escapes beneath a cloth on the abandoned handcart.",
      "actionCues": { "fight": "Clear access safely", "influence": "Ask about the handcart’s passage", "investigate": "Follow the warm glow", "assist": "Prepare the recovery" },
      "development": { "context": "The lead is confirmed. Finish the encounter and prepare to carry the prism home.", "actionCues": { "fight": "Clear the return path", "influence": "Organise the return", "investigate": "Inspect the known light", "assist": "Help recover the prism" } }
    },
    "watcher": {
      "context": "An obstacle waits near the handcart and the missing light.",
      "actionCues": { "influence": "Ask what changed", "investigate": "Inspect the obstruction", "assist": "Prepare the party’s approach" },
      "development": { "context": "The recorded encounter result determines how the party can proceed.", "actionCues": { "influence": "Organise a safe return", "investigate": "Follow the remaining details", "assist": "Help the party proceed" } }
    },
    "ramp": {
      "context": "The winding path has an exposed bend on the way to the light.",
      "actionCues": { "fight": "Clear the bend", "influence": "Organise passage", "investigate": "Inspect the approach", "assist": "Guide everyone through" },
      "development": { "context": "The approach is recorded and can support the return.", "actionCues": { "fight": "Clear a remaining obstacle", "influence": "Organise the return", "investigate": "Check the route", "assist": "Help everyone home" } }
    },
    "prism-trail": {
      "context": "The faint light points towards Gemward’s damaged beacon.",
      "actionCues": { "fight": "Clear the trail", "influence": "Discuss the light’s meaning", "investigate": "Follow the beacon connection", "assist": "Prepare the return" },
      "development": { "context": "The beacon connection is known. The light’s future still needs a decision.", "actionCues": { "fight": "Clear a practical obstruction", "influence": "Discuss the return", "investigate": "Compare the known warning", "assist": "Help carry the light home" } }
    }
  }
}
```

## Chapter 3 — Bring back the light

ID: `gemward-return`. Beats: resolve Take, Return, Change. Arrival: **“Choose the light’s future and help the town.”** Highlighted first opportunity: the broken beacon's displayed alternatives. Catch-up: “The party brought the prism home. Decide its future and help the neighbours live with the cost.”

Before the choice resolves, runtime catch-up expands that baseline into the saved variant's two irreversible costs, the Help/Influence vote mapping, abstention and the tie/no-vote Release fallback. Other action previews explicitly identify abstention and its possible dark-until-repair consequence. A late arrival does not need to remember the town warning to make an informed choice.

The beacon, keeper, prism cradle and waiting townsfolk make one shared return scene. It is not a second battle. The middle development is the confirmed irreversible choice; subsequent actions enact it and help the neighbours. The finishing event is the changed evening, with the preserved benefit and loss both recorded.

| Target ID / label | Tokens and plausible interactions | Developed image and next use |
| --- | --- | --- |
| `beacon` / Broken beacon | Fight: clear practical access. Influence: vote to Release the light, preserving the applicable evidence or spark's freedom. Investigate: inspect the beacon. Help: vote to Restore, accepting the applicable permanent cost. | The confirmed branch is displayed. Later actions enact that choice; they cannot vote the cost away. |
| `keeper` / Keeper at dusk | Influence: ask what each future preserves. Investigate: examine the warning. Help: help the keeper prepare. | The warning stays available for late arrivals. The keeper cannot secretly change the chosen price. |
| `cradle` / Prism cradle | Fight: clear access. Influence: organise the shared work. Investigate: inspect the cradle. Help: prepare a safe home for the recovered light. | The prepared cradle remains part of the chosen return. It cannot generate a spare prism to evade the cost. |
| `town` / Waiting townsfolk | Influence: organise neighbours. Investigate: inspect what they need. Help: prepare the changed evening. | The party's work supports the town under its chosen conditions. A dark ending does not become a lit ending through repeated Help. |

Authored success shows the town beginning a changed evening; mixed shows repairs and shared remaining light; setback shows neighbours beginning again. The actual branch-specific ending overrides generic copy so a Restore setback does not falsely describe a dark beacon. The reducer selects success at two progress or setback at the cap below that threshold; mixed remains fallback copy. Every outcome concludes the adventure, preserves contribution credit and states the lasting cost. The finale needs at least two exploration turns, with a four-turn closure; it does not require unanimous acknowledgement.

### On-screen context

```scene-context
{
  "situation": "The prism is home. Choose the light’s future, then help Gemward live with the cost.",
  "targets": {
    "beacon": {
      "context": "Help restores the beacon; Influence releases the light. The displayed run-specific cost is permanent after the party choice.",
      "actionCues": { "fight": "Clear practical access", "influence": "Choose Release at its stated cost", "investigate": "Inspect the recovered light", "assist": "Choose Restore at its stated cost" },
      "development": { "context": "The party’s resolved choice is fixed. Help enact its future.", "actionCues": { "fight": "Clear a practical obstacle", "influence": "Support the chosen return", "investigate": "Inspect what the choice changes", "assist": "Help enact the chosen return" } }
    },
    "keeper": {
      "context": "The keeper explains what each choice preserves and sacrifices.",
      "actionCues": { "influence": "Ask about both futures", "investigate": "Examine the warning", "assist": "Help the keeper prepare" },
      "development": { "context": "The warning remains useful, especially to someone arriving now.", "actionCues": { "influence": "Discuss the chosen future", "investigate": "Review the known cost", "assist": "Help with the remaining work" } }
    },
    "cradle": {
      "context": "The prism cradle offers a safe place to work with the recovered light.",
      "actionCues": { "fight": "Clear access", "influence": "Organise the shared work", "investigate": "Inspect the cradle", "assist": "Prepare the light’s resting place" },
      "development": { "context": "The cradle supports the chosen return; it does not remove its cost.", "actionCues": { "fight": "Clear a remaining obstacle", "influence": "Organise the return", "investigate": "Check the preparation", "assist": "Help finish the shared work" } }
    },
    "town": {
      "context": "Neighbours wait to learn what this evening will become.",
      "actionCues": { "influence": "Organise the neighbours", "investigate": "Inspect what they need", "assist": "Help prepare the evening" },
      "development": { "context": "The neighbours are preparing for the party’s chosen future.", "actionCues": { "influence": "Coordinate the return", "investigate": "Check remaining needs", "assist": "Help everyone settle" } }
    }
  }
}
```

## Cost and branch contract

There are two different shared decisions. The travel preference chooses a destination made available by the party's discoveries. The finale chooses what happens to the recovered prism. Discovery unlocks an option; it does not cast the party's vote.

The town previews the prism's one-use restoration and the ward-spark's dependence on it. Chapter 2 must repeat the applicable cost alongside the recovered prism, including early and setback closures. The finale displays the complete alternatives before an accepted vote.

| Run truth | Restore | Release |
| --- | --- | --- |
| Smugglers | Consume the recovered prism to relight the beacon now; its physical evidence is lost. | Preserve the prism and its evidence; the beacon stays dark while the town repairs it. |
| Failing ward | Bind the surviving ward-spark to the prism to relight the beacon; the spark loses its freedom. | Free the ward-spark; the beacon stays dark while the town repairs it. |

Both routes preserve the community and conclude the adventure. The alternative is not a hidden way to have every benefit. Later progress, good release timing, healing or a consumable cannot reverse the selected loss. A useful outcome remains possible without a perfect combat victory.

Human votes resolve together on the finale's first choosing boundary. Help on the beacon votes Restore; Influence votes Release. A tie or no vote uses Release, including its displayed cost. Companions do not supply preferences. A lone human can choose, committed departing players retain their votes, and late arrivals see the confirmed route. Subsequent beacon intentions explicitly sustain the fixed choice.

Travel preferences resolve after all actions on a town turn containing at least one route preference, or on the fourth town turn. Unique most votes selects the route; ties or no votes use the hill road. A route must already be available in the choosing snapshot. Learning its clue and selecting it cannot happen in one accepted action.

Duplicate commands must not repeat a vote, grant or spend. A lost response retains the same pending action and command ID. Players never have to re-create consent from memory after reconnecting.

## Coherent run variants

| Fact | Smugglers | Failing ward |
| --- | --- | --- |
| Cause | The prism was stolen for sale. | The apprentice moved a failing prism to keep a caged ward-spark alive. |
| Useful proof | Courier and shipping records connect the movement to the sale. | Repair and movement evidence connects the apprentice's actions to the failing ward. |
| NPC knowledge | Iris knows the missing stock; witnesses reveal the route, not a second incompatible motive. | Iris knows the failure; Nella's knowledge relates to the spark's survival. |
| Apparent answer | Recover the stolen prism. | Recover the missing prism. |
| Reframing | Immediate restoration destroys evidence the town could keep. | Immediate restoration binds the spark whose survival motivated its removal. |
| Final changed image | A lit beacon with sacrificed evidence, or a dark beacon beside retained evidence. | A lit beacon with a bound spark, or a dark beacon with a freed spark. |

The chosen setup is serialized at room creation. Revisiting a location, reconnecting or joining late must not regenerate its truth. Route variation changes which evidence and encounter the party sees; it does not randomly replace the motive halfway through the story. AI may rephrase the known situation but may not decide whether Nella is a thief, whether a route is open, or whether the spark has been freed.

## Mechanics and scope

Gemward version 1 adds shared quest discoveries, three personal consumable slots, route preferences, two coherent run variants and a distinct class-based combat encounter. Existing adventures retain their pinned rules. See the [runtime guide](../expedition-adventures.md) for exact item effects, human scaling, reward replacement, battle moves and persistence fields.

The source of truth is the existing server-authoritative command/reducer path. Location browsing is local; discovery, inventory, route, battle and ending state are serialized in the room. The four-token hand, release controls, turn deadline, reveal skips and confirmed-event history remain the interaction contract. Normal exploration is guaranteed; Spotlight retains its bounded supported effects. No new SQL columns are required for the optional snapshot metadata by code inspection. That is not hosted verification.

The map is a small authored branch-and-return structure, not a procedurally unbounded world. A seed chooses one coherent motive. Location layout, clue sources and the three macro chapters are authored. The optional AI does not assemble arbitrary NPCs, enemies or new quest logic in this release.

| State ID | Narrative fact |
| --- | --- |
| `ledger-copy` | The party recorded a delivery mark that opens the warehouse route. |
| `canal-key` | Bram's key opens the canal route; possession does not mean the party travelled there. |
| `ward-warning` | The party has a recorded warning about the light's coming cost. |
| `buyer-evidence` | Warehouse records establish who moved the prism, interpreted by the saved variant. |
| `mooring-line` | The canal landing is secured for a later quiet approach. |
| `quiet-passage` | The party recovered the prism without disturbing its watcher. |
| `recovered-prism` | The party possesses the real prism; Restore removes it because the beacon absorbs it. |
| `finaleChoice` | The party's irreversible Restore or Release choice is fixed. |
| `costs` | Travel, escape and finale losses remain recorded, including after later success. |
| `expedition-opening:<turn>` | A Rogue's confirmed support provides one temporary party opening on that turn. |

`discoveries` records accepted intention IDs rather than resetting or transforming an NPC. `stashes`, `offers` and `rewarded` describe personal tools and their source receipts, not shared quest facts. `variant`, resolved route and encounter state survive JSON round trips and a participant's absence.

## Closing image and keepsake

The changed lights must remain understandable to a player who arrives late or leaves before the finale. A lit beacon is accompanied by the selected cost; a dark beacon is accompanied by the preserved evidence or freed spark. The ending must not describe restored light after Release or preserved evidence after the smugglers' Restore.

Success presents an orderly return and a functioning chosen solution. Mixed presents the same fixed choice with damage or unfinished work. Setback presents the community carrying out that choice under difficult conditions. No outcome silently switches the party's branch, reverses its cost or retroactively claims a clean recovery.

Recaps credit only recorded contributions. Suitable examples, conditional on actual events, are “You copied the shipping record that opened the warehouse route,” “You protected a threatened companion during the encounter,” and “You helped enact the party's decision at the beacon.” A late joiner can see the earlier discovery in the shared story without receiving personal credit for it. Chapter keepsakes follow the existing contribution policy and do not change hero starting power.

The three authored keepsakes are Iris's glass bead, a prism-thread bracelet and Gemward's little lantern. They mark contributed chapters under ordinary reward eligibility; none is a substitute for the shared quest pouch or one of the five single-use stash items. Gemward is outside the four-story First tales Thread/Story Pass catalogs.

## Art and audio brief

Reuse the existing village, river and chapel scene plates. Town places and route scenes keep four interaction zones. Iris uses `mara-safe`; Nella uses `story-nella`; Oren uses `story-brindle`; Tess uses `story-pella`; Bram and the keeper use `ferryman-warning`. The canal lock uses `story-sluice`, reeds/landings use `reeds-path`, and the townsfolk's preparation uses `story-lantern`. These are reused representations, not a claim that another adventure's character has entered this story.

Unmatched boards, display cases, crates, handcart, watchers, loading ramp, light trail and prism cradle use text or native functional symbols rather than unrelated painted props. The beacon uses `broken-ward.png` before the choice and `ward-restored` only after Restore. A released beacon must not appear restored. There are no newly generated Gemward portraits, prop cutouts or enemy poses. Native map, pouch, stash and confirmed discovery/choice presentation supply state evidence; ending captions state the irreversible cost.

Gemward's twenty-word first intro has two local narrator recordings for each of the existing eight voices, generated with the established offline model pipeline. This adds opening narration, not custom music, ambience or battle effects. Confirmed consequences appear on the table before the automatic parchment; reduced motion shows the complete recorded result directly.

## Verification

Design review, implementation, local automated checks, browser integration, human comprehension and hosted publication are separate statuses. The target/token review, seeded-truth review, fallback paths and finale cost review have been completed against the working-tree content and reducer. On 2026-10-03, `rtk vitest run` passed all 695 unit/service tests; production build and `npm run art:check` passed. No human enjoyment or pacing improvement has yet been measured; no hosted publication is claimed.

The final Gemward browser run passed 21 checks with zero errors against the isolated real local handler and two independent browser identities. It completed all three chapters by Warehouse and Restore, including separate town actions, route choice, reload recovery, single-use Spark dust/Smoke, a two-round encounter, return to exploration, signed authored Spotlight preparation without spending followed by release/confirmation, and both players' chapter keepsakes. Town, discovered, battle and prepared-move layouts passed at 390×844, 320×568 and 1280×900. A caption overlap found during screenshot review was corrected and the final rerun includes an explicit clearance assertion.

The older scene regression passed 102 checks with zero errors or external calls, including exact lost-response/reload/retry behavior. Its actual local-handler/browser checks and client-snapshot presentation fixtures remain separately labeled. The Gemward runner uses a synchronized test clock, without injected room snapshots or external inference. Other route/ending permutations have reducer/service evidence rather than a claim of exhaustive browser coverage. Reports, commands and limits are recorded in the [runtime guide](../expedition-adventures.md#verification-status).

Opening-audio verification on 2026-10-03: `node scripts/build-narrator-openings.mjs --check` verified all 112 current opening clips, including the 16 new Gemward clips, at 20,094,928 bytes under the 20 MiB library cap. `rtk vitest run src/lib/dropinn/narratorOpenings.test.ts` passed all 10 tests. These checks validate exact prose/voice lookup, file format, hashes and size bounds; they are not a listening study.

A direct structured packet check parsed all three `scene-context` JSON blocks and matched their twelve canonical target IDs and supported-token cues against `GEMWARD_DEFINITION`. It passed after disabling Vite's unrelated dependency discovery in the temporary SSR reader. This verifies the packet's target contracts, not browser layout.

The story-specific review must answer these questions:

- Can a newcomer identify the missing object, a useful shop interaction, an unlocked destination and the reason it became available without opening Story?
- Does each variant reveal its own cause, including when the party travels by the always-available road or reaches a round cap?
- Does each ending show both the preserved benefit and the irreversible cost? Can a newcomer explain why Restore and Release differ?
- After entering the same turn at different town locations, do two players each see their own accepted action resolve before the party enters combat?
- Can a late arrival distinguish what the party knows, where it is going and what the arrival can do now?
- Does leaving after a vote preserve that vote without requiring an absent player's later acknowledgement?
- Are a full stash, an unclaimed reward and a reconnect comprehensible without losing a quest item or inventing a second grant?
- Does the battle actually take the authored bounded number of rounds with one human and companions, and with two humans? Is defending or helping ever a useful choice beside the obvious counter?
- On fast, slow and repeated-failure routes, does the party still see Find, Take, Return and Change in a causal order?
- Do keyboard, tap, assisted release, reduced motion, 390×844, 320×568 and enlarged text retain a visible scene, readable stakes and usable release controls?

Human checks should record the player's words and observed decision time. Clicking the expected target is not proof that the player understands the consequence or finds the encounter rewarding.
