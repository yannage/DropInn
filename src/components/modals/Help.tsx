import { Modal } from './Modal';
import { useLobbyStore } from '../../store/lobbyStore';

const STEPS = [
  { glyph: 'HP', title: 'Watch the bars', body: 'Enemy HP and party HP are the core state. If everyone drops, the encounter fails.' },
  { glyph: 'A', title: 'Pick an action', body: 'Choose Strike, Heavy, Guard, or Aid. You have 30 seconds to commit.' },
  { glyph: 'D20', title: 'Turn resolves', body: 'All committed actions resolve together, then the enemy attacks if still alive.' },
  { glyph: 'XP', title: 'Claim rewards', body: 'Victory gives +75 XP and gear. Failure still gives +15 XP so the run matters.' },
];

export const Help = () => {
  const closeOverlay = useLobbyStore((state) => state.closeOverlay);
  return (
    <Modal
      title="How to Play"
      onClose={closeOverlay}
      footer={<button className="btn-primary" onClick={closeOverlay}>Got it</button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {STEPS.map((step) => (
          <div key={step.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{
              minWidth: 34,
              height: 28,
              borderRadius: 6,
              border: '1px solid rgba(232,199,96,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Cinzel, serif',
              fontSize: 10,
              color: '#E8C760',
              flexShrink: 0,
            }}>
              {step.glyph}
            </span>
            <div>
              <div style={{
                fontFamily: 'Cinzel, serif',
                fontSize: 12,
                color: '#E8C760',
                letterSpacing: '0.08em',
                marginBottom: 3,
              }}>{step.title}</div>
              <div style={{ fontFamily: 'EB Garamond, serif', fontSize: 13, color: '#E8D9B4', lineHeight: 1.45 }}>
                {step.body}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};

