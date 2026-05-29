import { describe, expect, it } from 'vitest';
import type { CharacterProfile } from '../character';
import {
  FAILURE_XP,
  VICTORY_ITEM,
  VICTORY_XP,
  createInitialBattleState,
  getEnemyCounterDamage,
  getEnemyHpForPartySize,
  getBattleReward,
  resolveBattleTurn,
  type BattleParticipant,
  type BattleState,
} from './engine';

const makeCharacter = (
  id: string,
  name: string,
  hp = 12,
  traits = { INT: 20, ATH: 20, ING: 20, CHA: 20 },
): CharacterProfile => ({
  id,
  name,
  classKey: 'fighter',
  level: 3,
  xp: 240,
  hp,
  maxHp: hp,
  traits,
  spotlightTokens: 2,
  inventory: [],
  accent: '#6EE7B7',
});

const makeParticipant = (character: CharacterProfile): BattleParticipant => ({
  sessionId: `user-${character.id}`,
  character,
  online: true,
  leftAt: null,
});

describe('battle engine', () => {
  it('resolves Strike damage and enemy counter damage', () => {
    const character = makeCharacter('a', 'Arden', 12);
    const state = createInitialBattleState([character]);

    const result = resolveBattleTurn('ROOM', 1, state, [makeParticipant(character)], {
      'user-a': { actionId: 'strike', committedAt: 1 },
    });

    expect(result.battleState.enemyHp).toBe(state.enemyHp - 6);
    expect(result.battleState.partyHpByCharacterId.a).toBe(9);
    expect(result.results[0].damage).toBe(6);
    expect(result.results[0].incomingDamage).toBe(3);
  });

  it('applies Guard reduction and chip damage', () => {
    const character = makeCharacter('a', 'Arden', 12);
    const state = createInitialBattleState([character]);

    const result = resolveBattleTurn('ROOM', 1, state, [makeParticipant(character)], {
      'user-a': { actionId: 'guard', committedAt: 1 },
    });

    expect(result.battleState.enemyHp).toBe(state.enemyHp - 2);
    expect(result.battleState.partyHpByCharacterId.a).toBe(12);
    expect(result.results[0].incomingDamage).toBe(0);
  });

  it('heals the lowest damaged ally with Aid', () => {
    const cleric = makeCharacter('cleric', 'Mira', 12);
    const fighter = makeCharacter('fighter', 'Bram', 14);
    const state: BattleState = {
      ...createInitialBattleState([cleric, fighter]),
      partyHpByCharacterId: {
        cleric: 12,
        fighter: 4,
      },
    };

    const result = resolveBattleTurn('ROOM', 1, state, [makeParticipant(cleric), makeParticipant(fighter)], {
      'user-cleric': { actionId: 'aid', committedAt: 1 },
      'user-fighter': { actionId: 'guard', committedAt: 1 },
    });

    const aidResult = result.results.find((entry) => entry.actionId === 'aid');
    expect(aidResult?.healing).toBe(5);
    expect(result.logLines.some((line) => line.includes('restores 5 HP'))).toBe(true);
  });

  it('sets victory before the enemy can counterattack', () => {
    const character = makeCharacter('a', 'Arden', 12);
    const state: BattleState = {
      ...createInitialBattleState([character]),
      enemyHp: 4,
    };

    const result = resolveBattleTurn('ROOM', 1, state, [makeParticipant(character)], {
      'user-a': { actionId: 'strike', committedAt: 1 },
    });

    expect(result.enemyDefeated).toBe(true);
    expect(result.battleState.status).toBe('victory');
    expect(result.battleState.partyHpByCharacterId.a).toBe(12);
  });

  it('sets failure when the whole active party is downed', () => {
    const character = makeCharacter('a', 'Arden', 1, { INT: -20, ATH: -20, ING: -20, CHA: -20 });
    const state = createInitialBattleState([character]);

    const result = resolveBattleTurn('ROOM', 1, state, [makeParticipant(character)], {
      'user-a': { actionId: 'heavy', committedAt: 1 },
    });

    expect(result.partyDefeated).toBe(true);
    expect(result.battleState.status).toBe('failure');
    expect(result.battleState.downedCharacterIds).toContain('a');
  });

  it('returns the expected battle rewards', () => {
    expect(getBattleReward('victory')).toMatchObject({ xp: VICTORY_XP, item: VICTORY_ITEM });
    expect(getBattleReward('failure').xp).toBe(FAILURE_XP);
    expect(getBattleReward('active').xp).toBe(0);
  });

  it('scales enemy hp and counter damage down for solo runs', () => {
    expect(getEnemyHpForPartySize(1)).toBe(16);
    expect(getEnemyHpForPartySize(3)).toBe(32);
    expect(getEnemyCounterDamage(1, 1)).toBe(3);
    expect(getEnemyCounterDamage(1, 3)).toBe(5);
  });
});
