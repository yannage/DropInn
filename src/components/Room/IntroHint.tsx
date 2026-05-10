import { HandCursor } from '../icons';

interface Props {
  visible: boolean;
  originX: number;
  originY: number;
}

export const IntroHint = ({ visible, originX, originY }: Props) => {
  if (!visible || originX == null) return null;
  return (
    <div style={{
      position: 'absolute', left: originX - 2, top: originY - 4,
      pointerEvents: 'none',
      animation: 'idleBob 1.2s ease-in-out infinite',
      zIndex: 55,
    }}>
      <HandCursor size={32}/>
    </div>
  );
};
