import { CHARACTER_CLASS_PRESETS, heroAccent } from '../character';
import { normalizeHero } from '../cosmetics';
import { createExpedition, expeditionActionPreview, isExpedition } from './expedition';
import { advanceExpeditionBoundary, advanceExpeditionChapter, expeditionChapterOutcome, resolveExpeditionRound, validateExpeditionAction } from './expeditionEngine';
import { createJourney, isJourney, journeyActionPreview, journeyScene } from './journey';
import { isStoryTable } from './storyTable';
import { acceptJourneyVote, beginJourneyTravel, journeyChapterOutcome, journeyVotesReady, resolveJourneyRound, resolveJourneyTravel, TRAVEL_MS, validateJourneyAction, validateJourneyState } from './journeyEngine';
import { chapterCredits } from './collection';
import type { CharacterClassKey, CharacterProfile, TraitSet } from '../character';
import { adventureFor, chaptersFor, currentAdventure } from './registry';
import { combinationAvailable, combinationDefinition, combinationState, selectedPayoff } from './combinations';
import { rollSupport, supportText } from './teamwork';
import { getScene, developScene } from './scene';
import { approachOption, turnInsight } from './approaches';
import { isRiverSuppliesChapter, riverActionPreview, riverMove, riverSupplyState, RIVER_SUPPLY_DEADLINE } from './river';
import type { RiverMove, RiverSupplyStatus } from './river';
import { aggregateChoice, attributeChoice, choiceActionPreview, choiceChange, choiceCreditText, choiceDefinition, choiceGuaranteed, choiceMove, choiceMoveEffects, choiceState, choiceStatus, closeChoice } from './chapterChoices';
import type { ChoiceAttempt, ChoiceMove } from './chapterChoices';
import type { ActionDescription, AdventureCommand, AdventureRoom, ChapterChoiceDefinition, ChapterChoiceState, ChoiceCredit, CreativeEffect, CreativeProposal, Participant, PlayerAction, RoomSummary, Seat, StoryEvent, TokenKind, VisitRecap } from './types';

const ROUND_MS = 60_000;
const REVEAL_MS = 10_000;
const MAX_ROUNDS = 10;
export const RELEASE_DURATION_MS = 1200;
export const RELEASE_SWEET_START_MS = 650;
export const RELEASE_SWEET_END_MS = 950;
export const releaseBonus = (releaseMs?: number): 0 | 1 => Number.isInteger(releaseMs)
  && releaseMs! >= RELEASE_SWEET_START_MS && releaseMs! <= RELEASE_SWEET_END_MS ? 1 : 0;
const CLASS_TRAIT: Record<CharacterClassKey, keyof TraitSet> = { wizard: 'INT', fighter: 'ATH', rogue: 'ING', cleric: 'CHA' };
const COMPANIONS: Array<[string, CharacterClassKey]> = [['Bran', 'fighter'], ['Pip', 'rogue'], ['Lumen', 'cleric'], ['Vesper', 'wizard']];
const hash = (value: string) => { let n = 2166136261; for (const c of value) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; };
const chapterOf = (room: AdventureRoom) => getScene(room);
const humans = (room: AdventureRoom) => room.seats.filter(s => s.kind === 'human' && !s.leaving);
const progressShare = (room: AdventureRoom) => 1 / Math.max(1, room.seats.filter(s => s.kind === 'human').length);
const pointsLabel = (points: number) => Number(points.toFixed(2)).toString();
const hasFlag = (room: AdventureRoom, flag: string) => room.flags.includes(flag);
const flag = (room: AdventureRoom, value: string) => { if (!hasFlag(room, value)) room.flags.push(value); };
const event = (room: AdventureRoom, now: number, data: Omit<StoryEvent, 'id' | 'turn' | 'chapter' | 'at'>) => {
  room.events.push({ id: `${room.id}:${room.events.length}`, turn: room.turn, chapter: room.chapter, at: now, ...data });
};

function normalizedCharacter(character: CharacterProfile): CharacterProfile {
  const preset = CHARACTER_CLASS_PRESETS[character.classKey];
  if (!preset || !character.id || !character.name?.trim()) throw new Error('Choose a hero before joining.');
  return normalizeHero({ ...character, name: character.name.trim().slice(0, 18), traits: { ...preset.traits }, hp: preset.hp, maxHp: preset.hp, accent: heroAccent(character.accent, character.classKey, character.cosmeticUnlocks?.items), spotlightTokens: 1, inventory: [...character.inventory] });
}

function companion(index: number, usedClasses: Set<CharacterClassKey>): Seat {
  const [name, classKey] = COMPANIONS.find(([, key]) => !usedClasses.has(key)) ?? COMPANIONS[index % COMPANIONS.length];
  usedClasses.add(classKey);
  const preset = CHARACTER_CLASS_PRESETS[classKey];
  return { id: `seat-${index}`, actorId: `companion-${index}`, kind: 'companion', hp: preset.hp, missedTurns: 0, leaving: false,
    character: { id: `companion-${index}`, name, classKey, level: 1, xp: 0, hp: preset.hp, maxHp: preset.hp, traits: { ...preset.traits }, spotlightTokens: 0, inventory: [], accent: preset.accent } };
}

function fillCompanions(room: AdventureRoom) {
  const occupied = new Set(room.seats.map(s => s.id));
  const classes = new Set(room.seats.map(s => s.character.classKey));
  for (let i = 0; i < 4; i++) if (!occupied.has(`seat-${i}`)) room.seats.push(companion(i, classes));
  room.seats.sort((a, b) => a.id.localeCompare(b.id));
}

function announceEnemyIntent(room: AdventureRoom) {
  delete room.enemyIntent;
  if (!chapterOf(room).combat) return;
  const available = room.seats.filter(seat => seat.hp > 0 && !seat.leaving);
  const uprightHumans = available.filter(seat => seat.kind === 'human');
  const targets = uprightHumans.length ? uprightHumans : available;
  const target = targets[hash(`${room.id}:${room.turn}:threat`) % targets.length];
  if (target) room.enemyIntent = { turn: room.turn, sourceId: chapterOf(room).enemySource ?? (room.chapter === 1 ? 'pack' : 'gloamfang'),
    targetActorId: target.actorId, baseDamage: 3 + Math.floor(room.danger / 4) + (isStoryTable(room) && room.expedition?.routeId === 'road' ? 1 : 0),
    ...(room.mechanicsVersion === 1 ? { duelModifier: 2 + room.chapter + Math.floor(room.danger / 6) } : {}) };
}

function seatPlayer(room: AdventureRoom, player: Participant, now: number) {
  const available = room.seats.find(s => s.kind === 'companion');
  const id = available?.id ?? `seat-${room.seats.length}`;
  if (available) room.seats = room.seats.filter(s => s.id !== id);
  if (room.seats.length >= 4) throw new Error('This table is full. Try another adventure.');
  player.seatId = id;
  player.leftAt = null;
  room.seats.push({ id, actorId: player.userId, kind: 'human', character: player.character, hp: player.character.hp, missedTurns: 0, leaving: false });
  room.seats.sort((a, b) => a.id.localeCompare(b.id));
  event(room, now, { kind: 'arrival', actorId: player.userId, actorName: player.character.name, text: `${player.character.name} joins the adventure. ${chapterOf(room).objective}` });
}

function releasePlayer(room: AdventureRoom, seat: Seat, now: number, inactive = false) {
  const player = room.players[seat.actorId];
  if (player) { player.character.hp = seat.hp; player.seatId = null; player.leftAt = now; }
  room.seats = room.seats.filter(s => s.id !== seat.id);
  event(room, now, { kind: 'departure', actorId: seat.actorId, actorName: seat.character.name, text: inactive ? `${seat.character.name} steps away after two missed turns. Their progress is saved.` : `${seat.character.name} heads out. Their contribution stays with the party.` });
}

export function createAdventure(character: CharacterProfile, userId: string, now: number, code?: string, adventureId?: string, adventureVersion?: number): AdventureRoom {
  const adventure = adventureVersion === undefined ? currentAdventure(adventureId) : adventureFor({ adventureId, adventureVersion });
  const hero = normalizedCharacter(character);
  const roomCode = (code ?? Math.random().toString(36).slice(2, 8)).toUpperCase();
  const room: AdventureRoom = { version: 2, adventureId: adventure.id, adventureVersion: adventure.version, id: globalThis.crypto?.randomUUID?.() ?? `room-${roomCode}-${now}`, code: roomCode, revision: 0, title: adventure.title,
    mechanicsVersion: 1, collectionVersion: 1, status: 'active', phase: 'choosing', chapter: 0, chapterRound: 1, turn: 1, deadline: now + ROUND_MS, revealUntil: null,
    createdAt: now, updatedAt: now, progress: 0, danger: 0, flags: [], seats: [], players: {}, pendingJoins: [], commits: {}, events: [], outcomes: [], appliedCommands: [] };
  if (isExpedition(room)) room.expedition = createExpedition(room.id);
  if (isJourney(room)) room.expedition = createJourney(room.id, room.adventureVersion);
  room.players[userId] = { userId, character: hero, seatId: null, joinedAt: now, leftAt: null, actions: 0, xp: 0, keepsakes: [], spotlightChapters: [], highlights: [] };
  seatPlayer(room, room.players[userId], now);
  fillCompanions(room);
  event(room, now, { kind: 'chapter', text: adventure.chapters[0].intro });
  return room;
}

export function describeAction(classKey: CharacterClassKey, token: TokenKind, targetId: string, room: AdventureRoom): ActionDescription {
  if (isExpedition(room) || isJourney(room)) {
    const player = room.seats.find(seat => seat.character.classKey === classKey);
    const preview = (isJourney(room) ? journeyActionPreview : expeditionActionPreview)(room, player?.actorId ?? '', { token, targetId });
    return { label: preview.label, description: preview.description, trait: CLASS_TRAIT[classKey], dc: 10 + room.chapter };
  }
  const target = chapterOf(room).targets.find(t => t.id === targetId);
  const name = target?.name ?? 'the scene';
  const dc = 10 + room.chapter + (room.danger >= 6 ? 1 : 0);
  const points = (value: number) => pointsLabel(value * progressShare(room));
  const chapterChoice = choiceActionPreview(room, { token, targetId });
  if (chapterChoice) return { label: chapterChoice.label, description: chapterChoice.detail,
    trait: token === 'investigate' ? classKey === 'rogue' ? 'ING' : 'INT' : token === 'influence' ? classKey === 'rogue' ? 'ING' : 'CHA' : CLASS_TRAIT[classKey], dc };
  const riverPreview = riverActionPreview(room, { token, targetId });
  if (riverPreview) return { label: riverPreview.label, description: riverPreview.detail,
    trait: token === 'investigate' ? classKey === 'rogue' ? 'ING' : 'INT' : CLASS_TRAIT[classKey], dc };
  if (token === 'fight') {
    const verb = chapterOf(room).combat ? { wizard: 'Cast a spell', fighter: 'Strike', rogue: 'Exploit an opening', cleric: 'Channel radiance' }[classKey] : { wizard: 'Move it with magic', fighter: 'Lift the timbers', rogue: 'Cut it loose', cleric: 'Clear a safe path' }[classKey];
    return { label: verb, description: `${verb} at ${name}. On success, gain ${points(3)} objective progress${chapterOf(room).combat ? ' and block 2 damage from the next threat' : ' and clear the obstruction'}.`, trait: CLASS_TRAIT[classKey], dc };
  }
  if (token === 'influence') return { label: 'Make a connection', description: `Reassure, distract, or appeal to ${name}. On success, gain ${points(3)} progress and reduce danger.`, trait: classKey === 'rogue' ? 'ING' : 'CHA', dc };
  if (token === 'investigate') return { label: 'Find a way forward', description: `Study ${name}. On success, gain ${points(4)} progress and reveal an advantage for the next round.`, trait: classKey === 'rogue' ? 'ING' : 'INT', dc };
  if (token === 'spotlight') return { label: 'Try your own idea', description: 'Describe an interaction with this scene. Review its effect before spending your one Spotlight token this chapter.', trait: CLASS_TRAIT[classKey], dc };
  const ability = {
    fighter: ['Protect the party', `Shield an ally near ${name}. On success, gain ${points(2)} progress and block 2 damage this round.`],
    rogue: ['Set up an opening', `Distract the danger near ${name}. On success, gain ${points(2)} progress and give the next round an opening.`],
    wizard: ['Read the magic', `Uncover what binds ${name}. On success, gain ${points(3)} progress and reveal an advantage for the next round.`],
    cleric: ['Mend and restore', `Support the party at ${name}. On success, gain ${points(3)} progress and heal or revive the most wounded ally for 4 HP.`],
  }[classKey];
  return { label: ability[0], description: ability[1], trait: CLASS_TRAIT[classKey], dc: dc - 1 };
}

export function validateProposal(room: AdventureRoom, proposal: CreativeProposal): boolean {
  if (!proposal || proposal.turn !== room.turn || !proposal.supported || !proposal.id || proposal.id.length > 5000) return false;
  const target = chapterOf(room).targets.find(t => t.id === proposal.targetId);
  return !!target?.effects.includes(proposal.effect) && typeof proposal.label === 'string' && proposal.label.length > 0 && proposal.label.length <= 100 &&
    typeof proposal.description === 'string' && proposal.description.length > 0 && proposal.description.length <= 600 &&
    typeof proposal.idea === 'string' && proposal.idea.trim().length > 0 && proposal.idea.length <= 300 && ['authored', 'openai', 'ollama'].includes(proposal.source);
}

export function fallbackProposal(room: AdventureRoom, idea: string, targetId: string): CreativeProposal {
  const target = chapterOf(room).targets.find(t => t.id === targetId) ?? chapterOf(room).targets[0];
  return { id: `fallback-${room.turn}-${hash(idea)}`, turn: room.turn, targetId: target.id, effect: target.effects[0], label: `Try helping with ${target.name}`,
    description: `That idea needs a different approach. Use a highlighted standard action on ${target.name}; your Spotlight token is still available.`, idea: idea.slice(0, 300), supported: false, source: 'authored' };
}

function applyEffect(room: AdventureRoom, effect: CreativeEffect, now: number, strength = 1, share = 1) {
  flag(room, `chapter:${room.chapter}:${effect}`);
  if (effect === 'cover') { flag(room, `cover:${room.turn}`); room.danger = Math.max(0, room.danger - strength * share); }
  if (effect === 'distract') { flag(room, `opening:${room.turn + 1}`); flag(room, `cover:${room.turn}`); room.danger = Math.max(0, room.danger - strength * share); }
  if (effect === 'reveal') { flag(room, `insight:${room.turn + 1}`); room.progress += strength * share; }
  if (effect === 'rescue') {
    room.progress += strength * share;
    const hurt = [...room.seats].sort((a, b) => a.hp / a.character.maxHp - b.hp / b.character.maxHp)[0];
    if (hurt && hurt.hp < hurt.character.maxHp) {
      const healed = Math.min(4, hurt.character.maxHp - hurt.hp); hurt.hp += healed;
      event(room, now, { kind: 'consequence', actorId: hurt.actorId, actorName: hurt.character.name,
        text: `${hurt.character.name} recovers ${healed} HP${hurt.hp === healed ? ' and rejoins the action' : ''}.`,
        result: { targetKind: 'hero', targetId: hurt.actorId, healing: healed, hp: hurt.hp } });
    }
  }
}

function validateAction(room: AdventureRoom, userId: string, action: PlayerAction) {
  const seat = room.seats.find(s => s.actorId === userId && s.kind === 'human' && !s.leaving);
  if (!seat) throw new Error('Your seat will open at the next turn.');
  if (isExpedition(room) || isJourney(room)) {
    if (action.releaseMs !== undefined && (!Number.isInteger(action.releaseMs) || action.releaseMs < 0 || action.releaseMs > RELEASE_DURATION_MS)) throw new Error('Release timing must be a whole number from 0 to 1200 milliseconds.');
    if (action.targetKind !== undefined && action.targetKind !== 'scene' && action.targetKind !== 'hero') throw new Error('Choose a scene target or the threatened hero.');
    (isJourney(room) ? validateJourneyAction : validateExpeditionAction)(room, userId, action);
    if (action.token === 'spotlight') {
      if (room.players[userId].spotlightChapters.includes(room.chapter)) throw new Error('Your Spotlight token returns next chapter.');
      if (!action.proposal || action.proposal.targetId !== action.targetId || !validateProposal(room, action.proposal)) throw new Error('Review a supported idea for this turn before committing.');
    }
    return;
  }
  if (action.expedition !== undefined) throw new Error('This adventure does not use expedition actions.');
  if (choiceMove(room, action) && (action.approach !== undefined || action.combination !== undefined)) throw new Error('This scene choice has its own outcome. Choose it without an approach or combination.');
  const supplyMove = riverMove(room, action);
  if (supplyMove && supplyMove !== 'rescue' && (action.approach !== undefined || action.combination !== undefined)) throw new Error('This supplies move already has its own outcome. Choose it without an approach or combination.');
  if (action.combination !== undefined && (!combinationAvailable(room, userId) || !selectedPayoff(room, action))) throw new Error('Choose an available scene combination.');
  if (action.approach !== undefined && !approachOption(room, action)) throw new Error('Choose an available approach for this action.');
  if (action.targetKind !== undefined && action.targetKind !== 'scene' && action.targetKind !== 'hero') throw new Error('Choose a scene target or the threatened hero.');
  if (action.releaseMs !== undefined && (!Number.isInteger(action.releaseMs) || action.releaseMs < 0 || action.releaseMs > RELEASE_DURATION_MS)) throw new Error('Release timing must be a whole number from 0 to 1200 milliseconds.');
  if (action.targetKind === 'hero') {
    if (action.approach === 'mend' && action.token === 'assist') {
      const ally = room.seats.find(target => target.actorId === action.targetId);
      if (!ally || ally.leaving || ally.hp >= ally.character.maxHp) throw new Error('Choose a wounded hero at the table to Mend.');
      return;
    }
    if (action.token !== 'assist' || !chapterOf(room).combat || room.enemyIntent?.turn !== room.turn
      || room.enemyIntent.targetActorId !== action.targetId || !room.seats.some(target => target.actorId === action.targetId)) {
      throw new Error('Place Help on the hero threatened this turn to Protect.');
    }
    return;
  }
  const target = chapterOf(room).targets.find(t => t.id === action.targetId);
  if (!target) throw new Error('Choose a target in the current scene.');
  if (seat.hp <= 0 && action.token !== 'assist') throw new Error('While downed, use Help to keep helping your party.');
  if (action.token === 'spotlight') {
    if (room.players[userId].spotlightChapters.includes(room.chapter)) throw new Error('Your Spotlight token returns next chapter.');
    if (!action.proposal || action.proposal.targetId !== action.targetId || !validateProposal(room, action.proposal)) throw new Error('Review a supported idea for this turn before committing.');
  } else if (!target.tokens.includes(action.token)) throw new Error('That action is not available on this target.');
}

function resolveChoiceHuman(room: AdventureRoom, frozen: AdventureRoom, seat: Seat, action: PlayerAction, move: ChoiceMove, now: number, frozenBonus: number, startingDanger: number, share: number): ChoiceAttempt {
  const guaranteed = choiceGuaranteed(move);
  const description = describeAction(seat.character.classKey, action.token, action.targetId, { ...frozen, danger: startingDanger });
  const executionBonus = guaranteed ? 0 : releaseBonus(action.releaseMs);
  const roll = guaranteed ? undefined : 1 + hash(`${room.id}:${room.turn}:${seat.actorId}:${action.token}:${action.targetId}`) % 20;
  const support = rollSupport(frozen, seat.actorId, action);
  const modifier = guaranteed ? undefined : seat.character.traits[description.trait] + frozenBonus + support.teamwork + executionBonus;
  const success = guaranteed || roll! + modifier! >= description.dc;
  const effects = choiceMoveEffects(move, success, choiceState(frozen)!, chaptersFor(frozen)[frozen.chapter].combat);
  const progress = Math.max(0, Math.min(effects.progress * share, chaptersFor(room)[room.chapter].progressGoal - room.progress));
  const previousDanger = room.danger;
  room.progress += progress; room.danger = Math.max(0, room.danger + effects.danger * share);
  const danger = room.danger - previousDanger;
  if (effects.cover) flag(room, `cover:${room.turn}`);
  // This authored payoff actually repairs the ward; record that fact without
  // granting unrelated development to other signature resource interactions.
  const change = success && choiceDefinition(frozen)?.id === 'briar-bell-rhythm' && (move === 'spend-safe' || move === 'spend-risk')
    ? developScene(room, action) : undefined;
  const text = `${seat.character.name} ${guaranteed ? 'helps' : success ? 'succeeds' : 'finds a complication'}: ${description.label.toLowerCase()}.`;
  const effect = `${guaranteed ? 'Guaranteed. ' : ''}+${pointsLabel(progress)} progress.${danger ? ` ${danger > 0 ? '+' : '−'}${pointsLabel(Math.abs(danger))} danger.` : ''}${effects.cover ? ' 2 party cover; strongest cover wins.' : ''} The party’s scene choice resolves together.${!guaranteed && support.total ? ` Roll support: ${supportText(support)}.` : ''}`;
  event(room, now, { kind: 'action', actorId: seat.actorId, actorName: seat.character.name, text, effect, success, contribution: true,
    ...(roll === undefined ? {} : { roll, modifier }), result: { targetKind: 'scene', targetId: action.targetId, token: action.token, executionBonus,
      progress: Number(progress.toFixed(2)), danger: Number(danger.toFixed(2)), protection: effects.cover, changed: !!change }, ...(change ? { change } : {}) });
  const player = room.players[seat.actorId]; player.actions++; player.xp += guaranteed || !success ? 3 : 5;
  player.highlights = [...player.highlights, `${text} ${effect}${change ? ` ${change.text}` : ''}`].slice(-8); seat.missedTurns = 0;
  return { move, success, contributor: { actorId: seat.actorId, actorName: seat.character.name, eventId: room.events[room.events.length - 1].id } };
}

function recordChoiceState(room: AdventureRoom, definition: ChapterChoiceDefinition, state: ChapterChoiceState, now: number, closing = false, credit?: ChoiceCredit) {
  const before = choiceState(room)!;
  (room.chapterChoices ??= {})[definition.id] = { ...state };
  if (JSON.stringify(before) === JSON.stringify(state)) return;
  let progress = 0, danger = 0;
  if (definition.mode === 'rescue' && before.phase !== 'settled' && state.phase === 'settled' && room.chapter === chaptersFor(room).length - 1) {
    progress = Math.min(state.outcome === 'full' ? 2 : state.outcome === 'partial' ? 1 : 0, Math.max(0, chaptersFor(room)[room.chapter].progressGoal - room.progress));
    danger = state.outcome === 'lost' ? 1 : 0;
    room.progress += progress; room.danger += danger;
  }
  const change = choiceChange(definition, before, state, closing);
  if (credit) change.text += ` ${choiceCreditText(credit)}`;
  if (definition.mode === 'rescue' && state.phase === 'settled') {
    const destination = room.chapter === chaptersFor(room).length - 1 ? 'this finale' : 'the next chapter';
    change.text += state.outcome === 'lost' ? ` +1 danger for ${destination}.` : ` +${state.outcome === 'full' ? 2 : 1} progress for ${destination}.`;
  }
  event(room, now, { kind: 'consequence', text: change.text, change, result: { targetKind: 'scene', targetId: choiceStatus(room)?.targetId ?? definition.primaryId,
    changed: true, chapterChoice: { id: definition.id, state: { ...state }, ...(credit ? { credit } : {}) }, ...(progress ? { progress } : {}), ...(danger ? { danger } : {}) } });
}

function resolveChoices(room: AdventureRoom, frozen: AdventureRoom, attempts: ChoiceAttempt[], now: number) {
  const definition = choiceDefinition(frozen), before = choiceState(frozen);
  if (!definition || !before) return;
  let state = aggregateChoice(definition, before, attempts);
  const closing = room.progress >= chaptersFor(room)[room.chapter].progressGoal || room.chapterRound >= MAX_ROUNDS;
  const expired = definition.mode === 'rescue' && room.chapterRound >= (definition.deadlineRound ?? 3);
  if (closing || expired) state = closeChoice(definition, state);
  const attributed = attributeChoice(definition, before, state, attempts);
  // Do not advertise a recovery/payoff turn between the last action and chapter closure.
  recordChoiceState(room, definition, attributed.state, now, closing || expired && state.outcome === 'lost', attributed.credit);
}

function resolveSupplyMove(room: AdventureRoom, seat: Seat, action: PlayerAction, move: Exclude<RiverMove, 'rescue'>, now: number, frozenBonus: number, startingDanger: number, share: number): RiverSupplyStatus | undefined {
  const guaranteed = move === 'secure' || move === 'salvage';
  const description = describeAction(seat.character.classKey, action.token, action.targetId, { ...room, danger: startingDanger });
  const executionBonus = guaranteed ? 0 : releaseBonus(action.releaseMs);
  const roll = guaranteed ? undefined : 1 + hash(`${room.id}:${room.turn}:${seat.actorId}:${action.token}:${action.targetId}`) % 20;
  const support = rollSupport(room, seat.actorId, action);
  const modifier = guaranteed ? undefined : seat.character.traits[description.trait] + frozenBonus + support.teamwork + executionBonus;
  const success = guaranteed || roll! + modifier! >= description.dc;
  const progress = guaranteed ? 0 : (success ? move === 'rush' ? 4 : 2 : 1) * share;
  const danger = success ? 0 : share;
  room.progress += progress; room.danger += danger;
  const desired: RiverSupplyStatus | undefined = move === 'secure' ? 'secured' : move === 'salvage' ? 'salvaged'
    : success ? 'secured' : move === 'rush' ? 'spilled' : undefined;
  const text = `${seat.character.name} ${guaranteed ? 'helps' : success ? 'succeeds' : 'finds a complication'}: ${description.label.toLowerCase()}.`;
  const effect = guaranteed ? 'Guaranteed supplies contribution. No crossing progress or class support.'
    : `+${pointsLabel(progress)} crossing progress.${danger ? ` +${pointsLabel(danger)} danger.` : ''} ${success ? 'This move can secure all the supplies.' : move === 'rush' ? 'The cargo slips into the reeds unless the party secures it this turn.' : 'The supplies remain in the reeds unless another hero saves them.'}${support.total ? ` Roll support: ${supportText(support)}.` : ''}`;
  event(room, now, { kind: 'action', actorId: seat.actorId, actorName: seat.character.name, text, effect, success, contribution: true,
    ...(roll === undefined ? {} : { roll, modifier }),
    result: { targetKind: 'scene', targetId: action.targetId, token: action.token, executionBonus, progress: Number(progress.toFixed(2)), danger: Number(danger.toFixed(2)), protection: 0, changed: false } });
  const player = room.players[seat.actorId];
  player.actions++; player.xp += guaranteed || !success ? 3 : 5;
  player.highlights = [...player.highlights, `${text} ${effect}`].slice(-8);
  seat.missedTurns = 0;
  return desired;
}

function resolveHuman(room: AdventureRoom, seat: Seat, action: PlayerAction, now: number, frozenBonus: number, startingDanger: number, share: number, supplyState?: RiverSupplyStatus): RiverSupplyStatus | undefined {
  const executionBonus = releaseBonus(action.releaseMs);
  const supplyMove = riverMove(room, action, supplyState);
  if (supplyMove && supplyMove !== 'rescue') return resolveSupplyMove(room, seat, action, supplyMove, now, frozenBonus, startingDanger, share);
  if (action.targetKind === 'hero') {
    const target = room.seats.find(candidate => candidate.actorId === action.targetId)!;
    if (action.approach === 'mend') {
      const healing = Math.min(2 + executionBonus, target.character.maxHp - target.hp);
      target.hp += healing;
      const text = `${seat.character.name} mends ${target.character.name}: +${healing} HP.`;
      event(room, now, { kind: 'action', actorId: seat.actorId, actorName: seat.character.name, text, effect: 'Guaranteed healing. No objective progress.', success: true, contribution: true,
        result: { targetKind: 'hero', targetId: target.actorId, token: 'assist', approach: 'mend', executionBonus, healing, hp: target.hp, progress: 0 } });
      const player = room.players[seat.actorId]; player.actions++; player.xp += 3;
      player.highlights = [...player.highlights, text].slice(-8); seat.missedTurns = 0;
      return;
    }
    const protection = 2 + executionBonus;
    const text = `${seat.character.name} protects ${target.character.name}.`;
    const effect = `Blocks up to ${protection} damage from the announced strike. No objective progress.`;
    flag(room, `protect:${room.turn}:${target.actorId}:${protection}`);
    event(room, now, { kind: 'action', actorId: seat.actorId, actorName: seat.character.name, text, effect, success: true, contribution: true,
      result: { targetKind: 'hero', targetId: target.actorId, token: action.token, executionBonus, progress: 0, danger: 0, protection } });
    const player = room.players[seat.actorId];
    player.actions += 1; player.xp += 3;
    player.highlights = [...player.highlights, `${text} ${effect}`].slice(-8);
    seat.missedTurns = 0;
    return;
  }
  const description = describeAction(seat.character.classKey, action.token, action.targetId, { ...room, danger: startingDanger });
  const roll = 1 + hash(`${room.id}:${room.turn}:${seat.actorId}:${action.token}:${action.targetId}`) % 20;
  const support = rollSupport(room, seat.actorId, action);
  const approach = approachOption(room, action);
  const modifier = seat.character.traits[description.trait] + frozenBonus + support.teamwork + executionBonus + (approach?.modifier ?? 0);
  const enemyRoll = 1 + hash(`${room.id}:${room.turn}:${action.targetId}:duel`) % 20;
  const duel = approach && action.token === 'fight' ? { enemyRoll, enemyModifier: room.enemyIntent!.duelModifier!,
    enemyTotal: enemyRoll + room.enemyIntent!.duelModifier!, playerTotal: roll + modifier } : undefined;
  const success = duel ? duel.playerTotal > duel.enemyTotal : roll + modifier >= description.dc;
  const target = chapterOf(room).targets.find(t => t.id === action.targetId)!;
  const previousProgress = room.progress;
  const previousDanger = room.danger;
  const payoff = selectedPayoff(room, action);
  const prepared = combinationState(room);
  let combination: import('./types').CombinationResult | undefined;
  if (payoff && prepared) {
    combination = { id: prepared.id, kind: 'payoff', label: payoff.label, sourceId: combinationDefinition(room)!.sourceId, actorId: prepared.actorId, actorName: prepared.actorName, payoffId: payoff.id };
  }
  let effect = `The situation moves forward; danger increases by ${pointsLabel(share)}.`;
  if (success) {
    const points = approach?.progress ?? (action.token === 'assist' ? 2 : 3);
    room.progress += points * share;
    effect = '';
    if (action.token === 'fight') {
      if (!approach) { flag(room, `cover:${room.turn}`); effect += chapterOf(room).combat ? ' The threat is interrupted.' : ' The obstruction gives way.'; }
      else if (approach.protection) { flag(room, `cover:${room.turn}:3`); effect += ' Your guarded strike blocks 3 from the announced attack.'; }
    }
    if (action.token === 'influence') {
      if (action.approach === 'distract') { flag(room, `opening:${room.turn + 1}`); effect += ' An opening gives the party +1 next turn.'; }
      else { room.danger = Math.max(0, room.danger - share); effect += ' Danger eases.'; }
    }
    if (action.token === 'investigate') {
      if (action.approach === 'study') { flag(room, `insight:${room.turn + 1}:2`); effect += ' Study gives the party +2 insight next turn.'; }
      else if (action.approach !== 'trail') { applyEffect(room, 'reveal', now, 1, share); effect += ' An insight helps the next round.'; }
    }
    if (action.token === 'assist') {
      const ability: Record<CharacterClassKey, CreativeEffect> = { fighter: 'cover', rogue: 'distract', wizard: 'reveal', cleric: 'rescue' };
      const kind = ability[seat.character.classKey];
      applyEffect(room, kind, now, 1, share); effect += ` ${kind === 'rescue' ? 'The most wounded ally heals or revives' : `${kind[0].toUpperCase()}${kind.slice(1)} helps the party`}.`;
    }
    if (action.token === 'spotlight' && action.proposal) {
      applyEffect(room, action.proposal.effect, now, 2, share);
      effect += ` ${action.proposal.effect === 'cover' ? 'Cover blocks the next attack' : action.proposal.effect === 'distract' ? 'A distraction opens the next round' : action.proposal.effect === 'reveal' ? 'New information advances the objective' : 'Someone is brought to safety'}.`;
    }
    if (room.chapter === 2 && action.targetId === 'gloamfang' && action.token === 'fight') flag(room, 'guardian-confronted');
  } else { room.progress += share; room.danger += share; }
  if (success && payoff && combination) {
    const extraProgress = Math.min((payoff.progress ?? 0) * share, Math.max(0, chapterOf(room).progressGoal - room.progress));
    const reduction = Math.min(room.danger, (payoff.dangerReduction ?? 0) * share);
    room.progress += extraProgress; room.danger -= reduction;
    if (payoff.cover) flag(room, `cover:${room.turn}:3`);
    Object.assign(combination, { progress: Number(extraProgress.toFixed(2)), dangerReduction: Number(reduction.toFixed(2)), cover: payoff.cover ?? 0 });
    effect += ` ${payoff.label}, prepared by ${prepared!.actorName}: ${extraProgress ? `+${pointsLabel(extraProgress)} progress. ` : ''}${reduction ? `Danger −${pointsLabel(reduction)}. ` : ''}${payoff.cover ? '3 party cover; strongest cover wins.' : ''}`;
  }
  const setup = combinationDefinition(room);
  if (success && setup && !prepared && action.targetId === setup.sourceId && setup.setupTokens.includes(action.token)) {
    combination = { id: setup.id, kind: 'setup', label: setup.label, sourceId: setup.sourceId, actorId: seat.actorId, actorName: seat.character.name };
    (room.combinations ??= []).push({ chapter: room.chapter, id: setup.id, actorId: seat.actorId, actorName: seat.character.name,
      setupEventId: `${room.id}:${room.events.length}`, fromTurn: room.turn + 1, throughTurn: room.turn + 2, usedBy: [] });
    effect += ` ${setup.label}: each hero can try one combination during the next two turns.`;
  }
  effect = `${duel ? `Clash: ${roll} + ${modifier} = ${duel.playerTotal} versus enemy ${enemyRoll} + ${duel.enemyModifier} = ${duel.enemyTotal}. ${success ? 'You win.' : 'The enemy holds; ties favor the enemy.'} ` : ''}+${pointsLabel(room.progress - previousProgress)} objective progress. ${effect.trim()}${support.total ? ` Roll support: ${supportText(support)}.` : ''}`;
  const text = action.token === 'spotlight' ? `${seat.character.name} tries: ${action.proposal!.label}. ${success ? 'It works!' : 'It proves difficult, but reveals the next step.'}` : `${seat.character.name} ${success ? 'succeeds' : 'finds a complication'}: ${(approach?.label ?? description.label).toLowerCase()} at ${target.name}.`;
  const change = success ? developScene(room, action) : undefined;
  const offersCover = success && ((action.token === 'fight' && !approach) || (action.token === 'assist' && ['fighter', 'rogue'].includes(seat.character.classKey))
    || (action.token === 'spotlight' && ['cover', 'distract'].includes(action.proposal!.effect)));
  event(room, now, { kind: 'action', actorId: seat.actorId, actorName: seat.character.name, text, roll, modifier, success, effect, contribution: true,
    result: { targetKind: 'scene', targetId: action.targetId, token: action.token, executionBonus,
      ...(action.approach ? { approach: action.approach } : {}), ...(duel ? { duel } : {}),
      ...(success && action.approach === 'study' ? { insight: 2 } : {}), ...(success && action.approach === 'distract' ? { opening: 1 } : {}),
      progress: Number((room.progress - previousProgress).toFixed(2)), danger: Number((room.danger - previousDanger).toFixed(2)),
      protection: Math.max(success && approach?.protection ? approach.protection : offersCover ? 2 : 0, success ? payoff?.cover ?? 0 : 0), changed: !!change, ...(combination ? { combination } : {}) }, ...(change ? { change } : {}) });
  const player = room.players[seat.actorId];
  player.actions += 1; player.xp += success ? 5 : 3;
  if (action.token === 'spotlight') player.spotlightChapters.push(room.chapter);
  player.highlights.push(`${text} ${effect}${change ? ` ${change.text}` : ''}`);
  player.highlights = player.highlights.slice(-8);
  seat.missedTurns = 0;
  return success && supplyMove === 'rescue' ? 'secured' : undefined;
}

function recordSupplyChange(room: AdventureRoom, next: RiverSupplyStatus, now: number) {
  const previous = riverSupplyState(room);
  if (!previous || previous === next) return;
  room.riverSupplies = { status: next };
  const changes = {
    secured: { title: 'All supplies secured', text: 'The party saves all the supplies: +3 starting chapel progress.', next: 'Keep the party moving across the river.' },
    salvaged: { title: 'Some supplies salvaged', text: 'The party saves the nearby supplies: +1 starting chapel progress. The rest is left behind.', next: 'Keep the party moving across the river.' },
    spilled: room.chapterRound >= RIVER_SUPPLY_DEADLINE || room.progress >= chapterOf(room).progressGoal
      ? { title: 'Supplies spill into the reeds', text: 'The supplies spill as the current pulls them beyond reach. No recovery turn remains.', next: 'The unsaved cargo is swept away.' }
      : { title: 'Supplies spill into the reeds', text: 'The current catches the spilled supplies. Next turn, Help the boat to salvage +1 starting chapel progress, or Investigate the reeds to risk recovering +3.', next: 'Recover supplies before river round 3 ends or you finish crossing; otherwise the chapel starts with +2 danger.' },
    lost: { title: 'The supplies drift away', text: 'The unsaved supplies drift beyond reach: +2 starting chapel danger.', next: 'Everyone can still cross, help at the chapel, and earn their chapter rewards.' },
    drifting: { title: 'The supplies are drifting', text: 'The loaded boat drifts against its rope.', next: 'Secure the supplies or risk rushing them across.' },
  };
  const change = changes[next];
  event(room, now, { kind: 'consequence', text: change.text, change,
    result: { targetKind: 'scene', targetId: previous === 'spilled' && next === 'secured' ? 'reeds' : 'boat', changed: true, riverSupplies: { status: next } } });
}

/** Success takes precedence across the whole turn, independent of seat or commit order. */
function resolveSupplies(room: AdventureRoom, changes: RiverSupplyStatus[], now: number) {
  if (!isRiverSuppliesChapter(room)) return;
  room.riverSupplies ??= { status: 'drifting' };
  const next = (['secured', 'salvaged', 'spilled'] as const).find(status => changes.includes(status));
  if (next) recordSupplyChange(room, next, now);
  if ((room.riverSupplies.status === 'drifting' || room.riverSupplies.status === 'spilled')
    && (room.chapterRound >= RIVER_SUPPLY_DEADLINE || room.progress >= chapterOf(room).progressGoal)) recordSupplyChange(room, 'lost', now);
}

function finishChapter(room: AdventureRoom, now: number) {
  const choice = choiceDefinition(room), state = choiceState(room);
  if (choice && state) recordChoiceState(room, choice, closeChoice(choice, state), now, true);
  const definition = chapterOf(room);
  const expeditionOutcome = isJourney(room) ? journeyChapterOutcome(room) : isExpedition(room) ? expeditionChapterOutcome(room) : undefined;
  const result = expeditionOutcome?.result ?? (room.progress >= definition.progressGoal ? 'success' : room.progress >= definition.progressGoal * 0.5 ? 'mixed' : 'setback');
  let text = expeditionOutcome?.text ?? definition.endings[result];
  if (adventureFor(room).id === 'briar-glen' && room.chapter === 2 && result === 'success') text = hasFlag(room, 'ward-repaired') ? 'The repaired ward answers the bell. Gloamfang’s shadow falls away, and the guardian bows as the captives return to Briar Glen.' : 'You drive Gloamfang from the chapel and lead the captives home. The villagers hang a new bell, grateful for the brave strangers who answered it.';
  if (definition.branch && room.storyBranch) text += ` ${adventureFor(room).branchEndings?.[room.storyBranch] ?? ''}`;
  if (isRiverSuppliesChapter(room)) text += room.riverSupplies?.status === 'secured' ? ' You bring all the supplies: +3 starting chapel progress.'
    : room.riverSupplies?.status === 'salvaged' ? ' You bring some salvaged supplies: +1 starting chapel progress.' : ' The lost supplies leave the chapel with +2 starting danger.';
  if (room.chapter === 2 && hasFlag(room, 'mara-helped')) text += ' Mara welcomes you back with the copper bell you helped her save.';
  const choiceOutcome = choiceState(room)?.outcome;
  if (choice && choiceOutcome) text += ` ${choice.endings[choiceOutcome]}`;
  room.outcomes.push({ chapter: room.chapter, result, text, at: now });
  flag(room, `outcome:${room.chapter}:${result}`);
  // Necessary story facts arrive even when a chapter goes badly.
  flag(room, adventureFor(room).id === 'briar-glen' ? room.chapter === 0 ? 'river-lead' : room.chapter === 1 ? 'guardian-truth' : 'village-future' : `story:${definition.id}:complete`);
  const contributors = new Set(room.events.filter(e => e.chapter === room.chapter && e.kind === 'action' && e.actorId && (e.contribution || e.roll !== undefined)).map(e => e.actorId));
  for (const player of Object.values(room.players)) if (contributors.has(player.userId)) {
    player.xp += result === 'success' ? 15 : 10;
    if (!player.keepsakes.includes(definition.keepsake)) player.keepsakes.push(definition.keepsake);
    player.highlights.push(text);
    player.highlights = player.highlights.slice(-8);
  }
  event(room, now, { kind: 'chapter', text });
  if (room.chapter === chaptersFor(room).length - 1) room.status = 'completed';
}

function resolveRound(room: AdventureRoom, now: number) {
  if (room.phase !== 'choosing' || room.status === 'completed') return;
  if (isExpedition(room) || isJourney(room)) {
    if (!room.expedition) throw new Error('This expedition is missing its saved run state.');
    const closes = (isJourney(room) ? resolveJourneyRound : resolveExpeditionRound)(room, now);
    for (const seat of [...room.seats]) if (seat.kind === 'human') {
      room.players[seat.actorId].character.hp = seat.hp;
      if (seat.leaving || seat.missedTurns >= 2) releasePlayer(room, seat, now, !seat.leaving);
    }
    if (closes) finishChapter(room, now);
    room.phase = 'reveal'; room.revealUntil = now + REVEAL_MS; room.revealSkips = []; room.commits = {};
    if (room.outcomes.length < chaptersFor(room).length && !humans(room).length && !room.pendingJoins.length) room.status = 'parked';
    fillCompanions(room);
    return;
  }
  // Freeze before resolving branch votes too: a Help vote must not become a signature move.
  const frozenChoiceRoom: AdventureRoom = { ...room, chapterChoices: room.chapterChoices ? JSON.parse(JSON.stringify(room.chapterChoices)) : undefined };
  const choiceAttempts: ChoiceAttempt[] = [];
  const branch = chapterOf(room).branch;
  if (branch && !room.storyBranch) {
    const votes = branch.options.map(option => ({ option, count: Object.values(room.commits).filter(action => action.token === 'assist' && action.targetKind !== 'hero' && action.targetId === option.targetId).length }));
    const highest = Math.max(0, ...votes.map(vote => vote.count));
    const winners = votes.filter(vote => vote.count === highest && highest > 0);
    room.storyBranch = winners.length === 1 ? winners[0].option.id : branch.fallback;
    event(room, now, { kind: 'consequence', text: winners.length === 1 ? `The party chooses: ${winners[0].option.label}. ${winners[0].option.consequence}` : branch.fallbackText });
  }
  const submitted = Object.keys(room.commits).length;
  const frozenBonus = turnInsight(room) + Number(hasFlag(room, `opening:${room.turn}`));
  const startingDanger = room.danger;
  const share = progressShare(room);
  const supplyState = riverSupplyState(room);
  const supplyChanges: RiverSupplyStatus[] = [];
  for (const seat of room.seats.filter(s => s.kind === 'human')) {
    const action = room.commits[seat.actorId];
    if (action) {
      const move = choiceMove(frozenChoiceRoom, action);
      if (move) choiceAttempts.push(resolveChoiceHuman(room, frozenChoiceRoom, seat, action, move, now, frozenBonus, startingDanger, share));
      else {
        const supplyChange = resolveHuman(room, seat, action, now, frozenBonus, startingDanger, share, supplyState);
        if (supplyChange) supplyChanges.push(supplyChange);
      }
    }
    else if (!seat.leaving) {
      seat.missedTurns += 1;
      event(room, now, { kind: 'action', actorId: seat.actorId, actorName: seat.character.name, text: chapterOf(room).combat ? `${seat.character.name} defends while away. No token is spent.` : `${seat.character.name} sits this round out. No choice is made for them.`, effect: 'No reward or action was claimed.', contribution: false });
      if (chapterOf(room).combat) flag(room, `defending:${room.turn}:${seat.actorId}`);
    }
  }
  // Companions support actual human plans; they never solve unattended story beats.
  if (submitted > 0) {
    const helpers = room.seats.filter(s => s.kind === 'companion');
    if (helpers.length) {
      const helper = helpers[(room.turn - 1) % helpers.length];
      const effects: Record<CharacterClassKey, CreativeEffect> = { fighter: 'cover', rogue: 'distract', cleric: 'rescue', wizard: 'reveal' };
      applyEffect(room, effects[helper.character.classKey], now, 1, 0);
      event(room, now, { kind: 'consequence', actorId: helper.actorId, actorName: helper.character.name, text: `${helper.character.name} (AI companion) supports the party with ${effects[helper.character.classKey]}.`, effect: 'Companions provide protection, openings, insight, or healing; your actions advance the objective.' });
    }
  }
  room.progress = Math.min(chapterOf(room).progressGoal, Math.round(room.progress * 100) / 100);
  room.danger = Math.round(room.danger * 100) / 100;
  resolveChoices(room, frozenChoiceRoom, choiceAttempts, now);
  resolveSupplies(room, supplyChanges, now);
  if (chapterOf(room).combat && room.progress < chapterOf(room).progressGoal && humans(room).length) {
    // Old snapshots finish their current turn under the old targeting rule.
    const intent = room.enemyIntent?.turn === room.turn ? room.enemyIntent : undefined;
    const targets = room.seats.filter(s => s.hp > 0 && !s.leaving);
    const target = intent ? room.seats.find(seat => seat.actorId === intent.targetActorId)
      : targets[hash(`${room.id}:${room.turn}:threat`) % targets.length];
    if (target) {
      const defended = hasFlag(room, `defending:${room.turn}:${target.actorId}`) ? 2 : 0;
      const covered = hasFlag(room, `cover:${room.turn}:3`) ? 3 : hasFlag(room, `cover:${room.turn}`) ? 2 : 0;
      const protectedByHelp = hasFlag(room, `protect:${room.turn}:${target.actorId}:3`) ? 3 : hasFlag(room, `protect:${room.turn}:${target.actorId}:2`) ? 2 : 0;
      const protection = Math.max(covered, protectedByHelp);
      const damage = Math.min(target.hp, Math.max(0, (intent?.baseDamage ?? 3 + Math.floor(room.danger / 4)) - defended - protection));
      target.hp = Math.max(0, target.hp - damage);
      event(room, now, { kind: 'consequence', actorId: target.actorId, actorName: target.character.name, text: damage ? `${chapterOf(room).threat.split('.')[0]}. ${target.character.name} takes ${damage} damage${target.hp === 0 ? ' and can still Help while downed' : ''}.` : `${target.character.name} is protected from the danger by the party’s preparation.`, effect: damage ? `−${damage} HP` : 'Attack blocked',
        result: { targetKind: 'hero', targetId: target.actorId, damage, hp: target.hp, protection: defended + protection } });
    }
  }
  for (const seat of [...room.seats]) if (seat.kind === 'human') {
    room.players[seat.actorId].character.hp = seat.hp;
    if (seat.leaving || seat.missedTurns >= 2) releasePlayer(room, seat, now, !seat.leaving);
  }
  if (room.progress >= chapterOf(room).progressGoal || room.chapterRound >= MAX_ROUNDS) finishChapter(room, now);
  room.phase = 'reveal'; room.revealUntil = now + REVEAL_MS; room.revealSkips = []; room.commits = {};
  if (room.outcomes.length < chaptersFor(room).length && !humans(room).length && !room.pendingJoins.length) room.status = 'parked';
  fillCompanions(room);
}

function advanceRound(room: AdventureRoom, now: number) {
  if (room.status === 'completed') return;
  if (isJourney(room) && room.outcomes.some(outcome => outcome.chapter === room.chapter)) {
    admitPending(room, now);
    beginJourneyTravel(room, now);
    return;
  }
  if (room.outcomes.some(o => o.chapter === room.chapter)) {
    room.chapter += 1; room.chapterRound = 1;
    if (isExpedition(room)) advanceExpeditionChapter(room, now);
    else {
    const priorSuccess = hasFlag(room, `outcome:${room.chapter - 1}:success`);
    const maraHelp = room.chapter === 1 && hasFlag(room, 'mara-helped');
    room.progress = (priorSuccess ? 3 : 0) + Number(maraHelp);
    room.danger = Math.max(0, Math.min(8, room.danger) + (priorSuccess ? -2 : 1));
    let suppliesText = '';
    const previousChoice = chaptersFor(room)[room.chapter - 1]?.choice;
    const previousChoiceState = previousChoice && room.chapterChoices?.[previousChoice.id];
    if (previousChoice?.mode === 'rescue' && previousChoiceState?.phase === 'settled') {
      const carryProgress = previousChoiceState.outcome === 'full' ? 2 : previousChoiceState.outcome === 'partial' ? 1 : 0;
      room.progress += carryProgress;
      if (previousChoiceState.outcome === 'lost') room.danger += 1;
      suppliesText += carryProgress ? ` Saved ${previousChoice.resource} adds ${carryProgress} starting progress.` : ` Lost ${previousChoice.resource} adds 1 starting danger.`;
    }
    if (isRiverSuppliesChapter(room)) room.riverSupplies = { status: 'drifting' };
    if (room.chapter > 0 && chaptersFor(room)[room.chapter - 1]?.riverSupplies && room.riverSupplies) {
      const status = room.riverSupplies.status;
      const progress = status === 'secured' ? 3 : status === 'salvaged' ? 1 : 0;
      room.progress += progress;
      if (status === 'lost') room.danger += 2;
      suppliesText += progress ? ` The supplies you saved add ${progress} starting progress.` : status === 'lost' ? ' The lost supplies add 2 starting danger.' : '';
    }
    for (const seat of room.seats) { seat.hp = Math.min(seat.character.maxHp, seat.hp + 3); if (seat.kind === 'human') room.players[seat.actorId].character.hp = seat.hp; }
    event(room, now, { kind: 'chapter', text: `${chapterOf(room).intro}${priorSuccess ? ' Your earlier success gives the party a head start.' : ''}${maraHelp ? ' Because you helped Mara, her directions give the party another point of progress.' : ''}${suppliesText}` });
    }
  } else room.chapterRound += 1;
  room.turn += 1;
  room.phase = 'choosing'; room.deadline = now + ROUND_MS; room.revealUntil = null; room.revealSkips = []; room.commits = {};
  for (const userId of room.pendingJoins) { const player = room.players[userId]; if (player && player.leftAt === null) seatPlayer(room, player, now); }
  room.pendingJoins = [];
  fillCompanions(room);
  room.status = humans(room).length ? 'active' : 'parked';
  if (isExpedition(room) || isJourney(room)) advanceExpeditionBoundary(room);
  announceEnemyIntent(room);
}

function admitPending(room: AdventureRoom, now: number) {
  for (const userId of room.pendingJoins) { const player = room.players[userId]; if (player && player.leftAt === null) seatPlayer(room, player, now); }
  room.pendingJoins = [];
  fillCompanions(room);
  room.status = humans(room).length ? 'active' : 'parked';
}
function finishTravel(room: AdventureRoom, now: number) {
  resolveJourneyTravel(room, now);
  admitPending(room, now);
  announceEnemyIntent(room);
}

/** Pure, deterministic once a room id and clock are supplied. The persistence layer must CAS revision. */
export function reduceAdventure(original: AdventureRoom, command: AdventureCommand, now: number): AdventureRoom {
  if (!command.id || command.id.length > 160) throw new Error('A unique command id is required.');
  if (original.appliedCommands.includes(command.id)) return original;
  if (isExpedition(original) && !original.expedition) throw new Error('This expedition is missing its saved run state.');
  if (isJourney(original)) validateJourneyState(original);
  if (command.expectedTurn !== undefined && command.expectedTurn !== original.turn && (command.type === 'act' || command.type === 'vote-travel')) throw new Error('This turn has ended. Choose an action for the current scene.');
  if (original.status === 'completed' && command.type !== 'leave') {
    if (command.type === 'tick') return original;
    throw new Error('This adventure is complete. Start another story.');
  }
  const room: AdventureRoom = JSON.parse(JSON.stringify(original));
  if (command.type === 'vote-travel') {
    if (!isJourney(room)) throw new Error('This adventure does not use travel decisions.');
    if (command.expectedTurn === undefined) throw new Error('A travel vote must identify its turn.');
    acceptJourneyVote(room, command.userId, command.travel, now);
    if (journeyVotesReady(room)) finishTravel(room, now);
  } else if (command.type === 'skip-reveal') {
    if (command.expectedTurn === undefined || command.expectedTurn !== room.turn) throw new Error('That reveal has ended.');
    if (room.phase !== 'reveal' || room.status !== 'active') throw new Error('There is no turn reveal to skip.');
    if (!humans(room).some(seat => seat.actorId === command.userId)) throw new Error('Take a seat before skipping the reveal.');
    if (room.revealSkips?.includes(command.userId)) return original;
    room.revealSkips = [...(room.revealSkips ?? []), command.userId];
    if (humans(room).every(seat => room.revealSkips!.includes(seat.actorId))) advanceRound(room, now);
  } else if (command.type === 'react') {
    if (!room.seats.some(seat => seat.kind === 'human' && seat.actorId === command.userId && !seat.leaving)) throw new Error('Take a seat before reacting.');
    if (!command.reaction || !['cheer', 'thanks', 'clever'].includes(command.reaction)) throw new Error('Choose a table reaction.');
    const recent = (room.reactions ?? []).filter(reaction => now - reaction.at < 10_000);
    if (recent.some(reaction => reaction.userId === command.userId && now - reaction.at < 4_000)) throw new Error('Give your last reaction a moment.');
    room.reactions = [...recent, { id: command.id, userId: command.userId, kind: command.reaction, at: now }].slice(-12);
  } else if (command.type === 'act') {
    if (command.expectedTurn === undefined) throw new Error('An action must identify its turn.');
    if (room.status !== 'active' || room.phase !== 'choosing' || now >= room.deadline) throw new Error('This turn has ended. Choose an action for the next scene.');
    if (room.commits[command.userId]) throw new Error('Your action is already committed for this turn.');
    if (!command.action) throw new Error('Choose an action first.');
    validateAction(room, command.userId, command.action);
    room.commits[command.userId] = command.action;
    if (command.action.combination) combinationState(room)!.usedBy.push(command.userId);
    if (humans(room).every(s => room.commits[s.actorId])) resolveRound(room, now);
  } else if (command.type === 'join') {
    if (room.visibility === 'private' && !room.players[command.userId]
      && (!room.inviteKey || command.inviteKey !== room.inviteKey)) throw new Error('Use the invitation link to join this friend table.');
    const existingSeat = room.seats.find(s => s.actorId === command.userId && s.kind === 'human');
    if (existingSeat) { if (!existingSeat.leaving) return original; existingSeat.leaving = false; }
    else {
      if (room.pendingJoins.includes(command.userId)) return original;
      if (humans(room).length + room.pendingJoins.length >= 4) throw new Error('This table is full. Try another adventure.');
      let player = room.players[command.userId];
      if (!player) {
        if (!command.character) throw new Error('Choose a hero before joining.');
        player = room.players[command.userId] = { userId: command.userId, character: normalizedCharacter(command.character), seatId: null, joinedAt: now, leftAt: null, actions: 0, xp: 0, keepsakes: [], spotlightChapters: [], highlights: [] };
      }
      player.leftAt = null;
      if (room.status === 'parked') {
        seatPlayer(room, player, now); room.status = 'active';
        if (room.phase === 'reveal' && now >= (room.revealUntil ?? now)) advanceRound(room, now);
        else if (room.phase === 'choosing') { room.deadline = now + ROUND_MS; announceEnemyIntent(room); }
        else if (room.phase === 'travel' && isJourney(room)) {
          const travel = room.expedition!.travel!;
          if (!travel.eligibleActorIds.includes(command.userId)) travel.eligibleActorIds.push(command.userId);
          room.deadline = now + TRAVEL_MS;
        }
      } else room.pendingJoins.push(command.userId);
    }
  } else if (command.type === 'leave') {
    const player = room.players[command.userId];
    if (!player || (player.leftAt !== null && !player.seatId)) return original;
    const seat = room.seats.find(s => s.actorId === command.userId && s.kind === 'human');
    room.pendingJoins = room.pendingJoins.filter(id => id !== command.userId);
    if (seat && room.phase === 'choosing' && (room.commits[command.userId] || room.enemyIntent?.targetActorId === seat.actorId
      || Object.values(room.commits).some(action => action.targetKind === 'hero' && action.targetId === seat.actorId))) seat.leaving = true;
    else if (seat) releasePlayer(room, seat, now);
    else player.leftAt = now;
    const active = humans(room);
    if (room.status !== 'completed' && room.phase === 'travel' && isJourney(room)) {
      if (journeyVotesReady(room)) finishTravel(room, now);
      else if (!active.length) {
        // A waiting visitor can resume the empty crossroads, rather than inherit an unattended fallback.
        admitPending(room, now);
        if (room.status === 'active') {
          const travel = room.expedition!.travel!;
          for (const seat of humans(room)) if (!travel.eligibleActorIds.includes(seat.actorId)) travel.eligibleActorIds.push(seat.actorId);
          room.deadline = now + TRAVEL_MS;
        }
      }
    }
    else if (room.status !== 'completed' && room.phase === 'choosing' && Object.keys(room.commits).length && (!active.length || active.every(s => room.commits[s.actorId]))) resolveRound(room, now);
    else if (room.status !== 'completed' && !active.length && !room.pendingJoins.length) {
      room.status = 'parked';
      // No committed work means there is no strike left to resolve while empty.
      for (const departing of [...room.seats].filter(candidate => candidate.kind === 'human' && candidate.leaving)) releasePlayer(room, departing, now);
      delete room.enemyIntent;
    }
    if (room.status === 'active' && room.phase === 'reveal' && active.length && active.every(seat => room.revealSkips?.includes(seat.actorId))) advanceRound(room, now);
    fillCompanions(room);
  } else if (command.type === 'tick') {
    if (room.status === 'parked') return original;
    if (room.phase === 'travel' && isJourney(room)) {
      if (now < room.deadline && !journeyVotesReady(room)) return original;
      finishTravel(room, now);
    } else if (room.phase === 'reveal') { if (now < (room.revealUntil ?? Infinity)) return original; advanceRound(room, now); }
    else if (now >= room.deadline || (humans(room).length > 0 && humans(room).every(s => room.commits[s.actorId]))) resolveRound(room, now);
    else return original;
  } else throw new Error('Unknown adventure command.');
  room.revision = original.revision + 1; room.updatedAt = now;
  room.appliedCommands.push(command.id); room.appliedCommands = room.appliedCommands.slice(-256);
  return room;
}

export function summarizeRoom(room: AdventureRoom): RoomSummary {
  const definition = chapterOf(room);
  return { collectionVersion: room.collectionVersion, adventureId: room.adventureId, adventureVersion: room.adventureVersion, code: room.code, title: room.variation?.title ?? room.title, status: room.status, chapter: room.chapter, chapterTitle: definition.title,
    predicament: room.status === 'completed' ? room.outcomes[room.outcomes.length - 1]?.text ?? definition.objective : definition.objective,
    humans: humans(room).length, companions: room.seats.filter(s => s.kind === 'companion').length,
    openSeats: room.status === 'completed' ? 0 : Math.max(0, 4 - humans(room).length - room.pendingJoins.length), progress: room.progress, progressGoal: definition.progressGoal, updatedAt: room.updatedAt };
}

export function getCatchUp(room: AdventureRoom): string {
  const firstSentence = (text: string) => text.split(/[.!?](?:\s|$)/)[0];
  const outcome = room.outcomes.find(o => o.chapter === room.chapter);
  if (room.status === 'completed') return `${firstSentence(outcome?.text ?? 'The adventure is complete')}. Your contributions are saved in the chapter journal.`;
  if (isJourney(room)) {
    const scene = journeyScene(room);
    return `${scene.catchUp ?? scene.situation ?? scene.intro} ${scene.objective}`;
  }
  if (outcome && chaptersFor(room)[room.chapter + 1]) return `${firstSentence(outcome.text)}. Next: ${chaptersFor(room)[room.chapter + 1].objective}`;
  const definition = chapterOf(room);
  if (isRiverSuppliesChapter(room)) return `${definition.situation} ${definition.objective}`;
  if (adventureFor(room).id !== 'briar-glen') return `${definition.intro} ${definition.objective}`;
  const latestAttempt = [...room.events].reverse().find(e => e.chapter === room.chapter && e.kind === 'action' && e.roll !== undefined);
  let state = firstSentence(definition.intro);
  if (latestAttempt) state = latestAttempt.success === false
    ? `The last attempt uncovered a complication in ${definition.location}`
    : ['The party is tracing the missing herd through Briar Glen', 'The party is finding a way past the shadow pack', 'The party is loosening the guardian’s hold on the chapel'][room.chapter];
  if (room.chapter === 0 && hasFlag(room, 'mara-helped')) state = 'Mara has your help and is pointing the party toward the river';
  if (room.chapter === 2 && hasFlag(room, 'ward-repaired')) state = 'The repaired ward is weakening Gloamfang’s curse';
  if (humans(room).some(s => s.hp === 0)) state = `An ally is down in ${definition.location} and can still use Help`;
  const pressure = room.danger >= 6 ? ', with danger closing in' : room.chapterRound >= 8 ? ', and time is running short' : '';
  return `${state}${pressure}. ${definition.objective}`;
}

export function getVisitRecap(room: AdventureRoom, userId: string): VisitRecap {
  const player = room.players[userId];
  const chapterHighlights: Record<number, string[]> = {};
  for (const moment of room.events.filter(item => item.actorId === userId && item.kind === 'action' && (item.contribution || item.roll !== undefined))) {
    const highlights = chapterHighlights[moment.chapter] ?? [];
    highlights.push(moment.change?.text ?? moment.text);
    chapterHighlights[moment.chapter] = highlights.slice(-2);
  }
  return { adventureId: room.adventureId, adventureVersion: room.adventureVersion, code: room.code, title: room.variation?.title ?? room.title, characterId: player?.character.id ?? '', heroName:player?.character.name,heroTitle:player?.character.equipment?.title, actions: player?.actions ?? 0, xp: player?.xp ?? 0, keepsakes: [...(player?.keepsakes ?? [])], highlights: [...(player?.highlights ?? [])], outcomes: [...room.outcomes], chapterHighlights, collectionCredits: chapterCredits(room, userId) };
}
