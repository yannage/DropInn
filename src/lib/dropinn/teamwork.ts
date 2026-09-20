import type { AdventureRoom, PlayerAction } from './types';

/** Only locked human moves count. A draft can preview a pairing but grants nothing. */
export function teammatesAt(room: AdventureRoom, userId: string, targetId: string, targetKind: PlayerAction['targetKind'] = 'scene') {
  return room.seats.filter(seat => seat.kind === 'human' && seat.actorId !== userId
    && room.commits[seat.actorId]?.targetId === targetId
    && (room.commits[seat.actorId]?.targetKind ?? 'scene') === targetKind).map(seat => ({
      userId: seat.actorId, name: seat.character.name, token: room.commits[seat.actorId].token,
    }));
}

export function rollSupport(room: AdventureRoom, userId: string, action: PlayerAction) {
  const partners = teammatesAt(room, userId, action.targetId, action.targetKind).filter(mate => mate.token !== action.token);
  const insight = Number(room.flags.includes(`insight:${room.turn}`));
  const opening = Number(room.flags.includes(`opening:${room.turn}`));
  const teamwork = Number(partners.length > 0);
  return { insight, opening, teamwork, partners, total: insight + opening + teamwork };
}

export function supportText(support: ReturnType<typeof rollSupport>) {
  return [support.insight ? '+1 insight' : '', support.opening ? '+1 distraction' : '',
    support.teamwork ? `+1 teamwork with ${support.partners.map(partner => partner.name).join(', ')}` : '']
    .filter(Boolean).join(' · ');
}
