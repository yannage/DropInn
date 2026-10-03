import type { CharacterClassKey } from '../character';
import type { BattleStance } from './expeditionTypes';
import type { TokenKind } from './types';

export interface ExpeditionCombatEffect {
  progress: number;
  protection: number;
  exchange: 'counter' | 'even' | 'difficult' | 'help' | 'protect';
  signature: number;
  healSelf: number;
  healParty: number;
  opensNextRound: boolean;
}

/** The deterministic part of a class move. Items, party aggregation and damage remain in the reducer. */
export function expeditionCombatMove({ classKey, token, stance, humanCount, releaseMs, protect = false, downed = false }: {
  classKey: CharacterClassKey; token: Exclude<TokenKind, 'spotlight'>; stance: BattleStance;
  humanCount: number; releaseMs?: number; protect?: boolean; downed?: boolean;
}): ExpeditionCombatEffect {
  const share = 1 / Math.max(1, humanCount);
  const timing = Number(Number.isInteger(releaseMs) && releaseMs! >= 650 && releaseMs! <= 950);
  const result: ExpeditionCombatEffect = { progress: 0, protection: 0, exchange: 'help', signature: 0, healSelf: 0, healParty: 0, opensNextRound: false };
  if (protect || downed) return { ...result, protection: 2 + timing, exchange: 'protect' };
  const ownStance = ({ fight: 'strike', influence: 'trick', investigate: 'guard' } as const)[token as 'fight' | 'influence' | 'investigate'];
  if (ownStance) {
    const winning = ({ strike: 'trick', trick: 'guard', guard: 'strike' } as const)[ownStance] === stance;
    result.exchange = winning ? 'counter' : ownStance === stance ? 'even' : 'difficult';
    result.signature = winning && (classKey === 'fighter' && ownStance === 'strike' || classKey === 'rogue' && ownStance === 'trick') ? 1 : 0;
    result.progress = ((winning ? 3 : ownStance === stance ? 2 : 1) + result.signature) * share;
    if (ownStance === 'guard') result.protection = classKey === 'wizard' ? 3 : 2 + timing;
    if (winning && classKey === 'cleric' && ownStance === 'strike') result.healSelf = 1;
    return result;
  }
  result.progress = (classKey === 'wizard' ? stance === 'guard' ? 3 : 2 : classKey === 'rogue' ? 2 : 1) * share;
  if (classKey === 'fighter') result.protection = 4;
  if (classKey === 'rogue') result.opensNextRound = true;
  if (classKey === 'cleric') result.healParty = 3;
  return result;
}
