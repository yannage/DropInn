import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Heart, Shield, Sparkles } from 'lucide-react';
import type { AdventureRoom, StoryEvent } from '../../lib/dropinn/types';
import { chaptersFor } from '../../lib/dropinn/registry';
import { resultBenefits, resultLine, revealBeat } from '../../lib/dropinn/turnPresentation';
import { playTableSound } from './tableSound';
import { ResultBenefits } from './RoundRecap';
import './payoff-feel.css';

/** The total lands during bonuses; its sound belongs to the actual outcome. */
export function resolutionSoundCue(event: StoryEvent, beat: ReturnType<typeof revealBeat>, now: number) {
  const elapsed = now - event.at;
  if (elapsed < 0 || elapsed > 1800 || event.contribution === false) return undefined;
  const cue = beat === 'roll' ? 'roll' : event.success === false ? 'complication' : 'result';
  return { key: `${event.id}:${beat === 'roll' ? 'roll' : 'outcome'}`, cue } as const;
}

export function TurnResolution({ event, room, now, userId, announce = true }: { event: StoryEvent; room: AdventureRoom; now: number; userId: string; announce?: boolean }) {
  const reducedMotion = !!useReducedMotion();
  const beat = event.roll === undefined ? 'payoff' : revealBeat(event, now, reducedMotion);
  const played = useRef('');
  useEffect(() => {
    // Reconnecting to an old result should not replay its sound sequence.
    const sound = resolutionSoundCue(event, beat, Date.now());
    if (!sound || played.current === sound.key) return;
    played.current = sound.key;
    playTableSound(sound.cue);
  }, [event.id, event.at, event.success, event.contribution, beat]);
  const bonus = event.result?.executionBonus ?? 0;
  const modifier = event.modifier ?? 0;
  const benefits = resultBenefits(event);
  const duel = event.result?.duel;
  const healing = event.result?.approach === 'mend' || event.result?.healing !== undefined;
  const guaranteedAid = healing || event.result?.protection !== undefined;
  const outcome = room.outcomes.find(outcome => outcome.chapter === room.chapter);
  const chapters = chaptersFor(room);
  const keepsake = chapters[room.chapter].keepsake;
  const earned = room.players[userId]?.keepsakes.includes(keepsake);
  const showChapter = outcome && (reducedMotion || now - event.at >= 2200);
  const sign = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value)}`;
  // The personal view lasts 1.1 seconds. Let its total land with the bonuses so
  // it is readable before the shared scene returns; the recap keeps the arithmetic.
  const showTotal = beat !== 'roll';
  const elapsed = Math.max(0, now - event.at);

  return <div className={`di-turn-resolution ${event.success === false ? 'is-complication' : ''}`} data-beat={beat} data-chapter={!!showChapter} data-fresh={!reducedMotion && elapsed < 1100} style={{ animationDelay: `${-elapsed}ms` }}>
    <div className="di-resolution-eyebrow" aria-hidden="true">{beat === 'roll' ? 'Your die lands' : beat === 'bonuses' ? 'Your bonuses land' : event.success === false ? 'Forward, with a cost' : 'You made your move'}</div>
    {duel ? <div className="di-duel-score" aria-hidden="true"><div><small>{showTotal ? 'Your total' : 'Your roll'}</small><strong>{showTotal ? duel.playerTotal : event.roll}</strong><small>{event.roll} {sign(modifier)}</small></div><span>VS</span><div className="enemy"><small>{showTotal ? 'Enemy total' : 'Enemy roll'}</small><strong>{showTotal ? duel.enemyTotal : duel.enemyRoll}</strong><small>{duel.enemyRoll} {sign(duel.enemyModifier)}</small></div></div> : <div className="di-resolution-math" aria-hidden="true">
      {event.roll !== undefined ? <>
        <span className="di-resolution-die">{event.roll}</span>
        <span className="di-resolution-bonus" data-visible={beat !== 'roll'}><b>{sign(modifier - bonus)}</b><small>ability + support</small></span>
        {bonus > 0 && <span className="di-resolution-bonus is-timing" data-visible={beat !== 'roll'}><b>+{bonus}</b><small>release</small></span>}
        <span className="di-resolution-equals">=</span>
        <span className="di-resolution-total" data-visible={showTotal}>{event.roll + modifier}<small>total</small></span>
      </> : guaranteedAid ? <span className="di-resolution-guaranteed">{healing ? <Heart size={27} /> : <Shield size={27} />} {event.result?.healing ?? event.result?.protection ?? ''}<small>{healing ? 'guaranteed healing' : 'guaranteed protection'}</small></span> : <span className="di-resolution-recorded">{event.contribution === false ? 'You sat out this turn' : 'Your recorded move'}</span>}
    </div>}
    <div className="di-resolution-payoff" data-visible={showTotal} aria-hidden={!showTotal}>
      <strong>{resultLine(event)}</strong>
      <ResultBenefits benefits={benefits} />
    </div>
    {announce && <span className="di-game-sr" role="status">{event.roll !== undefined ? `Rolled ${event.roll}, modifier ${sign(modifier)}, total ${event.roll + modifier}. ` : ''}{duel ? `Enemy rolled ${duel.enemyRoll}, modifier ${duel.enemyModifier}, total ${duel.enemyTotal}. ` : ''}{resultLine(event)}. {benefits.join('. ')}</span>}
    {showChapter && <div className="di-resolution-chapter" role="status"><span><Check size={14} /> Chapter {room.chapter + 1} complete</span>{earned && <strong><Sparkles size={14} /> {keepsake}</strong>}{chapters[room.chapter + 1] && <small><ArrowRight size={12} /> {chapters[room.chapter + 1].title}</small>}</div>}
  </div>;
}
