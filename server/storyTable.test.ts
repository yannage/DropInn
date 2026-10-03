import { describe, expect, it, vi } from 'vitest';
import { createCharacterProfile } from '../src/lib/character';
import { createJourney } from '../src/lib/dropinn/journey';
import { getStoryTableState } from '../src/lib/dropinn/storyTable';
import type { AdventureRoom, PlayerAction } from '../src/lib/dropinn/types';
import { createDropinnHandler } from './dropinn';

async function service(variant: 'smugglers' | 'ward') {
  let now = 1000; let sequence = 0;
  const external = vi.fn(async () => { throw new Error('An authored story table requires no model.'); });
  const handler = createDropinnHandler({ local: true, env: {}, now: () => ++now, fetch: external });
  async function call(operation: string, fields: Record<string, unknown> = {}, expected = 200) {
    const response = await handler(new Request('http://localhost/api/dropinn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, sessionId: 'story_host', ...fields }) }));
    const data = await response.json(); expect(response.status, data.error ?? operation).toBe(expected); return data;
  }
  const seed = Array.from({ length: 20 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` as ReturnType<typeof crypto.randomUUID>).find(seed => createJourney(seed).variant === variant)!;
  const random = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(seed);
  let room: AdventureRoom;
  try { room = (await call('play', { character: createCharacterProfile('Story host', 'fighter'), adventureId: 'gemward', visibility: 'private' })).room; }
  finally { random.mockRestore(); }
  expect(room!.adventureVersion).toBe(3); expect(room!.expedition!.variant).toBe(variant);
  const receipts: Record<string, unknown>[] = [];
  const envelope = (room: AdventureRoom, type: string, extra: Record<string, unknown> = {}) => ({ roomCode: room.code, command: { id: `story-service-${++sequence}`, userId: 'forged-user', type, expectedTurn: room.turn, expectedRevision: room.revision, ...extra } });
  async function command(room: AdventureRoom, type: string, extra: Record<string, unknown> = {}) {
    const payload = envelope(room, type, extra); receipts.push(payload);
    const accepted: AdventureRoom = (await call('command', payload)).room;
    // The original request is retried unchanged, including its now-stale revision, as after a lost acknowledgement.
    const duplicate: AdventureRoom = (await call('command', JSON.parse(JSON.stringify(payload)))).room;
    const reloaded: AdventureRoom = (await call('read', { roomCode: room.code })).room;
    expect(duplicate.revision).toBe(accepted.revision); expect(duplicate.events).toEqual(accepted.events);
    expect(reloaded.expedition).toEqual(accepted.expedition); expect(reloaded.players).toEqual(accepted.players);
    expect(reloaded.players['forged-user']).toBeUndefined();
    return reloaded;
  }
  const turn = async (room: AdventureRoom, action: PlayerAction) => {
    const accepted = await command(room, 'act', { action });
    return accepted.status === 'completed' ? accepted : command(accepted, 'skip-reveal');
  };
  const vote = (room: AdventureRoom, edgeId: string) => command(room, 'vote-travel', { travel: { decisionId: room.expedition!.travel!.id, edgeId } });
  return { room: room!, call, command, turn, vote, envelope, receipts, external };
}

describe('Gemward v3 persisted story plans through the command service', () => {
  it.each((['smugglers', 'ward'] as const).flatMap(variant => (['beacon', 'lantern-square'] as const).map(node => ({ variant, node }))))('preserves exact Gather/Finish retries and the $variant cost at $node', async ({ variant, node }) => {
    const api = await service(variant); let room = api.room;
    const forgedPlan = api.envelope(room, 'act', { action: getStoryTableState(room).plan.action });
    const rejected = await api.call('command', forgedPlan, 409); expect(rejected.error).toContain('displayed intention');
    room = await api.turn(room, { token: 'assist', targetId: 'bram', expedition: { locationId: 'docks' } });
    expect(room.expedition!.storyTable!.facts.find(fact => fact.id === 'canal-key')!.sourceEventIds).toHaveLength(1);
    room = await api.turn(room, getStoryTableState(room).plan.action);
    const gatherPayload = api.receipts.find(payload => (payload.command as { action?: PlayerAction }).action?.expedition?.interactionId === 'story-plan:gather')!;
    expect(room.phase).toBe('travel'); expect(room.outcomes).toHaveLength(1);
    const beforeTravel = room.players.story_host.actions;
    room = await api.vote(room, 'town-canal'); expect(room.players.story_host.actions).toBe(beforeTravel);
    room = await api.turn(room, { token: 'assist', targetId: 'ramp' });
    const landing = room.events.filter(event => event.kind === 'action').at(-1)!;
    expect(landing.result!.expedition!.storyTable!.after).toContain('Secured canal landing'); expect(landing.text).not.toContain('No new preparation');
    room = await api.turn(room, { token: 'influence', targetId: 'watcher' });
    const recovery = room.events.filter(event => event.kind === 'action').at(-1)!;
    expect(recovery.result!.expedition!.storyTable!.after).toContain('Quiet'); expect(recovery.result!.changed).toBe(true);
    expect(room.phase).toBe('travel'); expect(room.expedition!.battle).toBeUndefined();
    room = await api.vote(room, `canal-${node}`);
    expect(room.expedition!.ending).toBeUndefined(); expect(room.expedition!.questItems).toContain('recovered-prism');
    room = await api.turn(room, { token: 'assist', targetId: node === 'beacon' ? 'cradle' : 'lanterns' });
    room = await api.turn(room, { token: 'assist', targetId: node === 'beacon' ? 'town' : 'neighbours' });
    const finish = getStoryTableState(room).plan;
    expect(finish.available).toBe(true); expect(finish.description).toContain(node === 'beacon' ? variant === 'smugglers' ? 'maker-mark' : 'bound' : 'dark evenings');
    room = await api.turn(room, finish.action);
    expect(room.status).toBe('completed'); expect(room.outcomes).toHaveLength(3); expect(room.players.story_host.keepsakes).toHaveLength(3);
    expect(room.expedition!.storyTable!.facts.filter(fact => fact.id === 'light-ready')).toHaveLength(1);
    const finishPayload = api.receipts.find(payload => (payload.command as { action?: PlayerAction }).action?.expedition?.interactionId === 'story-plan:finish')!;
    for (const original of [gatherPayload, finishPayload]) {
      const duplicate = (await api.call('command', original)).room;
      expect(duplicate.expedition).toEqual(room.expedition); expect(duplicate.players).toEqual(room.players); expect(duplicate.events).toEqual(room.events);
    }
    expect(room.events.filter(event => event.journey?.questChanges?.some(change => change.itemId === 'recovered-prism' && change.kind === 'spent'))).toHaveLength(node === 'beacon' ? 1 : 0);
    expect(api.external).not.toHaveBeenCalled();
  });
});
