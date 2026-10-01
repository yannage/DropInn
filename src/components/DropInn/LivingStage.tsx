import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { motion } from 'framer-motion';
import type { AdventureRoom, StoryEvent } from '../../lib/dropinn/types';
import { claimStageSound, stageCaption, stageProjection } from '../../lib/dropinn/stagePlayback';
import { combinationAvailable, combinationDefinition, combinationState } from '../../lib/dropinn/combinations';
import { StageDice } from './StageDice';
import { HeroAvatar } from './HeroAvatar';
import { TokenArtwork } from './TokenArtwork';
import { playTableSound } from './tableSound';

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
  const actor = room.seats.find(seat => seat.actorId === event.actorId);
  const token = event.result?.token;
  const strong = (event.success !== false && !!event.result?.combination) || event.result?.approach === 'heavy';
  const glyph = token === 'influence' ? '“' : token === 'investigate' ? '✧' : token === 'assist' ? '♡' : '✦';
  return <div className={`di-stage-effects is-${token ?? 'strike'} ${strong ? 'is-strong' : ''}`} aria-hidden="true" data-stage-event={event.id} style={{ "--beat-offset": `${delay}s`, "--beat-duration": `${duration / 1000}s`, "--beat-contact": `${.3 * scale}s`, "--beat-tail": `${.55 * scale}s`, "--beat-shake": `${.18 * scale}s` } as React.CSSProperties} key={event.id}>
    {showDice && <StageDice key={event.id} event={event} elapsed={elapsed} scale={scale} left={event.result?.duel ? (stage.current?.clientWidth ?? 320) / 2 : Math.max(68, Math.min((stage.current?.clientWidth ?? 320) - 68, points.from.x))} top={Math.max(8, Math.min(points.from.y - 100, (points.captionTop ?? points.from.y) - 80))} />}
    <svg className="di-action-thread"><path d={`M ${points.from.x} ${points.from.y} Q ${points.to.x} ${points.from.y - 70} ${points.to.x} ${points.to.y}`} /></svg>
    {actor && event.kind === 'action' && <motion.div className="di-acting-hero" initial={{ x: points.from.x - 28, y: points.from.y - 28, opacity: 0 }} animate={{ x: [points.from.x - 28, points.from.x - 28 + (points.to.x - points.from.x) * .3, points.from.x - 28], y: [points.from.y - 28, points.from.y - 65, points.from.y - 28], opacity: [0, 1, 0] }} transition={{ duration: .8 * scale, delay }}><HeroAvatar hero={actor.character} decorative /></motion.div>}
    <motion.div className="di-flying-piece" initial={{ x: points.from.x - 20, y: points.from.y - 20, scale: .6 }} animate={{ x: points.to.x - 20, y: points.to.y - 20, scale: [1.2, 1, 0], rotate: token === 'fight' ? 70 : -12 }} transition={{ duration: .65 * scale, delay, times: [0, .5, 1] }}>{token && token !== 'spotlight' ? <TokenArtwork token={token} /> : glyph}</motion.div>
    {!!event.result?.progress && <motion.div className="di-progress-flight" initial={{ x: points.to.x, y: points.to.y, opacity: 0 }} animate={{ x: (stage.current?.clientWidth ?? points.to.x) / 2, y: 0, opacity: [0, 1, 0], scale: [1, 1.1, .8] }} transition={{ duration: .55 * scale, delay: .3 * scale + delay }}>+{event.result.progress} progress</motion.div>}
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
