import { describe, expect, it, vi } from 'vitest';
import { createCharacterProfile } from '../src/lib/character';
import { createJourney, journeyMap, journeyPouch } from '../src/lib/dropinn/journey';
import type { AdventureRoom, PlayerAction } from '../src/lib/dropinn/types';
import { createDropinnHandler } from './dropinn';

type Variant = 'smugglers' | 'ward';
async function service(variant: Variant = 'smugglers') {
  let now = 1000; let sequence = 0;
  const external = vi.fn(async () => { throw new Error('No model is required for this authored journey.'); });
  const handler = createDropinnHandler({ local: true, env: {}, now: () => now, fetch: external });
  async function request(operation: string, fields: Record<string, unknown> = {}, user = 'journey_host') {
    now++;
    const response = await handler(new Request('http://localhost/api/dropinn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, sessionId: user, ...fields }) }));
    return { status: response.status, ...await response.json() };
  }
  async function call(operation: string, fields: Record<string, unknown> = {}, user = 'journey_host') {
    const value = await request(operation, fields, user); expect(value.status, value.error ?? operation).toBe(200); return value;
  }
  const seed = Array.from({ length: 20 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` as ReturnType<typeof crypto.randomUUID>).find(seed => createJourney(seed).variant === variant)!;
  const random = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(seed);
  let room: AdventureRoom;
  try { room = (await call('play', { character: createCharacterProfile('Journey host', 'fighter'), adventureId: 'gemward', visibility: 'private' })).room; }
  finally { random.mockRestore(); }
  expect(room!.adventureVersion).toBe(2); expect(room!.expedition!.variant).toBe(variant);
  function envelope(room: AdventureRoom, type: string, extra: Record<string, unknown> = {}) {
    return { roomCode: room.code, command: { id: `journey-service-${++sequence}`, type, expectedTurn: room.turn, expectedRevision: room.revision, ...extra } };
  }
  async function command(room: AdventureRoom, type: string, extra: Record<string, unknown> = {}, user = 'journey_host') {
    const payload = envelope(room, type, extra);
    const accepted = (await call('command', payload, user)).room as AdventureRoom;
    const duplicate = (await call('command', payload, user)).room as AdventureRoom;
    const readback = (await call('read', { roomCode: room.code }, user)).room as AdventureRoom;
    expect(duplicate.revision).toBe(accepted.revision); expect(duplicate.expedition).toEqual(accepted.expedition);
    expect(readback.expedition).toEqual(accepted.expedition); expect(readback.events).toEqual(accepted.events);
    expect(readback.players[user]).toEqual(accepted.players[user]);
    return accepted;
  }
  async function turn(room: AdventureRoom, action: PlayerAction) {
    room = await command(room, 'act', { action });
    return room.status === 'completed' ? room : command(room, 'skip-reveal');
  }
  async function town() {
    let current = room!;
    for (const action of [{ token: 'investigate', targetId: 'iris' }, { token: 'assist', targetId: 'bram', expedition: { locationId: 'docks' } }, { token: 'assist', targetId: 'nella' }, { token: 'assist', targetId: 'oren', expedition: { locationId: 'tavern' } }] as PlayerAction[]) current = await turn(current, action);
    expect(current.phase).toBe('travel'); return current;
  }
  const vote = (room: AdventureRoom, edgeId: string, user?: string) => command(room, 'vote-travel', { travel: { decisionId: room.expedition!.travel!.id, edgeId } }, user);
  return { room: room!, request, call, command, turn, vote, town, envelope, external, advance: (time: number) => { now = time; } };
}

describe('Gemward v2 real command service', () => {
  it.each((['warehouse', 'canal', 'road'] as const).flatMap(route => (['smugglers', 'ward'] as const).map(variant => ({ route, variant }))))('persists $route for the $variant telling across both travel forks and completion', async ({ route, variant }) => {
    const api = await service(variant);
    let room = await api.town();
    const beforeTravelXP = room.players.journey_host.xp;
    room = await api.vote(room, `town-${route}`);
    expect(room.players.journey_host.xp).toBe(beforeTravelXP);
    if (route === 'canal') {
      room = await api.turn(room, { token: 'assist', targetId: 'ramp' });
      room = await api.turn(room, { token: 'influence', targetId: 'watcher' });
    } else {
      room = await api.turn(room, { token: 'investigate', targetId: 'crate' });
      if (!room.expedition!.battle) room = await api.turn(room, { token: 'assist', targetId: 'ramp' });
      let rounds = 0;
      while (room.expedition!.battle?.status === 'active') {
        room = await api.turn(room, { token: ({ strike: 'investigate', trick: 'fight', guard: 'influence' } as const)[room.expedition!.battle!.stance], targetId: 'encounter' });
        expect(++rounds).toBeLessThanOrEqual(4);
      }
      expect(rounds).toBeGreaterThanOrEqual(2);
    }
    expect(room.phase).toBe('travel'); expect(room.outcomes).toHaveLength(2);
    const finale = variant === 'smugglers' ? 'beacon' : 'lantern-square';
    room = await api.vote(room, `${route}-${finale}`);
    expect(room.expedition!.questItems).toContain('recovered-prism'); expect(room.expedition!.ending).toBeUndefined();
    for (let rounds = 0; room.status !== 'completed'; rounds++) {
      expect(rounds).toBeLessThan(4);
      const dust = room.expedition!.stashes.journey_host.find(item => item.kind === 'dust');
      room = await api.turn(room, { token: 'assist', targetId: finale === 'beacon' ? 'cradle' : 'lanterns', ...(dust ? { expedition: { consumableId: dust.id } } : {}) });
    }
    expect(room.outcomes).toHaveLength(3); expect(room.players.journey_host.keepsakes).toHaveLength(3);
    expect(journeyMap(room).edges.filter(edge => edge.state === 'taken').map(edge => edge.id)).toEqual([`town-${route}`, `${route}-${finale}`]);
    expect(journeyPouch(room).find(item => item.id === 'recovered-prism')!.status).toBe(finale === 'beacon' ? 'spent' : 'held');
    expect(api.external).not.toHaveBeenCalled();
    const history = await api.call('history');
    const recap = history.recaps.find((recap: { code: string }) => recap.code === room.code);
    expect(recap.adventureVersion).toBe(2); expect(recap.outcomes).toHaveLength(3);
  });
  it('authenticates travel votes, persists an uncertain commitment, and admits a late visitor at the chosen destination', async () => {
    const api = await service(); let room = await api.town();
    const joined = await api.call('join', { roomCode: room.code, inviteKey: room.inviteKey, character: createCharacterProfile('Late guest', 'cleric') }, 'journey_guest');
    expect(joined.room.pendingJoins).toContain('journey_guest');
    const pending = await api.request('command', api.envelope(room, 'vote-travel', { travel: { decisionId: room.expedition!.travel!.id, edgeId: 'town-road' }, userId: 'journey_host' }), 'journey_guest');
    expect(pending.status).toBe(409);
    const intrusion = await api.request('command', api.envelope(room, 'vote-travel', { travel: { decisionId: room.expedition!.travel!.id, edgeId: 'town-road' } }), 'journey_intruder');
    expect(intrusion.status).toBe(403);
    for (const extra of [ { travel: { decisionId: 'old-decision', edgeId: 'town-road' } }, { travel: { decisionId: room.expedition!.travel!.id, edgeId: 'town-mountain' } } ]) {
      const rejected = await api.request('command', api.envelope(room, 'vote-travel', extra)); expect(rejected.status).toBe(409);
    }
    const blockedAction = await api.request('command', api.envelope(room, 'act', { action: { token: 'assist', targetId: 'iris' } }));
    const blockedProposal = await api.request('propose', { roomCode: room.code, targetId: 'iris', idea: 'Help Iris prepare the route.' });
    expect(blockedAction.status).toBe(409); expect(blockedProposal.status).toBe(409);
    const payload = api.envelope(room, 'vote-travel', { userId: 'forged-user', travel: { decisionId: room.expedition!.travel!.id, edgeId: 'town-canal' } });
    room = (await api.call('command', payload)).room;
    expect(room.phase).toBe('choosing'); expect(room.players.journey_guest.seatId).toBeTruthy();
    expect(room.players['forged-user']).toBeUndefined();
    const duplicate = await api.call('command', JSON.parse(JSON.stringify(payload)));
    expect(duplicate.room.revision).toBe(room.revision); expect(duplicate.room.events).toEqual(room.events);
    const guestRead = await api.call('read', { roomCode: room.code }, 'journey_guest');
    expect(journeyPouch(guestRead.room)).toEqual(journeyPouch(room));
    expect(guestRead.room.expedition).toEqual(room.expedition);
  });
});
