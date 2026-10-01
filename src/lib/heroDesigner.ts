import { HERO_COLORS, MOONLIT_BLUE, type CharacterProfile } from './character';
import { HERO_HAIR, HERO_HATS, HERO_PARTS, normalizeCustomization, ownsHat, type HeroCustomization, type HeroPart } from './cosmetics';
import type { CosmeticUnlocks } from './dropinn/collection';

export type HeroLook = HeroCustomization & Pick<CharacterProfile, 'accent'>;

/** Try on an owned look without changing the hero's identity, progress, or keepsakes. */
export function surpriseHeroLook(hero: CharacterProfile, unlocks: CosmeticUnlocks, random: () => number = Math.random): HeroLook {
  const current = normalizeCustomization({ ...hero, cosmeticUnlocks: unlocks });
  const pick = <T,>(choices: readonly T[]): T => choices[Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)))];
  const available = (parts: readonly HeroPart[]) => parts.filter(part => !part.unlockId || unlocks.items?.includes(part.unlockId));
  const appearance = {
    body: pick(available(HERO_PARTS.body)).id,
    eyes: pick(available(HERO_PARTS.eyes)).id,
    nose: pick(available(HERO_PARTS.nose)).id,
    mouth: pick(available(HERO_PARTS.mouth)).id,
    hair: pick([null, ...available(HERO_HAIR).map(part => part.id)]),
  };
  const hat = pick([null, ...HERO_HATS.filter(part => ownsHat(part, hero.inventory, unlocks)).map(part => part.id)]);
  const equipment = {
    ...current.equipment,
    hat,
    ...(hat !== current.equipment.hat ? { hatColor: null, hatTrim: null } : {}),
  };
  const colors = unlocks.items?.includes('color:moonlit-blue') ? [...HERO_COLORS, MOONLIT_BLUE] : HERO_COLORS;
  const accent = pick(colors).value;

  // Even a coincidental reroll should give the player something new to try on.
  if (accent === hero.accent && hat === current.equipment.hat
    && (Object.keys(appearance) as (keyof typeof appearance)[]).every(key => appearance[key] === current.appearance[key])) {
    appearance.body = pick(available(HERO_PARTS.body).filter(part => part.id !== current.appearance.body)).id;
  }

  return { accent, ...normalizeCustomization({ ...hero, appearance, equipment, cosmeticUnlocks: unlocks }) };
}
