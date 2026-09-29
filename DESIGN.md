# DropInn design

**Open the app, find something happening, join immediately, do something creative, and leave with a memorable moment.**

The unit of value is a satisfying short visit. New roleplayers and experienced tabletop players should be able to participate during a spare five to ten minutes without organizing a group or committing to an entire campaign. A chapter’s five-to-eight-minute duration is a playtesting target, not a measured guarantee; early commitments can make play faster.

## The current experience

1. The lobby explains the shared story and four-step round loop before one **Play [selected story]** button. A ready hero removes setup requirements; **Change story** selects without starting, and **Play with friends** opens private-table and invitation choices. Public tables, rewards, history and other options follow the entrance.
2. The shared goal, chapter progress and four illustrated targets introduce the scene. Persistent guidance explains what to do now, including waiting for admission at a safe turn boundary. The Story drawer holds the full catch-up.
3. Pick up one of the four visible tokens, aim at a compatible target, and inspect its authored moves. Dragging prepares a move; releasing the die commits it. The stage stays visible, with approach choices in the dock. Tap and keyboard controls remain equivalent.

4. Hold the die and release in the bright zone, or use Roll now/assisted release. Humans choose simultaneously within 60 seconds; everyone committing resolves immediately. Park committed pieces on the scene. Confirmed actions play anticipation, contact, consequence and settling within 5.85 seconds. The ten-second reveal ceiling and readiness rules remain. Open the round parchment immediately on commitment. View scene dismisses it for the rest of that round; history remains available to reopen.
5. The next round restores the target-selection prompt. Players can leave, keep earned progress, and read their contribution recap. History later shows chapter outcomes and rewards earned after their departure.

The core loop is **pick up a piece → aim → commit → watch the world react → spot the next opportunity**. Artwork is the primary play surface; developed objects remain visible in their accurate state. Normal play fits a phone viewport, with the timer/chapter/Leave bar above and a contextual action dock below. Marketing chrome stays outside an adventure. Story, chat, party, invitations and Spotlight use named drawers instead of stacking prose beneath the scene. Drawers can scroll; enlarged text can reflow rather than clip controls. Reduced motion preserves clear outcomes and all results remain available in the journal.

First-move teaching accompanies ordinary play: visible tokens, suggested targets and replayable action help introduce the loop without selecting an action. Route choices highlight both alternatives equally. The guide retires after the player's first recorded contribution result, can be dismissed early, and can be replayed from action help. Its preference is local to the browser; permanent state guidance remains visible after teaching ends. [Player clarity checks](docs/player-clarity.md) separate implemented presentation from unaided human comprehension.

Public cooperation includes local mute controls, reporting and server validation; report review is an operational responsibility, not an automated moderation promise.

## Tactical choice and execution

At each combat choosing boundary the server announces the enemy source, intended hero and base damage. The victim is an upright human when available, otherwise an upright companion. A departing victim stays through that turn's resolution; the attack never silently switches to a teammate. Progress, interruption, insight, danger reduction and healing retain their authored effects. Objectives remain the victory condition; there is no new enemy health bar or grid.

Help retains the existing `assist` identity and class support on scene targets. Placing it on the announced victim chooses **Protect**: guaranteed 2 protection, or 3 with a good release, and no objective progress. Multiple Protect moves use only the strongest value; existing party cover combines by taking the stronger value. Missing-input defense remains separate. Protect is a real contribution, awards 3 XP and qualifies for ordinary chapter rewards without a fabricated die roll. Downed heroes can still Protect.

The commitment control runs for 1.2 seconds. Inclusive release at 650–950 ms adds 1 to the server's roll modifier, or 1 protection for Protect. Other valid timing and Roll now keep the ordinary move. Assisted release grants the same maximum bonus. The selected action freezes during a hold; pointer cancellation submits nothing, and the round deadline cannot be extended. Signed Spotlight keeps preview-before-spending and uses the same release control for confirmation. These pacing constants are starting values for human playtesting.

The server accepts only an optional integer duration from 0–1200 ms and computes the bonus itself. Client timing is an input, not evidence of human dexterity; no anti-cheat claim is made. Uncertain delivery preserves the action and its command ID/timing across browser reload and retries.

## Chapters and consequences

New and revised adventures use [the storytelling and pacing baseline](docs/storytelling-guide.md), adapting Dan Harmon's Story Circle to observable player actions and three drop-in chapters. It is the master authoring reference for story beats, foreshadowed costs, changed endings and review. The Teacup, Tomorrow and Orchard stories are selectable alongside Briar Glen, with distinct chapters, art, route choices, endings and keepsakes. [Runtime scope and verification](docs/playable-adventures.md) distinguish implemented mechanics from optional design extensions.

| Chapter | Immediate goal | Possible contributions |
| --- | --- | --- |
| The missing livestock | Help Mara and find the missing herd’s trail | Calm animals, free Mara, inspect tracks, clear the gate |
| The riverside hunt | Cross the river and learn what binds the pack | Distract the pack, find cover, free the boat, question the ferryman |
| The chapel | Free captives and resolve Gloamfang’s threat | Repair the ward, interrupt the guardian, ring the bell, rescue captives |

Every chapter closes within ten rounds with success, mixed success or a setback. Failed checks add danger while revealing a way forward; essential story facts do not depend on retrying a check. Chapter outcomes affect the next chapter’s starting conditions. Helping Mara provides a later advantage and epilogue acknowledgment; repairing the ward can restore the guardian instead of driving it away.

Fighters protect and interrupt, rogues create openings, wizards reveal magical advantages, and clerics heal or revive. Class-appropriate traits drive checks. Downed heroes retain Help. Successful creative effects are limited to cover, distraction, revelation and rescue using existing scene targets.

## Drop-in rules

- Four total seats; deterministic companions support human plans and are always labeled.
- Human departures never require a replacement player to continue. No-human rooms park after finishing committed work.
- Missing turns do not invent dialogue, spend Spotlight or make a major choice. Repeated inactivity releases the seat.
- Heroes retain XP and keepsakes, but saved progression does not raise starting combat power. The hero used in an adventure stays pinned across rejoining.
- The four adventures share the First tales cosmetic collection. New tables award one Thread per contributed chapter; three buy a chosen Shepherd-hat palette and six buy its feather trim. Unlocks belong to the account, have no expiry, and never change power. The wardrobe tracks one optional goal; the discovery journal records seen outcomes. [Pilot rules and rollout](docs/collections.md).
- Objective and danger contributions scale with human count. Additional humans create more individual contributions without reducing chapters to a couple of rounds.
- Old snapshots lacking intent finish their current turn under the old targeting rule and announce intent at the next choosing boundary. Omitted target kind means scene; omitted timing gives no bonus. Structured result/contribution fields extend existing room/event JSON and require no schema migration. Readers retain support for old rolled-action events.

## AI and boundaries

The complete authored adventure works without a model. OpenAI and Ollama adapters optionally prepare cosmetic variations, interpret Spotlight ideas and narrate already validated outcomes. A five-second deadline protects play; unsupported or unavailable interpretations offer a standard action without spending the token. A generated proposal still requires player confirmation and a game check.

Public hosted play should use hosted inference; a public function cannot reach Ollama on a player’s personal computer. Actual model quality and latency still need evaluation. Prepared variations currently change presentation, not the underlying three-chapter adventure structure.

The prior battle/story implementation remains at `/?legacy=1`. Tactical grids, unrestricted freeform mechanics, an autonomous AI dungeon master, and a catalog of additional adventures are outside this pass.

## Living tabletop contract

**Show the consequence on the table before explaining it in history.** Pick up a piece → aim → commit → watch the world react → spot the next opportunity. Keep quiet intervals between proportionate action, combination and chapter payoffs. Preserve all four visible tokens, stable hit areas, tap/keyboard equivalence, reduced effects and opt-in sound. Combat objective progress is never presented as HP damage.

Briar Glen version 2 adds one authored combination per chapter, with an objective payoff and a safety payoff. Setup opens the next two choosing turns; every human explicitly chooses whether to spend one attempt. See [the implemented game-feel contract](docs/game-feel-direction.md) and [the version 2 story packet](docs/stories/briar-glen-v2.md). Existing version 1 rooms retain their rules.
