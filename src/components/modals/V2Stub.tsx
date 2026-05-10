import { Modal } from './Modal';
import { useLobbyStore } from '../../store/lobbyStore';

export const V2Stub = () => {
  const closeOverlay = useLobbyStore(s => s.closeOverlay);
  return (
    <Modal title="Coming in V2" onClose={closeOverlay}
      footer={<button className="btn-primary" onClick={closeOverlay}>Got it</button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>🐉</div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#E8C760', letterSpacing: '0.08em' }}>
          The Dragon Awaits
        </div>
        <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 14, color: '#E8D9B4', lineHeight: 1.55 }}>
          Scene 2 — Ash Hollow — is coming in V2 with live WebSocket multiplayer. The dragon is patient.
          It has been counting smoke rings.
        </div>
        <div style={{
          fontFamily: 'Inter, sans-serif', fontSize: 9, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: '#7a6a44', marginTop: 4,
        }}>
          · MULTIPLAYER · REAL-TIME TURNS · VOICE NARRATION ·
        </div>
      </div>
    </Modal>
  );
};
