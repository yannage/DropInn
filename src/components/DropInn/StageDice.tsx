import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Dice5, Swords } from 'lucide-react';
import type { StoryEvent } from '../../lib/dropinn/types';
import { PERSONAL_ROLL_WINDUP_MS, PERSONAL_ROLL_LANDING_MS } from '../../lib/dropinn/stagePlayback';
import './stage-dice.css';

/** Only confirmed rolls enter here. The wind-up never invents intermediate numbers. */
export function StageDice({ event, elapsed, scale = 1, left, top, windup = 300 * scale, landing = 200 * scale, quiet = false }: { event: StoryEvent; elapsed: number; scale?: number; left: number; top: number; windup?: number; landing?: number; quiet?: boolean }) {
  const landingDelay = useRef<number>();
  const anticipating = !quiet && elapsed < windup;
  if (!anticipating && landingDelay.current === undefined) landingDelay.current = -Math.max(0, elapsed - windup) / 1000;
  if (event.roll === undefined) return null;
  const duel = event.result?.duel;
  const modifier = event.modifier ?? 0;
  const total = duel?.playerTotal ?? event.roll + modifier;
  const addend = (value: number) => `${value < 0 ? '−' : '+'}${Math.abs(value)}`;
  return <div className={`di-roll-tableau ${duel ? 'is-clash' : ''} ${event.success === false ? 'is-miss' : 'is-success'}`}
    data-roll-event={event.id} data-roll-state={anticipating ? 'anticipating' : 'settled'} data-roll-quiet={quiet} style={{ left, top, '--landing-delay': `${landingDelay.current ?? 0}s`, '--die-windup': `${windup / 1000}s`, '--die-land': `${landing / 1000}s` } as CSSProperties}>
    <div className="di-roll-side">
      <b className="di-roll-face">{anticipating ? <Dice5 size={25} /> : event.roll}</b>
      <span className="di-roll-calculation">{anticipating ? 'Rolling…' : <><small>{addend(modifier)}</small><strong>= {total}</strong></>}</span>
    </div>
    {duel && <><Swords className="di-roll-versus" size={17} /><div className="di-roll-side is-enemy">
      <b className="di-roll-face">{anticipating ? <Dice5 size={25} /> : duel.enemyRoll}</b>
      <span className="di-roll-calculation">{anticipating ? 'Clash…' : <><small>{addend(duel.enemyModifier)}</small><strong>= {duel.enemyTotal}</strong></>}</span>
    </div></>}
    {!anticipating && <span className="di-roll-verdict">{event.success === false ? duel && total === duel.enemyTotal ? 'Tie · enemy holds' : 'Complication' : duel ? 'Clash won' : 'Success'}</span>}
  </div>;
}

/** The player's dice outlive the impact; other actors' effects cannot replace them. */
export function PersonalStageDice({ event, elapsed, stage, quiet, captionId, inline = false }: { event: StoryEvent; elapsed: number; stage: RefObject<HTMLDivElement>; quiet: boolean; captionId?: string; inline?: boolean }) {
  const [position, setPosition] = useState({ left: 0, top: 8 });
  useLayoutEffect(() => {
    const root = stage.current;
    if (!root || inline) return;
    const measure = () => {
      const bounds = root.getBoundingClientRect();
      const caption = root.querySelector<HTMLElement>('.di-stage-caption');
      // Reserve space for the next caption too, so the held dice do not jump down
      // between short impacts. Layout offsets exclude the caption entrance motion.
      const captionTop = caption?.offsetHeight ? caption.offsetTop : bounds.height;
      setPosition({ left: bounds.width / 2, top: Math.max(8, Math.min(bounds.height / 2 - 34, bounds.height - 240, captionTop - 80)) });
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(root);
    const caption = root.querySelector('.di-stage-caption'); if (caption) observer.observe(caption);
    return () => observer.disconnect();
  }, [event.actorId, stage, captionId, inline]);
  return <div className={`di-personal-roll ${inline ? 'is-inline' : ''}`} role="status" aria-label="Your confirmed roll">
    <StageDice event={event} elapsed={elapsed} {...position} windup={PERSONAL_ROLL_WINDUP_MS} landing={PERSONAL_ROLL_LANDING_MS} quiet={quiet} />
  </div>;
}
