import { chaptersFor } from './registry';
import { getScene } from './scene';
import type { AdventureRoom, PlayerAction, TokenKind } from './types';
import { riverStatus } from './river';
import { specialActionPreview } from './actionPreview';
import { choiceStatus } from './chapterChoices';
import { expeditionActionPreview, isExpedition } from './expedition';

export type PlayerGuidanceState = 'completed' | 'parked' | 'joining' | 'unseated' | 'leaving'
  | 'reveal' | 'pending' | 'committed' | 'expired' | 'holding' | 'prepared' | 'inspecting' | 'armed' | 'target';
export type PlayerGuidanceStep = 'target' | 'move' | 'commit' | 'wait' | 'results' | null;

/** A new snapshot can arrive between clock ticks; never display a longer turn. */
export function remainingTurnSeconds(room: AdventureRoom, now: number) {
  const boundary = (room.phase === 'reveal' ? room.revealUntil : room.deadline) ?? room.deadline;
  return Math.min(room.phase === 'reveal' ? 10 : 60, Math.max(0, Math.ceil((boundary - now) / 1000)));
}
export interface PlayerGuidance {
  state: PlayerGuidanceState;
  title: string;
  detail: string;
  seconds: number | null;
  activeStep: PlayerGuidanceStep;
}
export interface PlayerGuidanceInput {
  room: AdventureRoom;
  userId: string;
  now: number;
  selection?: PlayerAction | null;
  inspectedId?: string | null;
  pending?: { turn: number; action: PlayerAction } | null;
  armedToken?: TokenKind | null;
  holding?: boolean;
}

const tokenLabels: Record<TokenKind, string> = {
  fight: 'Fight', influence: 'Influence', investigate: 'Investigate', assist: 'Help', spotlight: 'Spotlight',
};

/** Keep the authored world action visible while the player compares mechanical approaches. */
export function contextualActionLabel(room: AdventureRoom, action: PlayerAction): string {
  if (action.token === 'spotlight' && action.proposal?.label.trim()) return action.proposal.label.trim();
  if (isExpedition(room)) {
    if (room.expedition?.battle?.status === 'active') {
      if (action.targetKind === 'hero') return 'Protect';
      return { fight: 'Strike', influence: 'Trick', investigate: 'Guard', assist: 'Class support' }[action.token as Exclude<TokenKind, 'spotlight'>] ?? 'Creative move';
    }
    return expeditionActionPreview(room, '', action).label;
  }
  const riverMove = specialActionPreview(room, action);
  if (riverMove) return riverMove.label;
  if (action.targetKind === 'hero') {
    const name = room.seats.find(seat => seat.actorId === action.targetId)?.character.name ?? 'your ally';
    if (action.token === 'assist') return `${action.approach === 'mend' ? 'Mend' : 'Protect'} ${name}`;
    return `${tokenLabels[action.token]} · ${name}`;
  }
  const target = getScene(room).targets.find(item => item.id === action.targetId);
  return target?.actionCues?.[action.token]?.trim() || `${tokenLabels[action.token]} · ${target?.name ?? 'the scene'}`;
}

/** Suggestions are invitations to inspect, never prepared actions or route recommendations. */
export function suggestedTargetIds(room: AdventureRoom, userId: string): string[] {
  const self = room.seats.find(seat => seat.actorId === userId && seat.kind === 'human');
  if (!self || self.leaving || room.status !== 'active' || room.phase !== 'choosing'
    || room.pendingJoins.includes(userId) || room.commits[userId]) return [];
  const scene = getScene(room);
  const legal = scene.targets.filter(target => self.hp === 0
    ? target.tokens.includes('assist') : target.tokens.some(token => token !== 'spotlight'));
  if (scene.branch && !room.storyBranch) {
    return scene.branch.options.map(option => option.targetId)
      .filter(id => legal.some(target => target.id === id && target.tokens.includes('assist')));
  }
  const first = legal.find(target => target.id === scene.firstTarget && !target.changed)
    ?? legal.find(target => !target.changed) ?? legal[0];
  return first ? [first.id] : [];
}

/** Presentation only: the authoritative room still owns admission, deadlines, and commitment. */
export function derivePlayerGuidance(input: PlayerGuidanceInput): PlayerGuidance {
  const { room, userId, now, selection, inspectedId, pending, armedToken, holding } = input;
  const seconds = remainingTurnSeconds(room, now);
  const guidance = (state: PlayerGuidanceState, title: string, detail: string, activeStep: PlayerGuidanceStep,
    remaining: number | null = seconds): PlayerGuidance => ({ state, title, detail, seconds: remaining, activeStep });
  if (room.status === 'completed') return guidance('completed', 'Adventure complete', 'Collect your recap and bring this hero to another adventure.', null, null);
  if (room.status === 'parked') return guidance('parked', 'Table resting', 'The adventure continues when someone returns.', 'wait', null);
  if (room.pendingJoins.includes(userId)) return guidance('joining', 'Joining next round', 'Look around while this round finishes. You can act when your seat is ready.', 'wait');
  const self = room.seats.find(seat => seat.actorId === userId && seat.kind === 'human');
  if (!self) return guidance('unseated', 'Take a seat to play', 'Rejoin the adventure to choose a move. You can inspect the scene now.', null);
  if (self.leaving) return guidance('leaving', 'Leaving after this round', 'The party is finishing this round. Your hero leaves when it ends.', 'wait');
  if (room.phase === 'reveal') {
    const nextChapter = room.outcomes.some(outcome => outcome.chapter === room.chapter)
      && room.chapter + 1 < chaptersFor(room).length;
    const next = nextChapter ? 'Next chapter' : 'Next round';
    return guidance('reveal', 'See what changed', seconds > 0
      ? `${next} in ${seconds}s, or earlier when everyone is ready.`
      : `Waiting for the ${next.toLowerCase()} to begin.`, 'results');
  }
  const accepted = room.commits[userId];
  // A confirmed snapshot settles a lingering local receipt. Old-turn pending data is irrelevant.
  if (pending?.turn === room.turn && !accepted) return guidance('pending', 'Checking your move', now >= room.deadline
    ? 'Checking whether your move was accepted before the deadline.'
    : 'Your move was sent. Retrying keeps the same move and timing.', 'wait');
  if (accepted) return guidance('committed', 'Waiting for your party', seconds > 0
    ? `Your move is committed. Everyone resolves together in up to ${seconds}s.`
    : 'Your move is committed. Waiting for the party’s results.', 'wait');
  if (now >= room.deadline) return guidance('expired', 'Time to resolve', 'Choosing has ended. Waiting for the party’s results.', 'wait');
  const guaranteed = selection && specialActionPreview(room, selection)?.guaranteed;
  if (holding) return guidance('holding', 'Finish your release', guaranteed ? 'This move is guaranteed. Timing does not change its outcome.' : 'The bright zone adds a bonus. Missing it keeps your ordinary move.', 'commit');
  if (selection) return guidance('prepared', 'Hold and release to commit', guaranteed ? 'Guaranteed move. Release or Commit now to send it.' : 'Release sends your move. The bright zone adds +1.', 'commit');
  const scene = getScene(room);
  const inspected = scene.targets.find(target => target.id === inspectedId);
  if (inspected) return guidance('inspecting', 'Choose how to help', 'Choose a move below. Release the die to send it.', 'move');
  const inspectedHero = room.seats.find(seat => seat.actorId === inspectedId);
  if (inspectedHero) return guidance('inspecting', 'Choose how to help', 'Choose a move below. Release the die to send it.', 'move');
  if (armedToken) return guidance('armed', `Place ${tokenLabels[armedToken]}`, 'Choose a highlighted target. You will commit your move afterward.', 'target');
  if (scene.branch && !room.storyBranch) return guidance('target', 'Inspect the routes', 'Compare the routes. Help votes for a route; other moves contribute without voting.', 'target');
  if (self.hp === 0) return guidance('target', 'Choose where to Help', 'You can still Help. Inspect a highlighted target to choose a move.', 'target');
  const choice = choiceStatus(room);
  if (choice && choice.phase !== 'settled') return guidance('target', choice.label, choice.detail, 'target');
  const supplies = riverStatus(room);
  if (supplies && supplies.roundsLeft > 0) return guidance('target', supplies.label, supplies.status === 'spilled'
    ? 'Help the boat to salvage some; Investigate the reeds to risk saving all. Lost cargo adds 2 chapel danger.'
    : 'Help the boat to secure supplies; Fight to risk a faster crossing. Lost cargo adds 2 chapel danger.', 'target');
  return guidance('target', self.hp === 0 ? 'Choose where to Help' : 'Pick a piece. Make a difference.', self.hp === 0
    ? 'You can still Help. Inspect a highlighted target to choose a move.'
    : 'Drag or tap a token onto the scene. You can also inspect a target first.', 'target');
}
