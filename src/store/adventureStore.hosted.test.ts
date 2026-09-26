import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createCharacterProfile } from '../lib/character';

const mocks = vi.hoisted(() => ({ request: vi.fn(), auth: vi.fn(), list: vi.fn(), create: vi.fn(), identity: vi.fn(), play:vi.fn() }));
vi.mock('../lib/dropinn/api', () => ({ AdventureRequestError:class extends Error {constructor(message:string,public status:number){super(message);}}, localPlay: false, adventureRequest: mocks.request, subscribeAdventure: () => () => {} }));
vi.mock('../lib/supabase/client', () => ({ ensureAnonymousUser: mocks.auth }));
vi.mock('../lib/supabase/characters', () => ({ listSupabaseCharacters: mocks.list, upsertSupabaseCharacter: mocks.create, updateSupabaseHeroIdentity: mocks.identity }));

beforeEach(() => {
  vi.resetModules();
  Object.values(mocks).forEach(mock => mock.mockReset());
  const storage = new Map<string, string>();
  vi.stubGlobal('window', { location: { search: '' } });
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
  mocks.request.mockImplementation(async(body)=>{
    if(body.operation==='collection') return {backend:'supabase',collection:{earned:0,spent:0,hats:[],styles:[],discoveries:[]}};
    if(body.operation==='account') {
      const user=await mocks.auth.mock.results.at(-1)?.value;
      const heroes=await mocks.list();
      return {backend:'supabase',account:{id:user.id,guest:false,identities:['email'],heroes:heroes.map((character:unknown)=>({playerId:user.id,character})),selectedCharacterId:heroes[0]?.id,capabilities:{heroSlots:1,payments:false},providers:{email:true,google:true}}};
    }
    return await mocks.play(body) ?? {backend:'supabase',rooms:[],recaps:[]};
  });
});
afterEach(() => vi.unstubAllGlobals());

it('retries an uncertain craft with its saved command ID after reload and ignores stale collection balances',async()=>{
  const hero=createCharacterProfile('Moss','wizard');
  mocks.auth.mockResolvedValue({id:'current'});mocks.list.mockResolvedValue([hero]);
  const original=mocks.request.getMockImplementation()!;
  const commands:string[]=[];
  let lost=true;
  mocks.request.mockImplementation(async body=>{
    if(body.operation==='collection') return {backend:'supabase',collection:{earned:3,spent:0,hats:['shepherd'],styles:[],discoveries:[]}};
    if(body.operation==='craft') {
      commands.push(body.commandId);
      if(lost){lost=false;throw new TypeError('Response lost');}
      return {backend:'supabase',collection:{earned:3,spent:3,hats:['shepherd'],styles:['shepherd-blue'],discoveries:[]}};
    }
    return original(body);
  });
  const {useAdventureStore:store}=await import('./adventureStore');
  await store.getState().initialize();
  await store.getState().craftStyle('shepherd-blue');
  expect(store.getState().pendingCraft?.commandId).toBe(commands[0]);
  vi.resetModules();
  const {useAdventureStore:restored}=await import('./adventureStore');
  await restored.getState().initialize();
  await restored.getState().craftStyle('shepherd-blue');
  expect(commands).toEqual([commands[0],commands[0]]);
  expect(restored.getState().pendingCraft).toBeNull();
  await restored.getState().refreshCollection();
  expect(restored.getState().collection).toMatchObject({earned:3,spent:3,styles:['shepherd-blue']});
});

it('shows plain-object backend errors instead of hiding them behind a generic retry message', async () => {
  mocks.auth.mockResolvedValue({ id: 'current' });
  mocks.list.mockRejectedValue({ message: 'The character database update is missing.', code: 'PGRST204' });
  const { useAdventureStore: store } = await import('./adventureStore');
  await store.getState().initialize();
  expect(store.getState().error).toBe('The character database update is missing.');
  await store.getState().playNow();
  expect(store.getState().error).toBe('The character database update is missing.');
  expect(mocks.play).not.toHaveBeenCalled();
});

it('preserves rewards arriving during an identity save and cosmetics during a reward refresh', async () => {
  const hero = createCharacterProfile('Owned hero', 'rogue');
  mocks.auth.mockResolvedValue({ id: 'current' });
  mocks.list.mockResolvedValue([hero]);
  const { useAdventureStore: store } = await import('./adventureStore');
  await store.getState().initialize();
  let finish!: (value: unknown) => void;
  mocks.identity.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const customization = { appearance: { body: 'squish', eyes: 'sleepy', nose: 'triangle', mouth: 'flat' }, equipment: { hat: 'fighter' } };
  const writing = store.getState().setHero('Pip', 'rogue', '#7DD3FC', customization);
  mocks.list.mockResolvedValue([{ ...hero, xp: 300, inventory: ['Mara’s copper bell'] }]);
  await store.getState().refreshRooms();
  finish({ ...hero, name: 'Pip', ...customization });
  await writing;
  expect(store.getState().character).toMatchObject({ ...customization, name: 'Pip', xp: 300, inventory: ['Mara’s copper bell'] });
  await store.getState().refreshRooms();
  expect(store.getState().character).toMatchObject({ ...customization, name: 'Pip', xp: 300 });
});

it('retains the saved hero when a hosted customization write fails', async () => {
  const hero = createCharacterProfile('Owned hero', 'rogue');
  mocks.auth.mockResolvedValue({ id: 'current' });
  mocks.list.mockResolvedValue([hero]);
  mocks.identity.mockRejectedValue(new Error('Unable to save. Please retry.'));
  const { useAdventureStore: store } = await import('./adventureStore');
  await store.getState().initialize();
  const before=store.getState().character;
  await store.getState().setHero('Changed', 'fighter');
  expect(store.getState().character).toEqual(before);
  expect(store.getState().error).toContain('Please retry');
});

it('recovers from failed startup before submitting Play Now', async () => {
  const hero = createCharacterProfile('Owned hero', 'rogue');
  mocks.auth.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValue({ id: 'current-account' });
  mocks.list.mockResolvedValue([hero]);
  const { useAdventureStore: store } = await import('./adventureStore');
  await store.getState().initialize();
  expect(store.getState().error).toBe('Network unavailable');
  const { createAdventure } = await import('../lib/dropinn/engine');
  mocks.play.mockResolvedValue({ backend: 'supabase', room: createAdventure(hero, 'current-account', 1000, 'RETRY1') });
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
  expect(mocks.play).not.toHaveBeenCalled();
  expect(store.getState().error).toBe('Could not load your heroes');
});
