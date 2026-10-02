import { specialActionPreview } from './actionPreview';
import { approachOption, isDuel } from './approaches';
import { combinationAvailable, selectedPayoff } from './combinations';
import { describeAction, RELEASE_DURATION_MS, validateProposal } from './engine';
import { getScene } from './scene';
import { rollSupport } from './teamwork';
import type { AdventureRoom, PlayerAction } from './types';

export interface ActionOdds {
  /** A move with no success roll, rather than a rolled move whose chance is 100%. */
  guaranteed: boolean;
  /** Percentage of possible rolls that succeed without the release bonus. */
  normal: number;
  /** Percentage of possible rolls that succeed with the +1 release bonus. */
  goodRelease: number;
}

const guaranteed = (): ActionOdds => ({ guaranteed: true, normal: 100, goodRelease: 100 });

/**
 * Current-snapshot odds for a legal, uncommitted move. Does not inspect seeded
 * rolls or predict an outcome. Callers choose any default approach explicitly;
 * an omitted approach retains the engine's ordinary difficulty check.
 */
export function actionOdds(room: AdventureRoom, userId: string, action: PlayerAction): ActionOdds | undefined {
  if (room.status !== 'active' || room.phase !== 'choosing' || room.commits[userId]) return;
  const actor = room.seats.find(seat => seat.kind === 'human' && seat.actorId === userId && !seat.leaving);
  if (!actor) return;
  if (action.targetKind !== undefined && action.targetKind !== 'scene' && action.targetKind !== 'hero') return;
  if (action.releaseMs !== undefined && (!Number.isInteger(action.releaseMs) || action.releaseMs < 0 || action.releaseMs > RELEASE_DURATION_MS)) return;

  let scene: ReturnType<typeof getScene>;
  try { scene = getScene(room); } catch { return; } // Unknown pinned definitions have no knowable odds.
  const special = specialActionPreview(room, action);
  const approach = approachOption(room, action);
  if (action.approach !== undefined && !approach) return;
  if (special && (action.approach !== undefined || action.combination !== undefined)) return;
  if (action.combination !== undefined && (!combinationAvailable(room, userId) || !selectedPayoff(room, action))) return;

  if (action.targetKind === 'hero') {
    if (action.token !== 'assist') return;
    const ally = room.seats.find(seat => seat.actorId === action.targetId);
    if (!ally) return;
    if (action.approach === 'mend') {
      return !ally.leaving && ally.hp < ally.character.maxHp ? guaranteed() : undefined;
    }
    return scene.combat && room.enemyIntent?.turn === room.turn && room.enemyIntent.targetActorId === ally.actorId
      ? guaranteed() : undefined;
  }

  const target = scene.targets.find(candidate => candidate.id === action.targetId);
  if (!target || (actor.hp <= 0 && action.token !== 'assist')) return;
  if (action.token === 'spotlight') {
    const participant = room.players[userId];
    if (!participant || participant.spotlightChapters.includes(room.chapter) || !action.proposal
      || action.proposal.targetId !== action.targetId || !validateProposal(room, action.proposal)) return;
  } else if (!target.tokens.includes(action.token)) return;
  if (special?.guaranteed) return guaranteed();

  const description = describeAction(actor.character.classKey, action.token, action.targetId, room);
  const support = rollSupport(room, userId, action);
  const modifier = actor.character.traits[description.trait] + support.total + (approach?.modifier ?? 0);
  if (!Number.isFinite(modifier) || !Number.isFinite(description.dc)) return;

  // The server opposes two dice only for an explicitly selected attack approach.
  if (approach && isDuel(room, action)) {
    const enemyModifier = room.enemyIntent!.duelModifier!;
    if (!Number.isFinite(enemyModifier)) return;
    let normalWins = 0, timedWins = 0;
    for (let playerDie = 1; playerDie <= 20; playerDie++) {
      for (let enemyDie = 1; enemyDie <= 20; enemyDie++) {
        const opposingTotal = enemyDie + enemyModifier;
        normalWins += Number(playerDie + modifier > opposingTotal);
        timedWins += Number(playerDie + modifier + 1 > opposingTotal);
      }
    }
    return { guaranteed: false, normal: normalWins / 4, goodRelease: timedWins / 4 };
  }

  let normalWins = 0, timedWins = 0;
  for (let die = 1; die <= 20; die++) {
    normalWins += Number(die + modifier >= description.dc);
    timedWins += Number(die + modifier + 1 >= description.dc);
  }
  return { guaranteed: false, normal: normalWins * 5, goodRelease: timedWins * 5 };
}
