import { useEffect, useState } from 'react';
import './stage-atmosphere.css';

/** Ambient motion is local decoration; it never advances a turn or signals a result. */
export function useVisibleTable() {
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}

export function stageIdle(id: string, changed?: boolean, enemy?: boolean) {
  if (enemy) return 'menace';
  if (['mara', 'ferryman', 'teacup-pella', 'teacup-guests', 'teacup-return-guests', 'tomorrow-brindle'].includes(id)) return 'breathe';
  if (id === 'herd' || (id === 'captives' && changed)) return 'graze';
  if (id === 'reeds' || id === 'teacup-sail') return 'sway';
  // The stranded boat stays grounded until its confirmed development.
  if ((id === 'boat' || id === 'bell') && changed) return 'rock';
  return 'none';
}

export function StageAtmosphere({ environment, quiet }: { environment: string; quiet: boolean }) {
  if (quiet) return null;
  const leaves = environment === 'village' || environment === 'orchard';
  const water = environment === 'river';
  const sky = environment === 'teacup';
  const lights = environment === 'chapel' || environment === 'tomorrow';
  if (!leaves && !water && !sky && !lights) return null;
  return <div className="di-stage-atmosphere" data-environment={environment} aria-hidden="true">
    <div className="di-ambient-light" />
    {(leaves || lights) && <div className={`di-ambient-motes ${leaves ? 'is-leaves' : 'is-lights'}`}>
      {[0, 1, 2, 3].map(index => <i key={index} data-ambient-mote="" />)}
    </div>}
    {(water || sky) && <div className="di-ambient-mist"><i /><i /></div>}
    {water && <div className="di-ambient-ripples"><i /><i /><i /></div>}
    {leaves && <svg className="di-ambient-grass" viewBox="0 0 1000 100" preserveAspectRatio="none">
      <g><path d="M0 100 Q18 48 8 29 M16 100 Q30 55 43 50 M29 100 Q48 80 60 79 M945 100 Q961 52 954 37 M969 100 Q975 59 993 49 M991 100 Q988 79 1000 74" /></g>
      <g><path d="M55 100 Q72 67 67 53 M80 100 Q93 83 103 83 M897 100 Q912 72 910 65 M917 100 Q930 85 941 84" /></g>
    </svg>}
  </div>;
}
