import { Modal } from './Modal';
import { useLobbyStore } from '../../store/lobbyStore';

export const Profile = () => {
  const { closeOverlay, xp, spotlightTokens, hasSalve } = useLobbyStore();
  return (
    <Modal title="Profile" onClose={closeOverlay}
      footer={<button className="btn-secondary" onClick={closeOverlay}>Close</button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(180deg,#B68CF0,#4A1F8A)',
            border: '2px solid #E8C760',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 22, color: '#FFEFCB',
          }}>Y</div>
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#E8C760' }}>Yanni</div>
            <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 12, color: '#A99668' }}>
              Wizard · Level 3
            </div>
          </div>
        </div>

        {[
          { label: 'Total XP',          value: `${xp} XP`  },
          { label: 'Spotlight Tokens',  value: `${spotlightTokens} / 2` },
          { label: 'Healing Salve',     value: hasSalve ? 'Owned' : 'None' },
        ].map(row => (
          <div key={row.label} style={{
            display: 'flex', justifyContent: 'space-between',
            borderBottom: '1px dashed rgba(232,199,96,0.15)',
            paddingBottom: 8,
          }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#7a6a44' }}>{row.label}</span>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: '#FFE9A8' }}>{row.value}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
};
