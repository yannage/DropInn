import { useId } from 'react';
import type { CharacterProfile } from '../../lib/character';
import { heroAccent } from '../../lib/character';
import { HERO_HATS, HERO_PARTS, ALL_HAT_STYLES, SHEPHERD_STYLE_ART, normalizeCustomization, type HeroArt, type HeroAppearance, type HeroHat } from '../../lib/cosmetics';

export type AvatarHero = Pick<CharacterProfile, 'name' | 'classKey' | 'accent'> & Partial<Pick<CharacterProfile, 'appearance' | 'equipment' | 'inventory' | 'cosmeticUnlocks'>>;

// One fixed pencil wobble for the complete drawing (including its tint mask).
// Never animate the seed: tiny table portraits should not shimmer or crawl.
function PencilEdges({ id }: { id: string }) {
  return <defs>
    <filter id={id} filterUnits="userSpaceOnUse" x="-4" y="-4" width="264" height="264" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.18" numOctaves="1" seed="17" result="pencil" />
      <feComponentTransfer in="pencil" result="steps">
        <feFuncR type="discrete" tableValues="0 .25 .5 .75 1" />
        <feFuncG type="discrete" tableValues="0 .25 .5 .75 1" />
      </feComponentTransfer>
      <feDisplacementMap in="SourceGraphic" in2="steps" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>;
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
  const parts = (Object.keys(appearance) as (keyof HeroAppearance)[]).map(key => HERO_PARTS[key].find(part => part.id === appearance[key])!);
  const hat = HERO_HATS.find(hat => hat.id === equipment.hat);
  return <svg className={`di-avatar ${className}`} viewBox={faceOnly ? '70 96 116 98' : '0 0 256 256'} role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : `${hero.name || 'Your hero'}${hat ? ` wearing ${hat.label}` : ', no hat'}`}>
    <PencilEdges id={`${id}-pencil`} />
    <g filter={`url(#${id}-pencil)`}>
      {parts.map((part, index) => <ArtLayer key={`${index}-${part.id}`} art={part.art} color={heroAccent(hero.accent, hero.classKey)} maskId={`${id}-${index}`} />)}
      {hat && <HatLayer hat={hat} hatColor={equipment.hatColor} hatTrim={equipment.hatTrim} id={`${id}-hat`} color={heroAccent(hero.accent,hero.classKey)}/>}
    </g>
  </svg>;
}

export function HeroHatPreview({ hat, color = '#e0bd70',hatColor,hatTrim }: { hat: HeroHat; color?: string;hatColor?:string|null;hatTrim?:string|null }) {
  const id = useId().replace(/:/g, '');
  return <svg className="di-hat-art" viewBox="0 0 256 140" aria-hidden="true">
    <PencilEdges id={`${id}-pencil`} />
    <g filter={`url(#${id}-pencil)`}><HatLayer hat={hat} hatColor={hatColor} hatTrim={hatTrim} id={`${id}-hat`} color={color}/></g>
  </svg>;
}
