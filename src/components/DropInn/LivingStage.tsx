import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { motion } from 'framer-motion';
import type { AdventureRoom, StoryEvent } from '../../lib/dropinn/types';
import { claimStageSound, stageCaption, stageProjection } from '../../lib/dropinn/stagePlayback';
import { combinationAvailable, combinationDefinition, combinationState } from '../../lib/dropinn/combinations';
import { StageDice } from './StageDice';
import { TokenArtwork } from './TokenArtwork';
import { playTableSound } from './tableSound';
import './action-effects.css';

export function useStagePlayback(room: AdventureRoom, now: number, immediate: boolean) {
  const before = useRef<AdventureRoom>();
  if (room.phase === 'choosing') before.current = room;
  const projection = stageProjection(room, before.current, now, immediate);
  const active = projection.active;
  useEffect(() => {
    if (!active || document.hidden || now < active.start + active.duration / 3 || now > active.start + active.duration * 5 / 9) return;
    if (claimStageSound(active.event.id)) playTableSound(active.event.success !== false && active.event.result?.combination ? 'combo' : active.event.result?.protection ? 'protect' : active.event.success === false || active.event.result?.damage ? 'complication' : 'result');
  }, [active?.event.id, now]);
  return { ...projection, hasChoosingSnapshot: before.current?.id === room.id && before.current.chapter === room.chapter && before.current.turn === room.turn };
}

type Point = { x: number; y: number };

function actionVisualToken(event: StoryEvent) {
  // Untokened rescue healing and fully protected attacks never read as damaging impacts.
  return event.result?.token ?? ((event.result?.healing ?? 0) > 0 || (event.result?.damage === 0 && event.result.protection) ? 'assist' : 'strike');
}

/** Decorative signatures only: all outcomes and beat timing come from the recorded event. */
function ActionSignature({ event }: { event: StoryEvent }) {
  const token = actionVisualToken(event);
  const missed = event.success === false;
  if (token === 'influence') return <svg viewBox="0 0 160 160" className="di-action-signature di-action-motif di-signature-influence">
    <ellipse className="di-voice-ring di-voice-ring-outer" cx="80" cy="80" rx="65" ry="47" />
    <ellipse className="di-voice-ring" cx="80" cy="80" rx="46" ry="34" />
    <path className="di-voice-bubble" d="M 52 35 Q 50 16 75 16 H 111 Q 130 16 130 33 V 47 Q 130 63 111 63 H 94 L 80 76 L 82 63 H 70 Q 52 63 52 47 Z" />
    <text className="di-signature-ink" x="91" y="53" textAnchor="middle">{missed ? '?' : '“'}</text>
  </svg>;
  if (token === 'investigate') return <svg viewBox="0 0 160 160" className="di-action-signature di-action-motif di-signature-investigate">
    <g className="di-search-lens">
      <circle className="di-lens-glass" cx="73" cy="71" r="37" />
      <path className="di-lens-handle" d="M 100 99 L 126 125" />
      <path className="di-lens-rim" d="M 46 67 A 28 28 0 0 1 68 43" />
      {missed ? <text className="di-search-question" x="73" y="84" textAnchor="middle">?</text> : <path className="di-clue-glint" d="M 73 51 L 78 66 L 94 71 L 78 77 L 73 92 L 68 77 L 53 71 L 68 66 Z" />}
    </g>
    <path className="di-search-orbit" d="M 24 83 A 57 57 0 0 1 116 29 M 126 67 A 57 57 0 0 1 45 120" />
  </svg>;
  if (token === 'assist') return <svg viewBox="0 0 160 160" className={`di-action-signature di-action-motif di-signature-assist ${event.result?.protection ? 'is-protection' : event.result?.healing ? 'is-healing' : 'is-help'}`}>
    <ellipse className="di-help-ring di-help-ring-outer" cx="80" cy="105" rx="66" ry="25" />
    <ellipse className="di-help-ring" cx="80" cy="105" rx="48" ry="16" />
    {event.result?.protection ? <path className="di-help-emblem" d="M 80 24 L 111 36 V 61 Q 111 84 80 103 Q 49 84 49 61 V 36 Z" /> : null}
    {event.result?.healing ? <path className="di-help-emblem" d="M 80 87 L 56 64 C 29 36 65 18 80 42 C 95 18 131 36 104 64 Z" /> : !event.result?.protection && <g className="di-help-emblem"><path d="M 80 30 L 110 61 L 80 92 L 50 61 Z" /><path d="M 65 61 H 95 M 80 46 V 76" /></g>}
  </svg>;
  if (token === 'spotlight') return <svg viewBox="0 0 160 160" className="di-action-signature di-action-motif di-signature-spotlight">
    <circle className="di-spotlight-ring" cx="80" cy="80" r="56" />
    <path className="di-spotlight-star" d="M 80 20 L 94 65 L 139 80 L 94 95 L 80 140 L 65 95 L 20 80 L 65 65 Z" />
  </svg>;
  return <svg viewBox="0 0 160 160" className="di-action-signature di-action-motif di-signature-fight">
    <path className="di-slash-echo" d="M 21 131 Q 41 47 135 21 Q 79 42 55 91" />
    <path className="di-slash-blade" d="M 20 135 Q 43 55 140 20 Q 81 53 55 96 Z" />
    <path className="di-slash-edge" d="M 23 131 Q 61 66 136 24" />
    {!missed && <path className="di-strike-contact" d="M 77 39 L 83 60 L 104 51 M 109 74 L 125 82 L 108 91 M 69 108 L 59 126 L 53 108" />}
  </svg>;
}

export function StageEffects({ room, event, elapsed = 0, duration = 900, stage, quiet, shake, showDice = true }: { room: AdventureRoom; event?: StoryEvent; elapsed?: number; duration?: number; stage: RefObject<HTMLDivElement>; quiet: boolean; shake: boolean; showDice?: boolean }) {
  const offset = useRef({ id: event?.id, seconds: elapsed / 1000 });
  if (offset.current.id !== event?.id) offset.current = { id: event?.id, seconds: elapsed / 1000 };
  const delay = -offset.current.seconds;
  const scale = duration / 900;
  const [points, setPoints] = useState<{ from: Point; to: Point; captionTop?: number }>();
  useLayoutEffect(() => {
    const root = stage.current;
    if (!root || !event || quiet) { setPoints(undefined); return; }
    const measure = () => {
      const rect = root.getBoundingClientRect();
      const anchor = (id?: string): Point => {
        const el = Array.from(root.querySelectorAll<HTMLElement>('[data-scene-target]')).find(node => node.dataset.sceneTarget === id);
        const box = el?.getBoundingClientRect();
        return box ? { x: box.x + box.width / 2 - rect.x, y: box.y + box.height / 2 - rect.y } : { x: rect.width / 2, y: rect.height * .65 };
      };
      const caption = root.querySelector('.di-stage-caption')?.getBoundingClientRect();
      setPoints({ captionTop: caption?.height ? caption.top - rect.top : undefined, from: anchor(event.kind === 'consequence' && event.result?.damage !== undefined ? room.enemyIntent?.sourceId : event.actorId), to: anchor(event.result?.targetId) });
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(root);
    const caption = root.querySelector('.di-stage-caption'); if (caption) observer.observe(caption);
    return () => observer.disconnect();
  }, [event?.id, quiet, room.enemyIntent?.sourceId, stage]);
  if (!event || !points || quiet) return null;
  const token = event.result?.token;
  const visualToken = actionVisualToken(event);
  const missed = event.success === false;
  const strong = !missed && (!!event.result?.combination || event.result?.approach === 'heavy');
  const glyph = missed ? '·' : visualToken === 'influence' ? '“' : visualToken === 'investigate' ? '✧' : visualToken === 'assist' ? event.result?.healing ? '♡' : '◇' : '✦';
  return <div className={`di-stage-effects is-${visualToken} ${strong ? 'is-strong' : ''} ${missed ? 'is-miss' : 'is-confirmed'}`} aria-hidden="true" data-stage-event={event.id} data-action-effect={visualToken} style={{ "--beat-offset": `${delay}s`, "--beat-duration": `${duration / 1000}s`, "--beat-contact": `${.3 * scale}s`, "--beat-tail": `${.55 * scale}s`, "--beat-shake": `${.18 * scale}s` } as React.CSSProperties} key={event.id}>
    {showDice && <StageDice key={event.id} event={event} elapsed={elapsed} scale={scale} left={event.result?.duel ? (stage.current?.clientWidth ?? 320) / 2 : Math.max(68, Math.min((stage.current?.clientWidth ?? 320) - 68, points.from.x))} top={Math.max(8, Math.min(points.from.y - 100, (points.captionTop ?? points.from.y) - 80))} />}
    <svg className="di-action-thread"><path pathLength="1" d={`M ${points.from.x} ${points.from.y} Q ${points.to.x} ${points.from.y - 70} ${points.to.x} ${points.to.y}`} /></svg>
    <motion.div className="di-flying-piece" initial={{ x: points.from.x - 20, y: points.from.y - 20, scale: .6 }} animate={{ x: points.to.x - 20, y: points.to.y - 20, scale: [1.2, 1, 0], rotate: token === 'fight' ? 70 : -12 }} transition={{ duration: .65 * scale, delay, times: [0, .5, 1] }}>{token && token !== 'spotlight' ? <TokenArtwork token={token} /> : glyph}</motion.div>
    {!!event.result?.progress && <motion.div className="di-progress-flight" initial={{ x: points.to.x, y: points.to.y, opacity: 0 }} animate={{ x: (stage.current?.clientWidth ?? points.to.x) / 2, y: 0, opacity: [0, 1, 0], scale: [1, 1.1, .8] }} transition={{ duration: .55 * scale, delay: .3 * scale + delay }}>+{event.result.progress} progress</motion.div>}
    <div className="di-action-signature-anchor" style={{ left: points.to.x, top: points.to.y }}><ActionSignature event={event} /></div>
    <div className={`di-impact ${strong && shake ? 'with-shake' : ''}`} style={{ left: points.to.x, top: points.to.y }}>{Array.from({ length: strong ? 16 : 6 }, (_, i) => <i key={i} style={{ '--angle': `${i * 360 / (strong ? 16 : 6)}deg` } as React.CSSProperties}>{glyph}</i>)}</div>
  </div>;
}

export function CombinationLinks({ room, stage, userId }: { room: AdventureRoom; stage: RefObject<HTMLDivElement>; userId: string }) {
  const definition = combinationDefinition(room);
  const available = combinationAvailable(room, userId);
  const [paths, setPaths] = useState<string[]>([]);
  useLayoutEffect(() => {
    const root = stage.current;
    if (!root || !definition || !available) { setPaths([]); return; }
    const measure = () => {
      const bounds = root.getBoundingClientRect();
      const point = (id: string) => {
        const box = [...root.querySelectorAll<HTMLElement>('[data-scene-target]')].find(node => node.dataset.sceneTarget === id)?.getBoundingClientRect();
        return box && { x: box.x + box.width / 2 - bounds.x, y: box.y + box.height / 2 - bounds.y };
      };
      const source = point(definition.sourceId);
      setPaths(source ? definition.payoffs.flatMap(payoff => { const target = point(payoff.targetId); return target ? [`M ${source.x} ${source.y} Q ${(source.x + target.x) / 2} ${Math.min(source.y, target.y) - 30} ${target.x} ${target.y}`] : []; }) : []);
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(root); return () => observer.disconnect();
  }, [room.chapter, definition?.id, available, stage]);
  return paths.length ? <svg className="di-combination-links" aria-hidden="true">{paths.map(path => <path key={path} d={path} />)}</svg> : null;
}

export function CombinationNotice({ room, userId }: { room: AdventureRoom; userId: string }) {
  const definition = combinationDefinition(room), state = combinationState(room);
  if (!definition || room.phase !== 'choosing') return null;
  const available = combinationAvailable(room, userId);
  return <div className={`di-combination-notice ${available ? 'is-ready' : ''}`} role="status">
    <strong>{available ? '✧ Combination ready' : state ? state.usedBy.includes(userId) ? '✧ Your combination played' : room.turn > state.throughTurn ? '✧ The opening has passed' : '✧ Opening next turn' : '✧ Make a little magic'}</strong>
    <span>{available ? `${state!.actorName} prepared the opening · ${state!.throughTurn - room.turn + 1} turns left · ${definition.payoffs.map(payoff => `${payoff.token === 'assist' ? 'Help' : payoff.token[0].toUpperCase() + payoff.token.slice(1)} → ${payoff.targetId}`).join(' or ')}` : !state ? `Prepare ${definition.sourceId === 'gate' ? 'the gate with Fight or Help' : definition.sourceId === 'reeds' ? 'the reeds with Investigate or Help' : 'the bell with Fight or Help'}.` : 'Ordinary moves remain available.'}</span>
  </div>;
}

export { stageCaption };
