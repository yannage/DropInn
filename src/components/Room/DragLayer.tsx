import type { DragState } from '../../store/gameStore';
import { ActionChip3D } from './ActionChip3D';
import { getActionGlyph, getActionVisual } from './actionVisuals';

interface Props {
  drag: DragState | null;
}

export const DragLayer = ({ drag }: Props) => {
  if (!drag) return null;
  const { action, x, y, trail } = drag;
  const visual = getActionVisual(action);
  return (
    <>
      {trail.map(t => (
        <div key={t.id} style={{
          position: 'absolute',
          left: t.x - 4, top: t.y - 4,
          width: 8, height: 8, borderRadius: '50%',
          background: 'radial-gradient(circle, #E8DAFA, #8E5BD9 60%, transparent 75%)',
          opacity: t.life,
          transform: `scale(${0.4 + t.life * 0.7})`,
          pointerEvents: 'none',
          mixBlendMode: 'screen',
          zIndex: 50,
        }}/>
      ))}
      <div style={{
        position: 'absolute',
        left: x - 44, top: y - 44,
        pointerEvents: 'none',
        zIndex: 60,
        filter: `drop-shadow(0 0 18px ${visual.glow}) drop-shadow(0 12px 18px rgba(0,0,0,0.6))`,
        transform: `scale(${drag.hover ? 1.12 : 1.05})`,
        transition: 'transform 0.12s',
      }}>
        <ActionChip3D
          label={action.label}
          glyph={getActionGlyph(action)}
          topColor={visual.top}
          edgeColor={visual.edge}
          glowColor={visual.glow}
          size={88}
        />
      </div>
    </>
  );
};
