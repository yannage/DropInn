# The Inn That Misplaced Tomorrow

Status: locally verified playable baseline; not published · Definition ID: `inn-misplaced-tomorrow` · Design version: 1

Playable scope: three chapters, authored outcomes and keepsakes, scene targets, and a server-resolved first-turn finale choice. Ordinary Help and developments carry the signature interactions; the optional extension below remains unimplemented. Proposed state names use the shared `storyBranch` and target flags. The art baseline uses one stage plate per story, neutral prop cutouts, explicit cost variants and a closing object with caption. Additional poses and the broader background/before-and-after wish list remain future art work. See [runtime scope and verification](../playable-adventures.md).

Baseline: [DropInn storytelling and pacing](../storytelling-guide.md).

## Promise

Breakfast keeps returning to the same cold minute. Find what the inn's clock swallowed and let morning begin.

Tone: cozy mystery with mischievous magic. Innkeeper Brindle maintains a breakfast so perfect that nobody is allowed to leave a crumb. His clockwork helper has interpreted “make this morning last” literally. The apparent goal is repairing time; the deeper need is allowing an unfinished day to happen. The repeated opening tableau makes the final change unmistakable.

## Circle

| Beat | Event | Visible evidence |
| --- | --- | --- |
| You | Guests settle into Brindle's immaculate breakfast routine. | Identical cups, polished clock and untouched toast. |
| Need | The same spoon falls again; sunrise never moves. | A spoon lifts back to the table while the window stays dark. |
| Go | Players follow a trail behind the clock into its tiny workshop. | The clock face opens into a cluttered doorway. |
| Search | They trace collected sounds and Brindle's literal instruction. | Morning sounds are bottled beside a handwritten command. |
| Find | They recover the missing dawn chime from the helper. | A glowing note warms a jar; the helper proudly presents it. |
| Take | Freeing the note requires unwinding the perfect routine or spending the helper's memory of it. | A recipe cylinder and memory spool offer distinct costs. |
| Return | The party carries the released note back to the breakfast room. | Light follows their repaired sound conduit upstairs. |
| Change | Breakfast resumes with room for mistakes or relearning. | Uneven toast, moving sunlight, and an extra chair beside Brindle. |

## Chapter 1 — The Coldest Breakfast

ID: `tomorrow-breakfast` · Beats: You/Need/Go · Noncombat.

Arrival: **“Find why breakfast keeps starting over.”** Highlight the spoon. Catch-up: “Morning is stuck on one repeated moment. Something behind the clock is collecting the sounds.”

| Target ID / label | Supported interactions | Developed image → next use |
| --- | --- | --- |
| `tomorrow-spoon` / Falling spoon | Investigate: follow its repeat; Help: catch and mark | Marked spoon stops repeating locally → compare nearby loops |
| `tomorrow-brindle` / Brindle | Influence: ask for help; Investigate: question his instruction; Help: calm him | Apron loosened, note in hand → reveal the exact command |
| `tomorrow-clock` / Breakfast clock | Fight: free jammed casing; Investigate: follow ticking; Help: steady gears | Open clock doorway → guide party inside |
| `tomorrow-toast` / Stubborn toast | Fight: lift jammed rack; Investigate: trace the heat; Help: shield hands | Warm crumbs point toward clock → mark workshop route |

Success: open the workshop with the instruction already understood. Mixed: the toast burns, revealing the same route. Setback: the clock coughs its door open and ejects Brindle's note. Every ending delivers “make this morning last”; players never have to guess a password. Proposed fact: `tomorrow-command-read` records early understanding.

## Chapter 2 — The Collector of Mornings

ID: `tomorrow-workshop` · Beats: Search/Find/Take · Noncombat. Pressure is visible jars vibrating and routine gears winding tighter; keep existing danger/progress instead of adding health attacks from an unexplained enemy.

Arrival: **“Recover the dawn chime from the clockwork helper.”** Highlight the sound jars. Catch-up: “Brindle asked for a perfect morning to last. His helper stored the dawn so morning could never end.”

| Target ID / label | Supported interactions | Developed image → next use |
| --- | --- | --- |
| `tomorrow-jars` / Sound jars | Investigate: inspect symbols; Influence: hum to matching jars; Help: steady shelf | Dawn jar glows beside rooster symbol → isolate the right note |
| `tomorrow-helper` / Tock | Influence: acknowledge its work; Investigate: ask about command; Help: repair grip | Tock offers the dawn jar → cooperate on release |
| `tomorrow-recipe` / Recipe cylinder | Fight: loosen spindle; Investigate: read routine; Help: uncouple gear | Cylinder exposed → prepare routine-unwinding route |
| `tomorrow-memory` / Memory spool | Investigate: inspect stored breakfast pattern; Influence: explain alternative to Tock; Help: connect safe lead | Spool in a protective cradle → prepare memory-spending route |

Success: recover the chime with Tock's help. Mixed: the party catches it as a shelf falls. Setback: Tock delivers it to prevent its collection shattering. In all routes, the note cannot pass the upstairs clock until one sustaining pattern is spent. Telegraph this with two cables from the jar to the recipe and memory objects before closure.

## Chapter 3 — A Morning Allowed to Happen

ID: `tomorrow-new-morning` · Beats: resolve Take/Return/Change · Noncombat.

Arrival: **“Release the chime and let the day begin.”** Highlight the two sustaining objects before selection, then the window clock. Catch-up: “The dawn is safe in its jar. Releasing it will cost the perfect routine or Tock's memory of making it.”

| Target ID / label | Supported interactions | Developed image → next use |
| --- | --- | --- |
| `tomorrow-return-recipe` / Perfect recipe | Fight: turn release crank; Investigate: unwind safely; Help: support cylinder | Blank cylinder if spent, preserved recipe otherwise → support the selected release circuit |
| `tomorrow-return-memory` / Breakfast memory | Investigate: guide transfer; Influence: reassure Tock; Help: support cradle | Empty breakfast spool if spent, intact spool otherwise → help Tock steady the chime |
| `tomorrow-return-clock` / Window clock | Fight: free bell arm; Investigate: align symbols; Help: seat jar | Clock sounding in sunlight → stabilize ordinary time |
| `tomorrow-return-table` / Waiting table | Influence: organize guests; Help: share breakfast | Imperfect shared meal and extra chair → welcome Tock |

Cost options: **“Lose the perfect recipe; keep Tock's memories”** or **“Keep the recipe; help Tock relearn breakfast.”** Memory loss concerns that learned routine only, not Tock's identity or all relationships. Preview this explicitly. The baseline branch rule applies to a dedicated choosing turn. Ties/no input preserve memory and unwind the recipe. Spent-object actions then become support, never a second sacrifice. Proposed state: `tomorrow-pattern-spent`.

Success: sunlight moves and everyone shares warm, slightly uneven breakfast. Mixed: morning returns amid burnt toast; neighbors contribute food. Setback: the clock stops working, but ordinary sunrise returns and the inn uses a hand bell. The recipe/memory cost persists across all endings. Brindle shares responsibility; he does not declare what the players learned.

Closing copy: “The spoon falls. This time, someone picks it up.” Keepsake: a mismatched breakfast spoon. Truthful recap example: “You found the dawn jar among the stored sounds.”

## Signature mechanic, art and verification

Proposed extension: match a discovered symbol to a sound jar for a one-time setup benefit. It must have a visible symbol/text equivalent, so listening or musical knowledge is never required. There is no real-time audio puzzle or repeated reset of actual game turns. Existing Investigate/development carries the playable mystery without the bonus system. The irreversible branch now uses explicit authored state and simultaneous resolution.

Art: breakfast room, oversized clock workshop, and the same breakfast room in sunrise; four before/after target pairs per chapter, with reusable recipe/spool cutouts; Tock's proud/concerned/helping poses; blank recipe and spent breakfast spool; identical spoon composition before/after. Optional sound motifs reinforce visible symbols, never replace them.

Verify that the reveal feels foreshadowed rather than an arbitrary magic rule; no essential clue requires success, audio or reading long dialogue; every class has a useful scene action; players understand the narrow scope of memory loss; a late join can distinguish preserved/spent objects; failed release timing never causes memory loss; fast chapter completion still exposes both cables and the cost. Ask players what changed when the final spoon falls.
