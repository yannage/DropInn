import { useState, type ReactNode } from 'react';
import { FrameAnimation } from './FrameAnimation';
import './loading-inn.css';

export function LoadingInn({ label = 'Opening the inn…', detail, compact = false }: { label?: string; detail?: ReactNode; compact?: boolean }) {
  const [quiet] = useState(() => { try { return localStorage.getItem('dropinn-effects') === 'off'; } catch { return false; } });
  return <div className={`di-loading-inn ${compact ? 'is-compact' : 'is-screen'}`} role="status" aria-live="polite" aria-atomic="true">
    <FrameAnimation atlas="sheep-loading" loop quiet={quiet} className="di-loading-sheep" fallback={<img src="/art/story-lantern.webp" alt="" draggable={false} onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />} />
    <div className="di-loading-copy">{compact ? <span>{label}</span> : <h1>{label}</h1>}{detail && <p>{detail}</p>}</div>
  </div>;
}
