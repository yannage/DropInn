import { Modal } from './Modal';
import { useLobbyStore } from '../../store/lobbyStore';

const STEPS = [
  { glyph: '📜', title: 'Read the scene', body: 'The scroll shows what\'s happening. Watch for Pip\'s reactions.' },
  { glyph: '🪙', title: 'Pick an action', body: 'Drag a coin onto the table, or tap to confirm. You have 30 seconds.' },
  { glyph: '🎲', title: 'Roll resolves', body: 'Your trait modifier + d20 vs DC. Higher is better.' },
  { glyph: '✦', title: 'Use a Spotlight', body: 'Tap the gold token to narrate your own action. Costs 1 token.' },
];

export const Help = () => {
  const closeOverlay = useLobbyStore(s => s.closeOverlay);
  return (
    <Modal title="How to Play" onClose={closeOverlay}
      footer={<button className="btn-primary" onClick={closeOverlay}>Got it</button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{s.glyph}</span>
            <div>
              <div style={{
                fontFamily: 'Cinzel, serif', fontSize: 12, color: '#E8C760',
                letterSpacing: '0.08em', marginBottom: 3,
              }}>{s.title}</div>
              <div style={{ fontFamily: 'EB Garamond, serif', fontSize: 13, color: '#E8D9B4', lineHeight: 1.45 }}>
                {s.body}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
