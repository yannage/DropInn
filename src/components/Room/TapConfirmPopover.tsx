import type { Action } from '../../data/campaign';

interface Props {
  action: Action | null;
  onCancel: () => void;
  onConfirm: (action: Action) => void;
}

export const TapConfirmPopover = ({ action, onCancel, onConfirm }: Props) => {
  if (!action) return null;
  return (
    <>
      <div
        onClick={onCancel}
        style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.5)' }}
      />
      <div style={{
        position: 'absolute', left: 14, right: 14, bottom: '28%',
        zIndex: 71,
        background: 'linear-gradient(180deg,#1A2B47,#0F1B2D)',
        border: '1.5px solid #E8C760',
        borderRadius: 10, padding: '14px',
        boxShadow: '0 14px 30px rgba(0,0,0,0.6)',
        animation: 'rewardSlideUp 0.25s ease both',
      }}>
        <div className="heading" style={{ fontSize: 10, letterSpacing: '0.16em', color: '#7a6a44', marginBottom: 8 }}>
          CONFIRM ACTION
        </div>
        <div className="body-serif" style={{ fontSize: 15, color: '#FFE9A8', lineHeight: 1.35, marginBottom: 4 }}>
          Commit <strong style={{ fontStyle: 'normal', color: '#E8C760' }}>{action.label}</strong>?
        </div>
        <div style={{
          fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 12,
          color: '#C9B888', marginBottom: 12,
        }}>
          {action.description}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px', borderRadius: 6, fontFamily: 'Cinzel, serif', fontSize: 11,
            background: 'linear-gradient(180deg,#1B2C4A,#0E1A30)', color: '#E8C760',
            border: '1px solid rgba(232,199,96,0.35)', cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(action)} style={{
            flex: 1, padding: '10px', borderRadius: 6, fontFamily: 'Cinzel, serif', fontSize: 11,
            background: 'linear-gradient(180deg,#E8C760,#8E6A1A)', color: '#3A2410',
            border: '1.5px solid #5C3F09', cursor: 'pointer',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
          }}>
            Commit ✦
          </button>
        </div>
        <div style={{
          marginTop: 8, fontFamily: 'Inter, sans-serif', fontSize: 9, color: '#5C3F09', textAlign: 'center',
        }}>
          Tip: drag the coin onto the table for the same effect.
        </div>
      </div>
    </>
  );
};
