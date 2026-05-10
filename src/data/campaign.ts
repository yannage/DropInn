import type { FC } from 'react';

export interface Traits {
  INT: number;
  ATH: number;
  ING: number;
  CHA: number;
}

export interface Action {
  id: string;
  label: string;
  coinColor: string;
  Coin: FC<{ size?: number }>;
  trait: keyof Traits;
  dc: number;
  description: string;
}

export interface Player {
  id: 'yanni' | 'bram' | 'aria';
  name: string;
  sealColor: string;
  online: boolean;
  initial: string;
  avatarColor: string;
}

export interface SlotPos {
  left: string;
  top: string;
  rot: string;
}

export interface BotPlay {
  actionId: string;
  label: string;
}

export interface NPC {
  id: string;
  name: string;
  species: string;
  role: string;
  traits: string[];
  motivation: string;
  secret: string;
  tagline: string;
}

export type SceneType = 'social' | 'combat' | 'dragon';

import {
  CharmCoin, BluffCoin, ScrutinizeCoin, BribeCoin,
  FireBoltCoin, ThunderwaveCoin, ShieldCoin, DisengageCoin,
  ArcaneBlastCoin, CommuneCoin,
} from '../components/icons';

// ── Social actions — used when the party is negotiating, investigating,
//    or interacting with NPCs in a town or social setting.
export const SOCIAL_ACTIONS: Action[] = [
  {
    id: 'charm',
    label: 'Charm',
    coinColor: 'charm',
    Coin: CharmCoin,
    trait: 'CHA',
    dc: 11,
    description: 'Disarm with warmth and wit.',
  },
  {
    id: 'bluff',
    label: 'Bluff',
    coinColor: 'bluff',
    Coin: BluffCoin,
    trait: 'ING',
    dc: 12,
    description: 'Spin a convincing tale.',
  },
  {
    id: 'scrutinize',
    label: 'Read Room',
    coinColor: 'scrutinize',
    Coin: ScrutinizeCoin,
    trait: 'INT',
    dc: 10,
    description: 'Observe tells and hidden clues.',
  },
  {
    id: 'bribe',
    label: 'Bribe',
    coinColor: 'bribe',
    Coin: BribeCoin,
    trait: 'ING',
    dc: 11,
    description: 'Let coin do the talking.',
  },
];

// ── Combat actions — used during active combat encounters.
//    Tuned for Yanni the Wizard (INT-heavy, low ATH).
export const COMBAT_ACTIONS: Action[] = [
  {
    id: 'firebolt',
    label: 'Fire Bolt',
    coinColor: 'fire',
    Coin: FireBoltCoin,
    trait: 'INT',
    dc: 13,
    description: 'Hurl a shard of orange fire.',
  },
  {
    id: 'thunderwave',
    label: 'Thunderwave',
    coinColor: 'thunder',
    Coin: ThunderwaveCoin,
    trait: 'INT',
    dc: 14,
    description: 'Release a percussive wave of force.',
  },
  {
    id: 'shield',
    label: 'Shield',
    coinColor: 'shield',
    Coin: ShieldCoin,
    trait: 'INT',
    dc: 10,
    description: 'Raise a magical barrier.',
  },
  {
    id: 'disengage',
    label: 'Disengage',
    coinColor: 'disengage',
    Coin: DisengageCoin,
    trait: 'ATH',
    dc: 8,
    description: 'Slip away and reposition.',
  },
];

// ── Dragon confrontation actions — high-stakes finale moves.
export const DRAGON_ACTIONS: Action[] = [
  {
    id: 'arcaneburst',
    label: 'Arcane Burst',
    coinColor: 'arcane',
    Coin: ArcaneBlastCoin,
    trait: 'INT',
    dc: 15,
    description: 'Unleash every thread of magic.',
  },
  {
    id: 'commune',
    label: 'Commune',
    coinColor: 'commune',
    Coin: CommuneCoin,
    trait: 'CHA',
    dc: 14,
    description: 'Speak the old draconic words.',
  },
  {
    id: 'dispel',
    label: 'Dispel',
    coinColor: 'dispel',
    Coin: ArcaneBlastCoin,
    trait: 'INT',
    dc: 16,
    description: 'Unravel the dragon\'s breath weave.',
  },
  {
    id: 'dash',
    label: 'Dash',
    coinColor: 'disengage',
    Coin: DisengageCoin,
    trait: 'ATH',
    dc: 8,
    description: 'Sprint for the high ground.',
  },
];

// All actions combined — used by the engine for ID lookup
export const ALL_ACTIONS: Action[] = [
  ...SOCIAL_ACTIONS,
  ...COMBAT_ACTIONS,
  ...DRAGON_ACTIONS,
];

// Backward-compat alias — Room passes actions explicitly now,
// but this lets the engine still import a single list.
export const ACTIONS = ALL_ACTIONS;

export const YANNI_TRAITS: Traits = { INT: 3, ATH: 1, ING: 2, CHA: 3 };

export const PLAYERS: Player[] = [
  { id: 'yanni', name: 'Yanni', sealColor: 'purple', online: true,  initial: 'Y', avatarColor: '#B68CF0' },
  { id: 'bram',  name: 'Bram',  sealColor: 'green',  online: true,  initial: 'B', avatarColor: '#6EE7B7' },
  { id: 'aria',  name: 'Aria',  sealColor: 'red',    online: false, initial: 'A', avatarColor: '#F87171' },
];

export const SLOT_POS: Record<string, SlotPos> = {
  yanni: { left: '10%', top: '8%',  rot: '-8deg' },
  bram:  { left: '34%', top: '-2%', rot: '2deg'  },
  aria:  { left: '60%', top: '8%',  rot: '8deg'  },
};

// Scene type per round (V1 has 3 rounds all social; V2 will vary by scene)
export const SCENE_TYPE_BY_ROUND: Record<number, SceneType> = {
  1: 'social',
  2: 'social',
  3: 'social',
};

export const ACTIONS_BY_ROUND: Record<number, Action[]> = {
  1: SOCIAL_ACTIONS,
  2: SOCIAL_ACTIONS,
  3: SOCIAL_ACTIONS,
};

// Bot plays — keyed first by round, then by bot ID
export const BOT_PLAYS_BY_ROUND: Record<number, Record<string, BotPlay>> = {
  1: {
    bram: { actionId: 'bluff',      label: 'Plays it Cool'    },
    aria: { actionId: 'scrutinize', label: 'Reads the Room'   },
  },
  2: {
    bram: { actionId: 'bribe',      label: 'Slides Coin'      },
    aria: { actionId: 'charm',      label: 'Builds Rapport'   },
  },
  3: {
    bram: { actionId: 'charm',      label: 'Goes All In'      },
    aria: { actionId: 'bluff',      label: 'Final Gambit'     },
  },
};

export const PIP: NPC = {
  id: 'pip',
  name: 'Pip Bramblebottom',
  species: 'Goblin',
  role: 'Trinket merchant',
  traits: ['Suspicious', 'Greedy', 'Nervous', 'Observant'],
  motivation: 'Protect his profit margins at all costs.',
  secret: 'Saw the dragon pass by Ash Hollow three nights ago — sold it a copper bracelet.',
  tagline: '"Constantly counts coins, even mid-sentence."',
};

export const CAMPAIGN_TITLE = 'The Dragon of Ash Hollow';
