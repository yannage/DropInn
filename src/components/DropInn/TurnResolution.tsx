import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Heart, Shield, Sparkles } from 'lucide-react';
import type { AdventureRoom, StoryEvent } from '../../lib/dropinn/types';
import { chaptersFor } from '../../lib/dropinn/registry';
import { resultBenefits, resultLine, revealBeat } from '../../lib/dropinn/turnPresentation';
import { playTableSound } from './tableSound';

export function TurnResolution({ event, room, now, userId, announce = true }: { event: StoryEvent; room: AdventureRoom; now: number; userId: string; announce?: boolean }) {
  const reducedMotion = !!useReducedMotion();
  const beat = event.roll === undefined ? 'payoff' : revealBeat(event, now, reducedMotion);
  const played = useRef('');
  useEffect(() => {
    // Reconnecting to an old result should not replay its sound sequence.
    const key = `${event.id}:${beat}`;
    if (played.current === key) return;
    played.current = key;
    if (Date.now() - event.at > 1800) return;
    playTableSound(beat === 'roll' ? 'roll' : beat === 'bonuses' ? 'bonus' : event.success === false ? 'complication' : 'result');
  }, [event.id, event.at, event.success, beat]);
  const bonus = event.result?.executionBonus ?? 0;
  const modifier = event.modifier ?? 0;
  const benefits = resultBenefits(event);
  const duel = event.result?.duel;
  const outcome = room.outcomes.find(outcome => outcome.chapter === room.chapter);
  const chapters = chaptersFor(room);
  const keepsake = chapters[room.chapter].keepsake;
  const earned = room.players[userId]?.keepsakes.includes(keepsake);
  const showChapter = outcome && (reducedMotion || now - event.at >= 2200);
  const sign = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value)}`;

  return <div className={`di-turn-resolution ${event.success === false ? 'is-complication' : ''}`} data-beat={beat} data-chapter={!!showChapter}>
    <div className="di-resolution-eyebrow" aria-hidden="true">{beat === 'roll' ? 'Your die lands' : beat === 'bonuses' ? 'Your bonuses land' : event.success === false ? 'Forward, with a cost' : 'You made your move'}</div>
    {duel ? <div className="di-duel-score" aria-hidden="true"><div><small>Your roll</small><strong>{beat === 'payoff' ? duel.playerTotal : event.roll}</strong><small>{event.roll} + {modifier}</small></div><span>VS</span><div className="enemy"><small>Enemy roll</small><strong>{beat === 'payoff' ? duel.enemyTotal : duel.enemyRoll}</strong><small>{duel.enemyRoll} + {duel.enemyModifier}</small></div></div> : <div className="di-resolution-math" aria-hidden="true">
      {event.roll !== undefined ? <>
        <span className="di-resolution-die">{event.roll}</span>
        <span className="di-resolution-bonus" data-visible={beat !== 'roll'}><b>{sign(modifier - bonus)}</b><small>ability + support</small></span>
        {bonus > 0 && <span className="di-resolution-bonus is-timing" data-visible={beat !== 'roll'}><b>+{bonus}</b><small>release</small></span>}
        <span className="di-resolution-equals">=</span>
        <span className="di-resolution-total" data-visible={beat === 'payoff'}>{event.roll + modifier}<small>total</small></span>
      </> : <span className="di-resolution-guaranteed">{event.result?.approach === 'mend' ? <Heart size={27} /> : <Shield size={27} />} {event.result?.healing ?? event.result?.protection ?? ''}<small>{event.result?.approach === 'mend' ? 'guaranteed healing' : 'guaranteed protection'}</small></span>}
    </div>}
    <div className="di-resolution-payoff" data-visible={beat === 'payoff'} aria-hidden={beat !== 'payoff'}>
      <strong>{resultLine(event)}</strong>
      <div className="di-resolution-benefits">{benefits.map(benefit => <span key={benefit}>{benefit}</span>)}</div>
    </div>
    {announce && <span className="di-game-sr" role="status">{event.roll !== undefined ? `Rolled ${event.roll}, modifier ${sign(modifier)}, total ${event.roll + modifier}. ` : ''}{duel ? `Enemy rolled ${duel.enemyRoll}, modifier ${duel.enemyModifier}, total ${duel.enemyTotal}. ` : ''}{resultLine(event)}. {benefits.join('. ')}</span>}
    {showChapter && <div className="di-resolution-chapter" role="status"><span><Check size={14} /> Chapter {room.chapter + 1} complete</span>{earned && <strong><Sparkles size={14} /> {keepsake}</strong>}{chapters[room.chapter + 1] && <small><ArrowRight size={12} /> {chapters[room.chapter + 1].title}</small>}</div>}
  </div>;
}
