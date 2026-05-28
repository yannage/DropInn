import { BackpackIcon, DoorIcon, HeartIcon, HelpIcon, SpotlightCoin } from '../icons';
import { useLobbyStore } from '../../store/lobbyStore';
import type { CharacterProfile } from '../../lib/character';
import { YANNI_TRAITS } from '../../data/campaign';

interface Props {
  character?: CharacterProfile;
  hp?: number;
  maxHp?: number;
  xp: number;
  tokensLeft: number;
}

export const RoomFooterRail = ({ character, hp = 8, maxHp = 10, xp, tokensLeft }: Props) => {
  const openOverlay = useLobbyStore(state => state.openOverlay);
  const resolvedHp = character?.hp ?? hp;
  const resolvedMaxHp = character?.maxHp ?? maxHp;
  const traits = character?.traits ?? YANNI_TRAITS;

  return (
    <footer className="room-footer">
      <div className="room-footer__hero">
        <div className="room-footer__name">
          <span className="body-serif">Yanni</span>
          <span className="room-footer__xp">{character?.xp ?? xp} XP</span>
        </div>
        <div className="room-footer__stats">
          <div className="room-footer__hp">
            <HeartIcon size={14} />
            <span>{resolvedHp}/{resolvedMaxHp}</span>
          </div>
          <div className="room-footer__traits">
            INT +{traits.INT} · ING +{traits.ING} · CHA +{traits.CHA}
          </div>
        </div>
      </div>

      <button className="room-footer__spotlight" onClick={() => tokensLeft > 0 && openOverlay('spotlight')}>
        <SpotlightCoin size={28} />
        <span className="heading">Spotlight</span>
        <span>{tokensLeft}/2</span>
      </button>

      <div className="room-footer__actions">
        <button onClick={() => openOverlay('inventory')} aria-label="Inventory"><BackpackIcon size={18} /></button>
        <button onClick={() => openOverlay('help')} aria-label="Help"><HelpIcon size={18} /></button>
        <button onClick={() => openOverlay('leave')} aria-label="Leave"><DoorIcon size={18} /></button>
      </div>
    </footer>
  );
};
