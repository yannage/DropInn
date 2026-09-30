import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from './character';
import { DEFAULT_APPEARANCE, HERO_HATS, HERO_PARTS, displayHeroName, normalizeCustomization, normalizeHero, ownsHat, type HeroAppearance } from './cosmetics';
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

  it('accepts every current body and face option as a saved catalog ID', () => {
    const base = createCharacterProfile('Many faces', 'wizard');
    for (const key of Object.keys(HERO_PARTS) as (keyof typeof HERO_PARTS)[]) {
      expect(new Set(HERO_PARTS[key].map(part => part.id)).size).toBe(HERO_PARTS[key].length);
      for (const part of HERO_PARTS[key].filter(part => !part.unlockId)) {
        expect(normalizeCustomization({ ...base, appearance: { ...DEFAULT_APPEARANCE, [key]: part.id } }).appearance[key]).toBe(part.id);
      }
    }
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

  it('accepts pass wardrobe choices only from owned rewards', () => {
    const base = createCharacterProfile('Yani', 'wizard');
    const request = { ...base, appearance: { ...DEFAULT_APPEARANCE, eyes:'starry', hair:'wayward-curls' },
      equipment: { hat:'pilot-cap', shoes:'ruby', shoeColor:'#F9A8D4', title:'tale-seeker', frame:'inn-border', frameColor:'#7DD3FC' } };
    const locked = normalizeCustomization(request);
    expect(locked.appearance).toMatchObject({ eyes:'dots', hair:null });
    expect(locked.equipment).toMatchObject({ hat:null, shoes:null, shoeColor:null, title:null, frame:null, frameColor:null });
    const owned = normalizeCustomization({ ...request, cosmeticUnlocks: { hats:['pilot-cap'], styles:[],
      items:['eyes:starry','hair:wayward-curls','shoes:ruby','shoes:ruby-sparkle','title:tale-seeker','frame:inn-border'] } });
    expect(owned.appearance).toMatchObject({ eyes:'starry', hair:'wayward-curls' });
    expect(owned.equipment).toMatchObject(request.equipment);
    expect(displayHeroName({ name:'Yani', equipment:owned.equipment })).toBe('Yani, the Tale Seeker');
  });

  it('pins appearance on rejoin and never uses it to change game mechanics', () => {
    const base = createCharacterProfile('Friend', 'rogue');
    const customized = { ...base, appearance: { body: 'squish', eyes: 'sleepy', nose: 'none', mouth: 'toothy' }, equipment: { hat: 'cleric' } };
    const ordinary = createAdventure(base, 'alice', 1000, 'COSM01');
    let room = createAdventure(customized, 'alice', 1000, 'COSM02');
    expect(room.seats[0].character.appearance).toMatchObject(customized.appearance);
    expect(room.seats[0].hp).toBe(ordinary.seats[0].hp);
    expect(room.seats[0].character.traits).toEqual(ordinary.seats[0].character.traits);
    room = reduceAdventure(room, { id: 'leave', type: 'leave', userId: 'alice' }, 1100);
    room = reduceAdventure(room, { id: 'rejoin', type: 'join', userId: 'alice', character: { ...base, equipment: { hat: 'wizard' } } }, 1200);
    expect(room.players.alice.character.appearance).toMatchObject(customized.appearance);
    expect(room.players.alice.character.equipment).toEqual(customized.equipment);
  });
});
