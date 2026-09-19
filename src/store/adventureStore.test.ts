import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacterProfile } from '../lib/character';
import type { AdventureRoom } from '../lib/dropinn/types';

const mocks = vi.hoisted(() => ({ request: vi.fn(), unsubscribe: vi.fn() }));
vi.mock('../lib/dropinn/api', () => ({
  localPlay: true,
  adventureRequest: mocks.request,
  subscribeAdventure: () => mocks.unsubscribe,
}));

let storage: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  mocks.request.mockReset();
  storage = new Map();
  vi.stubGlobal('window', { location: { search: '?session=storetest' } });
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
  });
});
afterEach(() => vi.unstubAllGlobals());

async function setup() {
  const { useAdventureStore: store } = await import('./adventureStore');
  const { createAdventure } = await import('../lib/dropinn/engine');
  const hero = createCharacterProfile('Test hero', 'rogue');
  store.setState({ character: hero });
  const room = createAdventure(hero, store.getState().userId, 1000, 'TEST01');
  mocks.request.mockImplementation(async (payload) => {
    if (payload.operation === 'list') return { backend: 'local', rooms: [] };
    if (payload.operation === 'history') return { backend: 'local', recaps: [] };
    return { backend: 'local', room: structuredClone(room), messages: [] };
  });
  await store.getState().initialize();
  await store.getState().playNow();
  return { store, room, hero };
}

describe('adventure client recovery', () => {
  it('persists read endings without hiding outcomes that arrive later', async () => {
    const { store, room } = await setup();
    const { getVisitRecap } = await import('../lib/dropinn/engine');
    room.outcomes.push({ chapter: 0, result: 'success', text: 'The herd reaches shelter.', at: 2000 });
    const recap = getVisitRecap(room, store.getState().userId);
    const key = `${recap.code}:${recap.characterId}`;
    expect(store.getState().seenOutcomes[key]).toBeUndefined();
    store.getState().markRecapSeen(recap);
    expect(store.getState().seenOutcomes[key]).toBe(1);
    vi.resetModules();
    const { useAdventureStore: restored } = await import('./adventureStore');
    expect(restored.getState().seenOutcomes[key]).toBe(1);
    room.outcomes.push({ chapter: 1, result: 'mixed', text: 'The party crosses.', at: 3000 });
    expect(room.outcomes.length - restored.getState().seenOutcomes[key]).toBe(1);
    restored.getState().markRecapSeen({ ...recap, outcomes: room.outcomes });
    restored.getState().markRecapSeen(recap);
    expect(restored.getState().seenOutcomes[key]).toBe(2);
  });

  it('applies a cumulative participation reward once across repeated snapshots and reloads', async () => {
    const { store, room, hero } = await setup();
    room.revision++;
    room.players[store.getState().userId].xp = 12;
    room.players[store.getState().userId].keepsakes = ['Copper bell'];
    await store.getState().syncRoom();
    await store.getState().syncRoom();
    expect(store.getState().character?.xp).toBe(hero.xp + 12);
    expect(store.getState().character?.inventory.filter(item => item === 'Copper bell')).toHaveLength(1);
    vi.resetModules();
    const { useAdventureStore: restored } = await import('./adventureStore');
    await restored.getState().initialize();
    expect(restored.getState().character?.xp).toBe(hero.xp + 12);
  });

  it('reuses an uncertain action command ID when the player retries', async () => {
    const { store, room } = await setup();
    const ids: string[] = [];
    mocks.request.mockImplementation(async payload => {
      if (payload.operation === 'command') {
        ids.push(payload.command.id);
        if (ids.length === 1) throw new Error('Connection took too long');
      }
      return { backend: 'local', room };
    });
    const action = { token: 'assist' as const, targetId: 'mara' };
    await store.getState().commitAction(action);
    expect(store.getState().error).toContain('Connection');
    await store.getState().commitAction(action);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
  });

  it('does not reopen a room when an older read completes after leaving', async () => {
    const { store, room } = await setup();
    let resolveRead!: (response: { backend: string; room: AdventureRoom }) => void;
    mocks.request.mockImplementation(async payload => {
      if (payload.operation === 'read') return new Promise(resolve => { resolveRead = resolve; });
      if (payload.operation === 'list') return { backend: 'local', rooms: [] };
      if (payload.operation === 'history') return { backend: 'local', recaps: [] };
      return { backend: 'local', room };
    });
    const reading = store.getState().syncRoom();
    await store.getState().leaveRoom();
    resolveRead({ backend: 'local', room });
    await reading;
    expect(store.getState().room).toBeNull();
    expect(store.getState().recap?.code).toBe(room.code);
  });

  it('collects later chapter rewards through history after departure, once', async () => {
    const { store, room, hero } = await setup();
    await store.getState().leaveRoom();
    mocks.request.mockImplementation(async payload => payload.operation === 'history' ? { backend: 'local', recaps: [{
      code: room.code, characterId: hero.id, title: room.title, xp: 20, actions: 1, keepsakes: ['Mara’s bell'], highlights: [], outcomes: [],
    }] } : { backend: 'local', rooms: [] });
    await store.getState().refreshRooms();
    await store.getState().refreshRooms();
    expect(store.getState().character?.xp).toBe(hero.xp + 20);
    expect(store.getState().character?.inventory).toContain('Mara’s bell');
  });

  it('discards a creative interpretation when its idea is cleared while pending', async () => {
    const { store, room } = await setup();
    let finish!: (value: unknown) => void;
    mocks.request.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pending = store.getState().propose('Lift the gate', 'gate');
    store.getState().clearProposal();
    finish({ backend: 'local', proposal: { id: 'old-idea', turn: room.turn, supported: true, idea: 'Lift the gate' } });
    await pending;
    expect(store.getState().proposal).toBeNull();
    expect(store.getState().proposing).toBe(false);
  });

  it('keeps a sent chat message when an older equal-revision read arrives', async () => {
    const { store, room } = await setup();
    let finish!: (value: unknown) => void;
    mocks.request.mockImplementation(async payload => {
      if (payload.operation === 'read') return new Promise(resolve => { finish = resolve; });
      return { backend: 'local', messages: [{ id: 'fresh', userId: store.getState().userId, name: 'Mira', text: 'I will help Mara.', at: 2000 }] };
    });
    const reading = store.getState().syncRoom();
    await store.getState().sendChat('I will help Mara.');
    finish({ backend: 'local', room, messages: [] });
    await reading;
    expect(store.getState().messages).toHaveLength(1);
  });

  it('does not report successful delivery when reporting or chat fails', async () => {
    const { store } = await setup();
    mocks.request.mockRejectedValue(new Error('Offline'));
    expect(await store.getState().report('other-player', 'Spam')).toBe(false);
    expect(await store.getState().sendChat('hello')).toBe(false);
  });
});
