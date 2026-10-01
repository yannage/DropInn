import { useId } from 'react';
import type { CharacterProfile } from '../../lib/character';
import { heroAccent } from '../../lib/character';
import { HERO_HATS, HERO_HAIR, HERO_SHOES, HERO_PARTS, ALL_HAT_STYLES, SHEPHERD_STYLE_ART, RUBY_SHOE_PALETTE_ART, normalizeCustomization, displayHeroName, type HeroArt, type HeroHat } from '../../lib/cosmetics';

export type AvatarHero = Pick<CharacterProfile, 'name' | 'classKey' | 'accent'> & Partial<Pick<CharacterProfile, 'appearance' | 'equipment' | 'inventory' | 'cosmeticUnlocks'>>;

export const INN_FRAME_ART = '/heroes/inn-frame-v1.png';

function InnFrame({ color, id }: { color: string; id: string }) {
  const [red, green, blue] = [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16) / 255);
  return <g className="di-avatar-frame" aria-hidden="true" pointerEvents="none">
    <defs><filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      {/* Tint the cream paint while retaining the original dark drawn contour and alpha. */}
      <feColorMatrix type="matrix" values={`${red} 0 0 0 0 ${green} 0 0 0 0 ${blue} 0 0 0 0 0 0 0 1 0`} />
    </filter></defs>
    <image href={INN_FRAME_ART} width="256" height="256" filter={`url(#${id})`} />
  </g>;
}

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

function HatLayer({hat,hatColor,hatTrim,id,color}:{hat:HeroHat;hatColor?:string|null;hatTrim?:string|null;id:string;color:string}) {
  const palette=ALL_HAT_STYLES.find(style=>style.id===hatColor && style.hat===hat.id && style.kind==='color');
  const art=palette ? hat.paletteArt ?? SHEPHERD_STYLE_ART.color : hat.art;
  return <><ArtLayer art={art} color={palette?.color ?? color} maskId={id}/>
    {hat.id==='shepherd' && hatTrim==='shepherd-feather' && <ArtLayer art={SHEPHERD_STYLE_ART.trim} color={color} maskId={`${id}-trim`}/>}</>;
}

export function HeroAvatar({ hero, className = '', decorative = false, faceOnly = false }: { hero: AvatarHero; className?: string; decorative?: boolean; faceOnly?: boolean }) {
  const id = useId().replace(/:/g, '');
  const { appearance, equipment } = normalizeCustomization(hero);
  const parts = (['body','eyes','nose','mouth'] as const).map(key => HERO_PARTS[key].find(part => part.id === appearance[key])!);
  const hat = HERO_HATS.find(hat => hat.id === equipment.hat);
  const hair = HERO_HAIR.find(part => part.id === appearance.hair);
  const shoes = HERO_SHOES.find(part => part.id === equipment.shoes);
  const accent = heroAccent(hero.accent, hero.classKey, hero.cosmeticUnlocks?.items);
  const framed = !faceOnly && equipment.frame === 'inn-border';
  // The painted raster contours and their matching masks need no displacement.
  return <svg className={`di-avatar ${framed ? 'di-avatar-framed' : ''} ${className}`} viewBox={faceOnly ? '70 96 116 98' : '0 0 256 256'} role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : `${displayHeroName({name:hero.name,equipment:hero.equipment}) || 'Your hero'}${hat ? ` wearing ${hat.label}` : ', no hat'}`}>
    {framed && <InnFrame color={equipment.frameColor ?? '#e2bd60'} id={`${id}-frame`} />}
    <g>
      <ArtLayer art={shoes ? { ...parts[0].art, src: parts[0].art.bareSrc ?? parts[0].art.src, maskSrc: parts[0].art.bareMaskSrc ?? parts[0].art.maskSrc } : parts[0].art} color={accent} maskId={`${id}-body`} />
      {shoes && (shoes.id === 'ruby' && equipment.shoeColor
        ? <ArtLayer art={RUBY_SHOE_PALETTE_ART} color={equipment.shoeColor} maskId={`${id}-shoes`}/>
        : <ArtLayer art={shoes.art} color={accent} maskId={`${id}-shoes`}/>)}
      {hair && <ArtLayer art={hair.art} color={accent} maskId={`${id}-hair`}/>}
      {parts.slice(1).map((part, index) => <ArtLayer key={`${index}-${part.id}`} art={part.art} color={accent} maskId={`${id}-${index}`} />)}
      {hat && <HatLayer hat={hat} hatColor={equipment.hatColor} hatTrim={equipment.hatTrim} id={`${id}-hat`} color={accent}/>}
      {shoes?.id === 'ruby' && equipment.shoeColor && <g fill="#fff2b0" stroke="#080907" strokeWidth="1.5"><path d="M74 217 l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/><path d="M177 217 l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></g>}
    </g>
  </svg>;
}

export function HeroHatPreview({ hat, color = '#e0bd70',hatColor,hatTrim }: { hat: HeroHat; color?: string;hatColor?:string|null;hatTrim?:string|null }) {
  const id = useId().replace(/:/g, '');
  return <svg className="di-hat-art" viewBox="0 0 256 140" aria-hidden="true">
    <HatLayer hat={hat} hatColor={hatColor} hatTrim={hatTrim} id={`${id}-hat`} color={color}/>
  </svg>;
}
