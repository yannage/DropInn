import { useLayoutEffect, useState, type RefObject } from 'react';
import { Heart, Shield, Sparkles, Swords } from 'lucide-react';
import type { AdventureRoom } from '../../lib/dropinn/types';
import type { IllustratedToken } from './TokenArtwork';
import { GemwardPiece } from './GemwardArt';

const stances = { strike: { label: 'Strike', text: 'A heavy blow. Guard beats Strike.', Icon: Swords }, trick: { label: 'Trick', text: 'A feint. Strike beats Trick.', Icon: Sparkles }, guard: { label: 'Guard', text: 'A closed defense. Trick beats Guard.', Icon: Shield } };
export function GemwardCombat({ room, stage, selectedTarget, quiet, disabled, onSelect, onProtect }: {
  room: AdventureRoom; stage: RefObject<HTMLDivElement>; selectedTarget?: string;
  quiet: boolean; disabled: boolean; onSelect: (id: string, token?: IllustratedToken) => void; onProtect: () => void;
}) {
  const battle = room.expedition?.battle;
  const victim = room.seats.find(seat => seat.actorId === room.enemyIntent?.targetActorId);
  const [path, setPath] = useState<string>();
  useLayoutEffect(() => {
    if (!battle || !stage.current) return;
    const root = stage.current;
    const measure = () => {
      const box = root.getBoundingClientRect();
      const source = root.querySelector<HTMLElement>('[data-scene-target="encounter"]')?.getBoundingClientRect();
      const destination = [...root.querySelectorAll<HTMLElement>('[data-scene-target]')].find(node => node.dataset.sceneTarget === victim?.actorId)?.getBoundingClientRect();
      if (!source || !destination) { setPath(undefined); return; }
      const x = source.x + source.width / 2 - box.x, y = source.y + source.height * .8 - box.y;
      const tx = destination.x + destination.width / 2 - box.x, ty = destination.y - box.y + 16;
      setPath(`M ${x} ${y} Q ${x + 40} ${ty - 40} ${tx} ${ty}`);
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(root); return () => observer.disconnect();
  }, [battle?.id, victim?.actorId, stage]);
  if (!battle) return null;
  const stance = stances[battle.stance];
  const finished = battle.status === 'won' || battle.status === 'escaped';
  const enemy = room.expedition?.variant === 'smugglers' ? 'The hired guard' : 'The ward construct';
  return <div className={`gm-combat ${finished ? 'is-finished' : ''} ${quiet ? 'is-quiet' : ''}`} aria-label="An encounter interrupts the journey">
    <div className="gm-enemy-intent"><stance.Icon size={23} /><div><span className="gm-overline">{finished ? 'The way is open' : `${enemy} · round ${battle.round} of 4`}</span><strong>{finished ? battle.status === 'won' ? 'The party breaks through.' : 'The party escapes with the prism.' : stance.text}</strong>{!finished && victim && <button type="button" disabled={disabled} onClick={onProtect}>Protect {victim.character.name} · {room.enemyIntent?.baseDamage} incoming damage <Shield size={13} /></button>}</div></div>
    {path && !finished && <svg className="gm-threat-line" aria-hidden="true"><path d={path} /></svg>}
    <button type="button" className={`gm-enemy gm-hotspot ${selectedTarget === 'encounter' ? 'is-selected' : ''}`} data-scene-target="encounter" data-target-kind="scene" disabled={disabled} onClick={() => onSelect('encounter')} aria-label={enemy}>
      <GemwardPiece target={{ id: 'encounter', name: enemy, description: '', tokens: [], effects: [] }} variant={room.expedition?.variant ?? 'ward'} locationId={room.expedition?.locationId ?? 'road'} /><span className="gm-piece-name">{enemy}</span>
      <span className="gm-enemy-meter" aria-label={`Resistance overcome: ${battle.progress} of ${battle.goal}`}><i style={{ width: `${Math.min(100, battle.progress / battle.goal * 100)}%` }} /><small>{Number(battle.progress.toFixed(1))} / {battle.goal}</small></span>
    </button>
    <button type="button" className={`gm-battle-cover gm-hotspot ${selectedTarget === 'cover' ? 'is-selected' : ''}`} data-scene-target="cover" data-target-kind="scene" disabled={disabled} onClick={() => onSelect('cover', 'investigate')} aria-label="Take cover with Guard"><img src="/art/story-parcels.webp" alt="" draggable={false} /><span className="gm-piece-name"><Shield size={13} />Take cover</span></button>
    <button type="button" className={`gm-battle-opening gm-hotspot ${selectedTarget === 'opening' ? 'is-selected' : ''}`} data-scene-target="opening" data-target-kind="scene" disabled={disabled} onClick={() => onSelect('opening', 'influence')} aria-label="Exploit the opening with Trick"><span className="gm-opening-mark" aria-hidden="true"><Sparkles /></span><span className="gm-piece-name">Find an opening</span></button>
    <button type="button" className={`gm-battle-allies gm-hotspot ${selectedTarget === 'allies' ? 'is-selected' : ''}`} data-scene-target="allies" data-target-kind="scene" disabled={disabled} onClick={() => onSelect('allies', 'assist')} aria-label="Prepare your class Help move"><span className="gm-piece-name"><Heart size={13} />Help the party</span></button>
  </div>;
}
