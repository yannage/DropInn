import { approachOption } from './approaches';
import { chaptersFor } from './registry';
import type { AdventureRoom, PlayerAction, SceneCombination } from './types';

export const BRIAR_COMBINATIONS: SceneCombination[] = [
  { id: 'shelter', label: 'A shelter for everyone', sourceId: 'gate', setupTokens: ['fight', 'assist'], payoffs: [
    { id: 'gather', label: 'Gather into shelter', targetId: 'herd', token: 'influence', progress: 3 },
    { id: 'secure', label: 'Secure the shelter', targetId: 'mara', token: 'assist', dangerReduction: 2 },
  ] },
  { id: 'hidden-path', label: 'A path through the reeds', sourceId: 'reeds', setupTokens: ['investigate', 'assist'], payoffs: [
    { id: 'ambush', label: 'Spring the ambush', targetId: 'pack', token: 'fight', progress: 3 },
    { id: 'crossing', label: 'Hidden crossing', targetId: 'boat', token: 'assist', cover: 3 },
  ] },
  { id: 'bell-song', label: 'The bell answers', sourceId: 'bell', setupTokens: ['fight', 'assist'], payoffs: [
    { id: 'repair', label: 'Resonant repair', targetId: 'ward', token: 'assist', progress: 3 },
    { id: 'escape', label: 'Cover the escape', targetId: 'captives', token: 'assist', cover: 3 },
  ] },
];

export const combinationDefinition = (room: AdventureRoom) => chaptersFor(room)[room.chapter].combination;
export const combinationState = (room: AdventureRoom) => room.combinations?.find(item => item.chapter === room.chapter);
export function combinationAvailable(room: AdventureRoom, userId: string) {
  const state = combinationState(room);
  return !!state && room.phase === 'choosing' && room.turn >= state.fromTurn && room.turn <= state.throughTurn && !state.usedBy.includes(userId);
}
export function selectedPayoff(room: AdventureRoom, action: PlayerAction) {
  const definition = combinationDefinition(room);
  return action.targetKind !== 'hero' && definition?.id === action.combination?.id
    ? definition?.payoffs.find(payoff => payoff.id === action.combination?.payoffId && payoff.targetId === action.targetId && payoff.token === action.token)
    : undefined;
}
export function combinationPreview(room: AdventureRoom, payoff: SceneCombination['payoffs'][number], action?: PlayerAction, userId?: string) {
  const share = 1 / Math.max(1, room.seats.filter(seat => seat.kind === 'human').length);
  const actor = room.seats.find(seat => seat.actorId === userId);
  const ordinaryProgress = action ? ((approachOption(room, action)?.progress ?? (action.token === 'assist' ? 2 : 3)) + (action.token === 'assist' && actor && ['wizard', 'cleric'].includes(actor.character.classKey) ? 1 : 0)) * share : 0;
  const ordinaryReduction = action?.token === 'assist' && actor && ['fighter', 'rogue'].includes(actor.character.classKey) ? share : 0;
  const points = (n: number) => Number(n.toFixed(2));
  if (payoff.progress) return `On success: up to +${points(Math.min(payoff.progress * share, Math.max(0, chaptersFor(room)[room.chapter].progressGoal - room.progress - ordinaryProgress)))} extra objective progress`;
  if (payoff.dangerReduction) return `On success: ease danger by up to ${points(Math.min(Math.max(0, room.danger - ordinaryReduction), payoff.dangerReduction * share))}`;
  const existing = room.flags.includes(`cover:${room.turn}:3`) || Object.values(room.commits).some(action => action.targetKind === 'hero' && !action.approach && (action.releaseMs ?? 0) >= 650 && (action.releaseMs ?? 0) <= 950) ? 3 : room.flags.includes(`cover:${room.turn}`) ? 2 : 0;
  return `On success: ${payoff.cover} party cover · strongest wins${existing >= (payoff.cover ?? 0) ? ' · already covered' : ''}`;
}
