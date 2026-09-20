import type { CharacterClassKey, CharacterProfile } from './character';

export interface HeroAppearance { body: string; eyes: string; nose: string; mouth: string }
export interface HeroEquipment { hat: string | null }
export interface HeroCustomization { appearance: HeroAppearance; equipment: HeroEquipment }
/** Assets share a 256px canvas. Placement is optional for externally supplied artwork. */
export interface HeroArt { src: string; maskSrc?: string; x?: number; y?: number; width?: number; height?: number }
export interface HeroPart { id: string; label: string; art: HeroArt }
export interface HeroHat extends HeroPart { keepsake?: string; chapter?: string }
const part = (category: string, id: string, label: string, tint = false): HeroPart => ({
  id, label, art: { src: `/heroes/${category}-${id}.svg`, ...(tint ? { maskSrc: `/heroes/${category}-${id}-fill.svg` } : {}) },
});
export const HERO_PARTS = {
  body: [part('body', 'bean', 'Bean', true), part('body', 'round', 'Round', true), part('body', 'squish', 'Squish', true)],
  eyes: [part('eyes', 'dots', 'Dot eyes'), part('eyes', 'wide', 'Wide eyes'), part('eyes', 'sleepy', 'Sleepy eyes')],
  nose: [part('nose', 'button', 'Button nose'), part('nose', 'triangle', 'Triangle nose'), part('nose', 'none', 'No nose')],
  mouth: [part('mouth', 'smile', 'Smile'), part('mouth', 'flat', 'Straight face'), part('mouth', 'toothy', 'Toothy grin')],
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
export const ownsHat = (hat: HeroHat, inventory: readonly string[]) => !hat.keepsake || inventory.includes(hat.keepsake);
export const hatForKeepsake = (keepsake: string) => HERO_HATS.find(hat => hat.keepsake === keepsake);

export function normalizeCustomization(value: { appearance?: unknown; equipment?: unknown; classKey: CharacterClassKey; inventory?: readonly string[] }): HeroCustomization {
  const input = value.appearance && typeof value.appearance === 'object' ? value.appearance as Record<string, unknown> : {};
  const appearance = { ...DEFAULT_APPEARANCE };
  for (const key of Object.keys(appearance) as (keyof HeroAppearance)[]) {
    appearance[key] = HERO_PARTS[key].find(part => part.id === input[key])?.id ?? DEFAULT_APPEARANCE[key];
  }
  const equipment = value.equipment && typeof value.equipment === 'object' ? value.equipment as Record<string, unknown> : {};
  const selected = equipment.hat === undefined ? value.classKey : equipment.hat;
  const hat = HERO_HATS.find(hat => hat.id === selected);
  return { appearance, equipment: { hat: hat && ownsHat(hat, value.inventory ?? []) ? hat.id : null } };
}

export function normalizeHero<T extends CharacterProfile>(hero: T): T & HeroCustomization {
  return { ...hero, ...normalizeCustomization(hero) };
}
