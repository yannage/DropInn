import { SpotlightCoin } from '../icons';
import type { RollResult } from '../../lib/engine';

interface Props {
  onContinue: () => void;
  dismissing: boolean;
  rollResult: RollResult | null;
  sceneRound: number;
  isSceneComplete: boolean;
  onSpotlightCommit: (text: string) => void;
}

export const RewardCard = ({ onContinue, dismissing, rollResult, sceneRound, isSceneComplete }: Props) => (
  <div style={{
    position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 80,
    padding: '12px 14px 18px',
    background: 'linear-gradient(180deg, #1F3160 0%, #0E1A30 100%)',
    borderTop: '2px solid #E8C760',
    boxShadow: '0 -10px 24px rgba(0,0,0,0.7)',
    animation: dismissing
      ? 'cardOut 0.45s ease-in forwards'
      : 'rewardSlideUp 0.6s cubic-bezier(.34,1.56,.64,1) both',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ filter: 'drop-shadow(0 0 12px rgba(255,221,120,0.7))' }}>
        <SpotlightCoin size={48}/>
      </div>
      <div style={{ flex: 1 }}>
        {isSceneComplete ? (
          <>
            <div className="heading gold-text" style={{ fontSize: 14, letterSpacing: '0.1em' }}>SCENE COMPLETE</div>
            <div className="body-serif" style={{ fontSize: 14, color: '#FFEFCB', marginTop: 3 }}>
              <span className="ui-num" style={{ color: '#FFE9A8' }}>+50 XP</span>. Bram found a{' '}
              <span style={{ color: '#6EE7B7' }}>Healing Salve</span>.
            </div>
          </>
        ) : (
          <>
            <div className="heading gold-text" style={{ fontSize: 14, letterSpacing: '0.1em' }}>
              TURN {sceneRound} / 3
            </div>
            <div className="body-serif" style={{ fontSize: 14, color: '#FFEFCB', marginTop: 3 }}>
              Press on — the gremlin is not done with you yet.
            </div>
          </>
        )}
        {rollResult && (
          <div className="ui-num" style={{
            fontSize: 10, marginTop: 4,
            color: rollResult.success ? '#6EE7B7' : '#F87171',
          }}>
            Roll: d20+{rollResult.mod} = {rollResult.total} — {rollResult.success ? 'Success' : 'Partial success'}
          </div>
        )}
      </div>
      <button
        onClick={onContinue}
        className="heading"
        style={{
          padding: '10px 14px',
          background: 'linear-gradient(180deg,#E8C760,#8E6A1A)',
          border: '1.5px solid #5C3F09',
          borderRadius: 8, color: '#3A2410', fontSize: 12, letterSpacing: '0.1em',
          cursor: 'pointer',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.6)',
        }}
      >
        {isSceneComplete ? 'FINISH' : 'CONTINUE'}
      </button>
    </div>
  </div>
);
