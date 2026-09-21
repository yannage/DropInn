import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Dice5, Sparkles } from 'lucide-react';
import './timing-feel.css';

const DURATION_MS = 1200;
const ASSISTED_RELEASE_MS = 800;
const ASSISTED_STORAGE_KEY = 'dropinn:assisted-release:v1';

export interface TimedReleaseProps {
  disabled: boolean;
  turn: number;
  deadline: number;
  onCommit: (releaseMs?: number) => void;
  onHoldingChange?: (holding: boolean) => void;
}

type ReleaseContext = Pick<TimedReleaseProps, 'disabled' | 'turn' | 'deadline'>;

/** Owns the attempt separately from rendering so cancellation and deadlines share one path. */
export function createTimedReleaseController(options: {
  getContext: () => ReleaseContext;
  onCommit: (releaseMs?: number) => void;
  onHoldingChange: (holding: boolean) => void;
}) {
  let attempt: { startedAt: number; context: ReleaseContext; assisted: boolean } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let committed = false;

  function cancel() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (!attempt) return;
    attempt = null;
    options.onHoldingChange(false);
  }

  function allowed(context: ReleaseContext) {
    return !context.disabled && Number.isFinite(context.deadline) && Date.now() < context.deadline;
  }

  function finish(releaseMs: number) {
    if (!attempt) return;
    const started = attempt;
    const current = options.getContext();
    const valid = !committed && allowed(current)
      && current.turn === started.context.turn && current.deadline === started.context.deadline;
    cancel();
    if (!valid) return;
    committed = true;
    options.onCommit(releaseMs);
  }

  return {
    start(assisted = false) {
      const context = options.getContext();
      if (attempt || committed || !allowed(context)) return false;
      attempt = { startedAt: Date.now(), context: { ...context }, assisted };
      const releaseMs = assisted ? ASSISTED_RELEASE_MS : DURATION_MS;
      timer = setTimeout(() => finish(releaseMs), Math.min(releaseMs, context.deadline - Date.now()));
      options.onHoldingChange(true);
      return true;
    },
    release() {
      if (!attempt || attempt.assisted) return;
      finish(Math.max(0, Math.min(DURATION_MS, Math.round(Date.now() - attempt.startedAt))));
    },
    rollNow() {
      if (attempt || committed || !allowed(options.getContext())) return false;
      committed = true;
      options.onCommit();
      return true;
    },
    cancel,
    reset() { cancel(); committed = false; },
    elapsed() { return attempt ? Math.max(0, Math.min(DURATION_MS, Date.now() - attempt.startedAt)) : 0; },
  };
}

function readAssisted() {
  try { return typeof window !== 'undefined' && window.localStorage.getItem(ASSISTED_STORAGE_KEY) === 'true'; }
  catch { return false; }
}

export function TimedRelease(props: TimedReleaseProps) {
  const { disabled, turn, deadline } = props;
  const latest = useRef(props);
  latest.current = props;
  const [holding, setHolding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [committed, setCommitted] = useState(false);
  const [assisted, setAssisted] = useState(readAssisted);
  const [feedback, setFeedback] = useState('');
  const pointer = useRef<number | null>(null);
  const keyboard = useRef<string | null>(null);
  const statusId = useId();
  const controller = useMemo(() => createTimedReleaseController({
    getContext: () => latest.current,
    onCommit: releaseMs => {
      setCommitted(true);
      setFeedback(releaseMs !== undefined && releaseMs >= 650 && releaseMs <= 950 ? 'Good release! +1' : 'Released');
      latest.current.onCommit(releaseMs);
    },
    onHoldingChange: next => {
      setHolding(next);
      latest.current.onHoldingChange?.(next);
    },
  }), []);

  useLayoutEffect(() => {
    controller.reset();
    pointer.current = null;
    keyboard.current = null;
    setElapsed(0);
    setCommitted(false);
    setFeedback('');
  }, [controller, disabled, turn, deadline]);

  useEffect(() => () => controller.cancel(), [controller]);
  useEffect(() => {
    try { window.localStorage.setItem(ASSISTED_STORAGE_KEY, String(assisted)); }
    catch { /* Private browsing may disable storage; the current choice still works. */ }
  }, [assisted]);
  useEffect(() => {
    if (!holding) return;
    let frame: number;
    const update = () => { setElapsed(controller.elapsed()); frame = requestAnimationFrame(update); };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [controller, holding]);

  const unavailable = disabled || committed || Date.now() >= deadline;
  const sweet = elapsed >= 650 && elapsed <= 950;
  const phase = committed ? 'released' : holding ? (sweet ? 'sweet' : elapsed > 950 ? 'late' : 'winding') : 'ready';
  const holdLabel = committed ? 'Move sent' : holding
    ? assisted ? 'Finding your moment…' : sweet ? 'Release for +1!' : elapsed > 950 ? 'Release your move' : 'Wind up…'
    : assisted ? 'Tap to release' : 'Hold & release';
  const begin = () => {
    if (controller.start(assisted)) { setElapsed(0); setFeedback(''); return true; }
    return false;
  };
  const cancel = () => {
    controller.cancel();
    pointer.current = null;
    keyboard.current = null;
    setElapsed(0);
  };

  return <div className="di-focus-control di-timing-feel" data-holding={holding} data-assisted={assisted} data-phase={phase}
    style={{ '--di-wind': Math.min(elapsed / 650, 1) } as CSSProperties}>
    <button type="button" className="di-focus-hold" disabled={unavailable}
      aria-describedby={statusId} aria-label={assisted ? 'Release with timing assistance' : 'Hold and release the die'}
      onPointerDown={event => {
        if (event.button !== 0 || !begin()) return;
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerUp={event => {
        if (pointer.current !== event.pointerId) return;
        pointer.current = null;
        controller.release();
      }}
      onPointerCancel={cancel}
      onLostPointerCapture={event => { if (pointer.current === event.pointerId) cancel(); }}
      onKeyDown={event => {
        if (event.key === 'Escape' && holding) { event.preventDefault(); event.stopPropagation(); cancel(); return; }
        if (event.key !== ' ' && event.key !== 'Enter') return;
        event.preventDefault();
        if (!event.repeat && keyboard.current === null && begin()) keyboard.current = event.key;
      }}
      onKeyUp={event => {
        if (event.key !== ' ' && event.key !== 'Enter') return;
        event.preventDefault();
        if (keyboard.current !== event.key) return;
        keyboard.current = null;
        controller.release();
      }}
      onBlur={() => { if (keyboard.current !== null) cancel(); }}
      onClick={event => {
        // Assistive-technology activation has no preceding pointer/key hold.
        if (event.detail === 0 && keyboard.current === null && pointer.current === null) controller.start(true);
      }}
    >
      <span className="di-timing-die" aria-hidden="true"><Dice5 size={24} strokeWidth={2.2} /></span>
      <span className="di-timing-label">{holdLabel}</span>
      <span className="di-timing-bonus" aria-hidden="true"><Sparkles size={13} /> +1</span>
      <span className="di-focus-meter" aria-hidden="true" data-sweet={sweet}>
        <span className="di-focus-sweet" style={{ left: `${650 / DURATION_MS * 100}%`, width: `${300 / DURATION_MS * 100}%` }} />
        <span className="di-focus-marker" style={{ left: `${elapsed / DURATION_MS * 100}%` }} />
      </span>
    </button>
    <span id={statusId} className="di-focus-status" role="status" aria-live="polite" aria-atomic="true">
      {feedback || (holding ? (assisted ? 'Timing assisted' : (sweet ? 'Release now for +1' : elapsed > 950 ? 'Your ordinary move is still ready' : 'Aim for the bright zone')) : 'Good timing: +1 · missing costs nothing')}
    </span>
    <div className="di-focus-options">
      <button type="button" className="di-focus-roll-now" disabled={unavailable || holding} onClick={() => controller.rollNow()}>Roll now</button>
      <label className="di-focus-assisted"><input type="checkbox" checked={assisted} disabled={holding}
        onChange={event => setAssisted(event.target.checked)} /> Assist timing</label>
    </div>
  </div>;
}
