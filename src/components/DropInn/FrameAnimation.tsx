import { useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { FRAME_ATLASES, frameBackgroundPosition, framePlayback, type FrameAtlasName } from '../../lib/dropinn/frameAnimation';
import './frame-animation.css';

export interface FrameAnimationProps {
  atlas: FrameAtlasName;
  durationMs?: number;
  loop?: boolean;
  quiet?: boolean;
  /** Initial age of an existing visual beat. Remount with its event ID for a new beat. */
  elapsedMs?: number;
  posterFrame?: number;
  className?: string;
  style?: CSSProperties;
  /** Omit for decorative art. Loading text should be announced by its enclosing status. */
  label?: string;
  fallback?: ReactNode;
}

/** Actual raster frames, with no frame loop, gameplay timer, or animation completion gate. */
export function FrameAnimation({ atlas, durationMs, loop = false, quiet = false, elapsedMs = 0, posterFrame, className = '', style, label, fallback = null }: FrameAnimationProps) {
  const sheet = FRAME_ATLASES[atlas];
  const [initialElapsed] = useState(elapsedMs);
  const [mountedAt] = useState(() => performance.now());
  const [epoch, setEpoch] = useState({ age: initialElapsed, revision: 0 });
  const [ended, setEnded] = useState(false);
  const playback = framePlayback(atlas, durationMs, epoch.age, loop);
  const [asset, setAsset] = useState<{ src: string; ready: boolean; failed: boolean }>({ src: sheet.src, ready: false, failed: false });
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReduced(media.matches);
    const updateVisibility = () => setHidden(document.hidden);
    media.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    updateMotion(); updateVisibility();
    return () => { media.removeEventListener('change', updateMotion); document.removeEventListener('visibilitychange', updateVisibility); };
  }, []);
  useEffect(() => {
    let current = true;
    const image = new Image();
    image.onload = () => { if (current) setAsset({ src: sheet.src, ready: true, failed: false }); };
    image.onerror = () => { if (current) setAsset({ src: sheet.src, ready: false, failed: true }); };
    image.src = sheet.src;
    return () => { current = false; image.onload = null; image.onerror = null; };
  }, [sheet.src]);
  const ready = asset.src === sheet.src && asset.ready;
  const frozen = quiet || reduced || hidden;
  // A delayed asset or a hidden tab must never replay an old one-shot from frame zero.
  // Only these visibility/readiness changes reset CSS's clock; normal parent renders do not.
  useLayoutEffect(() => {
    setEpoch(previous => ({ age: initialElapsed + performance.now() - mountedAt, revision: previous.revision + 1 }));
    setEnded(false);
  }, [ready, frozen, sheet.src, durationMs, loop, initialElapsed, mountedAt]);
  const finished = playback.completed || ended;
  const poster = frameBackgroundPosition(posterFrame ?? sheet.posterFrame);
  return <span className={`di-frame-animation ${frozen ? 'is-frozen' : ''} ${ready ? 'is-ready' : ''} ${className}`}
    data-frame-atlas={atlas} data-frame-state={ready ? frozen ? 'poster' : finished ? 'finished' : 'playing' : asset.failed && asset.src === sheet.src ? 'error' : 'loading'}
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
    style={{ '--frame-sheet': `url("${sheet.src}")`, '--frame-duration': `${playback.duration}ms`, '--frame-delay': `${-playback.offset}ms`, '--frame-iterations': loop ? 'infinite' : 1,
      '--frame-poster': poster, '--frame-ratio': `${sheet.width / sheet.columns} / ${sheet.height / sheet.rows}`, ...style } as CSSProperties}>
    {ready ? <span key={epoch.revision} className={`di-frame-cells ${finished ? 'is-finished' : ''}`} onAnimationEnd={event => { if (!loop && event.animationName === 'di-painted-frames') setEnded(true); }} /> : <span className="di-frame-fallback">{fallback}</span>}
  </span>;
}
