import { useId } from 'react';
import type { CharacterProfile } from '../../lib/character';
import { heroAccent } from '../../lib/character';
import { HERO_HATS, HERO_PARTS, normalizeCustomization, type HeroArt, type HeroAppearance, type HeroHat } from '../../lib/cosmetics';

export type AvatarHero = Pick<CharacterProfile, 'name' | 'classKey' | 'accent'> & Partial<Pick<CharacterProfile, 'appearance' | 'equipment' | 'inventory'>>;

function ArtLayer({ art, color, maskId }: { art: HeroArt; color: string; maskId: string }) {
  const bounds = { x: art.x ?? 0, y: art.y ?? 0, width: art.width ?? 256, height: art.height ?? 256 };
  return <g>
    {art.maskSrc && <>
      <defs><mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256" style={{ maskType: 'alpha' }}>
        <image href={art.maskSrc} {...bounds} />
      </mask></defs>
      <rect width="256" height="256" fill={color} mask={`url(#${maskId})`} />
    </>}
    <image href={art.src} {...bounds} />
  </g>;
}

export function HeroAvatar({ hero, className = '', decorative = false, faceOnly = false }: { hero: AvatarHero; className?: string; decorative?: boolean; faceOnly?: boolean }) {
  const id = useId().replace(/:/g, '');
  const { appearance, equipment } = normalizeCustomization(hero);
  const parts = (Object.keys(appearance) as (keyof HeroAppearance)[]).map(key => HERO_PARTS[key].find(part => part.id === appearance[key])!);
  const hat = HERO_HATS.find(hat => hat.id === equipment.hat);
  if (hat) parts.push(hat);
  return <svg className={`di-avatar ${className}`} viewBox={faceOnly ? '72 107 112 86' : '0 0 256 256'} role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : `${hero.name || 'Your hero'}${hat ? ` wearing ${hat.label}` : ', no hat'}`}>
    {parts.map((part, index) => <ArtLayer key={`${index}-${part.id}`} art={part.art} color={heroAccent(hero.accent, hero.classKey)} maskId={`${id}-${index}`} />)}
  </svg>;
}

export function HeroHatPreview({ hat, color = '#e0bd70' }: { hat: HeroHat; color?: string }) {
  const id = useId().replace(/:/g, '');
  return <svg className="di-hat-art" viewBox="0 0 256 140" aria-hidden="true">
    <ArtLayer art={hat.art} color={color} maskId={`${id}-hat`} />
  </svg>;
}
