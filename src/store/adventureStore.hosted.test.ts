import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createCharacterProfile } from '../lib/character';

const mocks = vi.hoisted(() => ({ request: vi.fn(), auth: vi.fn(), list: vi.fn(), create: vi.fn() }));
vi.mock('../lib/dropinn/api', () => ({ localPlay: false, adventureRequest: mocks.request, subscribeAdventure: () => () => {} }));
vi.mock('../lib/supabase/client', () => ({ ensureAnonymousUser: mocks.auth }));
vi.mock('../lib/supabase/characters', () => ({ listSupabaseCharacters: mocks.list, upsertSupabaseCharacter: mocks.create, updateSupabaseHeroIdentity: vi.fn() }));

beforeEach(() => {
  vi.resetModules();
  Object.values(mocks).forEach(mock => mock.mockReset());
  const storage = new Map<string, string>();
  vi.stubGlobal('window', { location: { search: '' } });
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
  mocks.request.mockResolvedValue({ backend: 'supabase', rooms: [], recaps: [] });
});
afterEach(() => vi.unstubAllGlobals());

it('recovers from failed startup before submitting Play Now', async () => {
  const hero = createCharacterProfile('Owned hero', 'rogue');
  mocks.auth.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValue({ id: 'current-account' });
  mocks.list.mockResolvedValue([hero]);
  const { useAdventureStore: store } = await import('./adventureStore');
  await store.getState().initialize();
  expect(store.getState().error).toBe('Network unavailable');
  const { createAdventure } = await import('../lib/dropinn/engine');
  mocks.request.mockResolvedValue({ backend: 'supabase', room: createAdventure(hero, 'current-account', 1000, 'RETRY1') });
  await store.getState().playNow();
  expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ operation: 'play', sessionId: 'current-account', characterId: hero.id }));
  expect(store.getState().error).toBeNull();
  expect(store.getState().room?.code).toBe('RETRY1');
});

it('replaces a stale account hero with an owned hero when authentication changes', async () => {
  const previous = createCharacterProfile('Previous', 'wizard');
  const current = createCharacterProfile('Current', 'fighter');
  mocks.auth.mockResolvedValueOnce({ id: 'previous' }).mockResolvedValue({ id: 'current' });
  mocks.list.mockResolvedValueOnce([previous]).mockResolvedValueOnce([previous]).mockResolvedValue([current]);
  const { useAdventureStore: store } = await import('./adventureStore');
  await store.getState().initialize();
  await store.getState().playNow();
  expect(mocks.request).toHaveBeenLastCalledWith(expect.objectContaining({ operation: 'play', sessionId: 'current', characterId: current.id }));
  expect(mocks.create).not.toHaveBeenCalled();
});

it('does not submit a cached hero if ownership refresh fails', async () => {
  mocks.auth.mockResolvedValue({ id: 'current' });
  mocks.list.mockRejectedValue(new Error('Could not load your heroes'));
  const { useAdventureStore: store } = await import('./adventureStore');
  await store.getState().playNow();
  expect(mocks.request).not.toHaveBeenCalled();
  expect(store.getState().error).toBe('Could not load your heroes');
});
