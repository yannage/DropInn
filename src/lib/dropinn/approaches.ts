import type { ActionApproach, AdventureRoom, PlayerAction } from './types';

export interface ApproachOption { id: ActionApproach; label: string; detail: string; modifier: number; progress: number; protection?: number }
export const ATTACKS: ApproachOption[] = [
  { id: 'quick', label: 'Quick Strike', detail: '+2 to hit · 2 progress · no cover', modifier: 2, progress: 2 },
  { id: 'heavy', label: 'Heavy Blow', detail: '−1 to hit · 6 progress · no cover', modifier: -1, progress: 6 },
  { id: 'guarded', label: 'Guarded Strike', detail: '2 progress · blocks 3 on a win', modifier: 0, progress: 2, protection: 3 },
];
export const isDuel = (room: AdventureRoom, action: PlayerAction) => room.mechanicsVersion === 1
  && action.token === 'fight' && action.targetKind !== 'hero' && room.enemyIntent?.turn === room.turn
  && room.enemyIntent.sourceId === action.targetId && room.enemyIntent.duelModifier !== undefined;

export function approachOptions(room: AdventureRoom, action: PlayerAction): ApproachOption[] {
  if (room.mechanicsVersion !== 1) return [];
  if (isDuel(room, action)) return ATTACKS;
  if (action.targetKind === 'hero') return action.token === 'assist'
    ? [{ id: 'mend', label: 'Mend', detail: 'Heal 2 HP · good release heals 3 · no progress', modifier: 0, progress: 0 }] : [];
  if (action.token === 'influence') return [
    { id: 'soothe', label: 'Reassure', detail: '3 progress · ease danger by 1', modifier: 0, progress: 3 },
    { id: 'distract', label: 'Distract', detail: '2 progress · +1 opening next turn', modifier: 0, progress: 2 },
  ];
  if (action.token === 'investigate') return [
    { id: 'trail', label: 'Follow the trail', detail: '4 progress · no next-turn bonus', modifier: 0, progress: 4 },
    { id: 'study', label: 'Study a weakness', detail: '2 progress · +2 insight next turn', modifier: 0, progress: 2 },
  ];
  return [];
}

export function approachOption(room: AdventureRoom, action: PlayerAction) {
  return approachOptions(room, action).find(option => option.id === action.approach);
}

export function approachDetail(room: AdventureRoom, option: ApproachOption) {
  const share = 1 / Math.max(1, room.seats.filter(seat => seat.kind === 'human').length);
  return option.detail.replace(/(\d+) progress/, (_, amount) => `${Number((Number(amount) * share).toFixed(2))} progress`)
    .replace('danger by 1', `danger by ${Number(share.toFixed(2))}`);
}

export const turnInsight = (room: AdventureRoom) => room.flags.includes(`insight:${room.turn}:2`) ? 2 : Number(room.flags.includes(`insight:${room.turn}`));
