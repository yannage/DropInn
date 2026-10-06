import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Check, Dice5, Smartphone, X } from 'lucide-react';
import { createQuestDiceGesture, QUEST_DICE_LAND_MS, QUEST_DICE_REST, questDiceLanding, questDieRotation, questMotionImpulse, type QuestMotionVector } from '../../lib/dropinn/questDiceGesture';
import { useLiveReducedMotion } from './TableContact';
import { useVisibleTable } from './StageAtmosphere';
import './quest-dice.css';

const COLORS = [{ id: 'ivory', label: 'Ivory' }, { id: 'moss', label: 'Moss green' }, { id: 'ember', label: 'Ember red' }] as const;
type DieColor = typeof COLORS[number]['id'];
const COLOR_KEY = 'dropinn:quest-die-color:v1';
const readColor = (): DieColor => { try { const saved = localStorage.getItem(COLOR_KEY); return COLORS.find(item => item.id === saved)?.id ?? 'ivory'; } catch { return 'ivory'; } };
const pips = [[5], [1, 9], [1, 5, 9], [1, 3, 7, 9], [1, 3, 5, 7, 9], [1, 3, 4, 6, 7, 9]];
const signed = (value: number) => value < 0 ? `−${Math.abs(value)}` : `+${value}`;
type MotionConstructor = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

export interface QuestDiceCheck {
  id: string; roll: number; modifier: number; dc: number; success: boolean; at: number;
  actorName?: string; label?: string;
  attribute?: string; baseModifier?: number; helpModifier?: number; helperName?: string; helpKind?: 'none' | 'party' | 'learned';
}
export interface QuestDiceProps {
  gestureKey: string; enabled: boolean; pending: boolean; onRoll: () => void;
  label: string; detail?: string; attribute: string; baseModifier: number; helpModifier: number; helperName?: string;
  dc?: number; deadline: number; quiet?: boolean; result?: QuestDiceCheck;
  helpKind?: 'none' | 'party' | 'learned';
}

function DieCube({ value, color, style, className = '' }: { value?: number; color: DieColor; style?: CSSProperties; className?: string }) {
  const rotation = value && questDieRotation(value);
  return <span className={`qd-die-space is-${color} ${className}`} style={style} aria-hidden="true">
    <span className="qd-die-shadow" /><span className="qd-flat-value">{value ?? '?'}</span><span className="qd-cube" style={rotation ? { '--qd-face-x': `${rotation[0]}deg`, '--qd-face-y': `${rotation[1]}deg` } as CSSProperties : undefined}>
      {pips.map((spots, index) => <span key={index} className={`qd-face qd-face-${index + 1}`}>{value ? spots.map(spot => <i key={spot} style={{ gridColumn: (spot - 1) % 3 + 1, gridRow: Math.floor((spot - 1) / 3) + 1 }} />) : <span className="qd-unrolled-mark">?</span>}</span>)}
    </span>
  </span>;
}

/** The tray commits an already prepared challenge. Cosmetics and sensor input never affect odds. */
export function QuestDice(props: QuestDiceProps) {
  const systemQuiet = useLiveReducedMotion(), visible = useVisibleTable();
  const quiet = !!props.quiet || systemQuiet;
  const latest = useRef(props); latest.current = props;
  const context = useRef({ key: props.gestureKey, enabled: props.enabled, pending: props.pending, visible, deadline: props.deadline });
  context.current = { key: props.gestureKey, enabled: props.enabled, pending: props.pending, visible, deadline: props.deadline };
  const [gesture, setGesture] = useState(QUEST_DICE_REST);
  const [color, setColor] = useState<DieColor>(readColor);
  const [motion, setMotion] = useState<'off' | 'requesting' | 'on' | 'unavailable' | 'denied' | 'no-data'>('off');
  const [feedback, setFeedback] = useState('');
  const [expired, setExpired] = useState(Date.now() >= props.deadline);
  const [pendingLanded, setPendingLanded] = useState(false);
  const [focused, setFocused] = useState(() => document.hasFocus());
  const focusedNow = useRef(focused); focusedNow.current = focused;
  const pointer = useRef<{ id: number; node: HTMLButtonElement }>();
  const swallowClick = useRef(false);
  const sensorAttempt = useRef(0);
  const mounted = useRef(true);
  const submittedAt = useRef<number>();
  const pendingSuppressed = useRef(false);
  const descriptionId = useId();
  const controller = useMemo(() => createQuestDiceGesture({ getContext: () => context.current, onChange: setGesture, onRoll: () => { submittedAt.current = Date.now(); pendingSuppressed.current = false; latest.current.onRoll(); } }), []);
  const releaseCapture = () => {
    const active = pointer.current; pointer.current = undefined;
    if (active?.node.hasPointerCapture(active.id)) active.node.releasePointerCapture(active.id);
  };
  const cancel = (message?: string) => { swallowClick.current = true; releaseCapture(); controller.cancel(); if (message) setFeedback(message); };
  useEffect(() => {
    mounted.current = true; controller.activate();
    return () => { mounted.current = false; sensorAttempt.current++; releaseCapture(); controller.dispose(); };
  }, [controller]);
  useEffect(() => {
    controller.sync(); cancel(); setFeedback(''); setExpired(Date.now() >= props.deadline);
    const timer = window.setTimeout(() => { controller.sync(); cancel('The turn has moved on.'); setExpired(true); }, Math.max(0, props.deadline - Date.now()));
    return () => clearTimeout(timer);
  }, [controller, props.gestureKey, props.enabled, props.pending, props.deadline]);
  useEffect(() => {
    const blur = () => { focusedNow.current = false; setFocused(false); sensorAttempt.current++; setMotion(value => value === 'requesting' ? 'off' : value); cancel('Shake cancelled. Your choice is still prepared.'); };
    const focus = () => { focusedNow.current = true; setFocused(true); };
    const hidden = () => { if (document.hidden) { context.current.visible = false; sensorAttempt.current++; setMotion(value => value === 'requesting' ? 'off' : value); cancel(); } };
    window.addEventListener('blur', blur); window.addEventListener('focus', focus); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('blur', blur); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', hidden); };
  }, [controller]);
  useEffect(() => { try { localStorage.setItem(COLOR_KEY, color); } catch { /* The current cosmetic choice still works. */ } }, [color]);
  useEffect(() => {
    if (!gesture.submitted) { setPendingLanded(false); return; }
    const timer = window.setTimeout(() => setPendingLanded(true), 900);
    return () => clearTimeout(timer);
  }, [gesture.submitted]);

  async function enableMotion() {
    if (motion === 'on' || motion === 'no-data') { sensorAttempt.current++; setMotion('off'); cancel(); return; }
    const DeviceMotion = window.DeviceMotionEvent as MotionConstructor | undefined;
    if (!window.isSecureContext || !DeviceMotion) { setMotion('unavailable'); return; }
    const attempt = ++sensorAttempt.current;
    setMotion('requesting');
    try {
      const allowed = DeviceMotion.requestPermission ? await DeviceMotion.requestPermission() : 'granted';
      if (!mounted.current || attempt !== sensorAttempt.current || !focusedNow.current || !context.current.visible) return;
      setMotion(allowed === 'granted' ? 'on' : 'denied');
    } catch { if (mounted.current && attempt === sensorAttempt.current) setMotion('denied'); }
  }
  useEffect(() => {
    if (motion !== 'on' && motion !== 'no-data' || !visible || !focused || !props.enabled || props.pending) return;
    let previous: QuestMotionVector | undefined, last = 0, received = false;
    const timer = window.setTimeout(() => { if (!received) setMotion('no-data'); }, 1800);
    const sensor = (event: DeviceMotionEvent) => {
      if (!focusedNow.current || !context.current.visible) return;
      const vector = [event.accelerationIncludingGravity, event.acceleration].find(vector => vector && [vector.x, vector.y, vector.z].every(value => typeof value === 'number' && Number.isFinite(value)));
      if (!vector || ![vector.x, vector.y, vector.z].every(value => typeof value === 'number' && Number.isFinite(value))) return;
      received = true;
      const at = performance.now();
      const impulse = questMotionImpulse(previous, vector);
      previous = { x: vector.x, y: vector.y, z: vector.z };
      if (!impulse || at - last < 80) return;
      last = at;
      if (controller.jostle(impulse.x, impulse.y, impulse.strength)) setFeedback('Die shaken. Press Roll die when you are ready.');
    };
    window.addEventListener('devicemotion', sensor);
    return () => { clearTimeout(timer); window.removeEventListener('devicemotion', sensor); };
  }, [motion, visible, focused, props.enabled, props.pending, controller]);

  const disabled = !props.enabled || props.pending || gesture.submitted || expired || !visible;
  if (!visible || quiet) pendingSuppressed.current = true;
  const pendingAnimation = gesture.submitted && !pendingLanded && !pendingSuppressed.current && !quiet && visible;
  const start = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !controller.start(event.pointerId, event.clientX, event.clientY)) return;
    event.preventDefault(); event.currentTarget.focus();
    pointer.current = { id: event.pointerId, node: event.currentTarget };
    swallowClick.current = false; setFeedback('Let go inside the tray to roll. Move outside to cancel.');
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const finish = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointer.current?.id !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    swallowClick.current = true; releaseCapture();
    if (!controller.release(event.pointerId, inside)) setFeedback('Shake cancelled. Your choice is still prepared.');
  };
  const supportText = motion === 'denied' ? 'Motion access was not enabled. Drag the die or use Roll die.'
    : motion === 'unavailable' ? 'Phone motion is unavailable here. Drag the die or use Roll die.'
    : motion === 'no-data' ? 'No motion readings yet. Drag the die or use Roll die.'
    : motion === 'on' ? 'Shake gently, then press Roll die. Motion never sends your move.' : undefined;
  return <section className={`qd-control ${quiet ? 'is-quiet' : ''}`} data-quest-dice aria-label="Roll your prepared challenge">
    <div className="qd-heading"><strong>{props.label}</strong><span>{props.attribute} {signed(props.baseModifier)}{props.helpModifier > 0 && ` · ${props.helpKind === 'learned' ? 'setup' : 'help'} +${props.helpModifier}`}{props.dc !== undefined && ` · need ${props.dc}`}</span></div>
    {props.detail && <p className="qd-detail">{props.detail}</p>}
    {props.helpModifier > 0 && <p className="qd-help-source">{props.helpKind === 'learned' ? `Your earlier attempt adds +${props.helpModifier}.` : `${props.helperName ?? 'Your party'} adds +${props.helpModifier} help.`}</p>}
    <div className="qd-release">
      <button className="qd-tray" type="button" disabled={disabled} aria-label="Shake the die; release inside this tray to roll" aria-describedby={descriptionId} data-quest-dice-tray
        onPointerDown={start} onPointerMove={event => controller.move(event.pointerId, event.clientX, event.clientY)} onPointerUp={finish}
        onPointerCancel={() => cancel('Shake cancelled. Your choice is still prepared.')} onLostPointerCapture={() => { if (pointer.current) cancel(); }}
        onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); cancel('Shake cancelled.'); } else if ((event.key === 'Enter' || event.key === ' ') && event.repeat) event.preventDefault(); }}
        onClick={event => { if (event.detail > 0 && swallowClick.current) { swallowClick.current = false; return; } controller.roll(); }}>
        <span className="qd-tray-grain" aria-hidden="true" /><DieCube color={color} className={`${gesture.holding ? 'is-held' : ''} ${pendingAnimation ? 'is-pending' : ''}`}
          style={{ '--qd-shake-x': `${quiet ? 0 : gesture.tiltX}deg`, '--qd-shake-y': `${quiet ? 0 : gesture.tiltY}deg`, '--qd-pending-delay': `${-Math.max(0, Date.now() - (submittedAt.current ?? Date.now()))}ms` } as CSSProperties} />
        <span className="qd-tray-label">{props.pending || gesture.submitted ? 'Waiting for the table…' : gesture.holding ? 'Release inside to roll' : 'Shake & release'}</span>
      </button>
      <button type="button" className="qd-roll" disabled={disabled || gesture.holding} onKeyDown={event => { if ((event.key === 'Enter' || event.key === ' ') && event.repeat) event.preventDefault(); }} onClick={() => controller.roll()}><Dice5 size={19} />Roll die</button>
    </div>
    <p className="qd-instructions" id={descriptionId}>{feedback || 'Drag or swirl the die. Releasing inside the tray rolls your prepared move. Tap Roll die for the same chance.'}</p>
    <div className="qd-options"><fieldset className="qd-colors"><legend>Die color · cosmetic</legend>{COLORS.map(item => <button type="button" key={item.id} className={`qd-swatch is-${item.id}`} aria-label={`${item.label} die`} aria-pressed={color === item.id} disabled={gesture.holding} onClick={() => setColor(item.id)}>{color === item.id && <Check size={15} aria-hidden="true" />}</button>)}</fieldset>
      <button type="button" className="qd-motion" disabled={motion === 'requesting' || gesture.holding || props.pending} aria-pressed={motion === 'on' || motion === 'no-data'} onClick={() => void enableMotion()}><Smartphone size={16} />{motion === 'requesting' ? 'Checking motion…' : motion === 'on' || motion === 'no-data' ? 'Phone motion on' : 'Use phone motion'}</button></div>
    {supportText && <p className="qd-motion-note" role="status">{supportText}</p>}
    {props.result && <QuestDiceResult result={props.result} quiet={quiet} />}
  </section>;
}

/** Keep mounted across preparation resets. Initial/reloaded results never restart a throw. */
export function QuestDiceResult({ result, quiet = false }: { result?: QuestDiceCheck; quiet?: boolean }) {
  const visible = useVisibleTable(), systemQuiet = useLiveReducedMotion();
  const previous = useRef(result?.id), live = useRef<string>();
  const [, tick] = useState(0);
  const [color, setColor] = useState<DieColor>(readColor);
  if (result?.id !== previous.current) {
    previous.current = result?.id;
    live.current = result && visible && !quiet && !systemQuiet && Date.now() >= result.at && Date.now() - result.at < QUEST_DICE_LAND_MS ? result.id : undefined;
  }
  if (!visible || quiet || systemQuiet) live.current = undefined;
  useEffect(() => {
    setColor(readColor());
    if (!result || live.current !== result.id) return;
    const timer = window.setInterval(() => { tick(value => value + 1); if (Date.now() >= result.at + QUEST_DICE_LAND_MS) clearInterval(timer); }, 50);
    return () => clearInterval(timer);
  }, [result?.id]);
  if (!result || !Number.isInteger(result.roll) || !questDieRotation(result.roll)) return null;
  const landing = questDiceLanding(result.at, Date.now(), live.current === result.id, quiet || systemQuiet, visible);
  const help = result.helpModifier ?? 0, base = result.baseModifier ?? result.modifier - help;
  return <section className={`qd-result ${result.success ? 'is-success' : 'is-costly'}`} data-quest-dice-result={result.id} data-dice-face={result.roll} data-dice-state={landing.animate ? 'landing' : 'settled'} aria-label="Recorded die result" aria-live="polite">
    <DieCube value={result.roll} color={color} className={landing.animate ? 'is-landing' : ''} style={{ '--qd-land-delay': `${-landing.elapsed}ms` } as CSSProperties} />
    <div>{(result.actorName || result.label) && <small className="qd-result-source">{[result.actorName, result.label].filter(Boolean).join(' · ')}</small>}<strong>{result.success ? <Check size={17} /> : <X size={17} />}{result.success ? 'Made it!' : 'A start to build on'}</strong>
      <p><b>{result.roll}</b> die {signed(base)} {result.attribute ?? 'stat'}{help !== 0 && <> {signed(help)} {result.helpKind === 'learned' ? 'setup' : 'help'}</>} = <b>{result.roll + result.modifier}</b><span>Needed {result.dc}</span></p>
      {!!help && <small>{result.helpKind === 'learned' ? `${result.helperName ? `${result.helperName}’s earlier attempt` : 'An earlier attempt'} added +${help}.` : result.helperName ? `${result.helperName} helped this attempt.` : 'The party’s recorded help counted.'}</small>}
    </div>
  </section>;
}
