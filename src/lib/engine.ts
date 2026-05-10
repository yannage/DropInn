import { ALL_ACTIONS, YANNI_TRAITS } from '../data/campaign';
import { OUTCOMES } from '../data/outcomes';

export interface RollResult {
  roll: number;
  mod: number;
  total: number;
  success: boolean;
  narrative: string;
  trait: string;
  dc: number;
}

export type StoryKind = 'intro' | 'resolution' | 'spotlight' | 'scene-complete';

export interface StoryEntry {
  turn: number;
  text: string;
  kind: StoryKind;
  roll?: RollResult;
  spotlightText?: string;
}

// Actions that always succeed — tactical repositioning with no meaningful failure state
const AUTO_SUCCEED = new Set(['disengage', 'dash']);

export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

export function resolveAction(actionId: string): RollResult | null {
  const action = ALL_ACTIONS.find(a => a.id === actionId);
  if (!action) return null;

  if (AUTO_SUCCEED.has(actionId)) {
    return {
      roll: 20, mod: 0, total: 20, success: true,
      narrative: OUTCOMES[actionId]?.success ?? '',
      trait: action.trait,
      dc: action.dc,
    };
  }

  const roll = rollD20();
  const mod = YANNI_TRAITS[action.trait] ?? 0;
  const total = roll + mod;
  const success = total >= action.dc;
  const outcomeGroup = OUTCOMES[actionId];
  const narrative = success
    ? (outcomeGroup?.success ?? '')
    : (outcomeGroup?.failure ?? outcomeGroup?.success ?? '');

  return { roll, mod, total, success, narrative, trait: action.trait, dc: action.dc };
}
