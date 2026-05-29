import type { CharacterProfile } from './character';

const LEVEL_THRESHOLDS: Array<{ level: number; xp: number }> = [
  { level: 5, xp: 450 },
  { level: 4, xp: 300 },
  { level: 3, xp: 0 },
];

export const getLevelForXp = (xp: number) => (
  LEVEL_THRESHOLDS.find((threshold) => xp >= threshold.xp)?.level ?? 3
);

export const applyCharacterReward = (
  character: CharacterProfile,
  xpAward: number,
  itemName?: string,
): CharacterProfile => {
  const nextXp = Math.max(0, character.xp + xpAward);
  const nextLevel = getLevelForXp(nextXp);
  const nextInventory = itemName && !character.inventory.includes(itemName)
    ? [...character.inventory, itemName]
    : character.inventory;

  return {
    ...character,
    xp: nextXp,
    level: nextLevel,
    inventory: nextInventory,
  };
};
