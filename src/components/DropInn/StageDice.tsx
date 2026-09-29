import { useRef, type CSSProperties } from 'react';
import { Dice5, Swords } from 'lucide-react';
import type { StoryEvent } from '../../lib/dropinn/types';
import './stage-dice.css';

/** Only confirmed rolls enter here. The wind-up never invents intermediate numbers. */
export function StageDice({ event, elapsed, scale = 1, left, top }: { event: StoryEvent; elapsed: number; scale?: number; left: number; top: number }) {
  const landingDelay = useRef<number>();
  const anticipating = elapsed < 300 * scale;
  if (!anticipating && landingDelay.current === undefined) landingDelay.current = -Math.max(0, elapsed - 300 * scale) / 1000;
  if (event.roll === undefined) return null;
  const duel = event.result?.duel;
  const modifier = event.modifier ?? 0;
  const total = duel?.playerTotal ?? event.roll + modifier;
  const addend = (value: number) => `${value < 0 ? '−' : '+'}${Math.abs(value)}`;
  return <div className={`di-roll-tableau ${duel ? 'is-clash' : ''} ${event.success === false ? 'is-miss' : 'is-success'}`}
    data-roll-event={event.id} data-roll-state={anticipating ? 'anticipating' : 'settled'} style={{ left, top, '--landing-delay': `${landingDelay.current ?? 0}s`, '--die-windup': `${.3 * scale}s`, '--die-land': `${.2 * scale}s` } as CSSProperties}>
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
