import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { FLICK_COASTERS, FLICK_DEFAULT_AIM, FLICK_DURATION, FLICK_ORIGIN, adjustFlickAim, boundedFlickAim, createTabletopFlickController, pullFlickAim, type FlickAim, type FlickContext, type FlickShot } from '../../lib/dropinn/tabletopFlick';
import { playTableSound } from './tableSound';
import './tabletop-flick.css';

/** An optional local toy, available only after the caller confirms a waiting move. */
export function TabletopFlick({ roundKey, active, reducedMotion, defaultExpanded = false }: {
  roundKey: string; active: boolean; reducedMotion: boolean; defaultExpanded?: boolean;
}) {
  const [openedFor, setOpenedFor] = useState<string | undefined>(defaultExpanded ? roundKey : undefined);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [aim, setAim] = useState<FlickAim>(FLICK_DEFAULT_AIM);
  const [coasterIndex, setCoasterIndex] = useState(0);
  const [shot, setShot] = useState<FlickShot>();
  const [pulling, setPulling] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const opened = openedFor === roundKey;
  const enabled = active && opened && visible;
  const coaster = FLICK_COASTERS[coasterIndex];
  const instructions = useId();
  const gesture = useRef<{ id: number; x: number; y: number; scale: number; roundKey: string; element: HTMLButtonElement }>();
  const swallowClick = useRef(false);
  const context = useRef<FlickContext>({ active: enabled, visible, roundKey, reducedMotion });
  context.current = { active: enabled, visible, roundKey, reducedMotion };
  const controller = useRef<ReturnType<typeof createTabletopFlickController>>();
  const clearGesture = () => {
    const held = gesture.current; gesture.current = undefined;
    if (held?.element.hasPointerCapture(held.id)) held.element.releasePointerCapture(held.id);
    setPulling(false);
  };
  // A cancelled captured press may still be followed by a native pointer click.
  // Keep keyboard/assistive activation (detail === 0) available after cancellation.
  const clearShot = () => { swallowClick.current = true; clearGesture(); controller.current?.cancel(); };
  useEffect(() => {
    controller.current = createTabletopFlickController({ getContext: () => context.current, onChange: setShot, onLand: () => playTableSound('place') });
    return () => { controller.current?.dispose(); const held = gesture.current; gesture.current = undefined; if (held?.element.hasPointerCapture(held.id)) held.element.releasePointerCapture(held.id); };
  }, []);
  useEffect(() => {
    controller.current?.sync();
    if (!enabled) clearShot();
  }, [enabled, roundKey, reducedMotion]);
  useEffect(() => {
    const visibility = () => {
      const next = !document.hidden;
      context.current.visible = next;
      setVisible(next);
      if (!next) clearShot();
    };
    const blur = () => clearShot();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', blur);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur); };
  }, []);

  const changeAim = (next: FlickAim) => { controller.current?.cancel(); setAim(boundedFlickAim(next)); };
  const flick = (next = aim) => {
    if (controller.current?.flick(next, coaster)) playTableSound('pick');
  };
  const pointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!enabled || shot?.running || event.button !== 0 || gesture.current) return;
    event.preventDefault(); event.currentTarget.focus();
    controller.current?.cancel();
    const rect = event.currentTarget.getBoundingClientRect();
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, scale: 300 / rect.width, roundKey, element: event.currentTarget };
    event.currentTarget.setPointerCapture(event.pointerId);
    swallowClick.current = false; setPulling(true);
  };
  const pointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const held = gesture.current;
    if (!held || held.id !== event.pointerId || held.roundKey !== roundKey || !enabled) return;
    const dx = event.clientX - held.x, dy = event.clientY - held.y;
    if (Math.hypot(dx, dy) >= 4) setAim(pullFlickAim(dx * held.scale, dy * held.scale));
  };
  const pointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const held = gesture.current;
    if (!held || held.id !== event.pointerId) return;
    const dx = event.clientX - held.x, dy = event.clientY - held.y;
    const next = Math.hypot(dx, dy) >= 4 ? pullFlickAim(dx * held.scale, dy * held.scale) : aim;
    swallowClick.current = true; clearGesture();
    if (held.roundKey === roundKey && enabled) { setAim(next); flick(next); }
  };
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    // Native Enter autorepeats clicks; each shot needs a fresh deliberate press.
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); return; }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault(); if (!shot?.running) changeAim(adjustFlickAim(aim, event.key));
    } else if (event.key === 'Escape') { event.preventDefault(); clearShot(); }
    // Native Enter/Space click supplies the same shot as pointer release.
  };
  if (!active) return null;
  const radians = aim.angle * Math.PI / 180;
  const pull = pulling ? aim.power * .12 : 0;
  const resting = shot?.landing.point ?? { x: FLICK_ORIGIN.x - Math.cos(radians) * pull, y: FLICK_ORIGIN.y - Math.sin(radians) * pull };
  const coinStyle = {
    '--flick-x': `${resting.x}px`, '--flick-y': `${resting.y}px`, '--flick-duration': `${FLICK_DURATION}ms`,
    '--flick-spin': `${140 + aim.power * 2}deg`,
    transform: `translate(${resting.x}px, ${resting.y}px)`,
  } as CSSProperties;
  const angleLabel = aim.angle === 0 ? 'straight' : `${Math.abs(Math.round(aim.angle))}° ${aim.angle < 0 ? 'up' : 'down'}`;
  return <section className={`gm-flick ${reducedMotion ? 'is-quiet' : ''}`} data-tabletop-flick aria-label="Coaster flick, just for fun">
    {!defaultExpanded && <button type="button" className="gm-flick-toggle" aria-expanded={opened} onClick={() => { clearShot(); setOpenedFor(opened ? undefined : roundKey); }}><span>Flick a spare counter</span><ChevronDown size={16} /></button>}
    {opened && <div className="gm-flick-open">
      <div className="gm-flick-intro"><strong>Coaster flick</strong><span>Just for fun · only on your table</span></div>
      <p id={instructions} className="gm-flick-instructions">Pull back and let go. Tap to reuse your aim.</p>
      <button type="button" className="gm-flick-lane" data-flick-lane data-flick-running={shot?.running ? 'true' : 'false'} aria-label={`Flick the spare counter. Aim ${angleLabel}, strength ${Math.round(aim.power)} percent. Arrow up or down aims. Left or right changes strength. Enter or Space flicks.`} aria-describedby={instructions}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { swallowClick.current = true; clearShot(); }} onLostPointerCapture={() => { if (gesture.current) { swallowClick.current = true; clearShot(); } }} onKeyDown={keyDown}
        onClick={event => { if (event.detail > 0 && swallowClick.current) { swallowClick.current = false; return; } flick(); }}>
        <svg viewBox="0 0 300 100" aria-hidden="true" focusable="false">
          <path className="gm-flick-grain" d="M9 18 Q125 14 291 19 M11 86 Q180 83 287 88 M83 6 Q81 49 85 95 M177 7 Q172 55 178 96" />
          <circle className="gm-flick-start" cx={FLICK_ORIGIN.x} cy={FLICK_ORIGIN.y} r="13" />
          <g className={`gm-flick-coaster ${shot && !shot.running && shot.landing.onCoaster ? 'is-landed' : ''}`} transform={`translate(${coaster.x},${coaster.y})`}>
            <circle r="21" /><circle r="15" /><path d="M-4-4h7v6q0 5-4 5t-4-5v-6m8 1h3q4 3 0 5h-3" />
          </g>
          {!shot && <path className="gm-flick-guide" d={`M${FLICK_ORIGIN.x + 15 * Math.cos(radians)} ${FLICK_ORIGIN.y + 15 * Math.sin(radians)} l${(18 + aim.power * .15) * Math.cos(radians)} ${(18 + aim.power * .15) * Math.sin(radians)}`} />}
          <g key={shot?.id ?? 'ready'} className={`gm-flick-counter ${shot?.running && !reducedMotion ? 'is-sliding' : ''}`} style={coinStyle} data-flick-counter>
            <ellipse className="gm-flick-shadow" cy="4" rx="11" ry="8" />
            <g className="gm-flick-counter-face"><circle r="10" /><circle r="6.5" /><path d="M-3 1q5-8 7-4 0 5-7 5M-3 1l-2 3" /></g>
          </g>
        </svg>
      </button>
      <div className="gm-flick-result" role="status" data-flick-result>{shot?.running ? 'Sliding…' : shot?.landing.feedback ?? 'Land the counter on the coaster.'}</div>
      <div className="gm-flick-tools"><button type="button" onClick={() => setAdjusting(value => !value)} aria-expanded={adjusting}>Aim {angleLabel} · {Math.round(aim.power)}%</button><button type="button" aria-label="Move the coaster" disabled={!!shot?.running} onClick={() => { clearShot(); setCoasterIndex(value => (value + 1) % FLICK_COASTERS.length); }}><RotateCcw size={14} /><span>Move coaster</span></button></div>
      {adjusting && <div className="gm-flick-adjust"><label>Aim <input type="range" min="-28" max="28" step="2" value={aim.angle} aria-label="Counter aim, up to down" aria-valuetext={angleLabel} disabled={!!shot?.running} onChange={event => changeAim({ ...aim, angle: Number(event.target.value) })} /></label><label>Strength <input type="range" min="0" max="100" step="1" value={aim.power} disabled={!!shot?.running} onChange={event => changeAim({ ...aim, power: Number(event.target.value) })} /></label><small>Keyboard: ↑↓ aim · ←→ strength · Enter flicks.</small></div>}
    </div>}
  </section>;
}
