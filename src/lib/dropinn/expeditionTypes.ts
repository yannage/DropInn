import type { TokenKind } from './types';

export type ConsumableKind = 'second-wind' | 'smoke' | 'favour' | 'dust' | 'binding';
export interface ConsumableInstance { id: string; kind: ConsumableKind }
export interface ConsumableOffer { id: string; item: ConsumableInstance; source: string }
export interface ExpeditionAction {
  locationId?: string;
  interactionId?: string;
  routeId?: string;
  consumableId?: string;
  favourChoice?: string;
  rewardChoice?: { offerId: string; replaceId?: string; decline?: boolean };
}
export type BattleStance = 'strike' | 'trick' | 'guard';
export interface ExpeditionBattle {
  id: string;
  round: number;
  progress: number;
  goal: number;
  stance: BattleStance;
  returnLocationId: string;
  status: 'queued' | 'active' | 'won' | 'escaped';
}
export interface ExpeditionState {
  seed: string;
  variant: 'smugglers' | 'ward';
  locationId: string;
  questItems: string[];
  discoveries: string[];
  visited: string[];
  routeId?: string;
  pendingRouteId?: string;
  battle?: ExpeditionBattle;
  encounterResolved?: boolean;
  explorationTurns: number;
  stashes: Record<string, ConsumableInstance[]>;
  offers: Record<string, ConsumableOffer[]>;
  rewarded: string[];
  costs: string[];
  finaleChoice?: 'restore' | 'release';
  ending?: string;
}
export interface ExpeditionInteraction {
  id: string;
  label: string;
  description: string;
  questItem?: string;
  consumable?: ConsumableKind;
  finaleChoice?: 'restore' | 'release';
}
export interface ExpeditionResult {
  locationId?: string;
  interactionId?: string;
  questItems?: string[];
  consumed?: ConsumableKind;
  reward?: ConsumableOffer;
  routeId?: string;
  battleProgress?: number;
  battleStance?: BattleStance;
  finaleChoice?: 'restore' | 'release';
}
export interface ExpeditionCombatMove { token: TokenKind; label: string; description: string; stance?: BattleStance }
