import type { CharacterClassKey, CharacterProfile } from './character';
import { HAT_STYLES, type CosmeticUnlocks } from './dropinn/collection';

export interface HeroAppearance { body: string; eyes: string; nose: string; mouth: string }
export interface HeroEquipment { hat: string | null; hatColor?: string | null; hatTrim?: string | null }
export interface HeroCustomization { appearance: HeroAppearance; equipment: HeroEquipment }
/** Assets share a 256px canvas. Placement is optional for externally supplied artwork. */
export interface HeroArt { src: string; maskSrc?: string; x?: number; y?: number; width?: number; height?: number }
export interface HeroPart { id: string; label: string; art: HeroArt }
export interface HeroHat extends HeroPart { keepsake?: string; chapter?: string }
export const SHEPHERD_STYLE_ART: Record<'color' | 'trim', HeroArt> = {
  color: { src:'/heroes/hat-shepherd-outline.svg', maskSrc:'/heroes/hat-shepherd-fill.svg' },
  trim: { src:'/heroes/hat-shepherd-feather.svg' },
};
const part = (category: string, id: string, label: string, tint = false): HeroPart => ({
  id, label, art: { src: `/heroes/${category}-${id}.svg`, ...(tint ? { maskSrc: `/heroes/${category}-${id}-fill.svg` } : {}) },
});
export const HERO_PARTS = {
  body: [
    part('body', 'bean', 'Bean', true),
    part('body', 'round', 'Round', true),
    part('body', 'squish', 'Squish', true),
    part('body', 'pear', 'Pear', true),
    part('body', 'puff', 'Puff', true),
    part('body', 'lanky', 'Lanky', true),
  ],
  eyes: [
    part('eyes', 'dots', 'Curious eyes'),
    part('eyes', 'wide', 'Startled eyes'),
    part('eyes', 'sleepy', 'Unimpressed eyes'),
    part('eyes', 'side-eye', 'Side-eye'),
    part('eyes', 'happy', 'Happy eyes'),
    part('eyes', 'wink', 'Winking eyes'),
    part('eyes', 'worried', 'Worried eyes'),
  ],
  nose: [
    part('nose', 'button', 'Round nose'),
    part('nose', 'triangle', 'Crooked nose'),
    part('nose', 'snout', 'Little snout'),
    part('nose', 'freckles', 'Freckled nose'),
    part('nose', 'beak', 'Little beak'),
    part('nose', 'none', 'No nose'),
  ],
  mouth: [
    part('mouth', 'smile', 'Smile'),
    part('mouth', 'flat', 'Straight face'),
    part('mouth', 'toothy', 'Toothy grin'),
    part('mouth', 'open', 'Little gasp'),
    part('mouth', 'smirk', 'Crooked smirk'),
    part('mouth', 'tongue', 'Tongue out'),
  ],
} satisfies Record<keyof HeroAppearance, HeroPart[]>;
export const HERO_HATS: HeroHat[] = [
  part('hat', 'wizard', 'Spellbound hat'),
  part('hat', 'fighter', 'Tin-pot helmet'),
  part('hat', 'rogue', 'Troublemaker bandana'),
  part('hat', 'cleric', 'Little light circlet'),
  { ...part('hat', 'shepherd', 'Shepherd’s floppy hat'), keepsake: 'Mara’s copper bell', chapter: 'The missing livestock' },
  { ...part('hat', 'reed', 'Reed-woven hat'), keepsake: 'A silver river reed', chapter: 'The riverside hunt' },
  { ...part('hat', 'moonstone', 'Moonstone crown'), keepsake: 'The guardian’s moonstone', chapter: 'The chapel' },
];
export const DEFAULT_APPEARANCE: HeroAppearance = { body: 'bean', eyes: 'dots', nose: 'button', mouth: 'smile' };
export const ownsHat = (hat: HeroHat, inventory: readonly string[], unlocks?: CosmeticUnlocks) => !hat.keepsake || inventory.includes(hat.keepsake) || !!unlocks?.hats.includes(hat.id);
export const hatForKeepsake = (keepsake: string) => HERO_HATS.find(hat => hat.keepsake === keepsake);

export function normalizeCustomization(value: { appearance?: unknown; equipment?: unknown; classKey: CharacterClassKey; inventory?: readonly string[]; cosmeticUnlocks?: CosmeticUnlocks }): HeroCustomization {
  const input = value.appearance && typeof value.appearance === 'object' ? value.appearance as Record<string, unknown> : {};
  const appearance = { ...DEFAULT_APPEARANCE };
  for (const key of Object.keys(appearance) as (keyof HeroAppearance)[]) {
    appearance[key] = HERO_PARTS[key].find(part => part.id === input[key])?.id ?? DEFAULT_APPEARANCE[key];
  }
  const equipment = value.equipment && typeof value.equipment === 'object' ? value.equipment as Record<string, unknown> : {};
  const selected = equipment.hat === undefined ? value.classKey : equipment.hat;
  const hat = HERO_HATS.find(hat => hat.id === selected);
  const owned = hat && ownsHat(hat, value.inventory ?? [], value.cosmeticUnlocks);
  const result: HeroEquipment = { hat: owned ? hat.id : null };
  for (const [field, kind] of [['hatColor', 'color'], ['hatTrim', 'trim']] as const) {
    if (equipment[field] !== undefined) result[field] = owned && HAT_STYLES.some(style => style.id === equipment[field]
      && style.hat === hat.id && style.kind === kind && value.cosmeticUnlocks?.styles.includes(style.id)) ? equipment[field] as string : null;
  }
  return { appearance, equipment: result };
}

export function normalizeHero<T extends CharacterProfile>(hero: T): T & HeroCustomization {
  return { ...hero, ...normalizeCustomization(hero) };
}
