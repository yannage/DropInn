import { useState } from 'react';
import { useLobbyStore } from '../../store/lobbyStore';
import { BellIcon, FriendsIcon } from '../icons';
import { RoomCard } from './RoomCard';
import { FilterSheet } from './FilterSheet';

const FILTERS = [
  { id: 'progress',   label: 'Progress'  },
  { id: 'players',    label: 'Players'   },
  { id: 'duration',   label: '30s'       },
  { id: 'theme',      label: 'Theme'     },
  { id: 'visibility', label: 'Public'    },
];

export const Lobby = () => {
  const lobby = useLobbyStore();
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [filterSheetKind, setFilterSheetKind] = useState<string | null>(null);
  const [emptyView, setEmptyView] = useState(false);

  const { completed, xp } = lobby;

  const room = {
    title: 'The Dragon of Ash Hollow',
    statusDot: 'sleeping',
    statusBadge: completed ? 'complete' : 'sleeping',
    statusLabel: completed ? 'Scene Complete' : 'Sleeping · 2d',
    theme: 'Dragon Slaying',
    party: [
      { color: 'purple', initial: 'Y', name: 'Yanni' },
      { color: 'green',  initial: 'B', name: 'Bram'  },
    ],
    maxPlayers: 4,
    turnDuration: '30s',
    visibilityIcon: '🌐',
    progress: completed ? 50 : 30,
    progressLabel: completed ? 'Scene 2 of 3 · 50%' : 'Scene 1 of 3 · 30%',
    lastBeat: completed
      ? 'You convinced Pip to talk. Bram pocketed a healing salve.'
      : 'Yanni and Bram await in Thornwick Market.',
    cta: completed ? 'Continue Adventure' : 'Wake the Room',
  };

  const handleRoomTap = () => {
    if (completed) {
      lobby.openOverlay('v2stub');
    } else {
      lobby.setScreen('previously');
    }
  };

  return (
    <div className="lobby-bg">
      {/* HEADER */}
      <div className="navbar-bg" style={{
        height: 54,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px',
        borderBottom: '1px solid rgba(232,199,96,0.18)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            onClick={() => lobby.openOverlay('profile')}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(180deg,#B68CF0,#4A1F8A)',
              border: '2px solid #E8C760', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Cinzel, serif', fontWeight: 700, color: '#FFEFCB', fontSize: 14,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 0 6px rgba(232,199,96,0.4)',
            }}
          >Y</div>
          <div>
            <div style={{
              fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em',
              background: 'linear-gradient(180deg, #FCE89B 0%, #E8C760 45%, #B8902E 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              lineHeight: 1,
            }}>Adventures</div>
            <div style={{
              fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 11, color: '#A99668',
              marginTop: 1,
            }}>Yanni · Wizard · Lvl 3 · {xp} XP</div>
          </div>
        </div>
        <div
          onClick={() => lobby.openOverlay('notifs')}
          style={{
            position: 'relative', cursor: 'pointer', width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(180deg,#1B2C4A,#0E1A30)',
            border: '1px solid rgba(232,199,96,0.3)', borderRadius: 8,
          }}
        >
          <BellIcon size={18}/>
          <div style={{
            position: 'absolute', top: -3, right: -3, width: 14, height: 14, borderRadius: '50%',
            background: '#A02828', border: '1.5px solid #0F1B2D', color: '#FFE9A8',
            fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>2</div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="filter-bar">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`chip ${activeFilters[f.id] ? 'on' : ''}`}
            onClick={() => setFilterSheetKind(f.id)}
          >
            {f.label} <span style={{ opacity: 0.6 }}>▾</span>
          </button>
        ))}
        {Object.keys(activeFilters).length > 0 && (
          <button className="chip clear" onClick={() => { setActiveFilters({}); setEmptyView(false); }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* LIST */}
      {emptyView ? (
        <div className="empty-state">
          <div className="glyph">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="17" cy="17" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M24 24 L32 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h3>NO CAMPAIGNS MATCH</h3>
          <p>The realm holds no quests of that nature. Try a different theme, or clear your filters.</p>
          <button className="btn-secondary" style={{ flex: 'none', padding: '8px 16px' }}
            onClick={() => { setActiveFilters({}); setEmptyView(false); }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="lobby-list">
          <div style={{
            fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.16em', color: '#7a6a44',
            textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ flex: 1, height: 1, background: 'rgba(232,199,96,0.18)' }}/>
            <span>Continue Where You Left Off</span>
            <span style={{ flex: 1, height: 1, background: 'rgba(232,199,96,0.18)' }}/>
          </div>
          <RoomCard room={room} featured onTap={handleRoomTap}/>

          <div style={{
            fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.16em', color: '#7a6a44',
            textTransform: 'uppercase', marginTop: 6,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ flex: 1, height: 1, background: 'rgba(232,199,96,0.18)' }}/>
            <span>Discover · Open to Drop-Ins</span>
            <span style={{ flex: 1, height: 1, background: 'rgba(232,199,96,0.18)' }}/>
          </div>

          <div className="room-card" style={{ opacity: 0.55 }}>
            <div className="room-row">
              <div className="room-title">The Stolen Crown</div>
              <span className="status-dot active"/>
              <span className="status-badge active">Active · 3</span>
            </div>
            <div className="theme-tag">Heist · Royal Court</div>
            <div className="room-row" style={{ justifyContent: 'space-between' }}>
              <div className="avatars">
                <div className="a red">M</div>
                <div className="a green">T</div>
                <div className="a purple">K</div>
                <div className="a empty">+</div>
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#A99668' }}>⏱ 60s · 🌐</div>
            </div>
            <div className="room-row" style={{ gap: 8 }}>
              <div className="pbar"><div style={{ width: '70%' }}/></div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#A99668', letterSpacing: '0.06em' }}>
                Scene 4 of 5
              </div>
            </div>
            <div style={{
              fontFamily: 'Inter, sans-serif', fontSize: 9, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: '#7a6a44', textAlign: 'center', paddingTop: 4,
            }}>· COMING IN V2 ·</div>
          </div>
          <div style={{ height: 8 }}/>
        </div>
      )}

      {/* ACTION BAR */}
      <div className="lobby-actionbar">
        <button className="btn-primary disabled" disabled>✦ Create Adventure</button>
        <button className="btn-secondary" onClick={() => setEmptyView(false)}>My Campaigns</button>
      </div>

      {filterSheetKind && (
        <FilterSheet
          kind={filterSheetKind}
          active={activeFilters[filterSheetKind]}
          onClose={() => setFilterSheetKind(null)}
          onPick={val => {
            const next = { ...activeFilters };
            if (val == null) delete next[filterSheetKind]; else next[filterSheetKind] = val;
            setActiveFilters(next);
            if (filterSheetKind === 'theme' && val && val !== 'Dragon') setEmptyView(true);
            else setEmptyView(false);
            setFilterSheetKind(null);
          }}
        />
      )}
    </div>
  );
};
