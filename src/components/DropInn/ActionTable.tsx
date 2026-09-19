import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Heart, MessageCircle, Search, Swords, Check, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type { SceneTarget, TokenKind } from '../../lib/dropinn/types';
import { playTableSound, tableSoundEnabled, setTableSound } from './tableSound';

const coins = [
  { kind: 'fight' as const, label: 'Fight', Icon: Swords },
  { kind: 'influence' as const, label: 'Influence', Icon: MessageCircle },
  { kind: 'investigate' as const, label: 'Investigate', Icon: Search },
  { kind: 'assist' as const, label: 'Assist', Icon: Heart },
];
type Gesture = { pointer: number; token: TokenKind; x: number; y: number; at: number; dragging: boolean; popped: boolean };

export function ActionTable({ targets, token, targetId, downed, disabled, turn, onChoose, onConfirm, preview, active }: {
  targets: SceneTarget[]; token: TokenKind; targetId: string; downed: boolean; disabled: boolean; turn: number;
  onChoose: (token: TokenKind, targetId: string) => void;
  onConfirm: () => void; preview: string; active: boolean;
}) {
  const gesture = useRef<Gesture | null>(null);
  const frame = useRef(0);
  const suppressClick = useRef(false);
  const board = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState<TokenKind | null>(null);
  const [scale, setScale] = useState(1);
  const [floating, setFloating] = useState<{ x: number; y: number } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [landed, setLanded] = useState('');
  const [message, setMessage] = useState('Drag a coin onto a card. Or tap a coin, then a card.');
  const [sound, setSound] = useState(tableSoundEnabled);
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canPlace = (kind: TokenKind, target: SceneTarget) => (!downed || kind === 'assist') && target.tokens.includes(kind);
  const reset = () => { cancelAnimationFrame(frame.current); gesture.current = null; setHeld(null); setFloating(null); setOver(null); setScale(1); };
  useEffect(() => { reset(); setLanded(''); }, [turn]);
  useEffect(() => { if (disabled) reset(); }, [disabled]);
  useEffect(() => () => { cancelAnimationFrame(frame.current); gesture.current = null; }, []);
  const choose = (kind: TokenKind, id: string) => {
    const target = targets.find(t => t.id === id);
    if (disabled || !target || !canPlace(kind, target)) return;
    onChoose(kind, id);
    setLanded(id);
    setMessage(`${coins.find(c => c.kind === kind)?.label} placed at ${target.name}. Confirm your move on the card, or move your coin to change it.`);
    playTableSound('place');
  };
  const hitTarget = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-table-target]');
    return element && board.current?.contains(element) ? targets.find(t => t.id === element.dataset.tableTarget) : undefined;
  };
  const start = (event: PointerEvent<HTMLButtonElement>, kind: TokenKind) => {
    if (disabled || !event.isPrimary || event.button !== 0 || gesture.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    suppressClick.current = false;
    const current: Gesture = { pointer: event.pointerId, token: kind, x: event.clientX, y: event.clientY, at: performance.now(), dragging: false, popped: false };
    gesture.current = current; setHeld(kind);
    const grow = () => {
      if (gesture.current !== current || current.dragging) return;
      const elapsed = performance.now() - current.at;
      if (elapsed >= 1250) {
        current.popped = true; setScale(1);
        setMessage('Poof! A little too much magic. Your token is safe.');
        playTableSound('pop');
        return;
      }
      if (!reduced()) setScale(1 + Math.min(.42, elapsed / 2600));
      frame.current = requestAnimationFrame(grow);
    };
    frame.current = requestAnimationFrame(grow);
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId) return;
    if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 9) current.dragging = true;
    if (!current.dragging) return;
    cancelAnimationFrame(frame.current); setScale(1);
    setFloating({ x: event.clientX, y: event.clientY });
    const target = hitTarget(event.clientX, event.clientY);
    setOver(target?.id ?? null);
    setMessage(target ? canPlace(current.token, target) ? `Release to prepare your move at ${target.name}.` : 'That approach does not fit here. Try a glowing card.' : 'The glowing cards welcome this approach.');
  };
  const end = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId) return;
    if (current.dragging) {
      suppressClick.current = true;
      const target = hitTarget(event.clientX, event.clientY);
      if (target && canPlace(current.token, target)) choose(current.token, target.id);
      else setMessage('Back to your hand. Drop on a glowing card, or tap to choose.');
    }
    reset();
  };
  const movingCoin = coins.find(c => c.kind === held);
  const placedCoin = coins.find(c => c.kind === token);
  return <div className="di-token-table" ref={board}>
    <div className="di-table-toolbar"><span><Sparkles size={13} /> Make a little magic</span>
      <button className="di-icon-button" type="button" aria-label={sound ? 'Mute table sounds' : 'Enable table sounds'} aria-pressed={sound}
        onClick={() => { setTableSound(!sound); setSound(!sound); if (!sound) playTableSound('place'); }}>
        {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
      </button>
    </div>
    <div className={`di-felt-table ${floating ? 'di-drag-active' : ''}`} role="group" aria-label="Adventure table targets">
      <span className="di-table-engraving" aria-hidden="true">DROPINN · THE NEXT MOVE IS YOURS</span>
      <div className="di-target-grid">
        {targets.map(target => {
          const compatible = canPlace(held ?? token, target);
          const placed = active && landed === target.id && targetId === target.id && placedCoin;
          return <div key={target.id} data-table-target={target.id} className={`di-table-spot ${placed ? 'di-spot-placed' : ''}`}>
          <button type="button"
            disabled={disabled} aria-pressed={targetId === target.id} aria-label={`${target.name}${target.changed ? ', changed by the party' : ''}`}
            className={`di-target-card ${targetId === target.id ? 'di-target-selected' : ''} ${held && compatible ? 'di-target-welcomes' : ''} ${over === target.id ? compatible ? 'di-target-over' : 'di-target-refuses' : ''} ${landed === target.id ? 'di-token-landed' : ''}`}
            onClick={() => { const kind = canPlace(token, target) ? token : target.tokens.find(t => t !== 'spotlight' && (!downed || t === 'assist')); if (kind) choose(kind, target.id); }}>
            <span className="di-target-status">{target.changed ? <><Sparkles size={11} /> A new opening</> : 'In the scene'}</span>
            <strong>{target.name}</strong>
            <span className="di-target-card-copy">{target.description}</span>
            {targetId === target.id && <Check className="di-target-check" size={14} />}
          </button>
          {placed && <div className="di-placed-move" aria-label="Move awaiting confirmation">
            <button type="button" className={`di-coin-button di-placed-coin di-coin-${token}`} disabled={disabled}
              aria-label={`Move placed ${placedCoin.label} token`}
              onPointerDown={e => start(e, token)} onPointerMove={move} onPointerUp={end}
              onPointerCancel={reset} onLostPointerCapture={() => { if (gesture.current) reset(); }}>
              <span className="di-coin" style={held === token ? { opacity: floating ? .25 : 1, transform: `scale(${scale})` } : undefined}><placedCoin.Icon size={24} /></span>
            </button>
            <strong>{placedCoin.label} placed</strong>
            <span className="di-placement-pending">Not confirmed yet</span>
            <p>{preview}</p>
            <button type="button" className="di-button di-primary di-confirm-placement" disabled={disabled} onClick={onConfirm}>
              <Check size={15} /> {disabled ? 'Confirming…' : 'Confirm move'}
            </button>
          </div>}
          </div>;
        })}
      </div>
    </div>
    <div className="di-coins di-table-hand" role="group" aria-label="Action tokens">
      {coins.map(({kind, label, Icon}) => {
        const enabled = !disabled && targets.some(target => canPlace(kind, target));
        return <button type="button" key={kind} disabled={!enabled} aria-label={`${label} token`} aria-pressed={token === kind}
          className={`di-coin-button di-coin-${kind} ${token === kind ? 'di-selected' : ''} ${held === kind ? 'di-coin-held' : ''}`}
          onPointerDown={e => start(e, kind)} onPointerMove={move} onPointerUp={end}
          onPointerCancel={() => { suppressClick.current = true; reset(); setMessage('Your token is back in your hand.'); }}
          onLostPointerCapture={() => { if (gesture.current) reset(); }}
          onClick={() => {
            if (suppressClick.current) { suppressClick.current = false; return; }
            const target = targets.find(t => t.id === targetId && canPlace(kind, t)) ?? targets.find(t => canPlace(kind, t));
            if (target) choose(kind, target.id);
          }}>
          <span className="di-coin" style={{ transform: held === kind ? `scale(${scale})` : undefined, opacity: (held === kind && floating) || (active && landed === targetId && token === kind) ? .25 : 1 }}><Icon size={23} strokeWidth={1.6} /></span>
          <strong>{label}</strong>
        </button>;
      })}
    </div>
    <p className="di-table-hint" role="status" aria-live="polite">{message}</p>
    <span className="di-hold-hint">Psst… hold a coin for a little surprise.</span>
    {floating && movingCoin && <div className={`di-floating-token di-coin-${held}`} style={{ left: floating.x, top: floating.y }} aria-hidden="true"><span className="di-coin"><movingCoin.Icon size={28} /></span></div>}
  </div>;
}
