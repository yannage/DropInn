import { Shield, Swords, Sparkles, Heart } from 'lucide-react';
import { combatMoves } from '../../lib/dropinn/expedition';
import type { AdventureRoom, TokenKind } from '../../lib/dropinn/types';
import type { CharacterClassKey } from '../../lib/character';
import { TokenArtwork } from './TokenArtwork';

const stanceCopy = {
  strike: 'A heavy strike is coming. Guard counters Strike.',
  trick: 'The enemy is preparing a trick. Strike counters Trick.',
  guard: 'The enemy is bracing. Trick counters Guard.',
};
const counterIcons = { strike: Swords, trick: Sparkles, guard: Shield };

/** Combat has its own presentation; the expedition still owns the turn and release. */
export function ExpeditionCombat({ room, classKey, selectedToken, disabled, canProtect, onProtect, onSelect }: {
  room: AdventureRoom;
  classKey: CharacterClassKey;
  selectedToken?: TokenKind;
  disabled: boolean;
  canProtect: boolean;
  onProtect: () => void;
  onSelect: (token: Exclude<TokenKind, 'spotlight'>) => void;
}) {
  const battle = room.expedition?.battle;
  if (!battle) return null;
  const Intent = counterIcons[battle.stance];
  const moves = combatMoves(classKey, room.seats.filter(seat => seat.kind === 'human').length);
  const victim = room.seats.find(seat => seat.actorId === room.enemyIntent?.targetActorId);
  const finished = battle.status === 'won' || battle.status === 'escaped';
  const percent = Math.min(100, battle.progress / Math.max(1, battle.goal) * 100);
  return <section className="exp-combat" aria-label="Party encounter">
    <button type="button" className="exp-enemy-intent" disabled={!canProtect || finished} onClick={onProtect} aria-label={victim ? `Prepare Help to protect ${victim.character.name} from ${room.enemyIntent?.baseDamage} damage` : 'Enemy intent'}>
      <Intent size={22} aria-hidden="true" />
      <div><strong>{finished ? battle.status === 'won' ? 'The encounter is won' : 'Your party escaped' : `Enemy intent: ${battle.stance}`}</strong><span>{finished ? 'The prism is safe. Exploration resumes next turn.' : stanceCopy[battle.stance]}</span>{!finished && victim && <span className="exp-victim">{victim.character.name} faces {room.enemyIntent?.baseDamage} damage · tap to Protect.</span>}</div>
      <span className="exp-battle-round">Round {battle.round}</span>
    </button>
    <div className="exp-battle-meter"><span>Break their resistance <b>{Number(battle.progress.toFixed(1))} / {battle.goal}</b></span><div role="progressbar" aria-label="Encounter progress" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${percent}%` }} /></div></div>
    <div className="exp-combat-moves">
      {moves.map(move => { const Symbol = move.stance ? counterIcons[move.stance] : Heart; return <button type="button" data-expedition-target={`combat-${move.token}`} key={move.token} className={`exp-target exp-combat-target ${selectedToken === move.token ? 'is-selected' : ''}`} aria-pressed={selectedToken === move.token} disabled={disabled} onClick={() => onSelect(move.token as Exclude<TokenKind, 'spotlight'>)}>
        <span className="exp-combat-symbol" data-stance={move.stance ?? 'support'} aria-hidden="true"><Symbol strokeWidth={1.5} /></span>
        <span className="exp-target-name">{move.label}</span>
        <span className="exp-combat-role">{move.stance ?? 'Class support'}</span>
        <span className="exp-target-seal"><TokenArtwork token={move.token as Exclude<TokenKind, 'spotlight'>} /></span>
      </button>; })}
    </div>
    <p className="exp-battle-footnote"><Heart size={13} aria-hidden="true" /> Everyone acts together. Each class has a signature move and strength.</p>
  </section>;
}
