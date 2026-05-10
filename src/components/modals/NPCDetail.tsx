import { Modal } from './Modal';
import { useLobbyStore } from '../../store/lobbyStore';
import { PIP } from '../../data/campaign';

export const NPCDetail = () => {
  const closeOverlay = useLobbyStore(s => s.closeOverlay);
  return (
    <Modal title={PIP.name} onClose={closeOverlay}
      footer={<button className="btn-secondary" onClick={closeOverlay}>Close</button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'linear-gradient(180deg,#5a8040,#2a4018)',
            border: '2px solid #E8C760',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>🧌</div>
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#E8C760', marginBottom: 2 }}>{PIP.name}</div>
            <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 12, color: '#A99668' }}>
              {PIP.species} · {PIP.role}
            </div>
          </div>
        </div>

        <div style={{ fontFamily: 'EB Garamond, serif', fontSize: 13, color: '#E8D9B4', fontStyle: 'italic', lineHeight: 1.5 }}>
          {PIP.tagline}
        </div>

        <div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.12em', color: '#7a6a44', marginBottom: 4 }}>
            TRAITS
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PIP.traits.map(t => (
              <span key={t} style={{
                fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#A99668',
                background: 'rgba(232,199,96,0.08)',
                border: '1px solid rgba(232,199,96,0.2)',
                borderRadius: 4, padding: '2px 8px',
              }}>{t}</span>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.12em', color: '#7a6a44', marginBottom: 4 }}>
            WHAT HE WANTS
          </div>
          <div style={{ fontFamily: 'EB Garamond, serif', fontSize: 13, color: '#E8D9B4', lineHeight: 1.5 }}>
            {PIP.motivation}
          </div>
        </div>
      </div>
    </Modal>
  );
};
