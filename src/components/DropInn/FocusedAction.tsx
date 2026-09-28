import { ArrowLeft, Heart, Shield, Swords } from 'lucide-react';
import type { AdventureRoom, PlayerAction, Seat, StoryEvent } from '../../lib/dropinn/types';
import { approachDetail, approachOptions, isDuel } from '../../lib/dropinn/approaches';
import { getScene } from '../../lib/dropinn/scene';
import { HeroAvatar } from './HeroAvatar';
import { TargetArtwork } from './TargetArtwork';
import './focused-action.css';

// Reuse the human-scaled mechanical description so a compact card never
// advertises solo progress at a multiplayer table.
function compactApproachDetail(detail: string) {
  return detail.split(' · ').filter(part => part !== 'no cover' && part !== 'no next-turn bonus' && part !== 'no progress')
    .map(part => part.replace('blocks ', 'Win: block ').replace(' on a win', '')
      .replace('ease danger by ', 'Danger −').replace('good release heals ', 'Good release: ')
      .replace(' opening next turn', ' rolls next round').replace(' insight next turn', ' rolls next round'));
}

const compactAttackName: Record<string, string> = { quick: 'Quick', heavy: 'Heavy', guarded: 'Guarded' };

export function FocusedActionStage({ room, action, actor, modifier, result }: {
  room: AdventureRoom; action: PlayerAction; actor: Seat; modifier: number; result?: StoryEvent;
}) {
  const scene = getScene(room);
  const target = scene.targets.find(item => item.id === action.targetId);
  const ally = room.seats.find(seat => seat.actorId === action.targetId);
  const duel = isDuel(room, action);
  const victim = room.seats.find(seat => seat.actorId === room.enemyIntent?.targetActorId);
  const strike = room.events.find(event => event.turn === room.turn && event.result?.targetId === victim?.actorId && event.result?.damage !== undefined)?.result;
  const threatNote = victim && room.enemyIntent ? room.phase === 'reveal'
    ? strike ? strike.damage ? `${victim.character.name} lost ${strike.damage} HP.` : `${victim.character.name} blocked the attack.` : 'The strike was averted.'
    : `${victim.character.name} faces ${room.enemyIntent.baseDamage} damage. Guard or protect to reduce it.` : '';
  const accepted = !!room.commits[actor.actorId];
  const title = room.phase === 'reveal' ? 'Your move resolves' : accepted ? 'Your committed move'
    : duel ? 'Choose your attack' : action.targetKind === 'hero' ? 'Choose how to help' : 'Choose your approach';
  return <section className={`di-focus-stage is-${action.token} ${result ? 'has-clashed' : ''}`} aria-label={duel ? 'Battle focus' : 'Action focus'}>
    <div className="di-focus-heading"><span>{title}</span><strong>{target?.name ?? ally?.character.name ?? 'Your target'}</strong>
      {duel ? <small>Enemy rolls d20 + {room.enemyIntent!.duelModifier} · beat its total</small> : <small>{action.targetKind === 'hero' ? 'Guaranteed aid · no roll needed' : accepted || room.phase === 'reveal' ? 'Your move resolves with the party' : 'Choose what your success will change'}</small>}
      {target && <p className="di-focus-context">{target.context ?? target.description}</p>}
    </div>
    <div className={`di-focus-opponent ${result?.success ? 'is-hit' : ''}`} data-scene-target={action.targetId} data-target-kind={action.targetKind ?? 'scene'}>
      {target ? <TargetArtwork target={target} pose={duel ? result ? 'reaction' : 'windup' : 'idle'} /> : ally && <HeroAvatar hero={ally.character} decorative />}
      {ally && <span><Heart size={13} /> {ally.hp} / {ally.character.maxHp} HP</span>}
    </div>
    <div className="di-focus-player"><HeroAvatar hero={actor.character} decorative /><div><strong>{actor.character.name}</strong><span><Heart size={13} />{actor.hp} / {actor.character.maxHp}</span>{action.targetKind !== 'hero' && <small>Your d20 + {result?.modifier ?? modifier}<br />{result ? 'Resolved with your bonuses' : 'Good release adds +1'}</small>}</div></div>
    <div className="di-focus-stakes">{threatNote ? <><Swords size={15} /><span>{threatNote}</span></> : action.targetKind === 'hero' ? <><Shield size={15} /><span>Helping an ally trades away objective progress this turn.</span></> : <span>On a miss: some progress, but danger rises. Study and Distract set up the next turn.</span>}</div>
  </section>;
}

export function FocusedActionChoices({ room, action, locked, backLocked = locked, onChange, onBack }: {
  room: AdventureRoom; action: PlayerAction; locked: boolean; backLocked?: boolean; onChange: (action: PlayerAction) => void; onBack: () => void;
}) {
  const options = approachOptions(room, action);
  const ally = room.seats.find(seat => seat.actorId === action.targetId);
  const canProtect = action.targetKind === 'hero' && room.enemyIntent?.turn === room.turn && room.enemyIntent.targetActorId === action.targetId;
  return <div className="di-focus-choices">
    <button className="di-focus-back" disabled={backLocked} onClick={onBack} aria-label="Back to scene"><ArrowLeft size={16} /><span>Scene</span></button>
    <div role="group" aria-label="Choose an approach">
      {canProtect && <button disabled={locked} aria-pressed={!action.approach} onClick={() => onChange({ ...action, approach: undefined })}><strong>Protect</strong><span className="di-approach-detail">Block 2 · great release blocks 3</span><span className="di-approach-compact"><span>Block 2</span><span>Good release: 3</span></span></button>}
      {options.map(option => <button key={option.id} aria-label={`${option.label}: ${approachDetail(room, option)}`} disabled={locked || (option.id === 'mend' && (!ally || ally.leaving || ally.hp >= ally.character.maxHp))} aria-pressed={action.approach === option.id} onClick={() => onChange({ ...action, approach: option.id })}>
        <strong><span className="di-approach-name">{option.label}</span><span className="di-approach-short" aria-hidden="true">{compactAttackName[option.id] ?? option.label}</span></strong>
        <span className="di-approach-detail">{approachDetail(room, option)}</span>
        <span className="di-approach-compact" aria-hidden="true">{compactApproachDetail(approachDetail(room, option)).map(part => <span key={part}>{part}</span>)}</span>
      </button>)}
    </div>
  </div>;
}
