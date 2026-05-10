import { Modal } from './Modal';
import { useLobbyStore } from '../../store/lobbyStore';

const NOTIFS = [
  { icon: '⚔️', text: 'Bram has joined the room.',            time: '2m ago' },
  { icon: '🐉', text: 'A dragon was spotted near Ash Hollow.', time: '1h ago' },
];

export const Notifications = () => {
  const closeOverlay = useLobbyStore(s => s.closeOverlay);
  return (
    <Modal title="Notifications" onClose={closeOverlay}
      footer={<button className="btn-secondary" onClick={closeOverlay}>Close</button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {NOTIFS.map((n, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px',
            background: 'rgba(232,199,96,0.04)',
            border: '1px solid rgba(232,199,96,0.12)',
            borderRadius: 6,
          }}>
            <span style={{ fontSize: 20 }}>{n.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'EB Garamond, serif', fontSize: 13, color: '#E8D9B4' }}>{n.text}</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: '#5C3F09', marginTop: 2 }}>{n.time}</div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
