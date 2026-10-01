import { Pencil } from 'lucide-react';
import { displayHeroName } from '../../lib/cosmetics';
import { HeroAvatar, type AvatarHero } from './HeroAvatar';
import './hero-menu.css';

export function HeroMenuButton({
  hero,
  disabled = false,
  onClick,
}: {
  hero: AvatarHero;
  disabled?: boolean;
  onClick: () => void;
}) {
  const name = displayHeroName(hero) || 'Your hero';

  return (
    <button
      type="button"
      className="di-hero-menu-button"
      aria-label="Customize hero from header"
      aria-haspopup="dialog"
      title={`${name} · Customize hero`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="di-hero-menu-portrait" aria-hidden="true">
        <HeroAvatar hero={hero} decorative />
        <span className="di-hero-menu-pencil"><Pencil size={11} strokeWidth={2.5} /></span>
      </span>
      <span className="di-hero-menu-copy" aria-hidden="true">
        <strong>{name}</strong>
        <small>Customize hero</small>
      </span>
    </button>
  );
}
