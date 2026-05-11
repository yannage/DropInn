# DropInn Design Brief - V1 Battle MVP

## Goal

Make DropInn feel like a game, not just a story reader. V1 is complete when a player can create/select a saved character, join a co-op multiplayer room, resolve a real battle sequence with shared enemy HP and party HP, earn XP/items, refresh, and keep progression.

The core question for V1:

> Does a 5-10 minute co-op battle with saved character progress feel worth returning to?

## Audience

13+ fantasy and tabletop RPG players who want a fast session. The tone is storybook fantasy with readable game-state feedback. The UI should stay compact enough for mobile, but the primary loop must be battle-first.

## V1 Stack

- Vite + React 18 + TypeScript
- Zustand for UI/cache state
- Supabase anonymous auth
- Supabase Postgres for characters, rooms, turn actions, battle logs, and rewards
- Supabase Realtime for room update propagation
- Netlify static hosting

## V1 Loop

1. Player lands in the lobby.
2. App signs in anonymously if Supabase is configured.
3. Player creates or selects a saved character.
4. Host creates a room and shares the room code.
5. Guest joins with a saved character.
6. Host starts "Ash Hollow Ambush".
7. Each active player commits one action per round.
8. Player actions resolve together.
9. Enemy attacks if still alive.
10. Battle continues, wins, or fails.
11. Each participating character claims XP/item reward once.
12. Refresh restores selected character and active room.

## Battle Design

### Encounter

The first playable room is "Ash Hollow Ambush". An Ash Warg attacks the party. Enemy max HP scales with party size so solo and two-player testing are both viable.

### State

The room stores:

- `status`: lobby, active, completed
- `battle_state.status`: lobby, active, victory, failure
- `round`
- `enemyHp` and `enemyMaxHp`
- `enemyIntent`
- `partyHpByCharacterId`
- `downedCharacterIds`
- `lastResolvedTurn`
- `rewardClaimedByCharacterId`

### Actions

| Action | DC | Effect |
| --- | ---: | --- |
| Strike | 11 | 6 damage on success, 2 on failure |
| Heavy | 15 | 11 damage on success, 0 on failure |
| Guard | 11 | Reduce incoming damage by 6, deal 2 on success |
| Aid | 10 | Heal lowest damaged ally by 5, or grant +2 momentum |

Class flavor changes action labels only:

- Wizard: Arcane Dart, Overchannel, Ward, Mend
- Fighter: Blade Strike, Cleave, Guard, Rally
- Rogue: Quick Cut, Backstab, Evasion, Distract
- Cleric: Radiant Blow, Judgement, Sanctuary, Blessing

### Resolution

1. Aid resolves first.
2. Strike, Heavy, and Guard resolve.
3. Enemy HP is reduced.
4. If enemy HP reaches 0, battle ends in victory before counterattack.
5. Enemy deals `4 + round` damage to every standing active hero.
6. Guard reduces that hero's incoming damage by 6.
7. Heroes at 0 HP are downed.
8. If every active hero is downed, battle ends in failure.
9. Otherwise the next round begins immediately.

## Progression

Characters start at level 3 with 240 XP. Rewards are applied once per character per completed room.

| Result | Reward |
| --- | --- |
| Victory | +75 XP, Ashhide Charm |
| Failure | +15 XP, Cracked Ash Token |

Level thresholds:

- Level 4 at 300 XP
- Level 5 at 450 XP

## UX Direction

The room screen prioritizes battle readability:

- Enemy HP and intent at the top.
- Battlefield visual in the center.
- Party cards with HP, online/downed state, and committed action state.
- Action bar with selected and committed states.
- Compact combat log instead of a long story scroll.
- Reward panel after victory or failure.

Story remains present as combat-log flavor, but combat state is the primary experience.

## Success Criteria

- A new player can create a character and start a room without reading docs.
- Two anonymous sessions can join the same room and see Realtime state updates.
- Actions commit once per round and cannot be changed after commit.
- Enemy HP changes after attacks.
- Player HP changes after enemy attacks.
- Battle can reach victory and failure.
- XP and item rewards persist after refresh.
- Netlify deploy works with base build settings plus Supabase env vars.

## Post-V1 Direction

- Account upgrade from anonymous auth.
- More encounters and enemy types.
- Tactical positioning or lanes.
- Public matchmaking.
- Server-side authoritative turn resolver.
- Richer animation and audio pass.
- LLM-assisted narration constrained by battle results.

