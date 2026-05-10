import type { CSSProperties } from 'react';
import { HamburgerIcon, SwordIcon, CrownIcon, StarSparkleIcon, BellIcon, FriendsIcon } from './icons';
import { useLobbyStore } from '../store/lobbyStore';

const iconBtnStyle: CSSProperties = {
  position: 'relative', width: 36, height: 36, borderRadius: 8,
  background: 'linear-gradient(180deg,#1B2C4A,#0E1A30)',
  border: '1px solid rgba(232,199,96,0.25)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', padding: 0,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.6)',
};

export const AppBar = () => {
  const openOverlay = useLobbyStore(s => s.openOverlay);
  return (
    <div className="navbar-bg" style={{
      height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 12px', position: 'relative', zIndex: 5, flexShrink: 0,
    }}>
      <button style={iconBtnStyle} onClick={() => openOverlay('help')}>
        <HamburgerIcon size={20}/>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)' }}>
          <CrownIcon size={16}/>
        </div>
        <SwordIcon size={18}/>
        <div className="heading gold-text" style={{ fontSize: 17, lineHeight: 1, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
          Stick Figure Quest
        </div>
        <div style={{ marginLeft: 1 }}><StarSparkleIcon size={10}/></div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button style={iconBtnStyle} onClick={() => openOverlay('notifs')}>
          <BellIcon size={18}/>
          <span style={{
            position: 'absolute', top: 1, right: 1,
            minWidth: 14, height: 14, borderRadius: 7,
            background: '#C53030', color: '#fff', fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid #0F1B2D',
            fontFamily: 'Inter, sans-serif',
          }}>2</span>
        </button>
        <button style={iconBtnStyle} onClick={() => openOverlay('profile')}>
          <FriendsIcon size={18}/>
        </button>
      </div>
    </div>
  );
};
