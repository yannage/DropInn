import { describe, expect, it } from 'vitest';
import type { CharacterProfile } from './character';
import { applyCharacterReward, getLevelForXp } from './progression';

const character: CharacterProfile = {
  id: 'char',
  name: 'Yanni',
  classKey: 'wizard',
  level: 3,
  xp: 240,
  hp: 10,
  maxHp: 10,
  traits: { INT: 3, ATH: 1, ING: 2, CHA: 3 },
  spotlightTokens: 2,
  inventory: [],
  accent: '#A78BFA',
};

describe('progression', () => {
  it('maps XP to V1 level thresholds', () => {
    expect(getLevelForXp(299)).toBe(3);
    expect(getLevelForXp(300)).toBe(4);
    expect(getLevelForXp(450)).toBe(5);
  });

  it('awards XP, levels up, and avoids duplicate items', () => {
    const rewarded = applyCharacterReward(character, 75, 'Ashhide Charm');
    const rewardedAgain = applyCharacterReward(rewarded, 75, 'Ashhide Charm');

    expect(rewarded.xp).toBe(315);
    expect(rewarded.level).toBe(4);
    expect(rewardedAgain.inventory.filter((item) => item === 'Ashhide Charm')).toHaveLength(1);
  });
});

