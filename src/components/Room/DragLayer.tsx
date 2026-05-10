import type { DragState } from '../../store/gameStore';

interface Props {
  drag: DragState | null;
}

export const DragLayer = ({ drag }: Props) => {
  if (!drag) return null;
  const { Coin, x, y, trail } = drag;
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
        left: x - 31, top: y - 31,
        pointerEvents: 'none',
        zIndex: 60,
        filter: 'drop-shadow(0 0 14px rgba(167,139,250,0.9)) drop-shadow(0 8px 16px rgba(0,0,0,0.6))',
        transform: `scale(${drag.hover ? 1.12 : 1.05})`,
        transition: 'transform 0.12s',
      }}>
        <Coin size={62}/>
      </div>
    </>
  );
};
