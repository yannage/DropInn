import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacterProfile } from '../lib/character';
import type { AdventureCommand } from '../lib/dropinn/types';

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../lib/dropinn/api', () => ({
  AdventureRequestError: class extends Error { constructor(message: string, public status: number) { super(message); } },
  localPlay: true,
  adventureRequest: mocks.request,
  subscribeAdventure: () => () => {},
}));
let storage: Map<string, string>;
beforeEach(() => {
  vi.resetModules(); mocks.request.mockReset(); storage = new Map();
  vi.stubGlobal('window', { location: { search: '?session=travelstore' } });
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
});
afterEach(() => vi.unstubAllGlobals());

async function setup() {
  const { useAdventureStore: store } = await import('./adventureStore');
  const { createAdventure } = await import('../lib/dropinn/engine');
  const room = createAdventure(createCharacterProfile('Traveller', 'rogue'), store.getState().userId, 1000, 'TRAVEL', 'gemward');
  // Transport recovery fixture; authoritative travel eligibility has separate reducer/service coverage.
  room.phase = 'travel'; room.turn = 5; room.revision = 12;
  room.expedition!.currentNodeId = 'town';
  room.expedition!.travel = { id: 'town-fork', fromNodeId: 'town', fallbackEdgeId: 'town-road', eligibleActorIds: [store.getState().userId], votes: {}, options: [
    { edgeId: 'town-road', toNodeId: 'road', unlockEventIds: [], costIds: [] },
    { edgeId: 'town-warehouse', toNodeId: 'warehouse', unlockEventIds: [], costIds: [] },
  ] };
  const respond = () => ({ backend: 'local', room: structuredClone(room), rooms: [], recaps: [] });
  mocks.request.mockImplementation(async () => respond());
  await store.getState().initialize(); await store.getState().playNow('gemward');
  return { store, room, respond };
}

describe('durable travel-vote transport', () => {
  it('restores and retries the exact vote envelope after response loss and a later revision', async () => {
    const { store, room, respond } = await setup();
    const commands: AdventureCommand[] = [];
    mocks.request.mockImplementation(async payload => {
      if (payload.command?.type === 'vote-travel') {
        commands.push(structuredClone(payload.command));
        if (commands.length === 1) throw new TypeError('Connection lost');
      }
      return respond();
    });
    await store.getState().voteTravel('town-warehouse');
    expect(store.getState().pendingTravel).toEqual({ turn: 5, decisionId: 'town-fork', edgeId: 'town-warehouse' });
    expect(store.getState().pendingMove).toBeNull();
    vi.resetModules();
    const { useAdventureStore: restored } = await import('./adventureStore');
    expect(restored.getState().pendingTravel?.edgeId).toBe('town-warehouse');
    room.revision++;
    await restored.getState().initialize();
    await restored.getState().voteTravel(restored.getState().pendingTravel!.edgeId);
    expect(commands).toHaveLength(2); expect(commands[1]).toEqual(commands[0]);
    expect(restored.getState().pendingTravel).toBeNull();
    expect(JSON.parse(storage.get('dropinn-v2-player-travelstore')!).pendingTravel).toBeNull();
  });

  it('freezes an uncertain destination and blocks ordinary action and Spotlight submission', async () => {
    const { store } = await setup();
    mocks.request.mockRejectedValue(new TypeError('Connection lost'));
    await store.getState().voteTravel('town-road');
    const calls = mocks.request.mock.calls.length;
    await store.getState().voteTravel('town-warehouse');
    expect(store.getState().error).toContain('still being checked');
    await store.getState().commitAction({ token: 'assist', targetId: 'iris' });
    await store.getState().propose('Follow the light', 'iris');
    expect(mocks.request).toHaveBeenCalledTimes(calls);
    expect(store.getState().pendingTravel?.edgeId).toBe('town-road');
  });

  it.each([400, 401, 403, 404, 409, 422])('clears a definitively rejected %s vote so the next choice may be prepared', async status => {
    const { store } = await setup();
    const { AdventureRequestError } = await import('../lib/dropinn/api');
    mocks.request.mockRejectedValue(new AdventureRequestError('The route is unavailable.', status));
    await store.getState().voteTravel('town-warehouse');
    expect(store.getState().pendingTravel).toBeNull();
    expect(store.getState().error).toContain('unavailable');
  });

  it.each(['vote', 'receipt', 'destination', 'decision'] as const)('settles uncertainty when synchronized %s proves it is no longer pending', async proof => {
    const { store, room, respond } = await setup();
    mocks.request.mockRejectedValue(new TypeError('Response lost'));
    await store.getState().voteTravel('town-road');
    const saved = JSON.parse(storage.get('dropinn-v2-player-travelstore')!);
    if (proof === 'vote') room.expedition!.travel!.votes[store.getState().userId] = { edgeId: 'town-road', actorName: 'Traveller' };
    if (proof === 'receipt') room.appliedCommands.push(saved.pendingTravel.commandId);
    if (proof === 'destination') { room.phase = 'choosing'; room.turn++; delete room.expedition!.travel; }
    if (proof === 'decision') room.expedition!.travel!.id = 'another-fork';
    room.revision++;
    mocks.request.mockImplementation(async () => respond());
    await store.getState().syncRoom();
    expect(store.getState().pendingTravel).toBeNull();
  });

  it('does not clear an uncertain vote on a transient read failure', async () => {
    const { store } = await setup();
    mocks.request.mockRejectedValue(new TypeError('Connection lost'));
    await store.getState().voteTravel('town-road'); await store.getState().syncRoom();
    expect(store.getState().pendingTravel?.edgeId).toBe('town-road');
    expect(store.getState().syncError).toContain('Reconnecting');
  });
});
