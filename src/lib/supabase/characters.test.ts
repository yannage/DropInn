import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCharacterProfile } from '../character';
import { listSupabaseCharacters, updateSupabaseHeroIdentity } from './characters';

const mock = vi.hoisted(() => ({ client: { from: vi.fn() } }));
vi.mock('./client', () => ({ requireSupabaseClient: () => mock.client }));
afterEach(() => vi.clearAllMocks());

const hero = createCharacterProfile('Pip', 'wizard');
const appearance = { body: 'round', eyes: 'wide', nose: 'none', mouth: 'flat' };
const row = { id: hero.id, user_id: 'owner', name: hero.name, class_key: hero.classKey, hp: hero.hp, max_hp: hero.maxHp,
  traits: hero.traits, level: hero.level, xp: hero.xp, spotlight_tokens: hero.spotlightTokens, inventory: ['A silver river reed'],
  accent: hero.accent, appearance, equipment: { hat: 'reed' } };

describe('hosted hero customization mapping', () => {
  it('loads saved appearance and equips hats using stored keepsake ownership', async () => {
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [row], error: null }) };
    mock.client.from.mockReturnValue(chain);
    const result = await listSupabaseCharacters('owner');
    expect(result[0]).toMatchObject({ appearance, equipment: { hat: 'reed' }, inventory: row.inventory });
  });

  it('writes only identity/cosmetics and returns concurrently awarded progress', async () => {
    const chain = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { ...row, xp: 320 }, error: null }) };
    mock.client.from.mockReturnValue(chain);
    const result = await updateSupabaseHeroIdentity('owner', { ...hero, appearance, equipment: { hat: 'reed' }, inventory: row.inventory });
    const payload = chain.update.mock.calls[0][0];
    expect(payload).toMatchObject({ appearance, equipment: { hat: 'reed' } });
    expect(payload).not.toHaveProperty('xp');
    expect(payload).not.toHaveProperty('inventory');
    expect(payload).not.toHaveProperty('level');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'owner');
    expect(result.xp).toBe(320);
  });
});
