import type { AdventureRoom } from './types';
import type { RoundEntry } from './roundSummary';
import { chaptersFor } from './registry';
import { expeditionTarget } from './expedition';
import { isJourney, journeyTarget } from './journey';

/** Retained human profiles survive departures; companion seat IDs can be reused. */
export function roundHero(room: AdventureRoom, actorId?: string, actorName?: string) {
  if (!actorId) return undefined;
  const participant = room.players[actorId];
  if (participant) return participant.character;
  return room.seats.find(seat => seat.actorId === actorId && seat.kind === 'companion'
    && actorName !== undefined && seat.character.name === actorName)?.character;
}

export function roundIllustrations(room: AdventureRoom, chapter: number, entry: RoundEntry) {
  const source = room.events.find(event => event.id === entry.id);
  const targetRecord = source && room.events.find(event => event.actorId === entry.targetId && event.chapter === source.chapter && event.turn === source.turn);
  const currentTarget = source?.turn === room.turn && source.chapter === room.chapter
    ? room.seats.find(seat => seat.actorId === entry.targetId) : undefined;
  return {
    actor: roundHero(room, entry.actorId, entry.actorName),
    // Consequence actors can be victims. Only actions get a directed interaction.
    target: entry.kind === 'action' && entry.targetKind !== 'hero'
      ? (isJourney(room) ? journeyTarget(source?.result?.expedition?.locationId, entry.targetId) : expeditionTarget(source?.result?.expedition?.locationId, entry.targetId))
        ?? chaptersFor(room)[chapter]?.targets.find(target => target.id === entry.targetId) : undefined,
    targetHero: entry.kind === 'action' && entry.targetKind === 'hero'
      ? roundHero(room, entry.targetId, targetRecord?.actorName ?? currentTarget?.character.name) : undefined,
  };
}
