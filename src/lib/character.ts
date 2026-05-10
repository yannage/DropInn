export type TraitSet = {
  INT: number;
  ATH: number;
  ING: number;
  CHA: number;
};

export type CharacterClassKey = 'wizard' | 'fighter' | 'rogue' | 'cleric';

export interface CharacterProfile {
  id: string;
  name: string;
  classKey: CharacterClassKey;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  traits: TraitSet;
  spotlightTokens: number;
  inventory: string[];
  accent: string;
}

export interface CharacterClassPreset {
  label: string;
  accent: string;
  hp: number;
  traits: TraitSet;
}

export const CHARACTER_CLASS_PRESETS: Record<CharacterClassKey, CharacterClassPreset> = {
  wizard: {
    label: 'Wizard',
    accent: '#A78BFA',
    hp: 10,
    traits: { INT: 3, ATH: 1, ING: 2, CHA: 3 },
  },
  fighter: {
    label: 'Fighter',
    accent: '#6EE7B7',
    hp: 14,
    traits: { INT: 1, ATH: 4, ING: 1, CHA: 2 },
  },
  rogue: {
    label: 'Rogue',
    accent: '#FCD34D',
    hp: 11,
    traits: { INT: 2, ATH: 2, ING: 4, CHA: 2 },
  },
  cleric: {
    label: 'Cleric',
    accent: '#F87171',
    hp: 12,
    traits: { INT: 2, ATH: 2, ING: 1, CHA: 4 },
  },
};

export const getCharacterLabel = (classKey: CharacterClassKey) => CHARACTER_CLASS_PRESETS[classKey].label;

export const getCharacterInitial = (name: string) => name.trim().charAt(0).toUpperCase() || '?';

export const sanitizeCharacterName = (name: string) => name.trim().slice(0, 18);

export const makeCharacterId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `char_${Math.random().toString(36).slice(2, 10)}`;
};

export const createCharacterProfile = (name: string, classKey: CharacterClassKey): CharacterProfile => {
  const preset = CHARACTER_CLASS_PRESETS[classKey];

  return {
    id: makeCharacterId(),
    name: sanitizeCharacterName(name),
    classKey,
    level: 3,
    xp: 240,
    hp: preset.hp,
    maxHp: preset.hp,
    traits: preset.traits,
    spotlightTokens: 2,
    inventory: [],
    accent: preset.accent,
  };
};

export const DEFAULT_CHARACTER = createCharacterProfile('Yanni', 'wizard');
