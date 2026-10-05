import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacterProfile } from '../lib/character';
import type { AdventureCommand } from '../lib/dropinn/types';
import type { QuestRunAction } from '../lib/dropinn/questRunTypes';

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../lib/dropinn/api', () => ({
  AdventureRequestError: class extends Error { constructor(message: string, public status: number) { super(message); } },
  localPlay: true, adventureRequest: mocks.request, subscribeAdventure: () => () => {},
}));
let storage: Map<string, string>;
const key = 'dropinn-v2-player-queststore';
beforeEach(() => {
  vi.resetModules(); mocks.request.mockReset(); storage = new Map();
  vi.stubGlobal('window', { location: { search: '?session=queststore' } });
  vi.stubGlobal('localStorage', { getItem: (name: string) => storage.get(name) ?? null, setItem: (name: string, value: string) => storage.set(name, value) });
});
afterEach(() => vi.unstubAllGlobals());

async function setup(adventureId = 'mosswater') {
  const { useAdventureStore: store } = await import('./adventureStore');
  const { createAdventure } = await import('../lib/dropinn/engine');
  const room = createAdventure(createCharacterProfile('Fern', 'rogue'), store.getState().userId, 1000, 'QUEST', adventureId);
  const respond = () => ({ backend: 'local', room: structuredClone(room), rooms: [], recaps: [] });
  mocks.request.mockImplementation(async () => respond());
  await store.getState().initialize(); await store.getState().playNow(adventureId);
  return { store, room, respond };
}

describe('durable quest command transport', () => {
  it.each([{ kind: 'follow-thread', threadId: 'bitter-water' }, { kind: 'return-episode' }] as QuestRunAction[])('restores the exact Avalon $kind envelope after a lost response', async action => {
    const { store, room, respond } = await setup('avalon');
    const commands: AdventureCommand[] = [];
    mocks.request.mockImplementation(async payload => {
      if (payload.command?.type === 'quest-act') {
        commands.push(structuredClone(payload.command));
        if (commands.length === 1) throw new TypeError('Response lost');
        room.appliedCommands.push(payload.command.id);
      }
      return respond();
    });
    await store.getState().commitQuestAction(action);
    vi.resetModules();
    const { useAdventureStore: restored } = await import('./adventureStore');
    expect(restored.getState().pendingQuest?.action).toEqual(action);
    await restored.getState().initialize();
    await restored.getState().commitQuestAction(restored.getState().pendingQuest!.action);
    expect(commands).toHaveLength(2); expect(commands[1]).toEqual(commands[0]);
    expect(restored.getState().pendingQuest).toBeNull();
  });
  it('restores and retries the complete frozen envelope after response loss and a newer revision', async () => {
    const { store, room, respond } = await setup();
    const commands: AdventureCommand[] = [];
    const action: QuestRunAction = { kind: 'interact', targetId: 'well', optionId: 'look-down' };
    mocks.request.mockImplementation(async payload => {
      if (payload.command?.type === 'quest-act') {
        commands.push(structuredClone(payload.command));
        if (commands.length === 1) throw new TypeError('Response lost');
        room.appliedCommands.push(payload.command.id);
      }
      return respond();
    });
    await store.getState().commitQuestAction(action);
    action.optionId = 'a different local draft';
    expect(store.getState().pendingQuest?.action).toEqual({ kind: 'interact', targetId: 'well', optionId: 'look-down' });
    vi.resetModules();
    const { useAdventureStore: restored } = await import('./adventureStore');
    room.revision += 2;
    await restored.getState().initialize();
    await restored.getState().commitQuestAction(restored.getState().pendingQuest!.action);
    expect(commands).toHaveLength(2); expect(commands[1]).toEqual(commands[0]);
    expect(restored.getState().pendingQuest).toBeNull();
    expect(JSON.parse(storage.get(key)!).pendingQuest).toBeNull();
  });

  it('freezes an uncertain choice and prevents old-mode actions from leaking into the quest', async () => {
    const { store } = await setup();
    mocks.request.mockRejectedValue(new TypeError('Offline'));
    await store.getState().commitQuestAction({ kind: 'pass' });
    const calls = mocks.request.mock.calls.length;
    await store.getState().commitQuestAction({ kind: 'combat', move: 'attack' });
    expect(store.getState().error).toContain('still being checked');
    await store.getState().commitAction({ token: 'assist', targetId: 'well' });
    await store.getState().voteTravel('a-path');
    await store.getState().propose('Help the well', 'well');
    expect(mocks.request).toHaveBeenCalledTimes(calls);
    expect(store.getState().pendingQuest?.action).toEqual({ kind: 'pass' });
  });

  it.each(['upgrade', 'loot'] as const)('keeps an uncertain %s across someone else’s action boundary until a receipt arrives', async kind => {
    const { store, room, respond } = await setup();
    const action: QuestRunAction = kind === 'upgrade' ? { kind, attribute: 'heart' } : { kind, offerId: 'cache-1', choiceId: 'buckler' };
    mocks.request.mockRejectedValue(new TypeError('Offline'));
    await store.getState().commitQuestAction(action);
    room.turn++; room.revision++; room.phase = 'reveal';
    mocks.request.mockImplementation(async () => respond());
    await store.getState().syncRoom();
    expect(store.getState().pendingQuest?.action).toEqual(action);
    room.appliedCommands.push(JSON.parse(storage.get(key)!).pendingQuest.commandId); room.revision++;
    await store.getState().syncRoom();
    expect(store.getState().pendingQuest).toBeNull();
  });

  it('retains a pending scene choice on read failure and clears it when a newer action boundary is confirmed', async () => {
    const { store, room, respond } = await setup();
    mocks.request.mockRejectedValue(new TypeError('Offline'));
    await store.getState().commitQuestAction({ kind: 'pass' }); await store.getState().syncRoom();
    expect(store.getState().pendingQuest).not.toBeNull();
    expect(store.getState().syncError).toContain('Reconnecting');
    room.turn++; room.revision++;
    mocks.request.mockImplementation(async () => respond()); await store.getState().syncRoom();
    expect(store.getState().pendingQuest).toBeNull();
  });

  it.each([400, 401, 403, 404, 409, 422])('releases a definitively rejected %s command for a fresh choice', async status => {
    const { store } = await setup();
    const { AdventureRequestError } = await import('../lib/dropinn/api');
    mocks.request.mockRejectedValue(new AdventureRequestError('That opportunity ended.', status));
    await store.getState().commitQuestAction({ kind: 'pass' });
    expect(store.getState().pendingQuest).toBeNull();
    expect(store.getState().error).toContain('opportunity ended');
  });

  it('ignores a corrupt cached quest action while preserving the saved hero', async () => {
    const { store } = await setup();
    const saved = JSON.parse(storage.get(key)!);
    saved.pendingQuest = { roomCode: saved.activeCode, turn: 1, revision: 1, commandId: 'bad-cache', action: { kind: 'combat', move: 'invent-reward' } };
    storage.set(key, JSON.stringify(saved)); vi.resetModules();
    const { useAdventureStore: restored } = await import('./adventureStore');
    expect(restored.getState().pendingQuest).toBeNull();
    expect(restored.getState().character?.id).toBe(store.getState().character?.id);
  });
});
