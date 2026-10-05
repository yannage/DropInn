import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Backpack, BookOpen, Check, Clock3, Compass, Droplets, Flame, Heart, Map, MessageCircle, Shield, Sparkles, Swords, Users, Volume2, VolumeX } from 'lucide-react';
import { useAdventureStore } from '../../store/adventureStore';
import { QUEST_GEAR, QUEST_RUN_CONTENT, questCombatMoves, questMap, questOptions, questRunView } from '../../lib/dropinn/questRun';
import type { QuestRunAction, QuestOption } from '../../lib/dropinn/questRunTypes';
import type { AdventureRoom, StoryEvent } from '../../lib/dropinn/types';
import { invitationUrl } from '../../lib/dropinn/invites';
import { HeroAvatar } from './HeroAvatar';
import { TargetArtwork } from './TargetArtwork';
import { QUEST_SCENES, QuestItemArtwork, questPiecePresentation } from './QuestArtwork';
import { SceneArt } from './SceneArt';
import { KeepsakeArtwork } from './KeepsakeArtwork';
import { SceneDrawer } from './SceneAdventure';
import { HeroReaction, TableReactions } from './TableReactions';
import { useLiveReducedMotion } from './TableContact';
import { useVisibleTable } from './StageAtmosphere';
import { FrameAnimation } from './FrameAnimation';
import { playTableSound, setTableSound, tableSoundEnabled } from './tableSound';
import './quest-adventure.css';
import './quest-art.css';

type Drawer = 'map' | 'pack' | 'hero' | 'story' | 'party' | 'chat' | 'settings' | null;
type Prepared = { action: QuestRunAction; label: string; detail: string };
const moveIcons = { attack: Swords, defend: Shield, spell: Sparkles, mend: Heart };
const artUrl = (art: string) => art.startsWith('/') ? art : `/art/${art}${/\.(png|webp)$/.test(art) ? '' : '.webp'}`;
const actualQuestEvent = (event: StoryEvent) => event.quest && !['loot', 'upgrade'].includes(event.quest.kind);

/** A different game loop: one hero's short scene, with choices and consequences sharing the table. */
export function QuestAdventure({ room, chat }: { room: AdventureRoom; chat: ReactNode }) {
  const { userId, loading, pendingQuest, commitQuestAction, leaveRoom, joinRoom, error, messages, sendChat } = useAdventureStore();
  const state = room.questRun!;
  const view = questRunView(room, userId);
  const self = room.seats.find(seat => seat.actorId === userId && seat.kind === 'human');
  const [now, setNow] = useState(Date.now);
  const [targetId, setTargetId] = useState<string>();
  const [prepared, setPrepared] = useState<Prepared>();
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [sound, setSound] = useState(tableSoundEnabled);
  const [reduceEffects, setReduceEffects] = useState(() => { try { return localStorage.getItem('dropinn-effects') === 'off'; } catch { return false; } });
  const [copied, setCopied] = useState(false);
  const focusHome = useRef<HTMLDivElement>(null);
  const reducedMotion = useLiveReducedMotion();
  const visible = useVisibleTable();
  const quiet = reducedMotion || reduceEffects || !visible;
  const pending = pendingQuest;
  const canAct = view.isActive && !loading && !pending && !!self && !self.leaving && now < room.deadline;
  const buildEnabled = !!self && !self.leaving && room.status === 'active' && !loading && !pending;
  const battle = state.combat;
  const combat = view.mode === 'combat' || room.phase === 'reveal' && !!battle;
  const enemy = battle && QUEST_RUN_CONTENT.enemies[battle.enemyId];
  const target = view.node.targets.find(item => item.id === targetId) ?? view.node.targets.find(item => item.id === state.followUp?.targetId) ?? view.node.targets[0];
  const targetPresentation = target && questPiecePresentation(target, state);
  const availableOptions = target ? questOptions(room, target.id) : [];
  const followUpOptions = state.followUp?.targetId === target?.id ? availableOptions.filter(option => state.followUp!.optionIds.includes(option.id)) : [];
  const options = followUpOptions.length ? followUpOptions : availableOptions;
  const moves = questCombatMoves(room, userId);
  const latest = room.events.filter(actualQuestEvent).at(-1);
  const currentEvents = room.events.filter(event => event.turn === (latest?.turn ?? room.turn) && (actualQuestEvent(event) || event.result?.targetKind === 'hero')
    // The initial water condition shares turn one, but is not a reward for the first action.
    && (event.actorId || event.quest?.kind !== 'discovery' || event.id === latest?.id));
  const result = currentEvents;
  const acted = currentEvents.find(event => event.contribution);
  const impact = currentEvents.find(event => (event.quest?.enemyDamage ?? 0) > 0);
  const discovery = [...currentEvents].reverse().find(event => event.quest?.factIds?.length || event.quest?.itemIds?.length);
  const checked = currentEvents.find(event => event.quest?.check);
  const wounded = room.seats.filter(seat => seat.kind === 'human' && !seat.leaving && seat.hp < seat.character.maxHp);
  const seconds = Math.max(0, Math.ceil((room.deadline - now) / 1000));
  const elapsed = latest ? Math.max(0, now - latest.at) : Infinity;
  const liveResult = room.phase === 'reveal' && !!latest && elapsed < 3000;
  const hit = liveResult && !!impact;
  const discovered = liveResult && !!discovery;
  const phase = room.status === 'completed' ? 'completed' : room.phase === 'reveal' ? 'reveal' : combat ? 'combat' : 'exploration';
  const lastMessage = messages.at(-1);
  const ownHero = state.heroes[userId];
  const activeName = view.activeActorId === userId ? 'You' : view.activeActorName;
  const firstMove = !room.events.some(event => event.contribution && event.quest);
  const discoveryLabels = [...(discovery?.quest?.itemIds ?? []).map(id => QUEST_RUN_CONTENT.items[id]?.label ?? id), ...(discovery?.quest?.factIds ?? []).map(id => QUEST_RUN_CONTENT.facts[id]?.label ?? id)].slice(0, 2);
  const missingLeads = Array.from(new Set((target?.options ?? []).filter(option => !state.usedOptions.includes(option.id) && !(option.absent ?? []).some(id => state.facts.some(fact => fact.id === id))).flatMap(option => option.requires ?? []).filter(id => !state.facts.some(fact => fact.id === id))));

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 100); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    setPrepared(undefined);
    setTargetId(state.followUp?.targetId);
    setCopied(false);
  }, [room.turn, state.nodeId]);
  useEffect(() => {
    // Inspecting the shared map is free. A scene change must not leave a stale travel confirmation open.
    setDrawer(current => current === 'map' ? null : current);
  }, [state.nodeId]);
  useEffect(() => {
    if (room.phase === 'choosing' && view.activeActorId === userId && !drawer) focusHome.current?.focus({ preventScroll: true });
  }, [room.turn, room.phase, view.activeActorId]);
  const sounded = useRef<string>();
  useEffect(() => {
    if (!latest || sounded.current === latest.id || elapsed > 600 || !visible) return;
    sounded.current = latest.id;
    playTableSound(latest.quest?.kind === 'combat' ? 'place' : 'pick');
  }, [latest?.id, visible]);

  function prepare(action: QuestRunAction, label: string, detail: string) {
    if (pending || !view.isActive || room.phase !== 'choosing') return;
    setPrepared({ action, label, detail });
    playTableSound('pick');
  }
  function chooseOption(option: QuestOption) {
    prepare({ kind: 'interact', targetId: target.id, optionId: option.id }, option.label, option.preview);
  }
  function chooseMove(move: ReturnType<typeof questCombatMoves>[number]) {
    const recipient = wounded.find(seat => seat.actorId === userId) ?? wounded[0];
    prepare({ kind: 'combat', move: move.id, ...(move.id === 'mend' && recipient ? { targetActorId: recipient.actorId } : {}) }, move.label, move.description);
  }
  async function release() {
    if (!canAct || !prepared) return;
    await commitQuestAction(prepared.action);
  }
  function prepareTravel(edgeId: string, label: string, detail: string) {
    prepare({ kind: 'travel', edgeId }, label, detail);
    setDrawer(null);
  }
  const closeDrawer = () => setDrawer(null);
  const note = (text: string) => void sendChat(text);
  const recovery = <div className="qr-recovery" role="status"><strong>Your choice is saved.</strong><p>Checking confirmation. Retrying keeps exactly the same move.</p><button className="qr-confirm" type="button" disabled={loading} onClick={() => pending && void commitQuestAction(pending.action)}>Retry the same move <ArrowRight size={17} /></button></div>;

  return <main className={`qr-adventure ${quiet ? 'is-quiet' : ''} is-${phase}`} data-quest-mode={phase}>
    <header className="qr-header">
      <div className="qr-quest-title"><span>A Mosswater expedition</span><strong>Bring clean water home</strong></div>
      <button type="button" className="qr-header-map" onClick={() => setDrawer('map')} aria-label="Open expedition map"><Map size={20} /><span>Map</span></button>
      <button type="button" className="qr-icon" onClick={() => setDrawer('settings')} aria-label="Open expedition settings"><BookOpen size={21} /></button>
    </header>
    <div className="qr-lantern-bar" ref={focusHome} tabIndex={-1} data-quest-focus>
      <span className="qr-lantern"><Flame size={22} aria-hidden="true" /></span>
      <div><strong>{room.status === 'completed' ? 'A little legend, made together' : room.phase === 'reveal' ? 'Here is what happened' : `${activeName} ${view.activeActorId === userId ? 'hold' : 'holds'} the lantern`}</strong><span>{room.status === 'completed' ? 'Your expedition is complete.' : room.phase === 'reveal' ? 'The whole party sees the consequence.' : combat ? 'One combat move, then the next hero.' : `${view.actionsRemaining} ${view.actionsRemaining === 1 ? 'action' : 'actions'} left · look around, then make your move.`}</span></div>
      {room.status === 'active' && room.phase === 'choosing' && <span className={`qr-clock ${seconds < 10 ? 'is-urgent' : ''}`} aria-label={`${seconds} seconds left in this turn`}><Clock3 size={14} />{seconds}s</span>}
    </div>
    <section className="qr-stage" aria-label={combat ? 'Battle at ' + view.node.label : view.node.label} data-quest-stage>
      <img className="qr-backdrop" key={state.nodeId} src={artUrl(QUEST_SCENES[state.nodeId] ?? view.node.art)} alt="" aria-hidden="true" draggable={false} onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />
      <div className="qr-stage-wash" />
      <div className="qr-place-label"><Compass size={13} /><span>{view.node.label}</span></div>
      {combat && battle && enemy ? <>
        <div className="qr-enemy-intent" data-quest-enemy-intent><Swords size={19} /><span><strong>{enemy.name}</strong>{battle.intent.label}: {battle.intent.damage} damage to {room.seats.find(seat => seat.actorId === battle.intent.targetActorId)?.character.name ?? 'the party'}<small>After every hero acts · round {battle.round} · {battle.enemyArmor} armor</small><small>{Math.max(0, battle.intent.damage - (battle.protection[battle.intent.targetActorId] ?? 0) - Number(battle.roundContributed && room.seats.some(seat => seat.kind === 'companion')))} damage after current cover</small></span></div>
        <div className={`qr-enemy-piece ${hit && !quiet ? 'is-hit' : ''}`} key={`${battle.id}:${latest?.id}`} style={{ '--qr-event-delay': `${-elapsed}ms` } as CSSProperties}>
          <TargetArtwork target={{ id: battle.enemyId, artKey: enemy.artKey }} />
          <div className="qr-enemy-health" role="progressbar" aria-label={`${enemy.name} health`} aria-valuemin={0} aria-valuemax={battle.enemyMaxHp} aria-valuenow={battle.enemyHp}><i style={{ width: `${Math.max(0, battle.enemyHp / battle.enemyMaxHp * 100)}%` }} /><strong>{battle.enemyHp} / {battle.enemyMaxHp}</strong></div>
        </div>
        {hit && !quiet && <span key={impact!.id} className="qr-damage-number" style={{ animationDelay: `${-elapsed}ms` }}>−{impact!.quest!.enemyDamage}</span>}
      </> : <div className="qr-scene-pieces">{view.node.targets.map((piece, index) => {
        const done = !questOptions(room, piece.id).length && piece.options.some(option => state.usedOptions.includes(option.id));
        const presentation = questPiecePresentation(piece, state);
        return <button type="button" key={`${state.nodeId}:${piece.id}`} data-quest-target={piece.id} className={`qr-scene-piece ${target?.id === piece.id ? 'is-selected' : ''}`} aria-pressed={target?.id === piece.id} onClick={() => { setTargetId(piece.id); setPrepared(undefined); playTableSound('pick'); }} style={{ '--qr-piece-index': index, '--qr-piece-count': view.node.targets.length } as CSSProperties}>
          <span className="qr-piece-shadow" /><TargetArtwork target={{ id: piece.id, artKey: presentation.artKey }} /><span className="qr-piece-label">{done && <Check size={12} />}{presentation.name}</span>
        </button>;
      })}</div>}
      <div className="qr-party" aria-label="The party">{room.seats.map(seat => {
        const hero = state.heroes[seat.actorId];
        const healthEvent = liveResult && currentEvents.find(event => event.result?.targetKind === 'hero' && event.result.targetId === seat.actorId);
        return <button type="button" key={seat.actorId} className={`qr-hero ${seat.actorId === view.activeActorId ? 'is-active' : ''} ${seat.actorId === battle?.intent.targetActorId && combat ? 'is-threatened' : ''} ${healthEvent && healthEvent.result?.damage ? 'is-wounded' : healthEvent && healthEvent.result?.healing ? 'is-healed' : liveResult && acted?.actorId === seat.actorId ? 'is-acting' : ''}`} style={{ '--qr-event-delay': `${-elapsed}ms` } as CSSProperties} onClick={() => setDrawer(seat.actorId === userId ? 'hero' : 'party')} aria-label={`${seat.character.name}, ${seat.hp} of ${seat.character.maxHp} health${seat.actorId === view.activeActorId ? ', holding the lantern' : ''}`}>
          <span className="qr-hero-art"><HeroAvatar hero={seat.character} decorative /></span><span className="qr-hero-label">{seat.actorId === userId ? 'You' : seat.character.name}{seat.kind === 'companion' && ' · helper'}</span><small><Heart size={10} />{seat.hp}{hero && <><Sparkles size={9} />{hero.mana}</>}</small><HeroReaction room={room} actorId={seat.actorId} now={now} />
        </button>;
      })}</div>
      {discovered && !quiet && <FrameAnimation key={latest!.id} atlas="discovery" durationMs={650} elapsedMs={elapsed} className="qr-discovery" />}
      {liveResult && combat && battle?.round === 1 && !battle.actedActorIds.length && !quiet && <FrameAnimation key={battle.id} atlas="encounter" durationMs={650} elapsedMs={elapsed} className="qr-encounter" />}
      {discovered && !firstMove && room.status !== 'completed' && <div className="qr-found-receipt" data-quest-discovery><Check size={18} /><span><small>Added to the shared pouch</small><strong>{discoveryLabels.join(' · ')}</strong></span></div>}
    </section>

    <section className="qr-table" aria-label="Your next decision">
      <div className="qr-quest-thread"><span><Droplets size={15} />{state.ending ? 'Clean water reaches Mosswater again.' : view.objective}</span><button type="button" onClick={() => setDrawer('pack')} aria-label={`Shared quest pouch, ${state.items.length} items`}><Backpack size={16} /><b>{state.supplies}</b><span>supplies</span></button></div>
      <div className="qr-story-beat" aria-live="polite" data-quest-result>
        {room.phase === 'reveal' || !view.isActive || room.status === 'completed' ? <>
          <strong>{room.status === 'completed' ? 'What your party changed' : acted?.actorName ? `${acted.actorName} made a move` : 'The well growls back.'}</strong>
          <p>{room.status === 'completed' ? state.ending?.text : result.length ? result.map(event => event.text).join(' ') : QUEST_RUN_CONTENT.opening}</p>
        </> : <>
          <strong>{firstMove ? 'The village is thirsty. The well is growling.' : combat ? 'Read the strike. Choose your answer.' : followUpOptions.length ? 'You found something. What next?' : !options.length && targetPresentation ? targetPresentation.name : `What will you try${targetPresentation ? ` with ${targetPresentation.name.toLowerCase()}` : ''}?`}</strong>
          <p>{firstMove ? QUEST_RUN_CONTENT.opening : combat ? enemy?.description : followUpOptions.length && acted ? acted.text : targetPresentation?.context ?? view.node.description}</p>
        </>}
        {checked?.quest?.check && <div className="qr-check-result"><b>{checked.quest.check.roll}</b> + {checked.quest.check.modifier} · needed {checked.quest.check.dc}<strong>{checked.quest.check.success ? 'Made it!' : 'A costly discovery'}</strong></div>}
      </div>

      {pending ? recovery
        : room.status === 'completed' ? <div className="qr-end-actions"><button className="qr-confirm" type="button" onClick={() => setDrawer('story')}><BookOpen size={17} />Read our trail</button><button className="qr-quiet-button" type="button" disabled={loading} onClick={() => void leaveRoom()}>Keep the memory & leave <ArrowRight size={17} /></button></div>
        : room.phase === 'reveal' ? <div className="qr-resolving"><span className="qr-settling-mark"><Check size={15} /></span><span>{discovered ? 'A new possibility is on the table.' : 'The table is changing.'}</span></div>
        : view.isActive ? <>
          <div className={`qr-options ${combat ? 'is-combat' : ''}`} role="group" aria-label={combat ? 'Choose a combat move' : 'Choose an intention'}>
            {combat ? moves.map(move => { const Icon = moveIcons[move.id]; return <button key={move.id} type="button" data-quest-move={move.id} className={prepared?.action.kind === 'combat' && prepared.action.move === move.id ? 'is-prepared' : ''} aria-pressed={prepared?.action.kind === 'combat' && prepared.action.move === move.id} disabled={!move.available || !canAct} onClick={() => chooseMove(move)}><Icon size={20} /><span><strong>{move.id === 'spell' ? `Spell · ${move.label}` : move.label}</strong><small>{move.reason ?? move.description}</small></span></button>; })
              : options.map(option => { const affordable = state.supplies + (option.supplyDelta ?? 0) >= 0; const modifier = option.check ? ownHero?.attributes[option.check.attribute] ?? 0 : 0; const odds = option.check ? Math.round(Math.min(6, Math.max(0, 7 + modifier - option.check.dc)) / 6 * 100) : 0; return <button key={option.id} type="button" data-quest-option={option.id} className={prepared?.action.kind === 'interact' && prepared.action.optionId === option.id ? 'is-prepared' : ''} aria-pressed={prepared?.action.kind === 'interact' && prepared.action.optionId === option.id} disabled={!canAct || !affordable} onClick={() => chooseOption(option)}><span><strong>{option.label}</strong><small>{affordable ? option.preview : `Needs ${-(option.supplyDelta ?? 0)} shared supplies. Find more on the map.`}</small>{option.check && <small><b>{option.check.attribute} +{modifier} · {odds}% chance</b></small>}</span><ArrowRight size={17} /></button>; })}
            {!combat && !options.length && <p className="qr-no-options">{missingLeads.length ? `This needs another lead: ${missingLeads.map(id => QUEST_RUN_CONTENT.facts[id]?.label ?? id).join(', ')}.` : 'This piece has no more moves.'} Look at another piece or follow a route on the map.</p>}
          </div>
          {prepared?.action.kind === 'combat' && prepared.action.move === 'mend' && <div className="qr-mend-targets" role="group" aria-label="Choose who to Mend"><span>Who needs the help?</span>{wounded.map(seat => <button type="button" key={seat.actorId} aria-pressed={prepared.action.kind === 'combat' && prepared.action.targetActorId === seat.actorId} onClick={() => setPrepared({ ...prepared, action: { kind: 'combat', move: 'mend', targetActorId: seat.actorId }, label: `Mend ${seat.actorId === userId ? 'yourself' : seat.character.name}` })}>{seat.actorId === userId ? 'You' : seat.character.name} · {seat.hp}/{seat.character.maxHp} HP</button>)}</div>}
          <div className="qr-release-row">{prepared ? <button type="button" className="qr-confirm" data-quest-release disabled={!canAct} onClick={() => void release()}>{loading ? 'Placing your move…' : prepared.label}<ArrowRight size={18} /></button> : combat ? <span className="qr-prepared-reason">Choose a move, then confirm it here.</span> : <button type="button" className="qr-route-button" onClick={() => setDrawer('map')}><Map size={18} />Choose a route</button>}{!combat && <button type="button" className="qr-pass" disabled={!canAct} onClick={() => prepare({ kind: 'pass' }, 'Pass the lantern', 'End your scene and let the next hero take the lead.')} aria-label="Prepare to pass the lantern">Pass <ArrowRight size={14} /></button>}</div>
          {prepared && <p className="qr-prepared-reason" data-quest-preview>{prepared.detail}</p>}
        </> : <div className="qr-waiting">
          <div className="qr-waiting-copy"><strong>{room.pendingJoins.includes(userId) ? 'A seat is being made for you.' : self?.leaving ? 'Your hero is leaving safely.' : `${view.activeActorName} is choosing.`}</strong><span>{room.pendingJoins.includes(userId) ? 'You join when this scene finishes.' : 'Inspect the map, plan your build, or cheer them on.'}</span></div>
          {!self && !room.pendingJoins.includes(userId) ? <button className="qr-confirm" disabled={loading} onClick={() => void joinRoom(room.code)}>Rejoin the expedition</button> : <TableReactions room={room} tabletop />}
        </div>}
      {error && <p className="qr-error" role="alert">{error}</p>}
      <nav className="qr-table-tools" aria-label="Expedition tools">
        <button type="button" onClick={() => setDrawer('map')}><Map size={16} /><span>Route</span></button>
        <button type="button" onClick={() => setDrawer('hero')} className={ownHero?.points || view.lootOffers.length ? 'has-upgrade' : ''}><Sparkles size={16} /><span>{ownHero?.points ? `${ownHero.points} point${ownHero.points > 1 ? 's' : ''}` : view.lootOffers.length ? 'Choose loot' : `Build · ${ownHero?.level ?? 1}`}</span></button>
        <button type="button" onClick={() => setDrawer('pack')}><Backpack size={16} /><span>Quest pouch</span></button>
        <button type="button" onClick={() => setDrawer('chat')}><MessageCircle size={16} /><span>Party</span>{!!lastMessage && <i />}</button>
      </nav>
      {lastMessage && <button className="qr-last-chat" type="button" onClick={() => setDrawer('chat')}><MessageCircle size={12} /><span><b>{lastMessage.name}:</b> {lastMessage.text}</span></button>}
    </section>

    {drawer && <SceneDrawer key={drawer} title={{ map: 'Your expedition', pack: 'The party’s discoveries', hero: 'Your expedition build', story: 'The trail you made', party: 'Around the table', chat: 'Talk to the party', settings: 'At your table' }[drawer]} presentation={drawer === 'map' ? 'dialog' : 'sheet'} onClose={closeDrawer}>
      {pending && recovery}{error && <p className="qr-error" role="alert">{error}</p>}
      {drawer === 'map' && <QuestMap room={room} canAct={canAct && !combat} onTravel={prepareTravel} onSuggest={text => note(text)} canSuggest={!!self && !self.leaving && !view.isActive} />}
      {drawer === 'pack' && <div className="qr-pack"><p><strong>{state.supplies} shared supplies</strong> · Spend one to Mend in a battle. Everyone can see and use this pouch.</p>{state.items.length === 0 && <p>Follow the first clue to put something useful here.</p>}{state.items.map(id => <article key={id}><QuestItemArtwork id={id} /><div><h3>{QUEST_RUN_CONTENT.items[id]?.label ?? id}</h3><p>{QUEST_RUN_CONTENT.items[id]?.description}</p></div></article>)}<h3>What we know</h3>{state.facts.map(fact => <article key={fact.id}><Check size={18} /><div><strong>{QUEST_RUN_CONTENT.facts[fact.id]?.label ?? fact.id}</strong><p>{QUEST_RUN_CONTENT.facts[fact.id]?.description}</p><small>{fact.actorName} found this at {QUEST_RUN_CONTENT.nodes.find(node => node.id === fact.nodeId)?.label ?? fact.nodeId}.</small></div></article>)}</div>}
      {drawer === 'hero' && <div className="qr-build"><div className="qr-build-heading">{self && <HeroAvatar hero={self.character} decorative />}<div><h3>{self?.character.name ?? 'Your hero'} · level {ownHero?.level ?? 1}</h3><p>{ownHero?.runXp ?? 0} expedition XP · {ownHero?.mana ?? 0}/{ownHero?.maxMana ?? 0} mana</p></div></div><p>Build this hero for this expedition. Your saved identity stays yours; a new run starts a fresh build.</p><div className="qr-attributes">{(['might', 'wits', 'heart'] as const).map(attribute => <article key={attribute}><div><strong>{attribute} <b>{ownHero?.attributes[attribute] ?? 0}</b></strong><p>{{ might: 'Stronger basic attacks and feats of strength.', wits: 'Sharper checks and stronger clever class abilities.', heart: 'More healing from Mend and cleric Kindle.' }[attribute]}</p></div><button type="button" disabled={!buildEnabled || !ownHero?.points} onClick={() => void commitQuestAction({ kind: 'upgrade', attribute })} aria-label={`Spend one point on ${attribute}`}>+1</button></article>)}</div><p>{ownHero?.points ? `${ownHero.points} attribute point${ownHero.points > 1 ? 's' : ''} to spend.` : 'Earn expedition XP from useful actions and battles to level up.'}</p>{view.lootOffers.map(offer => <section className="qr-loot-offer" key={offer.id}><h3>Choose your find</h3><p>One item from this cache. Its effect applies in this run.</p>{offer.choices.map(choiceId => { const item = QUEST_GEAR.find(gear => gear.id === choiceId); return <button type="button" key={choiceId} data-quest-loot={choiceId} disabled={!buildEnabled} onClick={() => void commitQuestAction({ kind: 'loot', offerId: offer.id, choiceId })}><QuestItemArtwork id={choiceId} /><strong>{item?.label ?? choiceId}</strong><span className="qr-loot-description">{item?.description}</span><ArrowRight size={16} /></button>; })}</section>)}<h3>Equipped for this run</h3>{ownHero?.equipment.length ? ownHero.equipment.map(id => <article className="qr-equipped-item" key={id}><QuestItemArtwork id={id} /><div><strong>{QUEST_GEAR.find(item => item.id === id)?.label ?? id}</strong><p>{QUEST_GEAR.find(item => item.id === id)?.description}</p></div><Check size={14} /></article>) : <p>Win a battle to find equipment.</p>}</div>}
      {drawer === 'story' && <div className="qr-trail"><p>{QUEST_RUN_CONTENT.opening}</p>{state.ending && <div className="qr-ending-memory"><KeepsakeArtwork name="Mosswater’s well token" /><div><strong>What the village keeps</strong><p>{state.ending.text}</p></div></div>}<ol>{room.events.filter(actualQuestEvent).map(event => <li key={event.id}><small>{QUEST_RUN_CONTENT.nodes.find(node => node.id === event.quest?.nodeId)?.label}{event.actorName && ` · ${event.actorName}`}</small><p>{event.text}</p>{event.quest?.next && <strong>{event.quest.next}</strong>}</li>)}</ol></div>}
      {drawer === 'chat' && chat}
      {drawer === 'party' && <div className="qr-party-sheet"><p>One hero leads a short scene; the lantern passes around the table. Battles give each hero one move before the enemy strikes.</p>{room.seats.map(seat => <article key={seat.actorId}><HeroAvatar hero={seat.character} decorative /><div><strong>{seat.character.name}</strong><p>{seat.kind === 'companion' ? 'Companion · supports the expedition' : seat.actorId === view.activeActorId ? 'Holding the lantern' : 'At the table'} · {seat.hp} health</p></div></article>)}<label htmlFor="qr-invite">Bring a friend</label><input id="qr-invite" readOnly value={invitationUrl(room, window.location.origin)} onFocus={event => event.target.select()} /><button className="qr-confirm" type="button" onClick={async () => { try { await navigator.clipboard.writeText(invitationUrl(room, window.location.origin)); setCopied(true); } catch { document.querySelector<HTMLInputElement>('#qr-invite')?.select(); } }}>{copied ? 'Copied!' : 'Copy invitation'}</button></div>}
      {drawer === 'settings' && <div className="qr-settings"><button onClick={() => setDrawer('party')}><Users size={18} />Party & invitation</button><button onClick={() => setDrawer('story')}><BookOpen size={18} />Read our trail</button><button onClick={() => { const enabled = !sound; setSound(enabled); setTableSound(enabled); }}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}{sound ? 'Table sounds on' : 'Table sounds off'}</button><label><input type="checkbox" checked={reduceEffects} onChange={event => { setReduceEffects(event.target.checked); try { localStorage.setItem('dropinn-effects', event.target.checked ? 'off' : 'on'); } catch {} }} />Reduce effects</label><p>Read the scene freely. Choose an intention, then place your move. The shared clock keeps the expedition moving if someone steps away.</p><button onClick={() => void leaveRoom()} disabled={loading}><ArrowLeft size={18} />Leave the table</button></div>}
    </SceneDrawer>}
  </main>;
}

const nodePosition = (id: string, index: number, count: number): [number, number] => ({
  'well-yard': [50, 86], watercourse: [27, 56], 'old-conduit': [49, 16], 'derelict-mill': [14, 25], 'herb-bank': [77, 57], 'hill-spring': [85, 22],
} as Record<string, [number, number]>)[id] ?? [15 + index % 3 * 35, 18 + Math.floor(index / 3) * 62 / Math.max(1, Math.ceil(count / 3) - 1)];
const mapTeasers: Record<string, string> = {
  watercourse: 'The well’s feed runs through an abandoned dye yard. Follow the water, or approach whatever is growling there.',
  'old-conduit': 'An old stone arch marks a forgotten water route. Bring tools or supplies if you want to reopen it.',
  'derelict-mill': 'A pack guards the mill passage and a work chest. Brave the fight for equipment, or find an outside route.',
  'herb-bank': 'Reeds and herbs grow by the river. Gather supplies, test your Wits, or ask a local about the hill trail.',
  'hill-spring': 'A spring lies on the hillside. Test its water, or risk a Might check to open a shorter path.',
};

function QuestMap({ room, canAct, canSuggest, onTravel, onSuggest }: { room: AdventureRoom; canAct: boolean; canSuggest: boolean; onTravel: (id: string, label: string, detail: string) => void; onSuggest: (text: string) => void }) {
  const map = questMap(room);
  const [selected, setSelected] = useState(room.questRun!.nodeId);
  const node = map.nodes.find(node => node.id === selected)!;
  const paths = map.edges.filter(edge => edge.from === room.questRun!.nodeId && edge.to === selected);
  const path = paths.find(edge => edge.available) ?? paths[0];
  const positions = new globalThis.Map(map.nodes.map((node, index) => [node.id, nodePosition(node.id, index, map.nodes.length)]));
  // Collapse opposite/alternative authored edges into one legible path on the paper map.
  const drawnEdges = new globalThis.Map<string, (typeof map.edges)[number]>();
  for (const edge of map.edges) {
    const key = [edge.from, edge.to].sort().join(':'); const prior = drawnEdges.get(key);
    drawnEdges.set(key, { ...edge, taken: edge.taken || !!prior?.taken, available: edge.available || !!prior?.available });
  }
  const memories = room.events.filter(event => actualQuestEvent(event) && event.quest?.nodeId === node.id && event.quest.kind !== 'pass');
  const isolated = room.questRun!.facts.some(fact => fact.id === 'source-isolated');
  const hasFact = (id: string) => room.questRun!.facts.some(fact => fact.id === id);
  const placeDescription = room.questRun!.ending && node.id === 'well-yard' ? room.questRun!.ending.id === 'repair' ? 'The village well is sealed. Neighbours carry clean spring water along the new relay.' : 'The well runs clean again. Mara can fill her kettle.'
    : isolated && node.id === 'watercourse' ? 'The leaking dye has been kept out of the water feed. Your party’s choice is recorded below.'
    : node.id === 'old-conduit' && hasFact('channel-open') ? hasFact('alternate-supply') ? 'The reopened channel and carrier’s handline now bring clean spring water to the village.' : hasFact('relay-ready') ? 'The channel is open and the carrier’s handline is ready. One final delivery can bring the tested spring water home.' : 'The water gate is clear. Test the spring and rig the carrier’s handline to finish the new supply route.'
    : node.id === 'hill-spring' && hasFact('ridge-shortcut') ? 'Your secured ridge handline opens a direct path between this spring and the well yard.'
    : node.visited ? node.description : mapTeasers[node.id] ?? node.description;
  return <div className="qr-map">
    <p>Travel spends one action. The whole party moves together; the hero holding the lantern chooses the route.</p>
    <div className="qr-map-paper"><div className="qr-map-board" aria-label="Connected places in Mosswater">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{Array.from(drawnEdges, ([id, edge]) => {
        const a = positions.get(edge.from)!, b = positions.get(edge.to)!;
        return <path key={id} className={edge.taken ? 'is-taken' : edge.available ? 'is-open' : ''} d={`M${a[0]} ${a[1]} Q${(a[0] + b[0]) / 2 + 3} ${(a[1] + b[1]) / 2} ${b[0]} ${b[1]}`} />;
      })}</svg>
      {map.nodes.map(node => { const [x, y] = positions.get(node.id)!; return <button type="button" key={node.id} data-quest-node={node.id} className={`${node.current ? 'is-current' : ''} ${node.visited ? 'is-visited' : ''} ${node.reachable ? 'is-reachable' : ''}`} style={{ left: `${x}%`, top: `${y}%` }} aria-pressed={selected === node.id} onClick={() => setSelected(node.id)}><span>{node.current ? <Flame size={24} /> : node.visited ? <Check size={21} /> : <Compass size={21} />}</span><strong>{node.label}</strong></button>; })}
    </div><p className="qr-map-legend"><span>━ Your trail</span><span>┄ Green: open now</span><span>○ A place to inspect</span></p></div>
    <div className="qr-map-inspector">
      <div className="qr-map-place-art"><SceneArt scene={QUEST_SCENES[node.id] ?? node.art} />{node.id === 'well-yard' && room.questRun!.ending?.id === 'repair' && <TargetArtwork target={{ id: 'well', artKey: 'mosswater-well-sealed' }} />}</div>
      <small>{node.current ? 'You are here' : node.visited ? 'A place on your trail' : node.reachable ? 'A route is open' : 'Find a way here'}</small><h3>{node.label}</h3>
      <p>{placeDescription}</p>
      {path && <p className="qr-route-cost">{path.description}</p>}
      {room.status === 'active' && path?.available ? <>
        <button className="qr-confirm" type="button" disabled={!canAct} onClick={() => onTravel(path.id, `Travel to ${node.label}`, path.description)}>Prepare this route <ArrowRight size={17} /></button>
        {canSuggest && <button className="qr-quiet-button" onClick={() => onSuggest(`I suggest ${node.label}: ${path.description}`)}>Suggest this route to the party <MessageCircle size={16} /></button>}
      </> : room.status === 'active' && !node.current && <p>{path?.reason ? `Route hint: ${path.reason}` : 'Reach a connected place first. The trail will stay on this map.'}</p>}
      {!!memories.length && <div className="qr-map-memories"><h4>What happened here</h4>{memories.slice(-3).map(event => <article key={event.id}><small>{event.actorName ?? 'The party'}</small><p>{event.text}</p></article>)}</div>}
    </div>
  </div>;
}
