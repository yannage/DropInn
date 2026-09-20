import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from './character';
import { DEFAULT_APPEARANCE, HERO_HATS, normalizeCustomization, normalizeHero, ownsHat } from './cosmetics';
import { CHAPTERS } from './dropinn/content';
import { createAdventure, reduceAdventure } from './dropinn/engine';

describe('cosmetic catalog and compatibility', () => {
  it('gives older heroes defaults without changing their progress or power', () => {
    const old = createCharacterProfile('Old friend', 'fighter');
    const normalized = normalizeHero(old);
    expect(normalized).toMatchObject(old);
    expect(normalized.appearance).toEqual(DEFAULT_APPEARANCE);
    expect(normalized.equipment).toEqual({ hat: 'fighter' });
    expect(normalizeHero(normalized)).toEqual(normalized);
  });

  it('preserves explicit unequip and falls back for malformed or unavailable parts', () => {
    const base = createCharacterProfile('Friend', 'wizard');
    expect(normalizeCustomization({ ...base, equipment: { hat: null } }).equipment.hat).toBeNull();
    expect(normalizeCustomization({ ...base, equipment: { hat: 'moonstone' } }).equipment.hat).toBeNull();
    expect(normalizeCustomization({ ...base, equipment: { hat: 'missing' } }).equipment.hat).toBeNull();
    expect(normalizeCustomization({ ...base, appearance: { body: 'round', eyes: 'bad', nose: null, mouth: [] } }).appearance)
      .toEqual({ ...DEFAULT_APPEARANCE, body: 'round' });
  });

  it('grants all four starter hats to every class and retroactively unlocks each chapter hat', () => {
    const base = createCharacterProfile('Friend', 'cleric');
    expect(HERO_HATS.filter(hat => ownsHat(hat, [])).map(hat => hat.id)).toEqual(['wizard', 'fighter', 'rogue', 'cleric']);
    for (const chapter of CHAPTERS) {
      const hat = HERO_HATS.find(hat => hat.keepsake === chapter.keepsake)!;
      expect(hat).toBeDefined();
      expect(ownsHat(hat, [chapter.keepsake])).toBe(true);
      expect(normalizeCustomization({ ...base, inventory: [chapter.keepsake], equipment: { hat: hat.id } }).equipment.hat).toBe(hat.id);
    }
  });

  it('pins appearance on rejoin and never uses it to change game mechanics', () => {
    const base = createCharacterProfile('Friend', 'rogue');
    const customized = { ...base, appearance: { body: 'squish', eyes: 'sleepy', nose: 'none', mouth: 'toothy' }, equipment: { hat: 'cleric' } };
    const ordinary = createAdventure(base, 'alice', 1000, 'COSM01');
    let room = createAdventure(customized, 'alice', 1000, 'COSM02');
    expect(room.seats[0].character.appearance).toEqual(customized.appearance);
    expect(room.seats[0].hp).toBe(ordinary.seats[0].hp);
    expect(room.seats[0].character.traits).toEqual(ordinary.seats[0].character.traits);
    room = reduceAdventure(room, { id: 'leave', type: 'leave', userId: 'alice' }, 1100);
    room = reduceAdventure(room, { id: 'rejoin', type: 'join', userId: 'alice', character: { ...base, equipment: { hat: 'wizard' } } }, 1200);
    expect(room.players.alice.character.appearance).toEqual(customized.appearance);
    expect(room.players.alice.character.equipment).toEqual(customized.equipment);
  });
});
