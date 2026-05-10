import { ShieldEmblem, TurnBadgeShield, DragonHead } from '../icons';
import { useLobbyStore } from '../../store/lobbyStore';

interface Props {
  turn: number;
  razed?: number;
  total?: number;
}

export const SceneHeader = ({ turn, razed = 1, total = 5 }: Props) => {
  const openOverlay = useLobbyStore(s => s.openOverlay);

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(180deg,#1F3160 0%, #182747 100%)',
      border: '1px solid rgba(232,199,96,0.35)',
      borderLeft: 'none', borderRight: 'none',
      height: 78,
      display: 'flex', alignItems: 'center',
      paddingLeft: 8, paddingRight: 8, gap: 8,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 0 rgba(0,0,0,0.4)',
      zIndex: 4,
      flexShrink: 0,
    }}>
      <div style={{ flexShrink: 0, marginTop: -2 }}><ShieldEmblem size={42}/></div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div className="heading gold-text" style={{ fontSize: 15, letterSpacing: '0.06em', lineHeight: 1.1 }}>
          Thornwick<br/>Market
        </div>
        <button
          onClick={() => openOverlay('npc')}
          style={{
            background: 'rgba(232,199,96,0.1)',
            border: '1px solid rgba(232,199,96,0.3)',
            borderRadius: 4, padding: '2px 6px', cursor: 'pointer',
            fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 11, color: '#C9B888',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 10 }}>👤</span> Pip
        </button>
      </div>

      <div style={{
        position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))',
      }}>
        <TurnBadgeShield turn={turn} size={62}/>
      </div>

      <div style={{ flex: 1 }}/>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, paddingRight: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <DragonHead size={28}/>
          <div className="ui-num" style={{ fontSize: 11, color: '#E8D9B4', letterSpacing: '0.04em' }}>
            Villages razed: <span style={{ color: '#FFE9A8' }}>{razed} / {total}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3, height: 8, width: 120 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              flex: 1,
              background: i < razed
                ? 'linear-gradient(180deg,#F36A6A,#7E1A1A)'
                : 'linear-gradient(180deg,#1F0808,#0a0303)',
              borderRadius: 2,
              border: '1px solid rgba(0,0,0,0.6)',
              boxShadow: i < razed ? 'inset 0 1px 0 rgba(255,200,200,0.4)' : 'none',
            }}/>
          ))}
        </div>
      </div>
    </div>
  );
};
