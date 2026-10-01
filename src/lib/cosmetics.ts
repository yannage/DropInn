import type { CharacterClassKey, CharacterProfile } from './character';
import { HAT_STYLES, type CosmeticUnlocks } from './dropinn/collection';
import { SUPPORTER_STYLES } from './dropinn/payments';
import { HERO_COLORS } from './character';
import { PASS_TITLES } from './dropinn/storyPass';

export interface HeroAppearance { body: string; eyes: string; nose: string; mouth: string; hair?: string | null }
export interface HeroEquipment { hat: string | null; hatColor?: string | null; hatTrim?: string | null;
  shoes?: string | null; shoeColor?: string | null; title?: string | null; frame?: string | null; frameColor?: string | null }
export interface HeroCustomization { appearance: HeroAppearance; equipment: HeroEquipment }
/** Assets share a 256px canvas. Placement is optional for externally supplied artwork. */
export interface HeroArt { src: string; maskSrc?: string; bareSrc?: string; x?: number; y?: number; width?: number; height?: number }
export interface HeroPart { id: string; label: string; art: HeroArt; unlockId?: string }
export interface HeroHat extends HeroPart { keepsake?: string; chapter?: string; supporter?: boolean; paletteArt?: HeroArt }
export const ALL_HAT_STYLES = [...HAT_STYLES, ...SUPPORTER_STYLES];
export const SHEPHERD_STYLE_ART: Record<'color' | 'trim', HeroArt> = {
  color: { src:'/heroes/hat-shepherd-outline.svg', maskSrc:'/heroes/hat-shepherd-fill.svg' },
  trim: { src:'/heroes/hat-shepherd-feather.svg' },
};
const RASTER_PARTS = new Set(['body-bean', 'eyes-dots', 'nose-button', 'mouth-open', 'hat-wizard']);
const part = (category: string, id: string, label: string, tint = false): HeroPart => {
  const key = `${category}-${id}`;
  const base = RASTER_PARTS.has(key) ? `/heroes/raster-v1/${key}` : `/heroes/${key}`;
  const extension = RASTER_PARTS.has(key) ? 'png' : 'svg';
  return { id, label, art: { src: `${base}.${extension}`,
    ...(tint ? { maskSrc: `${base}-fill.${extension}` } : {}),
    ...(category === 'body' ? { bareSrc: `${base}-bare.${extension}` } : {}),
  } };
};
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
    { ...part('eyes', 'starry', 'Starry Eyes'), unlockId: 'eyes:starry' },
  ],
  nose: [
    part('nose', 'button', 'Round nose'),
    part('nose', 'triangle', 'Crooked nose'),
    part('nose', 'snout', 'Little snout'),
    part('nose', 'freckles', 'Freckled nose'),
    part('nose', 'beak', 'Little beak'),
    part('nose', 'none', 'No nose'),
    { ...part('nose', 'rosy-button', 'Rosy Button nose'), unlockId: 'nose:rosy-button' },
  ],
  mouth: [
    part('mouth', 'smile', 'Smile'),
    part('mouth', 'flat', 'Straight face'),
    part('mouth', 'toothy', 'Toothy grin'),
    part('mouth', 'open', 'Little gasp'),
    part('mouth', 'smirk', 'Crooked smirk'),
    part('mouth', 'tongue', 'Tongue out'),
    { ...part('mouth', 'victorious', 'Victorious Grin'), unlockId: 'mouth:victorious' },
  ],
} satisfies Record<'body' | 'eyes' | 'nose' | 'mouth', HeroPart[]>;
export const HERO_HAIR: HeroPart[] = [
  part('hair', 'tidy-tuft', 'Tidy Tuft'), part('hair', 'soft-fringe', 'Soft Fringe'),
  { ...part('hair', 'wayward-curls', 'Wayward Curls'), unlockId: 'hair:wayward-curls' },
  { ...part('hair', 'cloud-tuft', 'Cloud Tuft'), unlockId: 'hair:cloud-tuft' },
];
export const HERO_SHOES: HeroPart[] = [
  { ...part('shoes', 'trail-boots', 'Trail Boots'), unlockId: 'shoes:trail-boots' },
  { ...part('shoes', 'ruby', 'Ruby Shoes'), unlockId: 'shoes:ruby' },
];
export const HERO_HATS: HeroHat[] = [
  part('hat', 'wizard', 'Spellbound hat'),
  part('hat', 'fighter', 'Tin-pot helmet'),
  part('hat', 'rogue', 'Troublemaker bandana'),
  part('hat', 'cleric', 'Little light circlet'),
  { ...part('hat', 'shepherd', 'Shepherd’s floppy hat'), keepsake: 'Mara’s copper bell', chapter: 'The missing livestock' },
  { ...part('hat', 'reed', 'Reed-woven hat'), keepsake: 'A silver river reed', chapter: 'The riverside hunt' },
  { ...part('hat', 'moonstone', 'Moonstone crown'), keepsake: 'The guardian’s moonstone', chapter: 'The chapel' },
  { ...part('hat', 'teacup', 'Travelling teacup'), supporter: true, paletteArt: { src:'/heroes/hat-teacup-outline.svg', maskSrc:'/heroes/hat-teacup-fill.svg' } },
  { ...part('hat', 'lantern', 'Lamplighter’s hat'), supporter: true, paletteArt: { src:'/heroes/hat-lantern-outline.svg', maskSrc:'/heroes/hat-lantern-fill.svg' } },
  { ...part('hat', 'pilot-cap', 'Teacup pilot cap'), keepsake: 'Pella’s dented brass badge', chapter: 'The Last Flight of the Teacup' },
  { ...part('hat', 'breakfast-nightcap', 'Breakfast nightcap'), keepsake: 'A mismatched breakfast spoon', chapter: 'The Inn That Misplaced Tomorrow' },
  { ...part('hat', 'apple-blossom-crown', 'Apple-blossom crown'), keepsake: 'A carved apple seed', chapter: 'The Orchard That Walked Away' },
];
export const DEFAULT_APPEARANCE: HeroAppearance = { body: 'bean', eyes: 'dots', nose: 'button', mouth: 'smile', hair: null };
export const ownsHat = (hat: HeroHat, inventory: readonly string[], unlocks?: CosmeticUnlocks) => (!hat.supporter && !hat.keepsake) || (!!hat.keepsake && inventory.includes(hat.keepsake)) || !!unlocks?.hats.includes(hat.id);
export const hatForKeepsake = (keepsake: string) => HERO_HATS.find(hat => hat.keepsake === keepsake);

export function normalizeCustomization(value: { appearance?: unknown; equipment?: unknown; classKey: CharacterClassKey; inventory?: readonly string[]; cosmeticUnlocks?: CosmeticUnlocks }): HeroCustomization {
  const input = value.appearance && typeof value.appearance === 'object' ? value.appearance as Record<string, unknown> : {};
  const appearance = { ...DEFAULT_APPEARANCE };
  for (const key of ['body','eyes','nose','mouth'] as const) {
    const part = HERO_PARTS[key].find(part => part.id === input[key]);
    appearance[key] = part && (!part.unlockId || value.cosmeticUnlocks?.items?.includes(part.unlockId)) ? part.id : DEFAULT_APPEARANCE[key];
  }
  const hair = HERO_HAIR.find(part => part.id === input.hair);
  appearance.hair = hair && (!hair.unlockId || value.cosmeticUnlocks?.items?.includes(hair.unlockId)) ? hair.id : null;
  const equipment = value.equipment && typeof value.equipment === 'object' ? value.equipment as Record<string, unknown> : {};
  const selected = equipment.hat === undefined ? value.classKey : equipment.hat;
  const hat = HERO_HATS.find(hat => hat.id === selected);
  const owned = hat && ownsHat(hat, value.inventory ?? [], value.cosmeticUnlocks);
  const result: HeroEquipment = { hat: owned ? hat.id : null };
  for (const [field, kind] of [['hatColor', 'color'], ['hatTrim', 'trim']] as const) {
    if (equipment[field] !== undefined) result[field] = owned && ALL_HAT_STYLES.some(style => style.id === equipment[field]
      && style.hat === hat.id && style.kind === kind && value.cosmeticUnlocks?.styles.includes(style.id)) ? equipment[field] as string : null;
  }
  const shoes = HERO_SHOES.find(part => part.id === equipment.shoes && value.cosmeticUnlocks?.items?.includes(part.unlockId!));
  if (equipment.shoes !== undefined) result.shoes = shoes?.id ?? null;
  if (equipment.shoeColor !== undefined) result.shoeColor = shoes?.id === 'ruby' && value.cosmeticUnlocks?.items?.includes('shoes:ruby-sparkle')
    && HERO_COLORS.some(c => c.value === equipment.shoeColor) ? equipment.shoeColor as string : null;
  if (equipment.title !== undefined) result.title = PASS_TITLES.find(title => title.id === equipment.title
    && value.cosmeticUnlocks?.items?.includes(`title:${title.id}`))?.id ?? null;
  if (equipment.frame !== undefined) result.frame = equipment.frame === 'inn-border' && value.cosmeticUnlocks?.items?.includes('frame:inn-border') ? 'inn-border' : null;
  if (equipment.frameColor !== undefined) result.frameColor = result.frame && HERO_COLORS.some(c => c.value === equipment.frameColor) ? equipment.frameColor as string : null;
  return { appearance, equipment: result };
}

export function displayHeroName(hero: Pick<CharacterProfile, 'name' | 'equipment'>): string {
  const title = PASS_TITLES.find(item => item.id === hero.equipment?.title);
  return title ? `${hero.name}, ${title.label}` : hero.name;
}

export function normalizeHero<T extends CharacterProfile>(hero: T): T & HeroCustomization {
  return { ...hero, ...normalizeCustomization(hero) };
}
