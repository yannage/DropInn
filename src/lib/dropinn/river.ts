import { chaptersFor } from './registry';
import type { AdventureRoom, PlayerAction, SceneTarget } from './types';

export type RiverSupplyStatus = NonNullable<AdventureRoom['riverSupplies']>['status'];
export type RiverMove = 'secure' | 'rush' | 'salvage' | 'recover' | 'rescue';
export const RIVER_SUPPLY_DEADLINE = 3;
export const isRiverSuppliesChapter = (room: AdventureRoom): boolean => chaptersFor(room)[room.chapter]?.riverSupplies === true;
export const riverSupplyState = (room: AdventureRoom): RiverSupplyStatus | undefined => isRiverSuppliesChapter(room) ? room.riverSupplies?.status ?? 'drifting' : undefined;
const points = (room: AdventureRoom, amount: number) => Number((amount / Math.max(1, room.seats.filter(seat => seat.kind === 'human').length)).toFixed(2));

/** Every human reads this same state until all of a turn's actions resolve. */
export function riverMove(room: AdventureRoom, action: PlayerAction, status = riverSupplyState(room)): RiverMove | undefined {
  if (!isRiverSuppliesChapter(room) || action.targetKind === 'hero' || (status !== 'drifting' && status !== 'spilled')) return;
  if (action.targetId === 'boat') {
    if (action.token === 'assist') return status === 'drifting' ? 'secure' : 'salvage';
    if (action.token === 'fight' && status === 'drifting') return 'rush';
    if (action.token === 'spotlight' && action.proposal?.supported && action.proposal.effect === 'rescue') return 'rescue';
  }
  if (action.targetId === 'reeds' && action.token === 'investigate' && status === 'spilled') return 'recover';
}

export function riverActionPreview(room: AdventureRoom, action: PlayerAction): { label: string; detail: string; guaranteed: boolean } | undefined {
  const move = riverMove(room, action);
  const missed = `Miss: +${points(room, 1)} crossing, +${points(room, 1)} danger;`;
  const deadline = 'Save by round 3 or crossing; otherwise +2 chapel danger.';
  if (move === 'secure') return { label: 'Secure the supplies', guaranteed: true,
    detail: 'Guaranteed: all supplies (+3 chapel progress). No crossing progress or usual Help effect. The pack can still strike.' };
  if (move === 'rush') return { label: 'Rush the loaded boat', guaranteed: false,
    detail: `Win: +${points(room, 4)} crossing, all supplies (+3 chapel progress). ${missed} cargo spills. ${room.chapterRound >= RIVER_SUPPLY_DEADLINE ? 'Last chance: unsaved cargo adds +2 chapel danger.' : deadline}` };
  if (move === 'salvage') return { label: 'Salvage what is nearby', guaranteed: true,
    detail: 'Guaranteed: some supplies (+1 chapel progress). No crossing progress or usual Help effect. The rest is lost unless recovered this turn.' };
  if (move === 'recover') return { label: 'Recover all the supplies', guaranteed: false,
    detail: `Win: +${points(room, 2)} crossing, all supplies (+3 chapel progress). ${missed} your search saves no supplies. ${deadline}` };
  if (move === 'rescue') return { label: 'Rescue the supplies', guaranteed: false,
    detail: `Win: +${points(room, 5)} crossing, heal the most wounded ally up to 4 HP, all supplies (+3 chapel progress). ${missed} your rescue saves no supplies. ${deadline}` };
}

export function riverStatus(room: AdventureRoom): { status: RiverSupplyStatus; label: string; detail: string; roundsLeft: number } | undefined {
  const status = riverSupplyState(room);
  if (!status) return;
  const remaining = Math.max(0, RIVER_SUPPLY_DEADLINE - room.chapterRound + (room.phase === 'choosing' ? 1 : 0));
  const descriptions: Record<RiverSupplyStatus, { label: string; detail: string }> = {
    drifting: { label: 'The supplies are drifting', detail: 'Help the boat to keep +3 starting chapel progress, or Fight to rush it across. Lost after river round 3 or an earlier crossing: +2 starting chapel danger.' },
    spilled: { label: 'Supplies in the reeds', detail: 'Help the boat to guarantee +1 starting chapel progress, or Investigate the reeds to risk recovering +3. Lost after river round 3 or an earlier crossing: +2 starting chapel danger.' },
    secured: { label: 'All supplies secured', detail: 'Your supplies will add +3 starting chapel progress. Finish the crossing together.' },
    salvaged: { label: 'Some supplies salvaged', detail: 'The supplies you saved will add +1 starting chapel progress. Finish the crossing together.' },
    lost: { label: 'The supplies drifted away', detail: 'The chapel will start with +2 extra danger. The crossing and every reward remain available.' },
  };
  return { status, ...descriptions[status], roundsLeft: status === 'drifting' || status === 'spilled' ? remaining : 0 };
}

/** Cargo changes the available decision, while the boat remains visibly afloat. */
export function riverTarget(room: AdventureRoom, target: SceneTarget): SceneTarget {
  const status = riverSupplyState(room);
  if (!status) return target;
  if (target.id === 'boat') {
    const unresolved = status === 'drifting' || status === 'spilled';
    const context = status === 'drifting' ? 'The loaded boat drifts against its rope. Securing its supplies takes a move; rushing it risks a spill.'
      : status === 'spilled' ? 'The boat is afloat, but its supplies are caught in the reeds. Save what is nearby, or search the reeds for everything.'
      : status === 'secured' ? 'The boat is afloat with all supplies secured for the chapel. Help keep the crossing steady.'
      : status === 'salvaged' ? 'The boat carries the supplies you salvaged. The rest is gone; guide the party across.'
      : 'The supplies have drifted beyond reach. The boat can still carry everyone across.';
    return { ...target, artKey: 'boat-afloat', changed: status !== 'drifting', name: status === 'drifting' ? 'The loaded boat' : status === 'spilled' ? 'The emptied boat' : 'The crossing boat',
      context, description: context,
      tokens: unresolved ? status === 'drifting' ? ['fight', 'assist'] : ['influence', 'investigate', 'assist'] : ['fight', 'influence', 'investigate', 'assist'],
      actionCues: unresolved ? status === 'drifting' ? { fight: 'Rush across with the supplies', assist: 'Secure all the supplies' }
        : { influence: 'Guide the party across', investigate: 'Plan the crossing', assist: 'Salvage nearby supplies' }
        : { fight: 'Push the crossing boat onward', influence: 'Guide the party across', investigate: 'Plan a steady crossing', assist: 'Keep the crossing steady' } };
  }
  if (target.id === 'reeds' && status === 'spilled') return { ...target, name: 'Supplies in the reeds',
    context: 'The spilled supplies are tangled in the reeds. Searching can recover everything, but the current is pulling them away.',
    description: 'Recover all the supplies before the end of river round 3, or help the party through the concealed path.',
    actionCues: { investigate: 'Search for all the supplies', assist: 'Make cover for the crossing' } };
  return target;
}
