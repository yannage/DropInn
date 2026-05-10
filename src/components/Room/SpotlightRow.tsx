import { SpotlightCoin, StarSparkleIcon } from '../icons';
import { useLobbyStore } from '../../store/lobbyStore';

interface Props {
  tokensLeft: number;
}

export const SpotlightRow = ({ tokensLeft }: Props) => {
  const openOverlay = useLobbyStore(s => s.openOverlay);

  return (
    <div className="panel-bg" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36,
      padding: '8px 12px', borderTop: '1px solid rgba(232,199,96,0.18)',
      flexShrink: 0,
    }}>
      {[0, 1].map(i => {
        const used = i >= tokensLeft;
        return (
          <div
            key={i}
            onClick={() => { if (!used) openOverlay('spotlight'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, position: 'relative',
              cursor: used ? 'default' : 'pointer',
              opacity: used ? 0.35 : 1,
              transition: 'opacity 0.3s',
            }}
          >
            <div style={{ filter: used ? 'none' : 'drop-shadow(0 0 10px rgba(255,221,120,0.5))' }}>
              <SpotlightCoin size={32}/>
            </div>
            <div className="heading gold-text" style={{ fontSize: 12, letterSpacing: '0.1em' }}>SPOTLIGHT</div>
            {i === 0 && !used && (
              <div style={{ position: 'absolute', right: -14, top: -2 }}>
                <StarSparkleIcon size={10}/>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
