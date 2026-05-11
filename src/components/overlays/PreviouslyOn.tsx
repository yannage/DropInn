import { useEffect, useState } from 'react';

interface Props {
  onContinue: () => void;
  completed: boolean;
}

export const PreviouslyOn = ({ onContinue, completed }: Props) => {
  const [seconds, setSeconds] = useState(8);

  useEffect(() => {
    if (seconds <= 0) {
      onContinue();
      return undefined;
    }

    const id = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds, onContinue]);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 60,
      background: 'radial-gradient(ellipse at 50% 50%, rgba(15,27,45,0.8) 0%, rgba(8,12,20,0.95) 80%)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '14px',
      animation: 'fade-in 0.4s ease',
    }}>
      <div className="prev-card" style={{ position: 'relative', top: 'auto', left: 'auto', right: 'auto' }}>
        <div className="ribbon">Previously on</div>
        <h3 style={{ marginTop: 14 }}>The Dragon of Ash Hollow</h3>
        <div className="summary">
          Smoke rolls through <em>Ash Hollow</em>. The party has tracked the dragon trail to the
          burned treeline, but an ash-black warg breaks cover before anyone can press deeper.
        </div>
        <div className="prev-strip">
          <strong>The Party</strong>
          Saved heroes, one committed action each round, shared consequences.
        </div>
        <div className="prev-strip">
          <strong>World State</strong>
          {completed
            ? 'The last ambush was cleared. The party keeps its scars, XP, and hard-won gear.'
            : 'Enemy sighted. Shared HP is live. Every hero acts before the counterattack.'}
        </div>
        <div className="countdown">
          <span>Beginning in {seconds}s...</span>
          <button className="skip" onClick={onContinue}>Skip</button>
        </div>
      </div>
    </div>
  );
};

