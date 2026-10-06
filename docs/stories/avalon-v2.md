# Avalon v2: Bold approaches and shared attempts

Status: implemented; authored content locally verified · Definition ID: `avalon` · Definition/content version: 2 · World/generator version: 1 · Not published

Required baseline: [DropInn storytelling and pacing](../storytelling-guide.md). The complete world, three conflict families, twelve-plus targets, circle, return, promise, art and drop-in contract remain in the [Avalon v1 packet](avalon-v1.md). This packet specifies the new dice edition's concrete differences. `avalonDiceContent.ts` builds a separate v2 definition from fresh v1 content; it does not edit pinned v1 rooms, causes, NPC assignments or authored choices.

## Promise

Try a bold approach because of what your hero can do, watch the die settle, and leave a useful opening for another player if it misses. The game still belongs to an understandable world: a sign can be read, an ordinary lunch can be packed, a witness can share a clear observation, and a known path can be walked without asking the die for permission.

The fantasy is collaborative improvisation around a physical problem. Might, Wits and Heart change the available chances; supplies, tools and the option to use a safe method change which chance is worth taking. The dice add uncertainty to optional efficiency and a few alternative solutions. They do not hide the reason for a quest or require the party to repeat a failed clue roll.

This is a **bounded authored library**, not a generated anthology: six possible obstacles, each with two risky approaches, distributed across the existing six places. A visit includes the three arrival-area obstacles and the two obstacles belonging to its selected conflicts: five obstacles and ten risky approaches. Quiet locations stay quiet when their conflict is absent. No ten-tavern system, arbitrary new NPC plot, new conflict family or generated world geometry is claimed.

## Circle

| Beat | What v2 adds | Visible evidence |
| --- | --- | --- |
| You | An ordinary shared world with one immediately available optional attempt at every eligible arrival. | Familiar NPCs/props; a safe lead beside the risk. |
| Need | An obstacle has a practical benefit: supplies, a shortcut or a cheaper lasting solution. | Plain preview identifies the benefit and resource cost. |
| Go | The active player chooses a physical, clever or social approach and confirms it. | The actual attribute, difficulty and previewed chance. |
| Search | A failed attempt identifies a useful hold, pin, seam or concern. | Named shared setup with its source actor and event. |
| Find | A later attempt can use that setup; another human receives the stronger cooperative benefit. | The actual support bonus and prior actor shown before release. |
| Take | Success pays the advertised method cost. A miss consumes the action but keeps supplies, items and the unresolved choice. | Confirmed die result followed by exact effect receipt. |
| Return | The party still plays its return at the inn after settling at least one thread. | No roll is required to finish an earned visit. |
| Change | History and resolved scenes preserve the chosen method and actual price. | A freed skiff stays afloat; a one-pack seal never claims two packs were spent. |

## Chapter 1: Something worth following

Stable milestone: `avalon-lead`; You, Need, Go. Objective: **Find a lead; choose a useful first move.** Initial locations remain the Larch Inn, Old Ford and Merewater reeds. Their safe clue sources and start selection are unchanged. Each also offers a prerequisite-free check: ask Wren for reserve rations, shove the grounded skiff or haul the deeper reed mat.

Catch-up: “The party is visiting the Larch Hills. Read the local lead, or try a useful extra while the next destination remains visible.” A first contribution can be information, supplies or a permanent route. No dice attempt is mandatory before following a thread.

Success: a first check improves the party's position, or a safe clue identifies a destination. Mixed: a miss creates a named setup and the party takes a safe alternative. Setback: an expired focus performs neither an attempt nor a discovery. First-failure progress is not an endless XP source.

## Chapter 2: What is happening here

Stable milestone: `avalon-truth`; Search, Find, Take. Objective: **Choose how to solve the actual problem.** Core source observations remain guaranteed: inspect the dye leak, check Pip's axle, survey the flock's two paths. Once the cause is known and the thread is explicitly active, class-sensitive methods can save supplies or avoid a trip for tools.

Catch-up: “The party has found the cause. Compare the safe method with a bold approach; another hero can build on a missed attempt.” The active hero still owns the current two-action focus. Helping means deliberately choosing a new attempt on the same obstacle, not automatically supplying consent or spending another player's action.

Success: the advertised method resolves the thread and records its actual cost. Mixed: another human completes the opening with a +2 bonus, or the party takes the guaranteed method after a miss. Setback: the obstacle remains unresolved; essential facts, tools and supplies are retained, and the safe method stays available.

### Authored obstacle and approach table

| Place / target | Safe route | Risky methods | Result and shared setup |
| --- | --- | --- | --- |
| Inn / `wren` | `inn-pack`: ordinary lunch offers 2 supplies. Read the notice for the guaranteed lead. | `inn-request-reserve`: Heart DC 6; `inn-release-reserve`: Wits DC 7. Both offer 3 supplies instead. | Wren's reserve and lunch are one claim, not separate rewards. A miss marks the cupboard's bent pin; Wren's hesitation and the physical latch refer to the same obstacle. |
| Ford / `ford-kit` | Borrow the landing's reusable tools; inspect the ford markers; all footpaths remain usable. | `ford-skiff-shove`: Might DC 7, no supplies; `ford-skiff-lever`: Wits DC 5, one supply only on success. | Freeing the skiff opens a new bidirectional Ford–mill route. A failed shove wedges its bow; a failed lever marks a stable pivot. |
| Reed bank / `bank-reeds` | `bank-gather-reeds`: safe harvest offers 2 supplies plus bed reeds. Physical leads remain guaranteed. | `bank-haul-reeds`: Might DC 7 without tools; `bank-rig-reeds`: Wits DC 6 with the reusable kit. Both offer 3 supplies plus the same bed reeds. | The harvest is one choice. A miss secures a handhold or locates the mat's firm root. The safe shelf remains untouched. |
| Mill / `mill-vat` | `water-seal-vat`: two supplies seal and flush the leak without a roll; bargain/combat routes remain. | `water-press-patch`: Might DC 7 without tools; `water-fit-patch`: Wits DC 6 with the kit. Success costs one supply. | Both preserve shelter and restore the stream. A miss exposes or braces the weak seam without consuming the patch. |
| Spring / `spring-flock` | `herd-gate`: reusable kit plus one supply guarantees a lasting gate repair; food and combat remain. | `herd-lift-gate`: Might DC 7, one supply and no toolkit; `herd-rig-gate`: Wits DC 6 with tools and no supply. | Both make the upper path a lasting route and bring the sheep home. A miss blocks the low corner or exposes the bent pin. |
| Quarry / `quarry-cart` | `carter-brace`: two-pack skid guarantees cart recovery; `carter-walk` brings Pip home without cargo. | `carter-repair`: Wits DC 6 with the reusable kit, no supplies; `carter-shoulder-cart`: Might DC 7 without tools, one supply. | Both bring person and cargo home. A miss exposes the straight axle edge or establishes a firm foothold. Pip remains unhurt. |

The remaining v1 targets—notice, markers, witnesses, Pip, clear spring, mossback, quiet mill shelf and quarry reserve—retain their defined interactions. There are still at most three stage targets in each place. The ford repair-kit target becomes the skiff-and-landing target while retaining its tool-borrowing option; no fourth cutout is added.

### On-screen context contract

The sequential quest schema remains `QuestTarget.context` plus `QuestOption.preview/result`, extended by `QuestOption.challenge`. A challenge has an immutable ID, label, attribute, DC, complete success description, failure description and named setup. Two methods for one obstacle share its ID. Preview copy distinguishes tool requirements, lower/higher difficulty and actual supply cost; it never substitutes narrative flourish for those differences.

The UI presents an authored option's actual actor-specific odds. On success it uses the confirmed `challenge.success` and exact effect receipt. Supply-gain prose does not claim a fixed number was packed when capacity limits the gain. The existing pack cap is six. A fresh visit starts with three supplies: the safe two-pack claim reaches five, while the successful three-pack claim reaches six.

## Chapter 3: The hills after your visit

Stable milestone: `avalon-return`; Take, Return, Change. Objective: **Bring the party's actual result home.** The prior return and promise conditions remain unchanged. A player may complete one thread and leave the other honestly open.

Catch-up: “The party's choices have changed these places. Wren can record the visit when you return; unfinished work and promises will stay explicit.” The return is not a final skill check. It should credit the successful actor and the source of cooperative setup separately, without assigning either player an invented feeling.

Success: the return records solved threads, actual costs and kept promises. Mixed: it records unresolved work or an owed reed bed. Setback: absence does not roll the dice or complete a visit for the party.

## Cost, cooperation and branch contract

- A roll is one server-authoritative D6 plus the hero's current Might, Wits or Heart. The preview shows its DC and success chance before release.
- A failed attempt records a named, attributed setup; it does not consume the successful option, grant its items/facts, spend its supplies or resolve its thread.
- A different human explicitly retrying that obstacle can use +2 from the earlier setup. A lone human's learned retry uses +1. Support does not stack through repeated misses, fabricate absent-player consent or change another person's stats.
- The setup belongs to the common obstacle, so a player can change approach rather than being forced to copy the prior method. Failure descriptions physically support either method.
- Any successful method settles that challenge. Guaranteed alternatives also set the shared outcome fact, making remaining risky alternatives unavailable. The lunch, reeds, vat, gate and cart cannot be harvested or solved twice.
- Costs are spent only on accepted success. The method's source event and success-only evidence determine the cost shown after settlement. `avalonDiceResolutionCost` distinguishes a one-pack vat seal, no-pack hinge repair and one-pack axle brace from their guaranteed prices.
- Existing two-action focus, release-only confirmation, exact command retries, battle interruption, late-join and parked-room behavior remain in force. Setup discovery and attempts do not authorize off-turn actions or extra dice throws.

## Mechanics and scope

Content implementation is isolated in `src/lib/dropinn/avalonDiceContent.ts`; it reads the existing episode, adds optional choices and two skiff-route edges, and returns definition version 2. The generator and atlas remain version 1. Saved manifest content version 2 selects this authored interpretation. Older manifests and retry payloads retain v1 rules.

No essential observation, sign reading, known travel, ordinary supply source, borrowing action, promise delivery or return is retroactively made uncertain. A failed optional check can lead to cooperation, a new approach, a safe method or another place. There is no requirement to clear every challenge or every option before progress counts.

## Closing image, art and keepsakes

The existing three Avalon keepsake names and reward policy stay stable. The new skiff uses the existing `stranded-boat.png` and `boat-afloat.webp` cutouts; its developed image appears only after confirmed `skiff-afloat`. Existing art depicts the other outcomes. No new raster asset or style change is required by this edition.

Confirmed die motion, result timing and cooperative setup are UI work owned by the runtime/presentation change. Reduced motion must show the same complete confirmed result without requiring animation. A page reload must not replay or reroll an old failure. The historical record preserves the real preparer and successful actor.

## Verification

Seven v2 authored-content tests passed locally together with all eight v1 content tests. The v2 suite samples 90 seeded episodes and checks stable world/cast/start behavior, no v1 mutation, immediate optional arrival checks plus safe leads, unblocked ordinary reachability, distinct attribute/cost methods, one-claim exclusivity, actual skiff-route effects and truthful successful-method prices. This is authored-data evidence, not a claim that player comprehension, animation quality or multiplayer behavior has been verified by those tests.

Runtime/browser release checks must cover: deterministic D6; exact retry after a failed response; a failed source attempt retaining all effects; another human completing it at +2 with provenance; solo retry at +1; repeated-failure anti-farming; a safe alternative after a miss; sibling methods blocked after success; tools and supplies required correctly; pack-cap receipts; a resolved method's real price; map route unlock; late join and reload; normal and reduced motion; keyboard and 320px mobile release.

Human questions: “Why choose this approach with your hero?”, “What does failure leave available?”, “Whose earlier work helps this attempt?”, “What actually changed on success?”, and “Could you still finish the visit without rolling here?” Record answers and observed pacing rather than treating a successful automated click as proof of fun.

Release verification (2026-10-05): production build and all 962 unit/service/gesture tests passed. The maintained local dice runner passed 24 checks with unchanged source/art fingerprints: all three arrivals, actual wizard/fighter identities, missed setup then named +2 success, solo +1, real battle-earned attributes, pointer/tap/keyboard, simulated motion permissions, cancellations, immutable accepted retries/reload and rejection recovery. It sampled a live accepted landing across animation frames, then a settled face that did not replay after hiding or reloading. Final 320/390px dice, setup badge and result screenshots were visually inspected. Pinned v1 Avalon (56 checks), Mosswater (99) and story selection (64) also passed locally. Evidence lives in ignored `output/playwright/avalon-dice-results.json` and `avalon-dice-evidence.txt`. These results do not establish hosted Realtime, physical-phone sensor behavior or human enjoyment; nothing was deployed.
