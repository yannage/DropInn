import { describe, expect, it } from 'vitest';
import { createCharacterProfile, HERO_COLORS, MOONLIT_BLUE } from './character';
import { DEFAULT_APPEARANCE, HERO_HATS, ownsHat } from './cosmetics';
import type { CosmeticUnlocks } from './dropinn/collection';
import { surpriseHeroLook } from './heroDesigner';

const noUnlocks: CosmeticUnlocks = { hats: [], styles: [] };

describe('surprise hero look', () => {
  it('only offers starter parts and colors when rewards are locked', () => {
    const hero = createCharacterProfile('Starter', 'wizard');
    // Exercise the whole random range, including the final option in each catalog.
    for (let step = 0; step < 100; step += 1) {
      const look = surpriseHeroLook(hero, noUnlocks, () => step / 100);
      expect(look.appearance.eyes).not.toBe('starry');
      expect(look.appearance.nose).not.toBe('rosy-button');
      expect(look.appearance.mouth).not.toBe('victorious');
      expect([null, 'tidy-tuft', 'soft-fringe']).toContain(look.appearance.hair);
      expect(HERO_COLORS.map(color => color.value)).toContain(look.accent);
      const hat = HERO_HATS.find(hat => hat.id === look.equipment.hat);
      expect(!hat || ownsHat(hat, [], noUnlocks)).toBe(true);
    }
  });

  it('includes owned pass parts, account hats, and the earned body color', () => {
    const hero = createCharacterProfile('Collector', 'rogue');
    const unlocks = { hats: ['apple-blossom-crown'], styles: [], items: [
      'eyes:starry', 'nose:rosy-button', 'mouth:victorious', 'hair:cloud-tuft', 'color:moonlit-blue',
    ] };
    expect(surpriseHeroLook(hero, unlocks, () => 0.999)).toMatchObject({
      accent: MOONLIT_BLUE.value,
      appearance: { eyes: 'starry', nose: 'rosy-button', mouth: 'victorious', hair: 'cloud-tuft' },
      equipment: { hat: 'apple-blossom-crown' },
    });
  });

  it('includes hats earned through the hero inventory and owned supporter hats', () => {
    const hero = { ...createCharacterProfile('Traveller', 'cleric'), inventory: ['Mara’s copper bell'] };
    expect(surpriseHeroLook(hero, noUnlocks, () => 0.999).equipment.hat).toBe('shepherd');
    expect(surpriseHeroLook(hero, { hats: ['lantern'], styles: [] }, () => 0.999).equipment.hat).toBe('lantern');
  });

  it('uses the passed ownership rather than stale ownership on the hero', () => {
    const hero = { ...createCharacterProfile('Collector', 'wizard'), cosmeticUnlocks: {
      hats: ['apple-blossom-crown'], styles: [], items: ['eyes:starry', 'hair:cloud-tuft', 'color:moonlit-blue'],
    } };
    const look = surpriseHeroLook(hero, noUnlocks, () => 0.999);
    expect(look.equipment.hat).toBe('cleric');
    expect(look.appearance.eyes).toBe('worried');
    expect(look.appearance.hair).toBe('soft-fringe');
    expect(look.accent).toBe('#F9A8D4');
  });

  it('can remove hair and hats and clears dyes when changing the hat', () => {
    const hero = { ...createCharacterProfile('Friend', 'wizard'),
      appearance: { ...DEFAULT_APPEARANCE, hair: 'tidy-tuft' },
      equipment: { hat: 'shepherd', hatColor: 'shepherd-green', hatTrim: 'shepherd-feather' },
    };
    const look = surpriseHeroLook(hero, { hats: ['shepherd'], styles: ['shepherd-green', 'shepherd-feather'] }, () => 0);
    expect(look.appearance.hair).toBeNull();
    expect(look.equipment).toMatchObject({ hat: null, hatColor: null, hatTrim: null });
  });

  it('preserves valid hat dyes for the same hat and keeps other wardrobe choices', () => {
    const unlocks: CosmeticUnlocks = { hats: ['shepherd'], styles: ['shepherd-green', 'shepherd-feather'], items: [
      'shoes:ruby', 'shoes:ruby-sparkle', 'title:tale-seeker', 'frame:inn-border',
    ] };
    const hero = { ...createCharacterProfile('Friend', 'wizard'), equipment: {
      hat: 'shepherd', hatColor: 'shepherd-green', hatTrim: 'shepherd-feather',
      shoes: 'ruby', shoeColor: '#F9A8D4', title: 'tale-seeker', frame: 'inn-border', frameColor: '#7DD3FC',
    } };
    const original = structuredClone(hero);
    const look = surpriseHeroLook(hero, unlocks, () => 0.999);
    expect(look.equipment).toEqual(hero.equipment);
    expect(hero).toEqual(original);
    expect(Object.keys(look).sort()).toEqual(['accent', 'appearance', 'equipment']);
  });

  it('changes the body when the random roll would reproduce the same look', () => {
    const hero = { ...createCharacterProfile('Friend', 'wizard'), appearance: { ...DEFAULT_APPEARANCE }, equipment: { hat: null } };
    const look = surpriseHeroLook(hero, noUnlocks, () => 0);
    expect(look.appearance).toEqual({ ...DEFAULT_APPEARANCE, body: 'round' });
    expect(look.accent).toBe(hero.accent);
    expect(look.equipment.hat).toBeNull();
  });
});
