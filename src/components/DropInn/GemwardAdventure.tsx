import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Backpack, BookOpen, Check, ChevronRight, Clock3, Compass, Gem, Heart, Map, Menu, MessageCircle, Shield, Sparkles, Users, Volume2, VolumeX, X } from 'lucide-react';
import { useAdventureStore } from '../../store/adventureStore';
import { journeyActionPreview, journeyInteractions, journeyLocations, journeyPouch, journeyScene } from '../../lib/dropinn/journey';
import { CONSUMABLES, QUEST_ITEMS, combatMoves, expeditionStash } from '../../lib/dropinn/expedition';
import { remainingTurnSeconds } from '../../lib/dropinn/playerGuidance';
import { latestRound } from '../../lib/dropinn/roundSummary';
import { personalRollBeat } from '../../lib/dropinn/stagePlayback';
import { spotlightSuggestions } from '../../lib/dropinn/suggestions';
import { invitationUrl } from '../../lib/dropinn/invites';
import type { AdventureRoom, PlayerAction } from '../../lib/dropinn/types';
import { CHARACTER_CLASS_PRESETS } from '../../lib/character';
import { SceneDrawer } from './SceneAdventure';
import { HeroAvatar } from './HeroAvatar';
import { TokenArtwork, type IllustratedToken } from './TokenArtwork';
import { TimedRelease } from './TimedRelease';
import { StoryScroll, type StoryScrollMode } from './StoryScroll';
import { RoundScroll } from './RoundScroll';
import { Narrator } from './Narrator';
import { useLiveReducedMotion, useTableContact } from './TableContact';
import { useStagePlayback, StageEffects } from './LivingStage';
import { AimConnection, HeldToken, useHeroPlay } from './PlayfulTable';
import { StageAtmosphere, useVisibleTable } from './StageAtmosphere';
import { PersonalStageDice } from './StageDice';
import { HeroReaction, TableReactions } from './TableReactions';
import { playTableSound, setTableSound, tableSoundEnabled } from './tableSound';
import { gemwardBackdrop, gemwardPlacement, GemwardItem, GemwardPiece } from './GemwardArt';
import { GemwardJourney } from './GemwardJourney';
import { GemwardPack, GemwardConsumable } from './GemwardPack';
import { GemwardCombat } from './GemwardCombat';
import './gemward-adventure.css';

const TOKENS: { kind: IllustratedToken; label: string }[] = [{ kind: 'fight', label: 'Fight' }, { kind: 'influence', label: 'Influence' }, { kind: 'investigate', label: 'Investigate' }, { kind: 'assist', label: 'Help' }];
type Drawer = 'journey' | 'pouch' | 'stash' | 'party' | 'chat' | 'menu' | 'details' | 'inspect' | 'spotlight' | 'round' | null;
type Attachments = NonNullable<PlayerAction['expedition']>;

export function GemwardAdventure({ room, chat }: { room: AdventureRoom; chat: ReactNode }) {
  const { userId, loading, leaveRoom, joinRoom, commitAction, pendingMove, pendingTravel, voteTravel, error, narration, skipReveal, skippingReveal, propose, proposal, proposing, clearProposal } = useAdventureStore();
  const state = room.expedition!;
  const self = room.seats.find(seat => seat.actorId === userId && seat.kind === 'human');
  const classKey = self?.character.classKey ?? room.players[userId]?.character.classKey ?? 'wizard';
  const [now, setNow] = useState(Date.now);
  const [locationId, setLocationId] = useState(state.locationId);
  const [token, setToken] = useState<IllustratedToken>('investigate');
  const [targetId, setTargetId] = useState<string>();
  const [interactionId, setInteractionId] = useState<string>();
  const [protectId, setProtectId] = useState<string>();
  const [attachments, setAttachments] = useState<Attachments>({});
  const [spotlightAction, setSpotlightAction] = useState<PlayerAction | null>(null);
  const [idea, setIdea] = useState('');
  const [spotlightTarget, setSpotlightTarget] = useState('');
  const [inspectedId, setInspectedId] = useState<string>();
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [holding, setHolding] = useState(false);
  const [storyMode, setStoryMode] = useState<StoryScrollMode>('collapsed');
  const [narratorHost, setNarratorHost] = useState<HTMLDivElement | null>(null);
  const [menuNarratorHost, setMenuNarratorHost] = useState<HTMLDivElement | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [pacedTurns, setPacedTurns] = useState(() => { try { return localStorage.getItem('dropinn-paced-turn-results') !== 'off'; } catch { return true; } });
  const [sound, setSound] = useState(tableSoundEnabled);
  const [quietEffects, setQuietEffects] = useState(() => { try { return localStorage.getItem('dropinn-effects') === 'off'; } catch { return false; } });
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState('Choose someone or something in the scene.');
  const [release, setRelease] = useState<{ at: number; turn: number; token: IllustratedToken; x: number; y: number }>();
  const [drag, setDrag] = useState<{ kind: IllustratedToken; x: number; y: number; tilt: number; over?: string; hero?: boolean }>();
  const [returning, setReturning] = useState<{ kind: IllustratedToken; x: number; y: number; toX: number; toY: number }>();
  const gesture = useRef<{ id: number; kind: IllustratedToken; x: number; y: number; homeX: number; homeY: number; lastX: number; over?: string; cueAt: number; moving: boolean }>();
  const suppressClick = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const reducedMotion = useLiveReducedMotion();
  const quiet = reducedMotion || quietEffects;
  const visible = useVisibleTable();
  const contact = useTableContact(quiet);
  const heroPlay = useHeroPlay();
  const playback = useStagePlayback(room, now, quiet || !pacedTurns);
  const activeEvent = playback.active?.event;
  const renderedLocationId = room.phase === 'reveal' && !quiet && activeEvent?.journey?.locationId ? activeEvent.journey.locationId : locationId;
  const before = useRef<AdventureRoom>();
  if (room.phase === 'choosing') before.current = room;
  const actualScene = journeyScene(room, renderedLocationId);
  const previousScene = before.current?.id === room.id && before.current.turn === room.turn && before.current.chapter === room.chapter ? journeyScene(before.current, renderedLocationId) : undefined;
  const scene = room.phase === 'reveal' && !playback.settled && previousScene ? { ...actualScene, targets: actualScene.targets.map(piece => playback.landed.some(event => event.result?.targetId === piece.id && (!event.journey?.locationId || event.journey.locationId === renderedLocationId)) ? piece : previousScene.targets.find(previous => previous.id === piece.id) ?? piece) } : actualScene;
  const sharedScene = journeyScene(room);
  const places = journeyLocations(room).filter(place => place.available);
  const inCombat = state.battle?.status === 'active';
  const showCombat = inCombat || room.phase === 'reveal' && (state.battle?.status === 'won' || state.battle?.status === 'escaped');
  const traveling = room.phase === 'travel';
  const completed = room.status === 'completed';
  const joining = room.pendingJoins.includes(userId);
  const pending = pendingMove?.turn === room.turn ? pendingMove : null;
  const travelPending = pendingTravel?.decisionId === state.travel?.id ? pendingTravel : null;
  const committed = room.commits[userId];
  const confirmed = room.phase === 'reveal' || completed;
  const canAct = !!self && !self.leaving && !joining && room.status === 'active' && room.phase === 'choosing' && !pending && !committed && now < room.deadline;
  const locked = !canAct || loading || holding;
  const rest = !!pending || !!committed || confirmed || traveling;
  const stash = expeditionStash(room, userId);
  const selectedItem = stash.find(item => item.id === attachments.consumableId);
  const needsFavour = selectedItem?.kind === 'favour' && !attachments.favourChoice;
  const pouch = journeyPouch(room);
  const target = scene.targets.find(item => item.id === targetId);
  const inspected = scene.targets.find(item => item.id === inspectedId);
  const topics = targetId && !inCombat ? journeyInteractions(room, locationId, targetId, token) : [];
  const moves = combatMoves(classKey, room.seats.filter(seat => seat.kind === 'human').length);
  const combatMove = moves.find(move => move.token === token);
  const seconds = remainingTurnSeconds(room, now);
  const lastRound = useMemo(() => latestRound(room), [room.id, room.events, room.outcomes, room.turn, room.chapter, room.phase]);
  const skipVoted = room.revealSkips?.includes(userId) ?? false;
  const canSkip = room.status === 'active' && room.phase === 'reveal' && !!self && !self.leaving;
  const spentSpotlight = room.players[userId]?.spotlightChapters.includes(room.chapter) ?? false;
  const spotlightPreview = proposal?.turn === room.turn && proposal.idea === idea.trim() && proposal.targetId === (spotlightTarget || sharedScene.targets[0]?.id) ? proposal : undefined;
  const selection: PlayerAction | null = spotlightAction ? { ...spotlightAction, expedition: { ...spotlightAction.expedition, ...attachments } }
    : protectId && inCombat ? { token: 'assist', targetId: protectId, targetKind: 'hero', expedition: attachments }
    : targetId && (inCombat || topics.some(topic => topic.id === interactionId)) ? { token, targetId, targetKind: 'scene', expedition: { locationId, ...(!inCombat && interactionId ? { interactionId } : {}), ...attachments } } : null;
  const preview = selection?.token === 'spotlight' ? selection.proposal : selection ? journeyActionPreview(room, userId, selection) : undefined;
  const actionOnTable = pending?.action ?? committed ?? selection;
  const localEvent = activeEvent && (activeEvent.result?.targetKind === 'hero' || scene.targets.some(item => item.id === activeEvent.result?.targetId)) && (!activeEvent.journey?.locationId || activeEvent.journey.locationId === renderedLocationId) ? activeEvent : undefined;
  const discovery = activeEvent?.journey?.questChanges?.find(item => item.kind === 'gained');
  const received = playback.landed.flatMap(event => (event.journey?.questChanges ?? []).map(change => ({ ...change, event }))).slice(-3);
  const receivedGift = playback.landed.filter(event => event.actorId === userId && event.result?.expedition?.reward).at(-1)?.result?.expedition?.reward;
  const roll = personalRollBeat(room, userId);
  const showRoll = roll && now < roll.readyAt;
  const releaseVisible = release?.turn === room.turn && now < release.at + (quiet ? 800 : 2100);
  const narrative = confirmed ? activeEvent ?? playback.landed.filter(event => event.change || event.kind === 'consequence').at(-1) ?? playback.landed.find(event => event.actorId === userId) : undefined;

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 100); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    setTargetId(undefined); setInteractionId(undefined); setProtectId(undefined); setAttachments({}); setSpotlightAction(null); setIdea(''); setSpotlightTarget(''); setHolding(false); setDrag(undefined); gesture.current = undefined; clearProposal(); setShowAll(false); setHint('Choose someone or something in the scene.');
  }, [room.turn, clearProposal]);
  useEffect(() => { try { localStorage.setItem('dropinn-paced-turn-results', pacedTurns ? 'on' : 'off'); } catch {} }, [pacedTurns]);
  useEffect(() => { setLocationId(state.locationId); setTargetId(undefined); setInteractionId(undefined); }, [state.currentNodeId, state.locationId]);
  const autoJourney = useRef<string>();
  useEffect(() => {
    if (traveling && state.travel?.id !== autoJourney.current) { autoJourney.current = state.travel?.id; setDrawer('journey'); setStoryMode('collapsed'); }
    else if (!traveling && autoJourney.current) { autoJourney.current = undefined; setDrawer(current => current === 'journey' ? null : current); }
  }, [traveling, state.travel?.id]);
  useEffect(() => { if (!canAct || loading) { gesture.current = undefined; setDrag(undefined); } }, [canAct, loading]);
  useEffect(() => { const cancel = () => { if (gesture.current) { gesture.current = undefined; setDrag(undefined); suppressClick.current = true; } }; window.addEventListener('blur', cancel); return () => window.removeEventListener('blur', cancel); }, []);

  function open(next: Drawer) { if (holding || drag) return; setStoryMode('collapsed'); setDrawer(next); }
  function inspect(id: string) { setInspectedId(id); open('inspect'); }
  function choose(id: string, kind = token, hero = false) {
    if (locked) { inspect(id); return; }
    if (self?.hp === 0 && kind !== 'assist') return;
    if (hero) {
      if (!inCombat || kind !== 'assist' || room.enemyIntent?.targetActorId !== id) return;
      setProtectId(id); setTargetId(undefined); setToken('assist'); setSpotlightAction(null); return;
    }
    const piece = scene.targets.find(item => item.id === id);
    if (!piece) return;
    const supported = self?.hp === 0 ? 'assist' : piece.tokens.includes(kind) ? kind : piece.tokens.find(item => item !== 'spotlight') as IllustratedToken;
    setToken(supported); setTargetId(id); setProtectId(undefined); setSpotlightAction(null); setInteractionId(inCombat ? undefined : journeyInteractions(room, locationId, id, supported)[0]?.id); clearProposal(); playTableSound('place');
  }
  function chooseToken(kind: IllustratedToken) {
    if (locked || self?.hp === 0 && kind !== 'assist') return;
    setToken(kind); setProtectId(undefined); setSpotlightAction(null);
    if (inCombat) choose('encounter', kind);
    else if (targetId) setInteractionId(journeyInteractions(room, locationId, targetId, kind)[0]?.id);
    playTableSound('pick');
  }
  function changePlace(id: string) { if (holding || drag) return; setLocationId(id); setTargetId(undefined); setInteractionId(undefined); setSpotlightAction(null); playTableSound('pick'); }
  function hit(x: number, y: number) {
    const node = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-scene-target]');
    if (!node || !stage.current?.contains(node)) return undefined;
    const id = node.dataset.sceneTarget!; const hero = node.dataset.targetKind === 'hero';
    return { id, hero };
  }
  function legal(kind: IllustratedToken, id: string, hero: boolean) { return self?.hp === 0 && kind !== 'assist' ? false : hero ? inCombat && kind === 'assist' && room.enemyIntent?.targetActorId === id : !!scene.targets.find(item => item.id === id)?.tokens.includes(kind); }
  function startDrag(event: PointerEvent<HTMLButtonElement>, kind: IllustratedToken) {
    if (locked || !event.isPrimary || event.button !== 0 || self?.hp === 0 && kind !== 'assist') return;
    suppressClick.current = false; event.currentTarget.setPointerCapture(event.pointerId); const rect = event.currentTarget.getBoundingClientRect(); setReturning(undefined);
    gesture.current = { id: event.pointerId, kind, x: event.clientX, y: event.clientY, homeX: rect.x + rect.width / 2, homeY: rect.y + rect.height / 2, lastX: event.clientX, cueAt: 0, moving: false };
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current; if (!current || current.id !== event.pointerId) return;
    if (!current.moving && Math.hypot(event.clientX - current.x, event.clientY - current.y) > 9) { current.moving = true; playTableSound('pick'); }
    if (!current.moving) return;
    const hovered = hit(event.clientX, event.clientY); const valid = hovered && legal(current.kind, hovered.id, hovered.hero) ? hovered : undefined;
    if (valid && valid.id !== current.over && performance.now() - current.cueAt > 120) { playTableSound('aim'); current.cueAt = performance.now(); }
    setDrag({ kind: current.kind, x: event.clientX, y: event.clientY, tilt: Math.max(-16, Math.min(16, (event.clientX - current.lastX) * .7)), over: valid?.id, hero: valid?.hero }); current.lastX = event.clientX; current.over = valid?.id;
  }
  function endDrag(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const current = gesture.current; if (!current || current.id !== event.pointerId) return;
    if (current.moving) {
      suppressClick.current = true; const hovered = cancelled ? undefined : hit(event.clientX, event.clientY);
      if (hovered && legal(current.kind, hovered.id, hovered.hero)) choose(hovered.id, current.kind, hovered.hero);
      else { setHint('Your token returned. Aim at a highlighted piece.'); playTableSound('return'); if (!quiet) setReturning({ kind: current.kind, x: event.clientX, y: event.clientY, toX: current.homeX, toY: current.homeY }); }
    }
    gesture.current = undefined; setDrag(undefined);
  }
  function commit(releaseMs?: number) {
    if (!selection || !canAct || needsFavour) return;
    const bounds = stage.current?.getBoundingClientRect(); const piece = [...stage.current?.querySelectorAll<HTMLElement>('[data-scene-target]') ?? []].find(node => node.dataset.sceneTarget === selection.targetId)?.getBoundingClientRect();
    if (bounds && piece && selection.token !== 'spotlight') setRelease({ at: Date.now(), turn: room.turn, token: selection.token, x: piece.x + piece.width / 2 - bounds.x, y: piece.y + piece.height / 2 - bounds.y });
    void commitAction({ ...selection, ...(releaseMs === undefined ? {} : { releaseMs }) });
  }
  async function copyInvite() { try { await navigator.clipboard.writeText(invitationUrl(room, window.location.origin)); setCopied(true); } catch { document.querySelector<HTMLInputElement>('#gm-invitation')?.select(); } }
  const status = completed ? 'A little legend, shared.' : traveling ? 'Your next chapter is waiting.' : pending ? 'Your move is saved. Checking confirmation…' : self?.leaving ? 'Your last move will finish with the party.' : joining ? 'Your hero joins at the next turn.' : !self ? 'There is room for another story.' : confirmed ? narrative?.change?.title ?? 'The party’s choices unfold.' : committed ? 'Your move is on the table.' : preview?.label ?? hint;
  const detail = completed ? state.ending ?? room.outcomes.at(-1)?.text : traveling ? 'Open Journey to choose where the party travels.' : pending ? 'Retry uses the same token, item, and release.' : confirmed ? narrative?.change?.next ?? narrative?.text : committed ? 'Your friends are still choosing. Look around or cheer them on.' : needsFavour ? 'Open your stash and choose a ledger or canal key.' : preview?.description ?? (inCombat ? 'Read the enemy’s intent. Pick a move from your class hand.' : 'Tap a piece, or carry a token to it. Release when you are ready.');
  const labelForDrag = drag?.over ? drag.hero ? 'Protect your threatened ally' : journeyActionPreview(room, userId, { token: drag.kind, targetId: drag.over, expedition: { locationId } }).label : undefined;

  return <main className={`gm-adventure ${quiet ? 'is-quiet' : ''} ${showCombat ? 'is-combat' : ''}`} aria-label="Adventure table" data-gemward-mode={completed ? 'completed' : traveling ? 'travel' : showCombat ? 'combat' : 'exploration'} {...contact.handlers}>
    <header className="gm-header"><div className="gm-title"><span>Chapter {room.chapter + 1} · Gemward</span><strong>{scene.location}</strong></div><button type="button" className="gm-journey-trigger" onClick={() => open('journey')} disabled={holding}><Map size={20} /><span>Journey</span>{traveling && <i />}</button><StoryScroll room={room} userId={userId} mode={storyMode} onMode={setStoryMode} suspended={!!drawer} locked={holding || !!drag} seconds={seconds} narration={narration?.turn === room.turn ? narration.text : undefined} /><span className={`gm-clock ${seconds <= 10 ? 'is-urgent' : ''}`} aria-label={`${seconds} seconds remaining`}><Clock3 size={13} />{seconds}s</span><button className="gm-icon" aria-label="Open adventure menu" disabled={holding} onClick={() => open('menu')}><Menu size={21} /></button></header>
    <section className="gm-stage" ref={stage} aria-label={showCombat ? 'Encounter scene' : scene.location} data-ambient-paused={quiet || !visible || holding || !!releaseVisible || room.phase !== 'choosing' || !!drawer || storyMode !== 'collapsed'}>
      <img key={renderedLocationId} className="gm-backdrop" src={gemwardBackdrop(renderedLocationId)} alt="" aria-hidden="true" draggable={false} /><div className="gm-stage-vignette" aria-hidden="true" /><StageAtmosphere environment={['docks', 'canal'].includes(renderedLocationId) ? 'river' : ['beacon', 'lantern-square'].includes(renderedLocationId) ? 'chapel' : 'village'} quiet={quiet || !visible || holding || !!releaseVisible || room.phase !== 'choosing' || !!drawer || storyMode !== 'collapsed'} />
      <div className="gm-scene-heading"><p className="gm-objective">{completed ? 'Gemward will remember this evening.' : scene.objective}</p>{!showCombat && places.length > 1 && <nav className="gm-nearby" aria-label="Free nearby exploration">{places.map(place => <button type="button" key={place.id} data-gemward-place={place.id} aria-pressed={locationId === place.id} disabled={holding || !!drag} onClick={() => changePlace(place.id)}>{place.id === 'shop' ? 'Gem shop' : place.id === 'tavern' ? 'Lantern Inn' : 'Canal docks'}{Object.entries(room.commits).some(([id, action]) => id !== userId && action.expedition?.locationId === place.id) && <i aria-label="A party move is here" />}</button>)}</nav>}</div>
      <button type="button" className="gm-pouch-charm" aria-label={`Party pouch, ${pouch.filter(item => item.status === 'held').length} discoveries`} onClick={() => open('pouch')} disabled={holding}><Gem size={18} /><span>{pouch.filter(item => item.status === 'held').length}</span></button>
      {!showCombat && <div className="gm-progress" role="progressbar" aria-label="Chapter progress" aria-valuemin={0} aria-valuemax={scene.progressGoal} aria-valuenow={Math.min(scene.progressGoal, playback.progress)}><span>Chapter {Number(playback.progress.toFixed(1))}/{scene.progressGoal}</span>{Array.from({ length: scene.progressGoal }, (_, index) => <i key={index} className={playback.progress > index ? 'is-filled' : ''} />)}</div>}
      {renderedLocationId !== locationId && <span className="gm-playback-location">{activeEvent?.actorName ?? 'The party'} · {scene.location}</span>}
      {showCombat ? <GemwardCombat room={room} stage={stage} selectedTarget={selection?.targetId} quiet={quiet} disabled={holding} onSelect={(id, kind) => choose(id, kind)} onProtect={() => room.enemyIntent && choose(room.enemyIntent.targetActorId, 'assist', true)} /> : <div className="gm-scene-pieces">{scene.targets.map((piece, index) => {
        const matching = actionOnTable?.targetId === piece.id && (!actionOnTable.expedition?.locationId || actionOnTable.expedition.locationId === locationId);
        const hovered = drag?.over === piece.id;
        const effect = localEvent?.result?.targetId === piece.id && localEvent.success !== false;
        return <button type="button" key={`${renderedLocationId}:${piece.id}`} data-scene-target={piece.id} data-target-kind="scene" className={`gm-hotspot ${matching ? 'is-selected' : ''} ${hovered ? 'is-over' : ''} ${piece.changed ? 'is-developed' : ''} ${effect ? 'has-impact' : ''}`} style={gemwardPlacement(renderedLocationId, index)} disabled={holding} aria-pressed={matching} aria-label={`${piece.name}${piece.changed ? ', changed by the party' : ''}`} onClick={() => choose(piece.id)} onContextMenu={event => { event.preventDefault(); inspect(piece.id); }}>
          <span className="gm-piece-shadow" /><GemwardPiece target={piece} variant={state.variant} locationId={renderedLocationId} restored={!!state.ending && state.finaleChoice === 'restore' && playback.settled} /><span className="gm-piece-name">{piece.changed && <Check size={11} />}{piece.name}</span>{matching && actionOnTable.token !== 'spotlight' && <span className={`gm-parked-token ${pending ? 'is-pending' : committed ? 'is-committed' : ''}`}><TokenArtwork token={actionOnTable.token} /></span>}
        </button>;
      })}</div>}
      <div className="gm-party" aria-label="Your party on the scene">{playback.seats.map(seat => {
        const threatened = inCombat && room.enemyIntent?.targetActorId === seat.actorId; const ownPlay = seat.actorId === userId ? heroPlay.play : undefined;
        return <button key={seat.id} type="button" data-scene-target={seat.actorId} data-target-kind="hero" className={`gm-hero ${seat.actorId === userId ? 'is-you' : ''} ${threatened ? 'is-threatened' : ''} ${seat.hp === 0 ? 'is-downed' : ''}`} disabled={holding} aria-label={`${seat.actorId === userId ? 'Your hero, ' : ''}${seat.character.name}, ${seat.hp} health${threatened ? ', threatened: Help can Protect' : ', tap to play'}`} onClick={() => { if (threatened && token === 'assist' && canAct) choose(seat.actorId, 'assist', true); else if (seat.actorId === userId) heroPlay.poke(); else open('party'); }}>
          <span className="gm-hero-shadow" /><span className={`gm-hero-paint ${ownPlay ? `is-${ownPlay.kind}` : ''}`} key={ownPlay?.id ?? 'rest'}><HeroAvatar hero={seat.character} decorative /></span><span className="gm-hero-name">{seat.actorId === userId ? 'You' : seat.character.name}{room.commits[seat.actorId] && <Check size={11} />}</span><small><Heart size={9} />{seat.hp}{seat.kind === 'companion' && <span> companion</span>}</small>{ownPlay && <span className="gm-hero-bubble">{ownPlay.caption}</span>}<HeroReaction room={room} actorId={seat.actorId} now={now} />
        </button>;
      })}</div>
      {canAct && (drag || selection) && <AimConnection stage={stage} actorId={userId} targetId={drag ? drag.over : selection?.targetId} pointer={drag} token={drag?.kind ?? selection!.token} />}
      <StageEffects room={room} stage={stage} event={localEvent} elapsed={playback.active ? Math.max(0, now - playback.active.start) : 0} duration={playback.active?.duration} quiet={quiet} shake={!quiet} showDice={false} />
      {releaseVisible && release && <div className="gm-release-flight" style={{ left: release.x, top: release.y, animationDelay: `${-Math.max(0, now - release.at) / 1000}s` }} aria-label="Move released"><TokenArtwork token={release.token} /></div>}
      {discovery && !quiet && playback.active && <div className="gm-discovery-flight" key={`${activeEvent!.id}:${discovery.itemId}`} style={{ animationDelay: `${-Math.max(0, now - playback.active.start) / 1000}s` }} aria-hidden="true"><GemwardItem id={discovery.itemId} /></div>}
      {confirmed && (received.length > 0 || receivedGift) && <div className="gm-discovery-receipts" role="status">{received.map(change => <div className="gm-discovery-receipt" key={`${change.event.id}:${change.itemId}`}><GemwardItem id={change.itemId} /><span><strong>{QUEST_ITEMS[change.itemId]?.label ?? 'Shared discovery'}</strong><small>{change.kind === 'spent' ? 'Used to change Gemward' : 'Added to the party pouch'}</small></span></div>)}{receivedGift && <div className="gm-discovery-receipt"><GemwardConsumable kind={receivedGift.item.kind} /><span><strong>{CONSUMABLES.find(item => item.id === receivedGift.item.kind)?.label}</strong><small>{state.offers[userId]?.some(offer => offer.id === receivedGift.id) ? 'A gift waits in your stash' : 'Added to your stash'}</small></span></div>}</div>}
      {showRoll && roll && <PersonalStageDice event={roll.event} elapsed={Math.max(0, now - roll.start)} stage={stage} quiet={quiet} />}
      {confirmed && narrative && !showRoll && <div className="gm-confirmed-caption" role="status" key={narrative.id}><span>{narrative.change?.title ?? (narrative.actorName ? `${narrative.actorName} made a difference` : 'The story moves')}</span><strong>{narrative.change?.next ?? narrative.text}</strong></div>}
    </section>
    <section className="gm-action-bar" aria-label="Your four tokens and release controls">
      <div className="gm-prepared" aria-live="polite"><div><strong>{status}</strong><p>{detail}</p></div>{selection && !rest && <button type="button" aria-label="Read this move and choose a topic" onClick={() => open('details')} disabled={holding}><span>{topics.length > 1 ? `${topics.length} topics` : 'Details'}</span><ChevronRight size={17} /></button>}</div>
      <div className="gm-hand-row"><button type="button" className="gm-stash-button" onClick={() => open('stash')} disabled={holding} aria-label={`Your stash, ${stash.length} of 3 slots`}><Backpack size={23} /><span>{stash.length}/3</span>{!!state.offers[userId]?.length && <i />}</button><div className="gm-hand" aria-label="Your action tokens">{TOKENS.map(item => <button type="button" key={item.kind} data-token={item.kind} disabled={locked || self?.hp === 0 && item.kind !== 'assist' || !inCombat && !!target && !target.tokens.includes(item.kind)} aria-pressed={!spotlightAction && token === item.kind} className={`${!spotlightAction && token === item.kind ? 'is-selected' : ''} ${drag?.kind === item.kind ? 'is-lifted' : ''}`} aria-label={showCombat ? `${item.label}: ${moves.find(move => move.token === item.kind)?.label}` : item.label} onPointerDown={event => startDrag(event, item.kind)} onPointerMove={moveDrag} onPointerUp={event => endDrag(event)} onPointerCancel={event => endDrag(event, true)} onLostPointerCapture={event => { if (gesture.current?.id === event.pointerId) endDrag(event, true); }} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } chooseToken(item.kind); }}><TokenArtwork token={item.kind} /><span>{showCombat ? moves.find(move => move.token === item.kind)?.label : item.label}</span></button>)}</div><button className="gm-spotlight-button" type="button" disabled={locked || spentSpotlight || self?.hp === 0} onClick={() => open('spotlight')} aria-label={spentSpotlight ? 'Spotlight used this chapter' : 'Create a Spotlight idea'}><Sparkles size={23} /><span>Spotlight</span></button>
        <div className="gm-release-controls">{selection && !rest ? <TimedRelease key={`${room.id}:${room.turn}`} turn={room.turn} deadline={room.deadline} disabled={!canAct || loading || !!drawer || needsFavour} timingBonus={selection.token === 'spotlight' || inCombat && (!!protectId || self?.hp === 0 || combatMove?.stance === 'guard' && classKey !== 'wizard')} onCommit={commit} onHoldingChange={setHolding} /> : pending ? <button className="gm-primary" disabled={loading} onClick={() => void commitAction(pending.action)}>Retry the same move</button> : !completed && !self && !joining ? <button className="gm-primary" disabled={loading} onClick={() => void joinRoom(room.code)}>Rejoin this story</button> : traveling ? <button className="gm-primary" onClick={() => open('journey')}><Map size={18} />Choose the next path</button> : completed ? <button className="gm-primary" disabled={loading} onClick={() => void leaveRoom()}>Collect your recap <ArrowRight size={17} /></button> : canSkip ? <button className="gm-primary" disabled={skipVoted || skippingReveal} onClick={() => void skipReveal()}>{skipVoted ? 'Ready for the next turn' : 'Ready · next turn'}</button> : !self && !joining ? <button className="gm-primary" disabled={loading} onClick={() => void joinRoom(room.code)}>Join this story</button> : committed ? <span className="gm-waiting-seal"><Check size={20} />Move placed</span> : <span className="gm-release-hint">Place a token.<br />Make a little difference.</span>}</div>
      </div>
      {!rest && (selectedItem || attachments.rewardChoice) && <div className="gm-attached">{selectedItem && <button type="button" disabled={locked} onClick={() => setAttachments({ ...attachments, consumableId: undefined, favourChoice: undefined })}><GemwardConsumable kind={selectedItem.kind} /><span>{CONSUMABLES.find(item => item.id === selectedItem.kind)?.label}</span><X size={13} /></button>}{attachments.rewardChoice && <button type="button" disabled={locked} onClick={() => setAttachments({ ...attachments, rewardChoice: undefined })}><Check size={12} /><span>Gift choice</span><X size={13} /></button>}</div>}
      {error && <p className="gm-error" role="alert">{error}</p>}
    </section>
    <div className="gm-narrator-home"><Narrator room={room} compact pacedTurns={pacedTurns} onPacedTurns={setPacedTurns} suppressCue={false} deferCue={!playback.settled || !!releaseVisible} portalTarget={drawer === 'round' ? narratorHost : drawer === 'menu' ? menuNarratorHost : null} /></div>
    {drawer && drawer !== 'round' && <SceneDrawer key={drawer} title={{ journey: 'Journey', pouch: 'Party pouch', stash: 'Your stash', party: 'Your party', chat: 'Table chat', menu: 'Around the table', details: 'Your move', inspect: 'A closer look', spotlight: 'A Spotlight idea' }[drawer]} presentation={drawer === 'journey' ? 'dialog' : 'sheet'} onClose={() => setDrawer(null)}>
      {drawer === 'journey' && <GemwardJourney key={state.travel?.id ?? state.currentNodeId} room={room} userId={userId} now={now} loading={loading} pending={travelPending} onVote={edgeId => void voteTravel(edgeId)} onClose={() => setDrawer(null)} />}
      {(drawer === 'stash' || drawer === 'pouch') && <GemwardPack room={room} userId={userId} mode={drawer} disabled={locked} attachments={attachments} onChange={setAttachments} onClose={() => setDrawer(null)} />}
      {drawer === 'menu' && <div className="gm-menu"><div className="gm-menu-links"><button onClick={() => setDrawer('party')}><Users />Party & invitations</button><button onClick={() => setDrawer('chat')}><MessageCircle />Table chat</button><button onClick={() => setDrawer('round')} disabled={!lastRound && !pending && !committed}><BookOpen />Read the last round</button><button onClick={() => setDrawer('pouch')}><Gem />Party discoveries</button></div><div className="gm-menu-narrator" ref={setMenuNarratorHost} /><label className="gm-setting"><input type="checkbox" checked={quietEffects} onChange={event => { setQuietEffects(event.target.checked); try { localStorage.setItem('dropinn-effects', event.target.checked ? 'off' : 'on'); } catch {} }} />Reduce effects</label><button className="gm-setting" onClick={() => { setSound(!sound); setTableSound(!sound); }}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}{sound ? 'Table sounds on' : 'Table sounds off'}</button><TableReactions room={room} /><button className="gm-quiet-button" disabled={loading} onClick={() => void leaveRoom()}><ArrowLeft size={17} />Leave the table</button></div>}
      {drawer === 'party' && <div className="gm-party-panel"><p>Table <strong>{room.code}</strong>. Everyone chooses together; arrivals join at a turn boundary.</p><h3>Bring a friend</h3><p>{room.visibility === 'private' ? 'This private table needs the full invitation.' : 'Share this link to bring a friend into the story.'}</p><label htmlFor="gm-invitation">Full invitation link</label><input id="gm-invitation" readOnly value={invitationUrl(room, window.location.origin)} onFocus={event => event.target.select()} /><button className="gm-primary" onClick={() => void copyInvite()}>{copied ? 'Copied!' : 'Copy invitation'}</button>{room.seats.map(seat => <article key={seat.id}><HeroAvatar hero={seat.character} /><div><strong>{seat.character.name}{seat.actorId === userId ? ' · you' : ''}</strong><p>{CHARACTER_CLASS_PRESETS[seat.character.classKey].label} · {seat.hp}/{seat.character.maxHp} health</p><small>{seat.kind === 'companion' ? 'Rules-based companion' : seat.leaving ? 'Leaving at the boundary' : room.commits[seat.actorId] ? 'Move placed' : traveling && state.travel?.votes[seat.actorId] ? 'Route vote placed' : 'Choosing'}</small></div></article>)}<TableReactions room={room} /></div>}
      {drawer === 'chat' && chat}
      {drawer === 'details' && <div className="gm-detail"><h3>{preview?.label}</h3><p>{preview?.description}</p>{topics.length > 1 && <fieldset className="gm-topic-options"><legend>What will you ask?</legend>{topics.map(topic => <button key={topic.id} type="button" data-gemward-interaction={topic.id} disabled={locked} aria-pressed={interactionId === topic.id} onClick={() => setInteractionId(topic.id)}><strong>{topic.label}</strong><span>{topic.description}</span></button>)}</fieldset>}{target && <p>{target.context ?? target.description}</p>}{selectedItem && <p><strong>Packed with this move:</strong> {CONSUMABLES.find(item => item.id === selectedItem.kind)?.description}</p>}<p>Preparing is free. Use the release controls when you are ready to act.</p><button className="gm-primary" onClick={() => setDrawer(null)}>Return to my move <ArrowRight size={16} /></button></div>}
      {drawer === 'inspect' && <div className="gm-detail"><h3>{inspected?.name ?? room.seats.find(seat => seat.actorId === inspectedId)?.character.name ?? 'The party’s encounter'}</h3><p>{inspected?.context ?? inspected?.description ?? scene.situation}</p><p>{scene.objective}</p><p>{rest ? 'Look around freely. Your submitted action remains saved exactly as released.' : 'Choose a token to prepare a way to help.'}</p></div>}
      {drawer === 'spotlight' && <div className="gm-spotlight"><p>One creative move per chapter. Work with something in the shared scene: <strong>{sharedScene.location}</strong>. Previewing spends nothing.</p><div className="gm-idea-suggestions">{spotlightSuggestions(room).map(suggestion => <button key={suggestion.label} disabled={proposing || !canAct} onClick={() => { setIdea(suggestion.idea); setSpotlightTarget(suggestion.targetId); clearProposal(); void propose(suggestion.idea, suggestion.targetId); }}><Sparkles size={16} />{suggestion.label}</button>)}</div><label htmlFor="gm-idea">Your idea</label><textarea id="gm-idea" maxLength={280} rows={3} value={idea} onChange={event => { setIdea(event.target.value); clearProposal(); }} /><label htmlFor="gm-idea-target">Use something in the scene</label><select id="gm-idea-target" value={spotlightTarget || sharedScene.targets[0]?.id} onChange={event => { setSpotlightTarget(event.target.value); clearProposal(); }}>{sharedScene.targets.map(piece => <option key={piece.id} value={piece.id}>{piece.name}</option>)}</select><button className="gm-primary" disabled={!idea.trim() || proposing || !canAct} onClick={() => void propose(idea.trim(), spotlightTarget || sharedScene.targets[0].id)}>{proposing ? 'Considering…' : 'Preview my idea'}</button>{spotlightPreview && <div role="status"><h3>{spotlightPreview.label}</h3><p>{spotlightPreview.description}</p>{spotlightPreview.supported ? <button className="gm-primary" disabled={!canAct} onClick={() => { setSpotlightAction({ token: 'spotlight', targetId: spotlightPreview.targetId, proposal: spotlightPreview, targetKind: 'scene', expedition: { locationId: state.locationId } }); setLocationId(state.locationId); setTargetId(spotlightPreview.targetId); setDrawer(null); }}>Ready this Spotlight</button> : <p>Your turn is safe. Try another idea or a normal token.</p>}</div>}{error && <p role="alert">{error}</p>}</div>}
    </SceneDrawer>}
    {drawer === 'round' && <RoundScroll room={room} userId={userId} summary={lastRound} action={pending?.action ?? committed} pending={!!pending} loading={loading} error={error} historical={!confirmed && !pending && !committed} now={now} seconds={seconds} bypass={showAll || !pacedTurns} reducedMotion={quiet} canVote={canSkip} skipped={skipVoted} skipping={skippingReveal} onClose={() => setDrawer(null)} onShowAll={() => setShowAll(true)} onNext={() => void skipReveal()} onRetry={() => pending && void commitAction(pending.action)} onCollect={() => void leaveRoom()} narratorHost={setNarratorHost} />}
    {drag && <HeldToken token={drag.kind} x={drag.x} y={drag.y} tilt={drag.tilt} label={labelForDrag} quiet={quiet} />}
    {returning && <motion.div className="gm-returning-token" initial={{ left: returning.x - 24, top: returning.y - 24, scale: 1.1 }} animate={{ left: returning.toX - 24, top: returning.toY - 24, scale: .55, opacity: 0 }} transition={{ type: 'spring', stiffness: 360, damping: 25 }} onAnimationComplete={() => setReturning(undefined)}><TokenArtwork token={returning.kind} /></motion.div>}
    {contact.feedback}
  </main>;
}

