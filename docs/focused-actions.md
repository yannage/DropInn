# Focused actions: battle and token identity

Design and implementation, 2026-09-20. Uses the installed Game Design Fundamentals GDD and motivation worksheet structure, scaled to this feature. No adventure story is authored or changed here.

## Overview and core loop

**Pitch:** Read the threat, choose how to confront it, then watch your hero's dice clash with the enemy's.

Browser/tablet/phone; one to four players with companions. Intended experience: tactical challenge, readable impact, and cooperation. The familiar four-target scene is the navigation layer. Choosing an enemy with Fight replaces it with a large enemy, a visible hero, the current threat and three attack options. Investigation, Influence and hero Help use the same focused space with different decisions. Escape or Scene returns to target selection before commitment.

The loop remains within one simultaneous 30-second turn: select a target → inspect stakes → choose an approach → timed release or Roll now → shared resolution → six-second reveal. The reveal shows actual dice and arithmetic; it never invents cosmetic results or delays the next choosing boundary. A late response skips elapsed presentation beats. Chapter progress and the real threatened hero remain the stakes; the interface does not invent an enemy HP pool.

## Mechanics and tradeoffs

Numbers below assume one human. Objective progress and danger reduction divide by seated human count; HP/protection values do not. UI options display the scaled values.

| Token | Approach | Resolution and payoff |
| --- | --- | --- |
| Fight against the announced enemy | Quick Strike | +2 roll modifier; 2 progress on a win; no attack-generated cover. Useful when accuracy matters or little progress remains. |
| Fight against the announced enemy | Heavy Blow | −1 roll modifier; 6 progress on a win; no attack-generated cover. A larger payoff with more risk. |
| Fight against the announced enemy | Guarded Strike | No approach modifier; 2 progress and 3 party cover on a win. Trades progress for protection. |
| Influence | Reassure | Ordinary difficulty check; 3 progress and 1 danger relief on success. |
| Influence | Distract | Ordinary difficulty check; 2 progress and +1 opening next turn on success. Does not grant Reassure's danger reduction or the separate class-Help distract effect. |
| Investigate | Follow the trail | Ordinary difficulty check; 4 progress on success; no next-turn bonus. |
| Investigate | Study a weakness | Ordinary difficulty check; 2 progress and +2 party insight next turn on success. |
| Help on the threatened hero | Protect | Existing guaranteed 2 protection, or 3 with good timing; no objective progress. |
| Help on a wounded hero | Mend | Guaranteed 2 HP, or 3 with good timing, capped at missing HP; no objective progress. Downed heroes can use it. |

Fight outside the announced enemy and Help on scene objects keep their contextual standard rules. Branch-directed Help still opens its cost preview and uses the existing vote rules. Spotlight still uses its signed preview.

For opposed Fight: player d20 + class trait + frozen insight/opening + committed teamwork + approach modifier + execution bonus must be **strictly greater** than enemy d20 + enemy modifier. Ties favor the enemy. The modifier is frozen when the choosing phase begins: `2 + chapterIndex + floor(danger / 6)`. The enemy die is shared across attackers; neither side's die changes if the player changes attack approach. Rolls are resolved deterministically by the server. Client fields cannot supply the opponent roll or its modifier.

A failed rolled action still gains the ordinary one share of progress and one share of danger. Loss does not create an additional personal retaliation: the original announced party strike resolves once against its original recipient. Guarded cover, standard cover and Protect take the strongest value, never their sum. Standard missed-input defense remains separate.

Setup lasts one following turn. Study's +2 insight takes precedence over ordinary +1 insight; multiple Study moves do not stack. Opening remains capped at +1. Cross-token teamwork remains capped at +1. Misses do not grant setup. Healing resolves in stable seat order and clamps to current missing HP; if another move already healed the target, the remaining healing can be zero. The event records the actual amount. Accepted aid retains a departing recipient until the boundary.

## Progression, economy and motivation worksheet

There is no added currency, equipment grind or permanent stat change. Resources are the current move, progress, danger, HP and one-turn setup bonuses. Ordinary action XP and chapter keepsakes retain their existing policy; Mend receives the same 3 contribution XP as guaranteed Protect. The ten-round chapter cap and existing endings remain.

The intended learning sequence is small: choose immediate progress versus setup in the first chapter; compare accuracy, payoff and protection when combat appears. A practiced player should consider the remaining objective, current victim, HP and next-turn support instead of always choosing the largest progress number. The starting balance is a hypothesis, not evidence of fun. Heavy's payoff is deliberately large enough to compete with direct investigation despite its lower win chance.

| Motivation worksheet area | Feature response | What remains to observe |
| --- | --- | --- |
| Explorers — primary | Discover how temporary insight and opening change a later clash. | Do players understand the one-turn expiry and choose when to prepare? |
| Socializers — primary | Visible teammate readiness, shared enemy roll, Protect and Mend. Companions keep solo visits viable. | Does saving an ally feel connected to the party's result? |
| Achievers — secondary | Objective progress, completion, unchanged XP and keepsakes. | Does the bigger Heavy payoff feel earned rather than arbitrary? |
| Player-versus-player dominance — not targeted | No direct PvP, ranking or competitive rewards added. | Not applicable to this cooperative slice. |
| Autonomy | Change approach before committing; leave focus with Escape; choose guaranteed aid instead of a roll. | Can a newcomer explain two reasonable choices in the same situation? |
| Competence | Visible arithmetic, enemy modifier, tactical payoff, unchanged timing assistance. | Can players predict what their action could change? |
| Relatedness | Shared stakes and distinct offensive/support roles; no unanimous continuation gate. | Do players notice another person's setup or protection? |
| Flow and pacing | Brief preparation, one shared release, one bounded reveal. No new timer or separate battle instance. | Are three attack options readable inside the existing turn allowance? |
| Rewards | Fixed existing contribution/chapter rules and variable roll outcomes. | No retention schedule or new reward claims introduced. |

No audience percentages, motivation scores, or measured enjoyment are claimed. Those require observation.

## Contract and compatibility

New rooms opt into `mechanicsVersion: 1`. Old snapshots omit it and preserve standard behavior. Optional `PlayerAction.approach`, `EnemyIntent.duelModifier`, and structured result fields travel in the existing command/snapshot/event JSON. No SQL schema changes are needed. The store's complete pending action preserves the approach and timing across retries/reloads; command receipts remain idempotent.

UI and server must be deployed together before enabling focused mechanics in new hosted rooms. An older server would not implement new approach choices. The local preview uses a newly started Vite process because server imports are cached; the unrelated preview on port 5198 is preserved. No hosted rollout, SQL write or model inference is part of this task.

## Verification

Verified locally on 2026-09-20 against the working changes based on `a5395ced`: all 217 unit/service tests passed, all 28 scene-runner checks passed against the local handler at port 5199, and the production build passed. The build reports a bundle-size warning. These results do not cover hosted persistence or Realtime.

Local Chromium scenarios cover focused Fight on desktop, 390×844 and 320×568; full-size enemy art; keyboard focus and Escape; Quick/Heavy shared opposed rolls; real Mend, Study and Distract commands; existing Protect; deadline cancellation; Spotlight; and loss/retry/reload with the same Heavy approach and release payload. Test snapshots for legacy result presentation are labeled separately from service-driven gameplay.

Reducer tests cover both dice remaining stable across approaches, strict ties, execution bonus, attack tradeoffs, human-count scaling, shared opponent dice, reversed command arrival, duplicate receipts, forged opponent values, invalid/old-room approaches, setup expiry/nonstacking, guaranteed clamped healing and departure during accepted aid. The HTTP test checks invalid approach rejection and preserved results/rewards after duplicate commands and reads.

Evidence is generated in `output/playwright/scene-integration-results.json`, `battle-focus-desktop.png`, `battle-clash-desktop.png`, `integration-battle-focus-390.png`, `integration-battle-focus-320.png`, and `integration-mend-focus-*.png`.

Human acceptance remains open: ask players which attack they chose and why, what happens on a tie, who is threatened, and whether Study or Mend changes their next decision. Listen to the audio and test screen readers and physical phones separately. Local tests do not verify deployed Supabase/Realtime or establish that the balance is enjoyable.
