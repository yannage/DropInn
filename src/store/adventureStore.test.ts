import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacterProfile } from '../lib/character';
import type { AdventureRoom } from '../lib/dropinn/types';

const mocks = vi.hoisted(() => ({ request: vi.fn(), unsubscribe: vi.fn() }));
vi.mock('../lib/dropinn/api', () => ({
  AdventureRequestError: class extends Error { constructor(message: string, public status: number) { super(message); } },
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
  it('saves every appearance selection and an unequipped hat across reload', async () => {
    const { store } = await setup();
    const original = store.getState().character!;
    await store.getState().leaveRoom();
    const customization = { appearance: { body: 'round', eyes: 'wide', nose: 'none', mouth: 'toothy' }, equipment: { hat: null } };
    await store.getState().setHero('Little Pip', original.classKey, '#F9A8D4', customization);
    expect(store.getState().character).toMatchObject({ ...customization, xp: original.xp, inventory: original.inventory, traits: original.traits });
    vi.resetModules();
    const { useAdventureStore: restored } = await import('./adventureStore');
    expect(restored.getState().character).toMatchObject({ ...customization, name: 'Little Pip' });
  });

  it('blocks customization during a visit and while restoring a saved table', async () => {
    const { store } = await setup();
    const before = store.getState().character;
    await store.getState().setHero('Changed', 'wizard');
    expect(store.getState().error).toBe('Change your hero between visits.');
    expect(store.getState().character).toEqual(before);
    store.setState({ room: null, restoringCode: 'TEST01' });
    await store.getState().setHero('Changed', 'wizard');
    expect(store.getState().character).toEqual(before);
  });

  it('unlocks chapter hats once through repeated receipts without auto-equipping', async () => {
    const { store, room } = await setup();
    const before = store.getState().character!;
    const { HERO_HATS, ownsHat, normalizeHero } = await import('../lib/cosmetics');
    store.setState({ character: normalizeHero(before) });
    room.revision++;
    room.players[store.getState().userId].keepsakes = ['Mara’s copper bell'];
    await store.getState().syncRoom();
    await store.getState().syncRoom();
    const character = store.getState().character!;
    expect(character.inventory).toEqual(['Mara’s copper bell']);
    expect(ownsHat(HERO_HATS.find(hat => hat.id === 'shepherd')!, character.inventory)).toBe(true);
    expect(character.equipment?.hat).toBe(before.classKey);
  });

  it('keeps the saved table during a failed reload and restores it on retry', async () => {
    const { room } = await setup();
    vi.resetModules();
    mocks.request.mockRejectedValue(new TypeError('Failed to fetch'));
    const { useAdventureStore: restored } = await import('./adventureStore');
    await restored.getState().initialize();
    expect(restored.getState().restoringCode).toBe(room.code);
    expect(restored.getState().syncError).toContain('Reconnecting');
    expect(JSON.parse(storage.get('dropinn-v2-player-storetest')!).activeCode).toBe(room.code);
    mocks.request.mockResolvedValue({ backend: 'local', room });
    await restored.getState().syncRoom();
    expect(restored.getState().room?.code).toBe(room.code);
    expect(restored.getState().restoringCode).toBeNull();
    expect(restored.getState().syncError).toBeNull();
  });

  it('clears background connection errors without erasing an action error', async () => {
    const { store, room } = await setup();
    store.setState({ error: 'Choose a supported target.' });
    mocks.request.mockRejectedValue(new TypeError('Failed to fetch'));
    await store.getState().syncRoom();
    expect(store.getState().room?.code).toBe(room.code);
    expect(store.getState().syncError).not.toBeNull();
    mocks.request.mockResolvedValue({ backend: 'local', room });
    await store.getState().syncRoom();
    expect(store.getState().syncError).toBeNull();
    expect(store.getState().error).toBe('Choose a supported target.');
  });

  it('stops restoring a table the server confirms is gone', async () => {
    await setup();
    vi.resetModules();
    const { AdventureRequestError } = await import('../lib/dropinn/api');
    mocks.request.mockImplementation(async payload => {
      if (payload.operation === 'read') throw new AdventureRequestError('That adventure could not be found.', 404);
      return { backend: 'local', rooms: [], recaps: [] };
    });
    const { useAdventureStore: restored } = await import('./adventureStore');
    await restored.getState().initialize();
    expect(restored.getState().restoringCode).toBeNull();
    expect(restored.getState().syncError).toBeNull();
    expect(restored.getState().error).toContain('could not be found');
    expect(JSON.parse(storage.get('dropinn-v2-player-storetest')!).activeCode).toBeNull();
  });

  it('ignores a failed background read from a table already left', async () => {
    const { store, room } = await setup();
    let rejectRead!: (error: Error) => void;
    mocks.request.mockImplementation(async payload => {
      if (payload.operation === 'read') return new Promise((_resolve, reject) => { rejectRead = reject; });
      return { backend: 'local', room, rooms: [], recaps: [] };
    });
    const reading = store.getState().syncRoom();
    await store.getState().leaveRoom();
    rejectRead(new Error('Network lost'));
    await reading;
    expect(store.getState().syncError).toBeNull();
    expect(store.getState().error).toBeNull();
  });

  it('saves cosmetic color across reload without changing earned rewards', async () => {
    const { store, hero } = await setup();
    await store.getState().leaveRoom();
    await store.getState().setHero('Sky Wren', 'wizard', '#7DD3FC');
    expect(store.getState().character?.accent).toBe('#7DD3FC');
    expect(store.getState().character?.xp).toBe(hero.xp);
    expect(store.getState().character?.inventory).toEqual(hero.inventory);
    vi.resetModules();
    const { useAdventureStore: restored } = await import('./adventureStore');
    expect(restored.getState().character?.accent).toBe('#7DD3FC');
    expect(restored.getState().character?.name).toBe('Sky Wren');
  });

  it('does not block a real move while a reaction request is pending', async () => {
    const { store, room } = await setup();
    let finishReaction!: (value: unknown) => void;
    mocks.request.mockImplementation(async payload => {
      if (payload.command?.type === 'react') return new Promise(resolve => { finishReaction = resolve; });
      return { backend: 'local', room };
    });
    const reacting = store.getState().sendReaction('cheer');
    expect(store.getState().reacting).toBe(true);
    expect(store.getState().loading).toBe(false);
    await store.getState().commitAction({ token: 'assist', targetId: 'mara' });
    expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ command: expect.objectContaining({ type: 'act' }) }));
    finishReaction({ backend: 'local', room });
    await reacting;
    expect(store.getState().reacting).toBe(false);
  });

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

  it('restores the exact timed action and command ID after a network failure and reload', async () => {
    const { store, room } = await setup();
    const commands: Array<{ id: string; action: unknown }> = [];
    mocks.request.mockImplementation(async payload => {
      if (payload.operation === 'command') {
        commands.push(structuredClone(payload.command));
        if (commands.length === 1) throw new TypeError('Network disconnected');
      }
      return { backend: 'local', room, rooms: [], recaps: [] };
    });
    const action = { token: 'assist' as const, targetKind: 'hero' as const, targetId: 'friend', releaseMs: 812 };
    await store.getState().commitAction(action);
    expect(store.getState().pendingMove).toEqual({ turn: room.turn, action });
    vi.resetModules();
    const { useAdventureStore: restored } = await import('./adventureStore');
    expect(restored.getState().pendingMove).toEqual({ turn: room.turn, action });
    await restored.getState().initialize();
    await restored.getState().commitAction(restored.getState().pendingMove!.action);
    expect(commands).toHaveLength(2);
    expect(commands[1]).toEqual(commands[0]);
    expect(restored.getState().pendingMove).toBeNull();
    expect(JSON.parse(storage.get('dropinn-v2-player-storetest')!).pendingAction).toBeNull();
  });

  it('freezes an uncertain move until a confirmed rejection permits a different action', async () => {
    const { store, room } = await setup();
    mocks.request.mockRejectedValue(new TypeError('Network lost'));
    const original = { token: 'assist' as const, targetId: 'mara', releaseMs: 750 };
    await store.getState().commitAction(original);
    const callCount = mocks.request.mock.calls.length;
    await store.getState().commitAction({ ...original, releaseMs: 800 });
    expect(store.getState().error).toContain('previous move is still being checked');
    expect(mocks.request.mock.calls).toHaveLength(callCount);
    expect(store.getState().pendingMove?.action).toEqual(original);
    const { AdventureRequestError } = await import('../lib/dropinn/api');
    mocks.request.mockRejectedValue(new AdventureRequestError('That target changed.', 409));
    await store.getState().commitAction(original);
    expect(store.getState().pendingMove).toBeNull();
    mocks.request.mockResolvedValue({ backend: 'local', room });
    await store.getState().commitAction({ ...original, targetId: 'gate' });
    expect(store.getState().error).toBeNull();
  });

  it.each(['commit', 'receipt', 'next-turn'] as const)('clears uncertainty when a synchronized %s proves the move is settled', async proof => {
    const { store, room } = await setup();
    mocks.request.mockRejectedValue(new Error('No response'));
    const action = { token: 'assist' as const, targetId: 'mara', releaseMs: 800 };
    await store.getState().commitAction(action);
    const pending = JSON.parse(storage.get('dropinn-v2-player-storetest')!).pendingAction;
    room.revision++;
    if (proof === 'commit') room.commits[store.getState().userId] = action;
    if (proof === 'receipt') room.appliedCommands.push(pending.commandId);
    if (proof === 'next-turn') room.turn++;
    mocks.request.mockResolvedValue({ backend: 'local', room });
    await store.getState().syncRoom();
    expect(store.getState().pendingMove).toBeNull();
    expect(JSON.parse(storage.get('dropinn-v2-player-storetest')!).pendingAction).toBeNull();
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
