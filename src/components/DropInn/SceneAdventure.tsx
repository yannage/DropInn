import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { latestRound } from '../../lib/dropinn/roundSummary';
import { RoundScroll } from './RoundScroll';
import { InspectionBubble } from './InspectionBubble';
import { Narrator } from './Narrator';
import { StoryScroll, type StoryScrollMode } from './StoryScroll';
import { ArrowLeft, Check, Clock3, Copy, Dices, Flame, Heart, Info, MessageCircle, Shield, Sparkles, Users, Volume2, VolumeX, X } from 'lucide-react';
import { useAdventureStore } from '../../store/adventureStore';
import { chaptersFor, adventureFor } from '../../lib/dropinn/registry';
import { describeAction } from '../../lib/dropinn/engine';
import { getScene, spotlightExample } from '../../lib/dropinn/scene';
import { rollSupport, supportText, teammatesAt } from '../../lib/dropinn/teamwork';
import { spotlightSuggestions } from '../../lib/dropinn/suggestions';
import { invitationUrl } from '../../lib/dropinn/invites';
import { CHARACTER_CLASS_PRESETS } from '../../lib/character';
import type { AdventureRoom, PlayerAction } from '../../lib/dropinn/types';
import { currentTurnResults } from '../../lib/dropinn/turnPresentation';
import { HeroAvatar } from './HeroAvatar';
import { TargetArtwork } from './TargetArtwork';
import { TokenArtwork, type IllustratedToken } from './TokenArtwork';
import { TabletopArtwork } from './TabletopArtwork';
import { TimedRelease } from './TimedRelease';
import { HeroReaction, TableReactions } from './TableReactions';
import { playTableSound, tableSoundEnabled, setTableSound } from './tableSound';
import { SceneStageArt } from './SceneStageArt';

import { FocusedActionChoices } from './FocusedAction';
import { approachDetail, approachOption, approachOptions, isDuel } from '../../lib/dropinn/approaches';
import { contextualActionLabel, derivePlayerGuidance, remainingTurnSeconds, suggestedTargetIds } from '../../lib/dropinn/playerGuidance';
import './scene-adventure.css';
import './game-feel.css';
import './shared-story.css';
import './tabletop-art.css';
import './player-guidance.css';
import './encounter-focus.css';
import './responsive-table.css';
import './living-table.css';
import { useStagePlayback, StageEffects, CombinationLinks, CombinationNotice, stageCaption } from './LivingStage';
import { useTableContact, useLiveReducedMotion } from './TableContact';
import { AimConnection, HeldToken, useHeroPlay } from './PlayfulTable';
import { ChapterReward } from './ChapterReward';
import { combinationAvailable, combinationDefinition, combinationState, combinationPreview, selectedPayoff } from '../../lib/dropinn/combinations';
import { claimStageSound, stageEvents } from '../../lib/dropinn/stagePlayback';
function readEffectPreference(key: string) { try { return localStorage.getItem(key) === 'off'; } catch { return false; } }


const TOKENS: { kind: IllustratedToken; label: string }[] = [
  { kind: 'fight', label: 'Fight' }, { kind: 'influence', label: 'Influence' },
  { kind: 'investigate', label: 'Investigate' }, { kind: 'assist', label: 'Help' },
];
const effects: Record<IllustratedToken, string> = { fight: 'Progress · block 2', influence: 'Progress · ease danger', investigate: 'Progress · next-turn insight', assist: 'Progress · class support' };
const pacedTurnsKey = 'dropinn-paced-turn-results';
function initialPacedTurns() { try { return localStorage.getItem(pacedTurnsKey) !== 'off'; } catch { return true; } }
const firstMoveKey = 'dropinn:first-move-guide:v1';
function initialGuide(): { enabled: boolean; afterResult?: string } {
  try { const saved = JSON.parse(localStorage.getItem(firstMoveKey) ?? 'null'); return { enabled: saved?.enabled !== false, afterResult: typeof saved?.afterResult === 'string' ? saved.afterResult : undefined }; }
  catch { return { enabled: true }; }
}
type Drawer = 'party' | 'chat' | 'invite' | 'details' | 'spotlight' | 'choice' | 'round' | null;

export function SceneDrawer({ title, onClose, children, presentation = 'sheet' }: { title: string; onClose: () => void; children: ReactNode; presentation?: 'sheet' | 'dialog' }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const key = (event: KeyboardEvent) => {
      // A report sheet may be opened from Chat; only the top sheet traps input.
      if (Array.from(document.querySelectorAll('[role="dialog"]')).at(-1) !== ref.current) return;
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]') ?? []).filter(node => node.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = old; document.removeEventListener('keydown', key); previous?.isConnected && previous.focus(); };
  }, []);
  return <div className={`di-scene-shade is-${presentation}`} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`di-scene-drawer is-${presentation}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
      <header><h2>{title}</h2><button onClick={onClose} aria-label={`Close ${title}`}><X size={22} /></button></header>
      <div className="di-scene-drawer-body">{children}</div>
    </div>
  </div>;
}

export function SceneAdventure({ room, chat }: { room: AdventureRoom; chat: ReactNode }) {
  const { userId, loading, leaveRoom, joinRoom, commitAction, pendingMove, error, propose, proposal, proposing, clearProposal, messages, narration, skipReveal, skippingReveal } = useAdventureStore();
  const scene = getScene(room);
  const CHAPTERS = chaptersFor(room);
  const branchOpen = !!scene.branch && !room.storyBranch;
  const closing = room.storyBranch ? adventureFor(room).closing?.[room.storyBranch] : undefined;
  const self = room.seats.find(seat => seat.actorId === userId && seat.kind === 'human');
  const participant = room.players[userId];
  const intent = room.enemyIntent?.turn === room.turn ? room.enemyIntent : undefined;
  const victim = room.seats.find(seat => seat.actorId === intent?.targetActorId);
  const joining = room.pendingJoins.includes(userId);
  const committed = Boolean(room.commits[userId]);
  const [now, setNow] = useState(Date.now());
  const [pacedTurns, setPacedTurns] = useState(initialPacedTurns);
  const [localSkipId, setLocalSkipId] = useState('');
  const autoSkipAttempt = useRef('');
  useEffect(() => { try { localStorage.setItem(pacedTurnsKey, pacedTurns ? 'on' : 'off'); } catch {/* Optional preference. */} }, [pacedTurns]);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [dismissedRound, setDismissedRound] = useState('');
  const [manualRound, setManualRound] = useState('');
  const [narratorHost, setNarratorHost] = useState<HTMLDivElement | null>(null);
  const [storyMode,setStoryMode] = useState<StoryScrollMode>('collapsed');
  useEffect(() => {setStoryMode('collapsed');},[room.id]);
  const [token, setToken] = useState<IllustratedToken>('investigate');
  const [selection, setSelection] = useState<PlayerAction | null>(null);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [armedToken, setArmedToken] = useState(false);
  const [guide, setGuide] = useState(initialGuide);
  const [focusDismissed, setFocusDismissed] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const inspected = scene.targets.find(item => item.id === inspectedId);
  const inspectedHero = room.seats.find(member => member.actorId === inspectedId);
  const hasInspection = !!(inspected || inspectedHero);
  const reducedMotion = useLiveReducedMotion();
  const lastRound = useMemo(() => latestRound(room), [room.id, room.events, room.outcomes, room.turn, room.chapter, room.phase]);
  const skipVoted = room.revealSkips?.includes(userId) ?? false;
  const revealBypassed = !pacedTurns || skipVoted || (lastRound !== undefined && localSkipId === lastRound.id);
  const partyPayoff = room.phase === 'reveal' && (!lastRound || reducedMotion || revealBypassed || now - lastRound.at >= 1100);
  const revealVoters = room.seats.filter(seat => seat.kind === 'human' && !seat.leaving);
  const canSkipReveal = room.status === 'active' && room.phase === 'reveal' && revealVoters.some(seat => seat.actorId === userId);
  useEffect(() => {
    if (pacedTurns || !canSkipReveal || skipVoted || skippingReveal || !lastRound) return;
    if (autoSkipAttempt.current === lastRound.id) return;
    autoSkipAttempt.current = lastRound.id;
    void skipReveal();
  }, [pacedTurns, canSkipReveal, skipVoted, skippingReveal, lastRound?.id, skipReveal]);
  const [holding, setHolding] = useState(false);
  const [idea, setIdea] = useState('');
  const [spotlightTarget, setSpotlightTarget] = useState(scene.targets[0]?.id ?? '');
  const [copied, setCopied] = useState(false);
  const [sound, setSound] = useState(tableSoundEnabled);
  const [seenMessages, setSeenMessages] = useState(messages.length);
  const [hint, setHint] = useState('Choose a highlighted object.');
  const [drag, setDrag] = useState<{ kind: IllustratedToken; x: number; y: number; tilt: number; over: string | null } | null>(null);
  const [returning, setReturning] = useState<{ kind: IllustratedToken; x: number; y: number; toX: number; toY: number } | null>(null);
  const gesture = useRef<{ id: number; kind: IllustratedToken; x: number; y: number; homeX: number; homeY: number; lastX: number; over: string | null; cueAt: number; moving: boolean } | null>(null);
  const suppressClick = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const [threatPath, setThreatPath] = useState<{ width: number; height: number; path: string } | null>(null);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 100); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    setSelection(null); setInspectedId(null); setArmedToken(false);  setFocusDismissed(false); setHolding(false); setDrag(null); gesture.current = null;
    setIdea(''); setSpotlightTarget(scene.targets[0]?.id ?? ''); clearProposal(); setDrawer(current => current === 'spotlight' || current === 'choice' ? null : current);
    setHint('Choose a highlighted object.');
  }, [room.turn, clearProposal]);
  useEffect(() => { setInspectedId(null); setArmedToken(false); }, [room.phase]);
  useEffect(() => { if (drawer === 'chat') setSeenMessages(messages.length); }, [drawer, messages.length]);
  const pending = pendingMove?.turn === room.turn ? pendingMove : null;
  const roundKey = `${room.id}:${room.chapter}:${room.turn}`;
  const roundRest = !!pending || committed || room.phase === 'reveal' || room.status === 'completed';
  const historicalRound = drawer === 'round';
  const roundOpen = historicalRound || (roundRest && storyMode === 'collapsed'
    && (manualRound === roundKey || dismissedRound !== roundKey));
  const liveSummary = room.phase === 'reveal' || room.status === 'completed' ? lastRound : undefined;
  const closeRound = () => {
    if (historicalRound) { setDrawer(null); return; }
    setDismissedRound(roundKey); setManualRound('');
  };
  useEffect(() => { if (roundOpen && drawer && drawer !== 'round') setDrawer(null); }, [roundOpen]);
  const canAct = !!self && !self.leaving && !joining && room.status === 'active' && room.phase === 'choosing' && !committed && now < room.deadline;
  useLayoutEffect(() => {
    const node = stage.current;
    if (!node || !intent) { setThreatPath(null); return; }
    const update = () => {
      const nodes = Array.from(node.querySelectorAll<HTMLElement>('[data-scene-target]'));
      const from = nodes.find(item => item.dataset.sceneTarget === intent.sourceId);
      const to = nodes.find(item => item.dataset.sceneTarget === intent.targetActorId);
      if (!from || !to) { setThreatPath(null); return; }
      const box = node.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      const x1 = a.x + a.width / 2 - box.x, y1 = a.y - box.y + 6;
      const x2 = b.x + b.width / 2 - box.x, y2 = b.bottom - box.y + 3;
      setThreatPath({ width: box.width, height: box.height, path: `M ${x1} ${y1} Q ${x1} ${y2 + 20} ${x2} ${y2}` });
    };
    update(); const observer = new ResizeObserver(update); observer.observe(node);
    return () => observer.disconnect();
  }, [room.chapter, intent?.targetActorId, intent?.sourceId, intent?.turn, partyPayoff, inspectedId, selection?.targetId]);
  const locked = !canAct || loading || holding || !!pending;
  const target = scene.targets.find(target => target.id === selection?.targetId);
  const protect = selection?.targetKind === 'hero';
  const downed = self?.hp === 0;
  const seconds = remainingTurnSeconds(room, now);
  const [quietEffects, setQuietEffects] = useState(() => readEffectPreference('dropinn-effects'));
  const [noShake, setNoShake] = useState(() => readEffectPreference('dropinn-shake'));
  const heroPlay = useHeroPlay();
  const contact = useTableContact(quietEffects || reducedMotion);
  const playback = useStagePlayback(room, now, reducedMotion || quietEffects || revealBypassed);
  const activeOffset = useRef({ id: playback.active?.event.id, ms: 0 });
  if (activeOffset.current.id !== playback.active?.event.id) activeOffset.current = { id: playback.active?.event.id, ms: playback.active ? Math.max(0, now - playback.active.start) : 0 };
  const results = room.phase === 'reveal' ? playback.landed : currentTurnResults(room);
  const visualScene = playback.scene;
  const combo = combinationDefinition(room), comboState = combinationState(room);
  const comboReady = combinationAvailable(room, userId);
  useLayoutEffect(() => {
    if (!selection?.combination) return;
    const choices = document.querySelector('.di-dock-choices');
    if (!choices) return;
    const revealChoice = () => { choices.scrollTop = choices.scrollHeight; };
    revealChoice(); const observer = new ResizeObserver(revealChoice); observer.observe(choices);
    return () => observer.disconnect();
  }, [selection?.combination?.payoffId]);
  const chosenCombo = selection ? selectedPayoff(room, selection) : undefined;
  const chapterComplete = room.outcomes.some(outcome => outcome.chapter === room.chapter);
  const rewardReady = chapterComplete && playback.landed.length === stageEvents(room).length;
  useEffect(() => {
    if (room.phase === 'reveal' && rewardReady && playback.active && chapterComplete && lastRound && now - lastRound.at < 6000 && !reducedMotion && !quietEffects && claimStageSound(`${room.id}:${room.chapter}:reward`)) playTableSound('reward');
  }, [rewardReady, playback.active?.event.id, chapterComplete, room.phase, now]);
  const strike = results.find(event => event.turn === room.turn && event.result?.targetKind === 'hero' && event.result.targetId === intent?.targetActorId && event.result.damage !== undefined)?.result;
  const threatLabel = room.phase === 'reveal' ? !playback.settled && !strike ? 'The threat is resolving' : strike ? strike.damage ? 'The strike lands' : 'Attack blocked' : 'Strike averted' : `${victim?.actorId === userId ? 'You are' : `${victim?.character.name} is`} in danger`;
  const ownResult = results.find(event => event.actorId === userId && (event.contribution || event.roll !== undefined));
  useEffect(() => {
    if (guide.enabled && ownResult && ownResult.id !== guide.afterResult) setGuide({ enabled: false });
  }, [ownResult?.id, guide.enabled, guide.afterResult]);
  useEffect(() => { try { localStorage.setItem(firstMoveKey, JSON.stringify(guide)); } catch { /* Guidance remains available without storage. */ } }, [guide]);
  const guidance = derivePlayerGuidance({ room, userId, now, selection, inspectedId, pending, armedToken: armedToken ? token : null, holding });
  const suggestedIds = guide.enabled && guidance.state === 'target' ? suggestedTargetIds(room, userId) : [];
  const coachVisible = guide.enabled && ['target', 'armed'].includes(guidance.state);
  const support = selection && !protect ? rollSupport(room, userId, selection) : null;
  const description = selection && self && !protect ? describeAction(self.character.classKey, selection.token, selection.targetId, room) : null;
  const successChance = (bonus: number) => description && self ? Math.max(0, Math.min(20, 21 + self.character.traits[description.trait] + (support?.total ?? 0) + bonus - description.dc)) * 5 : null;
  const availableProposal = proposal?.turn === room.turn && proposal.idea === idea.trim() && proposal.targetId === spotlightTarget ? proposal : null;
  const spent = participant?.spotlightChapters.includes(room.chapter) ?? false;
  const canPlace = (kind: IllustratedToken, id: string, type = 'scene') => {
    if (downed && kind !== 'assist') return false;
    return type === 'hero' ? kind === 'assist' && (intent?.targetActorId === id || (room.mechanicsVersion === 1 && room.seats.some(member => member.actorId === id && !member.leaving && member.hp < member.character.maxHp))) : !!scene.targets.find(target => target.id === id)?.tokens.includes(kind);
  };
  const choose = (kind: IllustratedToken, id: string, type: 'scene' | 'hero' = 'scene', approach?: PlayerAction['approach']) => {
    if (locked) return;
    if (type === 'hero' && approach === 'mend' && room.seats.find(member => member.actorId === id)?.leaving) return;
    if (!canPlace(kind, id, type)) { setHint(type === 'hero' ? 'Use Help to protect the threatened hero.' : 'Try a highlighted object, or choose another token.'); return; }
    const action: PlayerAction = { token: kind, targetId: id, targetKind: type };
    if (type === 'hero') { if (approach === 'mend' || intent?.targetActorId !== id) action.approach = 'mend'; }
    else action.approach = approachOptions(room, action)[0]?.id;
    setToken(kind); setInspectedId(null); setArmedToken(false);  setFocusDismissed(false); setSelection(action); clearProposal();
    if (branchOpen && kind === 'assist' && type === 'scene' && scene.branch?.options.some(option => option.targetId === id)) setDrawer('choice');
    setHint('Release the die to commit. Good timing adds a bonus.'); playTableSound('place');
  };
  const inspect = (id: string) => {
    if (holding || drag) return;
    if (id !== inspectedId) playTableSound('pick');
    setInspectedId(id); setArmedToken(false);
    if (!locked) { setSelection(null); clearProposal(); }
  };
  const dismissInspection = (restore = false) => {
    const id = inspectedId; setInspectedId(null); setArmedToken(false);
    if (restore) requestAnimationFrame(() => Array.from(stage.current?.querySelectorAll<HTMLElement>('[data-scene-target]') ?? []).find(node => node.dataset.sceneTarget === id)?.focus());
  };
  const hit = (x: number, y: number) => {
    const node = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-scene-target]');
    return node && stage.current?.contains(node) ? { id: node.dataset.sceneTarget!, type: node.dataset.targetKind as 'scene' | 'hero' } : null;
  };
  const startDrag = (event: PointerEvent<HTMLButtonElement>, kind: IllustratedToken) => {
    if (locked || !event.isPrimary || event.button !== 0 || (downed && kind !== 'assist')) return;
    suppressClick.current = false; event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    setReturning(null);
    gesture.current = { id: event.pointerId, kind, x: event.clientX, y: event.clientY, homeX: rect.x + rect.width / 2, homeY: rect.y + rect.height / 2, lastX: event.clientX, over: null, cueAt: 0, moving: false };
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    if (!current.moving && Math.hypot(event.clientX - current.x, event.clientY - current.y) > 9) { current.moving = true; setHint('Aim at a highlighted piece. Dropping prepares your move.'); playTableSound('pick'); }
    if (current.moving) {
      const hovered = hit(event.clientX, event.clientY); setToken(current.kind); setArmedToken(true);
      const over = hovered && canPlace(current.kind, hovered.id, hovered.type) ? hovered.id : null;
      if (over && over !== current.over && performance.now() - current.cueAt > 120) { playTableSound('aim'); current.cueAt = performance.now(); }
      setDrag({ kind: current.kind, x: event.clientX, y: event.clientY, tilt: Math.max(-16, Math.min(16, (event.clientX - current.lastX) * .7)), over });
      current.lastX = event.clientX; current.over = over;
    }
  };
  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (current?.id !== event.pointerId) return;
    if (current.moving) {
      suppressClick.current = true;
      const hovered = hit(event.clientX, event.clientY);
      if (hovered && canPlace(current.kind, hovered.id, hovered.type)) choose(current.kind, hovered.id, hovered.type);
      else { setHint('Token returned. Drop it on a highlighted object.'); playTableSound('return'); if (!quietEffects && !reducedMotion) setReturning({ kind: current.kind, x: event.clientX, y: event.clientY, toX: current.homeX, toY: current.homeY }); }
    }
    gesture.current = null; setDrag(null);
  };
  useEffect(() => { if (!canAct || loading) { gesture.current = null; setDrag(null); } }, [canAct, loading]);
  useEffect(() => {
    const cancel = () => { if (gesture.current) { gesture.current = null; setDrag(null); setArmedToken(false); suppressClick.current = true; } };
    window.addEventListener('blur', cancel);
    return () => window.removeEventListener('blur', cancel);
  }, []);
  const dragHero = drag?.over && room.seats.some(member => member.actorId === drag.over);
  const dragLabel = drag?.over ? contextualActionLabel(room, { token: drag.kind, targetId: drag.over, targetKind: dragHero ? 'hero' : 'scene', ...(dragHero && drag.over !== intent?.targetActorId ? { approach: 'mend' as const } : {}) }) : undefined;
  const commit = (releaseMs?: number) => {
    if (!selection || !canAct) return;
    void commitAction({ ...selection, ...(releaseMs === undefined ? {} : { releaseMs }) });
  };
  const branchOption = branchOpen && selection?.token === 'assist' ? scene.branch?.options.find(option => option.targetId === selection.targetId && selection.targetKind !== 'hero') : undefined;
  const focusAction = selection ?? pending?.action ?? room.commits[userId] ?? (ownResult?.result?.approach && ownResult.result.token && ownResult.result.targetId ? { token: ownResult.result.token, targetId: ownResult.result.targetId, targetKind: ownResult.result.targetKind, approach: ownResult.result.approach } : null);
  const focus = !roundRest && !focusDismissed && !hasInspection && !partyPayoff && !!self && room.mechanicsVersion === 1 && !!focusAction && (focusAction.approach !== undefined || focusAction.targetKind === 'hero');
  const focusedOption = focusAction ? approachOption(room, focusAction) : undefined;
  const focusDescription = focusAction && self ? describeAction(self.character.classKey, focusAction.token, focusAction.targetId, room) : null;
  const focusModifier = self && focusDescription && focusAction ? self.character.traits[focusDescription.trait] + rollSupport(room, userId, focusAction).total + (focusedOption?.modifier ?? 0) : 0;
  const backToScene = () => {
    if (holding || drag) return;
    const id = focusAction?.targetId;
    if (!locked) setSelection(null);
    setFocusDismissed(true); setInspectedId(null); setArmedToken(false);
    requestAnimationFrame(() => { Array.from(stage.current?.querySelectorAll<HTMLElement>('[data-scene-target]') ?? []).find(node => node.dataset.sceneTarget === id)?.focus(); });
  };
  useEffect(() => {
    if (selection && !locked && !hasInspection) document.querySelector<HTMLElement>(focus ? '.di-focus-choices button[aria-pressed="true"]' : '.di-focus-hold')?.focus();
  }, [focus, selection?.targetId, selection?.token]);
  const compactLabel = focusAction ? contextualActionLabel(room, focusAction) : 'Your move';
  const helpEffect = self ? { fighter: 'Progress · cover', rogue: 'Progress · next-turn opening', wizard: 'Progress · next-turn insight', cleric: 'Progress · heal up to 4' }[self.character.classKey] : effects.assist;
  const handEffects: Record<IllustratedToken, string> = { fight: scene.combat ? 'Attack or guard' : 'Clear the way', influence: 'Reassure or distract', investigate: 'Discover or prepare', assist: downed ? 'You can still help' : 'Support your party' };
  const compactEffect = branchOption ? 'Your route vote counts even if the roll misses.' : protect ? 'Block 2 · great release blocks 3' : selection?.token === 'spotlight' ? `On success: ${selection.proposal?.effect}` : selection ? selection.token === 'assist' ? helpEffect : selection.token === 'fight' && !scene.combat ? 'Progress · clear the way' : effects[selection.token as IllustratedToken] : '';
  const openSpotlight = () => { if (holding || pending || !canAct || downed || spent) return; setDrawer('spotlight'); setSpotlightTarget(inspected?.id ?? target?.id ?? scene.targets[0].id); setIdea(''); clearProposal(); };
  const closeDrawer = () => { setDrawer(null); if (drawer === 'spotlight') { clearProposal(); setIdea(''); } };
  const chooseSpotlight = () => {
    if (!availableProposal?.supported || !canAct) return;
    setInspectedId(null); setArmedToken(false); setSelection({ token: 'spotlight', targetKind: 'scene', targetId: availableProposal.targetId, proposal: availableProposal }); setDrawer(null);
  };
  const share = async () => { try { await navigator.clipboard.writeText(invitationUrl(room, window.location.origin)); setCopied(true); } catch { setCopied(false); } };
  const skipRound = () => { if (!lastRound) return; setLocalSkipId(lastRound.id); if (canSkipReveal && !skipVoted) void skipReveal(); };
  const clockLabel = room.status === 'completed' ? 'Complete' : room.status === 'parked' ? 'Paused'
    : room.phase === 'reveal' ? room.outcomes.some(outcome => outcome.chapter === room.chapter) ? 'Next chapter in' : 'Next round in'
      : guidance.state === 'pending' ? 'Checking move' : seconds === 0 ? 'Resolving'
        : ['committed', 'joining', 'leaving', 'unseated'].includes(guidance.state) ? 'Resolves within' : 'Choose within';
  return <main {...contact.handlers} className={`di-theater di-guided-table di-living-table ${bubbleVisible ? 'has-inspection-bubble' : ''}`} aria-label="Adventure table" data-quiet={quietEffects || reducedMotion} data-completed={room.status === 'completed'} onKeyDown={event => { if (event.key === 'Escape' && !drawer && storyMode === 'collapsed') { if (hasInspection) { event.preventDefault(); dismissInspection(true); } else if (focus) { event.preventDefault(); backToScene(); } } }}>
    <header className="di-stage-header">
      <div className="di-stage-header-left">
      <button aria-label={room.status === 'completed' ? 'Back to the inn' : 'Leave & save'} disabled={loading || holding} onClick={() => void leaveRoom()}><ArrowLeft size={20} /><span>Leave</span></button>
      <StoryScroll key={room.id} room={room} userId={userId} mode={storyMode} onMode={setStoryMode} suspended={drawer!==null || roundOpen} locked={holding || !!drag} seconds={seconds} narration={narration?.turn===room.turn ? narration.text : undefined}/>
      </div>
      <div className="di-stage-chapters" aria-label={`Chapter ${room.chapter + 1} of ${CHAPTERS.length}`}>
        {CHAPTERS.map((chapter, index) => <span key={chapter.id} className={index === room.chapter ? 'current' : index < room.chapter ? 'done' : ''} title={chapter.title}>{index < room.chapter ? <Check size={12} /> : index + 1}</span>)}
      </div>
      <span className={`di-stage-clock ${seconds <= 8 && room.phase === 'choosing' && canAct && !pending ? 'urgent' : ''}`} role="timer" aria-label={`${clockLabel}${room.status === 'active' ? `: ${seconds} seconds` : ''}`}><small>{clockLabel}</small><Clock3 size={14} />{room.status === 'active' ? `${seconds}s` : '—'}</span>
    </header>
    <div className="di-stage-objective"><strong><span className="di-goal-label">Your shared goal</span>{room.status === 'completed' ? 'You made a little legend.' : visualScene.objective}</strong><Narrator key={room.id} room={room} pacedTurns={pacedTurns} onPacedTurns={setPacedTurns} suppressCue={room.phase === 'reveal' && revealBypassed} portalTarget={roundOpen ? narratorHost : null} /><div className="di-objective-progress"><div className="di-chapter-meter"><span>Chapter progress <b>{Number(playback.progress.toFixed(1))} / {scene.progressGoal}</b></span><div role="progressbar" aria-label="Chapter progress" aria-valuenow={Math.round(Math.min(100, playback.progress / scene.progressGoal * 100))} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.min(100, playback.progress / scene.progressGoal * 100)}%` }} /></div></div><span className="di-danger-details" aria-label={`Danger ${playback.danger}`}><Flame size={12} />Danger {Number(playback.danger.toFixed(1))}</span></div></div>
    <div className={`di-scene-stage di-stage-${scene.art} ${scene.combat ? 'di-stage-combat' : ''} ${room.phase === 'reveal' ? 'is-resolving' : ''} ${holding ? 'is-charging' : ''} `} ref={stage} onClick={event => { if (inspected && !(event.target as HTMLElement).closest('[data-scene-target],button')) dismissInspection(); }}>
      <SceneStageArt chapter={room.chapter} art={scene.art} />
      <>
      {threatPath && <svg className="di-threat-link" aria-hidden="true" viewBox={`0 0 ${threatPath.width} ${threatPath.height}`}><defs><marker id="stage-threat-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#b44e35" /></marker></defs><path d={threatPath.path} fill="none" stroke="#b44e35" strokeWidth="2.5" strokeDasharray="5 6" markerEnd="url(#stage-threat-arrow)" /></svg>}
      <div className="di-stage-party" aria-label="Heroes at the table">
        {playback.seats.map(member => {
          const threatened = intent?.targetActorId === member.actorId;
          const playful = member.actorId === userId && !armedToken && (locked || !!selection || !canPlace('assist', member.actorId, 'hero'));
          const playing = member.actorId === userId ? heroPlay.play : undefined;
          const ready = room.commits[member.actorId];
          const guard = Object.values(room.commits).filter(action => action.targetKind === 'hero' && action.targetId === member.actorId).length;
          const damage = results.find(event => event.result?.targetId === member.actorId && event.result?.damage !== undefined);
          const healing = results.filter(event => event.result?.targetKind === 'hero' && event.result.targetId === member.actorId).reduce((total, event) => total + (event.result?.healing ?? 0), 0);
          return <button key={member.id} className={`di-stage-hero ${threatened ? 'is-threatened' : ''} ${selection?.targetKind === 'hero' && selection.targetId === member.actorId ? 'is-selected' : ''} ${drag?.over === member.actorId ? 'is-over' : ''}`} data-scene-target={member.actorId} data-target-kind="hero" data-hero-play={playful}
            aria-label={`${member.character.name}${member.actorId === userId ? ', you' : ''}, ${member.hp} HP${member.kind === 'companion' ? ', companion' : ''}${playful ? ', tap to play: hop, twirl, bow' : threatened ? ', threatened: Help to protect' : room.mechanicsVersion === 1 && member.hp < member.character.maxHp ? ', wounded: Help to heal' : ', party details'}`} onClick={() => playful ? heroPlay.poke() : canPlace('assist', member.actorId, 'hero') ? armedToken && token === 'assist' && !locked ? choose('assist', member.actorId, 'hero') : inspect(member.actorId) : setDrawer('party')}>
            <HeroAvatar key={`avatar-${playing?.id ?? "rest"}`} hero={member.character} decorative className={playing ? `di-hero-${playing.kind}` : undefined} />{playing && <span key={`caption-${playing.id}`} className="di-hero-play-caption" role="status">{playing.caption}</span>}{!playing && <HeroReaction room={room} actorId={member.actorId} now={now}/>}<span className="di-stage-hero-name">{member.actorId === userId ? 'You' : member.character.name}</span>
            <span className="di-stage-health">{member.kind === "human" && combinationAvailable(room, member.actorId) && <small title="Combination available" aria-label="Combination available">✧</small>}<Heart size={10} />{member.hp}{member.kind === 'companion' && <small>C</small>}</span>
            {ready && <span className="di-stage-ready"><Check size={12} /></span>}{guard > 0 && <span className="di-stage-guard"><Shield size={14} /></span>}
            {room.phase === 'reveal' && (damage || healing > 0) && <span key={`${room.turn}-${member.actorId}`} className="di-stage-damage" aria-label={`${healing ? `Recovered ${healing} HP. ` : ''}${damage ? damage.result?.damage ? `Lost ${damage.result.damage} HP.` : 'Attack blocked.' : ''}`}>{healing > 0 && <span className="di-stage-healing">+{healing}</span>}{damage && <span>{damage.result?.damage ? `−${damage.result.damage}` : <Shield size={18} />}</span>}</span>}
          </button>;
        })}
      </div>
      {intent && victim && <div className="di-stage-threat" aria-label={room.phase === 'reveal' ? `${threatLabel}: ${victim.character.name}, ${strike?.damage ?? 0} damage` : `Incoming attack on ${victim.character.name}: ${intent.baseDamage} damage`}><span className="di-threat-arrow">{room.phase === 'reveal' && !strike?.damage ? '✓' : '↗'}</span><strong>{threatLabel}</strong><span>{room.phase === 'reveal' ? strike?.damage ?? 0 : intent.baseDamage}<Heart size={12} /></span></div>}
      <div className="di-stage-targets" aria-label="Objects in the scene">
        {visualScene.targets.map((item, index) => {
          const selected = selection?.targetKind !== 'hero' && selection?.targetId === item.id;
          const can = canPlace(token, item.id);
          const teammates = teammatesAt(room, userId, item.id);
          const teamwork = teammates.some(mate => mate.token !== token) && can && canAct;
          const targetResults = results.filter(event => event.result?.targetKind !== 'hero' && event.result?.targetId === item.id && event.result?.token);
          const event = targetResults.find(event => event.result?.changed || event.success) ?? targetResults[0];
          const source = intent?.sourceId === item.id;
          return <button type="button" key={item.id} data-scene-target={item.id} data-target-kind="scene" style={playback.active ? { "--target-contact": `${(playback.active.duration / 3 - activeOffset.current.ms) / 1000}s`, "--target-motion": `${playback.active.duration / 1800}s` } as CSSProperties : undefined} data-impact={playback.active?.event.result?.targetId === item.id ? playback.active.event.result?.token : undefined} className={`di-scene-object object-${index} ${can && canAct && armedToken ? 'is-compatible' : ''} ${selected || inspectedId === item.id ? 'is-selected' : ''} ${suggestedIds.includes(item.id) ? 'is-suggested' : ''} ${drag?.over === item.id ? 'is-over' : ''} ${item.changed ? 'is-developed' : ''} ${source ? 'is-enemy' : ''} ${room.phase === 'reveal' && event ? 'has-result' : ''}`}
            aria-label={`${item.name}${item.changed ? ', changed' : ''}${can && canAct && armedToken ? `, place ${TOKENS.find(item => item.kind === token)?.label}` : ', inspect'}`} aria-pressed={selected || inspectedId === item.id} aria-expanded={inspectedId === item.id} onClick={() => armedToken && can && !locked ? choose(token, item.id) : inspect(item.id)}>
            <TargetArtwork key={`${item.id}:${playback.active?.event.result?.targetId === item.id ? playback.active.event.id : "rest"}`} target={item} pose={source ? room.phase === 'reveal' && event?.success ? 'reaction' : 'windup' : 'idle'} />
            {suggestedIds.includes(item.id) && <span className="di-start-here">{branchOpen ? 'Explore this route' : 'Start here'}</span>}
            <span className="di-object-label">{item.name}{item.changed && <Check size={12} />}</span>
            {(() => { const move = pending?.action ?? room.commits[userId] ?? selection; return move?.targetKind !== 'hero' && move?.targetId === item.id ? <span className={`di-object-coin ${pending ? 'is-pending' : ''}`}>{move.token === 'spotlight' ? <TabletopArtwork kind="spotlight" /> : <TokenArtwork token={move.token} />}</span> : null; })()}
            {comboReady && combo?.payoffs.some(payoff => payoff.targetId === item.id) && <span className="di-combo-target">✧ Combo</span>}
            <span className="di-object-teammates">{teammates.map(mate => <span key={mate.userId} title={mate.name}>{mate.token === 'spotlight' ? <Sparkles size={12} /> : <TokenArtwork token={mate.token as IllustratedToken} />}</span>)}</span>
            {teamwork && <span className="di-object-teamwork">+1 teamwork</span>}
            {inspectedId === item.id && <InspectionBubble text={item.context ?? item.description} onVisible={setBubbleVisible} />}
            {room.phase === 'reveal' && event && <span className="di-object-result" key={event.id}>{event.success ? <Check size={16} /> : '!'}{targetResults.some(result => result.result?.progress) && <small>+{Number(targetResults.reduce((sum, result) => sum + (result.result?.progress ?? 0), 0).toFixed(2))} progress</small>}{targetResults.some(result => result.result?.protection) && <small><Shield size={12} />{Math.max(...targetResults.map(result => result.result?.protection ?? 0))}</small>}</span>}
          </button>;
        })}
      </div>
      </>
      {room.phase === "choosing" && !committed && !pending && (drag || selection) && <AimConnection stage={stage} actorId={userId} targetId={drag ? drag.over ?? undefined : selection?.targetId} pointer={drag ?? undefined} token={drag?.kind ?? selection!.token} />}
      <CombinationLinks room={room} stage={stage} userId={userId} />
      <StageEffects room={room} event={playback.active?.event} elapsed={playback.active ? Math.max(0, now - playback.active.start) : 0} duration={playback.active?.duration} stage={stage} quiet={quietEffects || reducedMotion} shake={!noShake} />
      {playback.active && <div className="di-stage-caption" role="status" key={playback.active.event.id}>{stageCaption(playback.active.event)}{playback.active.event.result?.combination?.kind === 'payoff' && <small>Prepared by {playback.active.event.result.combination.actorName}</small>}</div>}
      {room.phase === 'reveal' && rewardReady && room.status !== 'completed' && <div className="di-stage-reward" data-arriving={!!playback.active}><span className="di-collection-destination">✧ Collection</span><ChapterReward room={room} /></div>}
      {joining && <div className="di-stage-notice" role="status"><Users size={20} />Joining next turn. Explore the scene.</div>}
      {!self && !joining && room.status !== 'completed' && <div className="di-stage-notice"><button disabled={loading} onClick={() => void joinRoom(room.code)}>Rejoin the adventure</button></div>}
      {room.status === 'completed' && playback.settled && <div className="di-stage-finale"><Sparkles size={30} /><h2>A story worth telling.</h2>{closing && <><TargetArtwork target={{ id: "closing", artKey: closing.artKey }} /><strong>{closing.caption}</strong></>}<p>{participant?.actions ?? 0} contributions · +{participant?.xp ?? 0} XP</p><button onClick={() => void leaveRoom()} disabled={loading}>Collect your recap</button></div>}
    </div>
    <section className={`di-scene-dock ${hasInspection ? 'is-inspecting' : ''} ${!roundRest && (selection || focus) ? 'has-action' : ''} ${roundRest && !hasInspection ? 'is-round-rest' : ''}`} aria-label="Your move" data-phase={room.phase} data-holding={holding}>
      {roundRest && !hasInspection ? <div className="di-round-rest-bar"><div><strong>{pending ? 'Checking your move…' : room.phase === 'reveal' ? playback.settled ? 'Round complete' : 'Your round is unfolding' : room.status === 'completed' ? 'Your story is complete' : 'Waiting for the party'}</strong><small>{room.status === 'completed' ? 'Your keepsakes are ready.' : `${room.phase === 'reveal' ? 'Next round in' : 'Resolves within'} ${seconds}s`}</small></div><div className="di-rest-actions">{pending ? <button disabled={loading} onClick={() => void commitAction(pending.action)}>Retry same move</button> : !roundOpen && canSkipReveal && <button disabled={skipVoted || skippingReveal} onClick={skipRound}>{skipVoted ? 'Ready' : chapterComplete ? 'Next chapter' : 'Next round'}</button>}<button onClick={() => { setStoryMode('collapsed'); setManualRound(roundKey); }}>Open round scroll</button></div>{pending && error && <p role="alert">{error}</p>}<span className="di-turn-consequence">{ownResult ? stageCaption(ownResult) : pending ? "Your token and release are saved." : ""}</span><span className="di-hero-play-hint">Tap your hero for a little dance.</span><span className="di-party-readiness">{revealVoters.filter(member => room.commits[member.actorId] || room.phase === 'reveal').length}/{revealVoters.length} moves ready</span>{committed && !pending && room.phase === 'choosing' && room.status === 'active' && <TableReactions room={room} tabletop/>}</div> : <>
      <div className="di-dock-choices">
      <CombinationNotice room={room} userId={userId} />
      <div className="di-player-guidance" data-state={guidance.state}>
        <div className="di-guidance-heading"><div className="di-guidance-copy"><strong role="status">{guidance.title}</strong><p>{guidance.state === 'armed' ? hint : branchOpen && guidance.state === 'target' ? scene.branch!.prompt : guidance.detail}</p></div><div className="di-guidance-controls">
          <button aria-label="Action details and help" disabled={!!drag} onClick={() => setDrawer('details')}><Info size={20} /></button>
        </div></div>
        {coachVisible && <div className="di-first-move-guide"><ol aria-label="Your move, step by step">{[['target', 'Explore'], ['move', 'Choose'], ['commit', 'Release'], ['results', 'Results']].map(([step, label], index) => <li key={step} aria-current={guidance.activeStep === step ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol><button aria-label="Dismiss first-move guide" onClick={() => setGuide({ enabled: false })}><X size={16} /></button></div>}
      </div>
      {inspected && <div className="di-inspection-context"><div><strong>{inspected.name}</strong><p>{inspected.context ?? inspected.description}</p></div><button aria-label="Close inspection" onClick={() => dismissInspection(true)}><X size={18}/></button></div>}
      {inspectedHero && <div className="di-inspection-context"><div><strong>{inspectedHero.character.name}</strong><p>{intent?.targetActorId === inspectedHero.actorId ? `Faces ${intent.baseDamage} damage this round. Protect them or tend their wounds.` : `${inspectedHero.hp} / ${inspectedHero.character.maxHp} HP. Help them recover.`}</p></div><button aria-label="Close inspection" onClick={() => dismissInspection(true)}><X size={18}/></button></div>}
      {inspectedHero ? <div className="di-context-moves" role="group" aria-label="Moves for this hero">
        {intent?.targetActorId === inspectedHero.actorId && <button disabled={locked} onClick={() => choose('assist', inspectedHero.actorId, 'hero')}><TokenArtwork token="assist"/><span><strong>Protect {inspectedHero.character.name}</strong><small>Help · block 2, or 3 with good timing</small></span></button>}
        {room.mechanicsVersion === 1 && !inspectedHero.leaving && inspectedHero.hp < inspectedHero.character.maxHp && <button disabled={locked} onClick={() => choose('assist', inspectedHero.actorId, 'hero', 'mend')}><TokenArtwork token="assist"/><span><strong>Mend {inspectedHero.character.name}</strong><small>Help · heal 2, or 3 with good timing</small></span></button>}
      </div> : inspected ? <div className="di-context-moves" role="group" aria-label="Moves for this target">{TOKENS.filter(item => inspected.tokens.includes(item.kind)).map(item => <button key={item.kind} aria-label={`${item.label}: ${inspected.actionCues?.[item.kind] ?? inspected.name}`} disabled={locked || !canPlace(item.kind, inspected.id)} onClick={() => choose(item.kind, inspected.id)}><TokenArtwork token={item.kind}/><span><strong>{inspected.actionCues?.[item.kind] ?? item.label}</strong><small>{item.label}</small></span></button>)}<button className="di-context-spotlight" disabled={locked || spent || downed} onClick={openSpotlight}><TabletopArtwork kind="spotlight"/><span>Spotlight</span></button></div> : focus && focusAction ? <FocusedActionChoices room={room} action={focusAction} locked={locked} backLocked={holding || !!drag} onBack={backToScene} onChange={action => { if (!locked) { setSelection(action); playTableSound('pick'); } }} /> : !selection ? <div id="adventure-token-hand" className="di-scene-hand" role="group" aria-label="Action tokens">
        {TOKENS.map(item => <button key={item.kind} data-token={item.kind} className={`${armedToken && token === item.kind ? 'is-chosen' : ''} ${drag?.kind === item.kind ? 'is-lifted' : ''}`} aria-label={`${item.label} token`} aria-pressed={armedToken && token === item.kind} disabled={locked || (downed && item.kind !== 'assist')}
          onPointerDown={event => startDrag(event, item.kind)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={() => { gesture.current = null; setDrag(null); setArmedToken(false); suppressClick.current = true; }} onLostPointerCapture={() => { if (gesture.current) { gesture.current = null; setDrag(null); setArmedToken(false); suppressClick.current = true; } }}
          onClick={event => { const suppress = suppressClick.current; suppressClick.current = false; if (suppress && event.detail > 0) return; setToken(item.kind); setArmedToken(true); setSelection(null); clearProposal(); playTableSound('pick'); setHint(item.kind === 'assist' && victim ? `Place Help on ${victim.character.name} to protect.` : 'Choose a highlighted object.'); }}>
          <TokenArtwork token={item.kind} /><span>{item.label}<small>{handEffects[item.kind]}</small></span>
        </button>)}
        <button className="di-scene-spark" disabled={locked || spent || downed} onClick={openSpotlight} aria-label="Spotlight idea"><TabletopArtwork kind="spotlight" /><span>Spotlight</span></button>
      </div> : null}
      {focusAction && !hasInspection && !committed && <div className="di-scene-selection" aria-live="polite"><TabletopArtwork kind="dice" /><div><strong>{compactLabel}</strong><span>{pending ? 'Retry keeps this exact move and release.' : focusedOption ? `${focusedOption.label} · ${focusAction?.targetKind === 'hero' ? '' : 'On success: '}${approachDetail(room, focusedOption)}` : compactEffect}{!pending && support?.total ? ` · ${supportText(support)}` : ''}</span></div>{selection && <button className="di-selection-help" aria-label="Action details and help" onClick={() => setDrawer('details')}><Info size={18}/></button>}{!focus && selection && <button className="di-change-move" disabled={locked} onClick={() => inspect(selection.targetId)}>Change move</button>}</div>}
      {selection && comboReady && combo && combo.payoffs.some(payoff => payoff.token === selection.token && payoff.targetId === selection.targetId && selection.targetKind !== 'hero') && <div className="di-combo-choices" role="group" aria-label="Scene combination"><button disabled={locked} aria-pressed={!selection.combination} onClick={() => setSelection({ ...selection, combination: undefined })}>Ordinary move</button>{combo.payoffs.filter(payoff => payoff.token === selection.token && payoff.targetId === selection.targetId).map(payoff => <button key={payoff.id} disabled={locked} aria-pressed={chosenCombo?.id === payoff.id} onClick={() => setSelection({ ...selection, combination: { id: combo.id, payoffId: payoff.id } })}><strong>✧ {payoff.label}</strong><small>{combinationPreview(room, payoff, selection, userId).replace('On success: up to ', 'Success: ≤').replace('extra objective progress', 'progress').replace('On success: ease danger by up to ', 'Success: danger −≤').replace('On success: ', 'Success: ')} · one try</small></button>)}</div>}
      </div>
      {selection && !roundRest && <TimedRelease key={room.turn} turn={room.turn} deadline={room.deadline} disabled={!canAct || loading || drawer !== null} onCommit={commit} onHoldingChange={setHolding} />}
      </>}
    </section>
    <nav className="di-scene-tools" aria-label="Adventure tools">
      {lastRound && <button className="di-last-round" aria-label="Last round" onClick={() => setDrawer('round')} disabled={holding || !!drag}><TabletopArtwork kind="journal" /><span>Last round</span></button>}
      <button onClick={() => setDrawer('party')}><Users size={18} /><span>Party</span></button>
      <button onClick={() => setDrawer('chat')}><MessageCircle size={18} /><span>Chat</span>{messages.length > seenMessages && <i>{messages.length - seenMessages}</i>}</button>
      <button onClick={() => setDrawer('invite')}><Copy size={18} /><span>Invite</span></button>
      <button aria-label={sound ? 'Mute table sounds' : 'Enable table sounds'} onClick={() => { setSound(!sound); setTableSound(!sound); }}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}<span>Sound</span></button>
    </nav>
    {drag && <HeldToken token={drag.kind} x={drag.x} y={drag.y} tilt={drag.tilt} label={dragLabel} quiet={quietEffects || reducedMotion} />}
    {returning && <motion.div className="di-scene-drag di-returning-token" style={{ left: 0, top: 0 }} initial={{ x: returning.x - 26, y: returning.y - 26, scale: 1.1 }} animate={{ x: returning.toX - 26, y: returning.toY - 26, scale: .6, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} onAnimationComplete={() => setReturning(null)}><TokenArtwork token={returning.kind} /></motion.div>}
    {drawer && drawer !== 'round' && <SceneDrawer title={{ party: 'Your party', chat: 'Table chat', invite: 'Invite a friend', details: 'Your action', spotlight: 'A Spotlight idea', choice: 'Choose your route', round: 'Last round' }[drawer]} onClose={() => { if (drawer === 'choice') setSelection(null); closeDrawer(); }}>
      {drawer === 'choice' && scene.branch && <><h3>{branchOption?.label}</h3><p>{branchOption?.consequence}</p><p>Everyone chooses this turn. Most Help votes wins; timing and die results do not change your vote. Other actions contribute without voting.</p><p>{scene.branch.fallbackText}</p><button className="di-scene-primary" disabled={!canAct || !branchOption} onClick={() => setDrawer(null)}>Ready this route</button></>}
      {drawer === 'party' && <>{room.seats.map(member => <article className="di-scene-party-detail" key={member.id}><HeroAvatar hero={member.character} /><div><h3>{member.character.name}{member.actorId === userId ? ' · you' : ''}</h3><p>{member.kind === 'companion' ? 'Rules-based companion' : CHARACTER_CLASS_PRESETS[member.character.classKey].label} · {member.hp}/{member.character.maxHp} HP</p><p>{member.hp === 0 ? 'Downed · Help is still available' : member.leaving ? 'Leaving at the boundary' : room.commits[member.actorId] ? 'Move committed' : 'Choosing a move'}</p></div></article>)}<TableReactions room={room} /></>}
      {drawer === 'chat' && chat}
      {drawer === 'invite' && <><p>{room.visibility === 'private' ? 'This is a private friend table. New players need the full invitation.' : 'Friends can join your table through this link.'}</p><input aria-label="Full invitation link" value={invitationUrl(room, window.location.origin)} readOnly onFocus={event => event.target.select()} /><button className="di-scene-primary" onClick={() => void share()}>{copied ? 'Copied!' : 'Copy invitation'}</button></>}
      {drawer === 'details' && <>
        {guide.enabled && <section><h3>Your first move</h3><p>Pick up a token, aim at a highlighted target, then hold and release the die. Watch your hero act and the scene change. Inspect a target whenever you want its story.</p><button onClick={() => setGuide({ enabled: false })}>Dismiss first-move guide</button></section>}
        <h3>Effects</h3><label><input type="checkbox" checked={quietEffects} onChange={event => { setQuietEffects(event.target.checked); try { localStorage.setItem('dropinn-effects', event.target.checked ? 'off' : 'on'); } catch {} }} /> Reduce effects</label><label><input type="checkbox" checked={noShake} onChange={event => { setNoShake(event.target.checked); try { localStorage.setItem('dropinn-shake', event.target.checked ? 'off' : 'on'); } catch {} }} /> Disable impact shake</label>
        <h3>Your shared goal</h3><p>{scene.objective} Build shared progress to finish this chapter. The chapter also ends after ten rounds, with an outcome shaped by the party’s progress.</p>
        <p>Danger makes enemy attacks stronger in combat. Protecting or healing helps your party survive, but adds no chapter progress.</p>
        <h3>{compactLabel}</h3><p>{focusedOption ? `${focusedOption.label}. ${focusAction?.targetKind === 'hero' ? 'Guaranteed: ' : 'On success: '}${approachDetail(room, focusedOption)}.` : protect ? 'Protect the threatened hero for 2 damage, or 3 with a great release. The strongest protection wins; it does not stack. No objective progress.' : description?.description ?? 'Tap something in the scene, choose how to help, then hold and release the die to commit. Choosing a move does not send it. Drag or tap a token to aim. Once prepared, tap your hero to play without changing your move.'}</p>
        {target && <p>{target.description}</p>}
        {focusAction && isDuel(room, focusAction) ? <p>Your d20 + {focusModifier} must beat the enemy’s d20 + {room.enemyIntent?.duelModifier}. Ties favor the enemy. All attackers face the same enemy roll. Good timing adds +1 to your total. On a loss, you make some progress but danger rises; the announced attack still resolves against its original victim.</p> : description && <p>Roll + {self?.character.traits[description.trait]} {description.trait}{support?.total ? ` + ${supportText(support)}` : ''}. Total {description.dc}+ succeeds on a d20. With current support: {successChance(0)}% success, or {successChance(1)}% with a good or assisted release.</p>}
        <h3>Release to commit</h3><p>Hold the die and release in the bright zone for +1. An early or late release keeps your normal move. Roll now skips timing. Assisted release earns the same maximum bonus.</p>
        <h3>Help each other</h3><p>Different tokens committed on the same scene object give both players +1. Help can Protect the threatened hero{room.mechanicsVersion === 1 ? ' or Mend a wounded hero' : ''}. Downed heroes can still Help. Insight and opening expire after the following turn; repeated setup takes the strongest bonus rather than stacking.</p>
        <p>Everyone chooses at the same time. The round resolves when everyone commits, or after 60 seconds. The results stay in Story. Leave whenever you need.</p>
        <button className="di-scene-primary" onClick={() => { setGuide({ enabled: true, afterResult: ownResult?.id }); setDrawer(null); }}>Replay first-move guide</button>
      </>}
      {drawer === 'spotlight' && <div className="di-scene-spotlight"><p>Borrow a spark, or use something in the scene. Previewing never spends your token.</p>{spotlightSuggestions(room).map(suggestion => <button key={suggestion.label} disabled={proposing || !canAct} onClick={() => { setIdea(suggestion.idea); setSpotlightTarget(suggestion.targetId); clearProposal(); void propose(suggestion.idea, suggestion.targetId); }}><Sparkles size={17} /><span>{suggestion.label}</span></button>)}<label htmlFor="stage-idea">Your idea</label><textarea id="stage-idea" maxLength={280} value={idea} rows={3} placeholder={spotlightExample(room)} onChange={event => { setIdea(event.target.value); clearProposal(); }} /><label htmlFor="stage-idea-target">Use something in the scene</label><select id="stage-idea-target" value={spotlightTarget} onChange={event => { setSpotlightTarget(event.target.value); clearProposal(); }}>{scene.targets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="di-scene-primary" disabled={!idea.trim() || proposing || !canAct} onClick={() => void propose(idea.trim(), spotlightTarget)}>{proposing ? 'Considering…' : 'Preview my idea'}</button>{availableProposal && <div role="status"><h3>{availableProposal.label}</h3><p>{availableProposal.description}</p>{availableProposal.supported ? <button className="di-scene-primary" disabled={!canAct} onClick={chooseSpotlight}>Ready this Spotlight</button> : <p>Your token is safe. Try a normal move or another idea.</p>}</div>}</div>}
    </SceneDrawer>}
    {roundOpen && <RoundScroll key={`${roundKey}:${historicalRound ? 'history' : 'live'}`} room={room} userId={userId} summary={historicalRound ? lastRound : liveSummary} action={pending?.action ?? room.commits[userId]} pending={!!pending} loading={loading} error={error} historical={historicalRound} now={now} seconds={seconds} bypass={revealBypassed} reducedMotion={reducedMotion} canVote={canSkipReveal} skipped={skipVoted} skipping={skippingReveal} onClose={closeRound} onShowAll={() => { if (lastRound) setLocalSkipId(lastRound.id); }} onNext={skipRound} onRetry={() => { if (pending) void commitAction(pending.action); }} onCollect={() => void leaveRoom()} narratorHost={setNarratorHost} />}
    {contact.feedback}
  </main>;
}
