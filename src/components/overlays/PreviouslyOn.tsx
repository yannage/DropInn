import { useState, useEffect } from 'react';

interface Props {
  onContinue: () => void;
  completed: boolean;
}

export const PreviouslyOn = ({ onContinue, completed }: Props) => {
  const [seconds, setSeconds] = useState(8);

  useEffect(() => {
    if (seconds <= 0) { onContinue(); return; }
    const id = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds, onContinue]);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      background: 'radial-gradient(ellipse at 50% 50%, rgba(15,27,45,0.8) 0%, rgba(8,12,20,0.95) 80%)',
      backdropFilter: 'blur(4px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '14px',
      animation: 'fade-in 0.4s ease',
    }}>
      <div className="prev-card" style={{ position: 'relative', top: 'auto', left: 'auto', right: 'auto' }}>
        <div className="ribbon">Previously on</div>
        <h3 style={{ marginTop: 14 }}>The Dragon of Ash Hollow</h3>
        <div className="summary">
          Yanni and Bram have arrived in <em>Thornwick</em>. The town is uneasy — smoke rises from the
          northern road where the dragon was last seen. The villagers speak of a gremlin merchant who
          may know more.
        </div>
        <div className="prev-strip">
          <strong>The Party</strong>
          Yanni the Wizard · Bram the Fighter · You (drop-in)
        </div>
        <div className="prev-strip">
          <strong>World State</strong>
          {completed
            ? 'You convinced Pip to talk. Bram found a healing salve. The dragon awaits in Ash Hollow.'
            : 'Villages razed: 1 of 5 · Turn 3 · Pip Bramblebottom (suspicious gremlin) eyes you from his stall.'}
        </div>
        <div className="countdown">
          <span>Beginning in {seconds}s…</span>
          <button className="skip" onClick={onContinue}>Skip ›</button>
        </div>
      </div>
    </div>
  );
};
