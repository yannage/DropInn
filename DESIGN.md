# DropInn design

**Open the app, find something happening, join immediately, do something creative, and leave with a memorable moment.**

The unit of value is a satisfying short visit. New roleplayers and experienced tabletop players should be able to participate during a spare five to ten minutes without organizing a group or committing to an entire campaign. A chapter’s five-to-eight-minute duration is a playtesting target, not a measured guarantee; early commitments can make play faster.

## The current experience

1. The lobby shows live adventures, open seats, companions and chapter progress. Play Now finds a table or starts one, using an immediately available hero.
2. A two-sentence catch-up explains the situation and current objective. A joining player receives a seat at the next safe turn boundary.
3. Each player selects a scene target and contextual Fight, Influence, Investigate or Assist token. The preview explains the check and effect. Optional Spotlight offers a short custom idea to review before commitment.
4. Humans choose simultaneously within 30 seconds; the round resolves early when everyone commits. Individual rolls and consequences remain visible for six seconds before the next turn.
5. Players can leave, keep earned progress, and read their contribution recap. History later shows chapter outcomes and rewards earned after their departure.

Scene artwork, targets, party status and tactile tokens share one compact, mobile-first layout. Chat is optional. Public cooperation includes local mute controls, reporting and server validation; report review is an operational responsibility, not an automated moderation promise.

## Chapters and consequences

| Chapter | Immediate goal | Possible contributions |
| --- | --- | --- |
| The missing livestock | Help Mara and find the missing herd’s trail | Calm animals, free Mara, inspect tracks, clear the gate |
| The riverside hunt | Cross the river and learn what binds the pack | Distract the pack, find cover, free the boat, question the ferryman |
| The chapel | Free captives and resolve Gloamfang’s threat | Repair the ward, interrupt the guardian, ring the bell, rescue captives |

Every chapter closes within ten rounds with success, mixed success or a setback. Failed checks add danger while revealing a way forward; essential story facts do not depend on retrying a check. Chapter outcomes affect the next chapter’s starting conditions. Helping Mara provides a later advantage and epilogue acknowledgment; repairing the ward can restore the guardian instead of driving it away.

Fighters protect and interrupt, rogues create openings, wizards reveal magical advantages, and clerics heal or revive. Class-appropriate traits drive checks. Downed heroes retain Assist. Successful creative effects are limited to cover, distraction, revelation and rescue using existing scene targets.

## Drop-in rules

- Four total seats; deterministic companions support human plans and are always labeled.
- Human departures never require a replacement player to continue. No-human rooms park after finishing committed work.
- Missing turns do not invent dialogue, spend Spotlight or make a major choice. Repeated inactivity releases the seat.
- Heroes retain XP and keepsakes, but saved progression does not raise starting combat power. The hero used in an adventure stays pinned across rejoining.
- Objective and danger contributions scale with human count. Additional humans create more individual contributions without reducing chapters to a couple of rounds.

## AI and boundaries

The complete authored adventure works without a model. OpenAI and Ollama adapters optionally prepare cosmetic variations, interpret Spotlight ideas and narrate already validated outcomes. A five-second deadline protects play; unsupported or unavailable interpretations offer a standard action without spending the token. A generated proposal still requires player confirmation and a game check.

Public hosted play should use hosted inference; a public function cannot reach Ollama on a player’s personal computer. Actual model quality and latency still need evaluation. Prepared variations currently change presentation, not the underlying three-chapter adventure structure.

The prior battle/story implementation remains at `/?legacy=1`. Tactical grids, unrestricted freeform mechanics, an autonomous AI dungeon master, and a catalog of additional adventures are outside this pass.
