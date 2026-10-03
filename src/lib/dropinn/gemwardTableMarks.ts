import { journeyActionPreview, journeyScene } from './journey';
import { isStoryTable, storyFactCopy } from './storyTable';
import type { AdventureRoom, StoryEvent, TokenKind } from './types';

/** Presentation-safe accepted intent. Never includes a draft, signed proposal or outcome. */
export interface GemwardPlacedMove {
  id: string;
  actorId: string;
  actorName: string;
  targetId: string;
  targetKind: 'scene' | 'hero';
  targetName: string;
  token: TokenKind;
  label: string;
}

/** Teammates' counters only; the local player's existing parked token keeps its job. */
export function gemwardPlacedMoves(room: AdventureRoom, userId: string, locationId: string): GemwardPlacedMove[] {
  if (!isStoryTable(room) || room.status !== 'active' || room.phase !== 'choosing') return [];
  const scene = journeyScene(room, locationId);
  return room.seats.flatMap(seat => {
    const action = room.commits[seat.actorId];
    if (seat.kind !== 'human' || seat.actorId === userId || !action) return [];
    const targetKind = action.targetKind ?? 'scene';
    // A move at another town stop must not be drawn onto this stop's scenery.
    if (targetKind === 'scene' && action.expedition?.locationId && action.expedition.locationId !== locationId) return [];
    const targetName = targetKind === 'hero'
      ? room.seats.find(target => target.actorId === action.targetId)?.character.name
      : scene.targets.find(target => target.id === action.targetId)?.name;
    if (!targetName) return [];
    const label = action.token === 'spotlight' ? `Spotlight at ${targetName}` : journeyActionPreview(room, seat.actorId, action).label;
    return [{ id: `${room.id}:${room.turn}:${seat.actorId}`, actorId: seat.actorId, actorName: seat.character.name,
      targetId: action.targetId, targetKind, targetName, token: action.token, label }];
  }).slice(0, 3);
}

export interface GemwardFactBeat { event: StoryEvent; start: number; duration: number }

/** The existing confirmed stage beat owns contact, fast-forwarding and expiry. */
export function gemwardFactStamp(beat: GemwardFactBeat | undefined, now: number, quiet: boolean, visible: boolean) {
  if (!beat || !visible || !Number.isFinite(now) || !Number.isFinite(beat.start) || !(beat.duration > 0)) return undefined;
  const result = beat.event.result?.expedition?.storyTable;
  if (!result || result.repeated || beat.event.success === false || !result.factIds.length) return undefined;
  const contactAt = beat.start + beat.duration / 3;
  if (now < contactAt || now >= beat.start + beat.duration) return undefined;
  const factIds = [...new Set(result.factIds)];
  const durationMs = Math.min(360, beat.duration * 2 / 3);
  const elapsedMs = now - contactAt;
  return {
    eventId: beat.event.id,
    label: factIds.map(id => storyFactCopy(id).label).join(' + '),
    factIds,
    durationMs,
    elapsedMs,
    animate: !quiet && elapsedMs < durationMs,
  };
}
