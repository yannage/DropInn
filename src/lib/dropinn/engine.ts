import { CHARACTER_CLASS_PRESETS } from '../character';
import type { CharacterClassKey, CharacterProfile, TraitSet } from '../character';
import { CHAPTERS } from './content';
import { getScene, developScene } from './scene';
import type { ActionDescription, AdventureCommand, AdventureRoom, CreativeEffect, CreativeProposal, Participant, PlayerAction, RoomSummary, Seat, StoryEvent, TokenKind, VisitRecap } from './types';

const ROUND_MS = 30_000;
const REVEAL_MS = 6_000;
const MAX_ROUNDS = 10;
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
  return { ...character, name: character.name.trim().slice(0, 18), traits: { ...preset.traits }, hp: preset.hp, maxHp: preset.hp, accent: preset.accent, spotlightTokens: 1, inventory: [...character.inventory] };
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

export function createAdventure(character: CharacterProfile, userId: string, now: number, code?: string): AdventureRoom {
  const hero = normalizedCharacter(character);
  const roomCode = (code ?? Math.random().toString(36).slice(2, 8)).toUpperCase();
  const room: AdventureRoom = { version: 2, id: globalThis.crypto?.randomUUID?.() ?? `room-${roomCode}-${now}`, code: roomCode, revision: 0, title: 'Briar Glen: The Broken Bell',
    status: 'active', phase: 'choosing', chapter: 0, chapterRound: 1, turn: 1, deadline: now + ROUND_MS, revealUntil: null,
    createdAt: now, updatedAt: now, progress: 0, danger: 0, flags: [], seats: [], players: {}, pendingJoins: [], commits: {}, events: [], outcomes: [], appliedCommands: [] };
  room.players[userId] = { userId, character: hero, seatId: null, joinedAt: now, leftAt: null, actions: 0, xp: 0, keepsakes: [], spotlightChapters: [], highlights: [] };
  seatPlayer(room, room.players[userId], now);
  fillCompanions(room);
  event(room, now, { kind: 'chapter', text: CHAPTERS[0].intro });
  return room;
}

export function describeAction(classKey: CharacterClassKey, token: TokenKind, targetId: string, room: AdventureRoom): ActionDescription {
  const target = chapterOf(room).targets.find(t => t.id === targetId);
  const name = target?.name ?? 'the scene';
  const dc = 10 + room.chapter + (room.danger >= 6 ? 1 : 0);
  const points = (value: number) => pointsLabel(value * progressShare(room));
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
      event(room, now, { kind: 'consequence', text: `${hurt.character.name} recovers ${healed} HP${hurt.hp === healed ? ' and rejoins the action' : ''}.` });
    }
  }
}

function validateAction(room: AdventureRoom, userId: string, action: PlayerAction) {
  const seat = room.seats.find(s => s.actorId === userId && s.kind === 'human' && !s.leaving);
  if (!seat) throw new Error('Your seat will open at the next turn.');
  const target = chapterOf(room).targets.find(t => t.id === action.targetId);
  if (!target) throw new Error('Choose a target in the current scene.');
  if (seat.hp <= 0 && action.token !== 'assist') throw new Error('While downed, use Assist to keep helping your party.');
  if (action.token === 'spotlight') {
    if (room.players[userId].spotlightChapters.includes(room.chapter)) throw new Error('Your Spotlight token returns next chapter.');
    if (!action.proposal || action.proposal.targetId !== action.targetId || !validateProposal(room, action.proposal)) throw new Error('Review a supported idea for this turn before committing.');
  } else if (!target.tokens.includes(action.token)) throw new Error('That action is not available on this target.');
}

function resolveHuman(room: AdventureRoom, seat: Seat, action: PlayerAction, now: number, frozenBonus: number, startingDanger: number, share: number) {
  const description = describeAction(seat.character.classKey, action.token, action.targetId, { ...room, danger: startingDanger });
  const roll = 1 + hash(`${room.id}:${room.turn}:${seat.actorId}:${action.token}:${action.targetId}`) % 20;
  const modifier = seat.character.traits[description.trait] + frozenBonus;
  const success = roll + modifier >= description.dc;
  const target = chapterOf(room).targets.find(t => t.id === action.targetId)!;
  const previousProgress = room.progress;
  let effect = `The situation moves forward; danger increases by ${pointsLabel(share)}.`;
  if (success) {
    const points = action.token === 'assist' ? 2 : 3;
    room.progress += points * share;
    effect = '';
    if (action.token === 'fight') { flag(room, `cover:${room.turn}`); effect += chapterOf(room).combat ? ' The threat is interrupted.' : ' The obstruction gives way.'; }
    if (action.token === 'influence') { room.danger = Math.max(0, room.danger - share); effect += ' Danger eases.'; }
    if (action.token === 'investigate') { applyEffect(room, 'reveal', now, 1, share); effect += ' An insight helps the next round.'; }
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
  effect = `+${pointsLabel(room.progress - previousProgress)} objective progress. ${effect.trim()}`;
  const text = action.token === 'spotlight' ? `${seat.character.name} tries: ${action.proposal!.label}. ${success ? 'It works!' : 'It proves difficult, but reveals the next step.'}` : `${seat.character.name} ${success ? 'succeeds' : 'finds a complication'}: ${description.label.toLowerCase()} at ${target.name}.`;
  const change = success ? developScene(room, action) : undefined;
  event(room, now, { kind: 'action', actorId: seat.actorId, actorName: seat.character.name, text, roll, modifier, success, effect, ...(change ? { change } : {}) });
  const player = room.players[seat.actorId];
  player.actions += 1; player.xp += success ? 5 : 3;
  if (action.token === 'spotlight') player.spotlightChapters.push(room.chapter);
  player.highlights.push(`${text} ${effect}${change ? ` ${change.text}` : ''}`);
  player.highlights = player.highlights.slice(-8);
  seat.missedTurns = 0;
}

function finishChapter(room: AdventureRoom, now: number) {
  const definition = chapterOf(room);
  const result = room.progress >= definition.progressGoal ? 'success' : room.progress >= definition.progressGoal * 0.5 ? 'mixed' : 'setback';
  let text = definition.endings[result];
  if (room.chapter === 2 && result === 'success') text = hasFlag(room, 'ward-repaired') ? 'The repaired ward answers the bell. Gloamfang’s shadow falls away, and the guardian bows as the captives return to Briar Glen.' : 'You drive Gloamfang from the chapel and lead the captives home. The villagers hang a new bell, grateful for the brave strangers who answered it.';
  if (room.chapter === 2 && hasFlag(room, 'mara-helped')) text += ' Mara welcomes you back with the copper bell you helped her save.';
  room.outcomes.push({ chapter: room.chapter, result, text, at: now });
  flag(room, `outcome:${room.chapter}:${result}`);
  // Necessary story facts arrive even when a chapter goes badly.
  flag(room, room.chapter === 0 ? 'river-lead' : room.chapter === 1 ? 'guardian-truth' : 'village-future');
  const contributors = new Set(room.events.filter(e => e.chapter === room.chapter && e.kind === 'action' && e.actorId && e.roll !== undefined).map(e => e.actorId));
  for (const player of Object.values(room.players)) if (contributors.has(player.userId)) {
    player.xp += result === 'success' ? 15 : 10;
    if (!player.keepsakes.includes(definition.keepsake)) player.keepsakes.push(definition.keepsake);
    player.highlights.push(text);
    player.highlights = player.highlights.slice(-8);
  }
  event(room, now, { kind: 'chapter', text });
  if (room.chapter === CHAPTERS.length - 1) room.status = 'completed';
}

function resolveRound(room: AdventureRoom, now: number) {
  if (room.phase !== 'choosing' || room.status === 'completed') return;
  const submitted = Object.keys(room.commits).length;
  const frozenBonus = Number(hasFlag(room, `insight:${room.turn}`)) + Number(hasFlag(room, `opening:${room.turn}`));
  const startingDanger = room.danger;
  const share = progressShare(room);
  for (const seat of room.seats.filter(s => s.kind === 'human')) {
    const action = room.commits[seat.actorId];
    if (action) resolveHuman(room, seat, action, now, frozenBonus, startingDanger, share);
    else if (!seat.leaving) {
      seat.missedTurns += 1;
      event(room, now, { kind: 'action', actorId: seat.actorId, actorName: seat.character.name, text: chapterOf(room).combat ? `${seat.character.name} defends while away. No token is spent.` : `${seat.character.name} sits this round out. No choice is made for them.`, effect: 'No reward or action was claimed.' });
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
  if (chapterOf(room).combat && room.progress < chapterOf(room).progressGoal && humans(room).length) {
    const targets = room.seats.filter(s => s.hp > 0 && !s.leaving);
    const target = targets[hash(`${room.id}:${room.turn}:threat`) % targets.length];
    if (target) {
      const defended = hasFlag(room, `defending:${room.turn}:${target.actorId}`) ? 2 : 0;
      const covered = hasFlag(room, `cover:${room.turn}`) ? 2 : 0;
      const damage = Math.max(0, 3 + Math.floor(room.danger / 4) - defended - covered);
      target.hp = Math.max(0, target.hp - damage);
      event(room, now, { kind: 'consequence', actorId: target.actorId, actorName: target.character.name, text: damage ? `${chapterOf(room).threat.split('.')[0]}. ${target.character.name} takes ${damage} damage${target.hp === 0 ? ' and can still Assist while downed' : ''}.` : `${target.character.name} is protected from the danger by the party’s preparation.`, effect: damage ? `−${damage} HP` : 'Attack blocked' });
    }
  }
  for (const seat of [...room.seats]) if (seat.kind === 'human') {
    room.players[seat.actorId].character.hp = seat.hp;
    if (seat.leaving || seat.missedTurns >= 2) releasePlayer(room, seat, now, !seat.leaving);
  }
  if (room.progress >= chapterOf(room).progressGoal || room.chapterRound >= MAX_ROUNDS) finishChapter(room, now);
  room.phase = 'reveal'; room.revealUntil = now + REVEAL_MS; room.commits = {};
  if (room.outcomes.length < CHAPTERS.length && !humans(room).length && !room.pendingJoins.length) room.status = 'parked';
  fillCompanions(room);
}

function advanceRound(room: AdventureRoom, now: number) {
  if (room.status === 'completed') return;
  if (room.outcomes.some(o => o.chapter === room.chapter)) {
    room.chapter += 1; room.chapterRound = 1;
    const priorSuccess = hasFlag(room, `outcome:${room.chapter - 1}:success`);
    const maraHelp = room.chapter === 1 && hasFlag(room, 'mara-helped');
    room.progress = (priorSuccess ? 3 : 0) + Number(maraHelp);
    room.danger = Math.max(0, Math.min(8, room.danger) + (priorSuccess ? -2 : 1));
    for (const seat of room.seats) { seat.hp = Math.min(seat.character.maxHp, seat.hp + 3); if (seat.kind === 'human') room.players[seat.actorId].character.hp = seat.hp; }
    event(room, now, { kind: 'chapter', text: `${chapterOf(room).intro}${priorSuccess ? ' Your earlier success gives the party a head start.' : ''}${maraHelp ? ' Because you helped Mara, her directions give the party another point of progress.' : ''}` });
  } else room.chapterRound += 1;
  room.turn += 1;
  room.phase = 'choosing'; room.deadline = now + ROUND_MS; room.revealUntil = null; room.commits = {};
  for (const userId of room.pendingJoins) { const player = room.players[userId]; if (player && player.leftAt === null) seatPlayer(room, player, now); }
  room.pendingJoins = [];
  fillCompanions(room);
  room.status = humans(room).length ? 'active' : 'parked';
}

/** Pure, deterministic once a room id and clock are supplied. The persistence layer must CAS revision. */
export function reduceAdventure(original: AdventureRoom, command: AdventureCommand, now: number): AdventureRoom {
  if (!command.id || command.id.length > 160) throw new Error('A unique command id is required.');
  if (original.appliedCommands.includes(command.id)) return original;
  if (command.expectedTurn !== undefined && command.expectedTurn !== original.turn && command.type === 'act') throw new Error('This turn has ended. Choose an action for the current scene.');
  if (original.status === 'completed' && command.type !== 'leave') {
    if (command.type === 'tick') return original;
    throw new Error('This adventure is complete. Start another story.');
  }
  const room: AdventureRoom = JSON.parse(JSON.stringify(original));
  if (command.type === 'act') {
    if (command.expectedTurn === undefined) throw new Error('An action must identify its turn.');
    if (room.status !== 'active' || room.phase !== 'choosing' || now >= room.deadline) throw new Error('This turn has ended. Choose an action for the next scene.');
    if (room.commits[command.userId]) throw new Error('Your action is already committed for this turn.');
    if (!command.action) throw new Error('Choose an action first.');
    validateAction(room, command.userId, command.action);
    room.commits[command.userId] = command.action;
    if (humans(room).every(s => room.commits[s.actorId])) resolveRound(room, now);
  } else if (command.type === 'join') {
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
        else if (room.phase === 'choosing') room.deadline = now + ROUND_MS;
      } else room.pendingJoins.push(command.userId);
    }
  } else if (command.type === 'leave') {
    const player = room.players[command.userId];
    if (!player || (player.leftAt !== null && !player.seatId)) return original;
    const seat = room.seats.find(s => s.actorId === command.userId && s.kind === 'human');
    room.pendingJoins = room.pendingJoins.filter(id => id !== command.userId);
    if (seat && room.phase === 'choosing' && room.commits[command.userId]) seat.leaving = true;
    else if (seat) releasePlayer(room, seat, now);
    else player.leftAt = now;
    const active = humans(room);
    if (room.status !== 'completed' && room.phase === 'choosing' && Object.keys(room.commits).length && (!active.length || active.every(s => room.commits[s.actorId]))) resolveRound(room, now);
    else if (room.status !== 'completed' && !active.length && !room.pendingJoins.length) room.status = 'parked';
    fillCompanions(room);
  } else if (command.type === 'tick') {
    if (room.status === 'parked') return original;
    if (room.phase === 'reveal') { if (now < (room.revealUntil ?? Infinity)) return original; advanceRound(room, now); }
    else if (now >= room.deadline || (humans(room).length > 0 && humans(room).every(s => room.commits[s.actorId]))) resolveRound(room, now);
    else return original;
  } else throw new Error('Unknown adventure command.');
  room.revision = original.revision + 1; room.updatedAt = now;
  room.appliedCommands.push(command.id); room.appliedCommands = room.appliedCommands.slice(-256);
  return room;
}

export function summarizeRoom(room: AdventureRoom): RoomSummary {
  const definition = chapterOf(room);
  return { code: room.code, title: room.variation?.title ?? room.title, status: room.status, chapter: room.chapter, chapterTitle: definition.title,
    predicament: room.status === 'completed' ? room.outcomes[room.outcomes.length - 1]?.text ?? definition.objective : definition.objective,
    humans: humans(room).length, companions: room.seats.filter(s => s.kind === 'companion').length,
    openSeats: room.status === 'completed' ? 0 : Math.max(0, 4 - humans(room).length - room.pendingJoins.length), progress: room.progress, progressGoal: definition.progressGoal, updatedAt: room.updatedAt };
}

export function getCatchUp(room: AdventureRoom): string {
  const firstSentence = (text: string) => text.split(/[.!?](?:\s|$)/)[0];
  const outcome = room.outcomes.find(o => o.chapter === room.chapter);
  if (room.status === 'completed') return `${firstSentence(outcome?.text ?? 'The adventure is complete')}. Your contributions are saved in the chapter journal.`;
  if (outcome && CHAPTERS[room.chapter + 1]) return `${firstSentence(outcome.text)}. Next: ${CHAPTERS[room.chapter + 1].objective}`;
  const definition = chapterOf(room);
  const latestAttempt = [...room.events].reverse().find(e => e.chapter === room.chapter && e.kind === 'action' && e.roll !== undefined);
  let state = firstSentence(definition.intro);
  if (latestAttempt) state = latestAttempt.success === false
    ? `The last attempt uncovered a complication in ${definition.location}`
    : ['The party is tracing the missing herd through Briar Glen', 'The party is finding a way past the shadow pack', 'The party is loosening the guardian’s hold on the chapel'][room.chapter];
  if (room.chapter === 0 && hasFlag(room, 'mara-helped')) state = 'Mara has your help and is pointing the party toward the river';
  if (room.chapter === 2 && hasFlag(room, 'ward-repaired')) state = 'The repaired ward is weakening Gloamfang’s curse';
  if (humans(room).some(s => s.hp === 0)) state = `An ally is down in ${definition.location} and can still help with Assist`;
  const pressure = room.danger >= 6 ? ', with danger closing in' : room.chapterRound >= 8 ? ', and time is running short' : '';
  return `${state}${pressure}. ${definition.objective}`;
}

export function getVisitRecap(room: AdventureRoom, userId: string): VisitRecap {
  const player = room.players[userId];
  const chapterHighlights: Record<number, string[]> = {};
  for (const moment of room.events.filter(item => item.actorId === userId && item.kind === 'action' && item.roll !== undefined)) {
    const highlights = chapterHighlights[moment.chapter] ?? [];
    highlights.push(moment.change?.text ?? moment.text);
    chapterHighlights[moment.chapter] = highlights.slice(-2);
  }
  return { code: room.code, title: room.variation?.title ?? room.title, characterId: player?.character.id ?? '', actions: player?.actions ?? 0, xp: player?.xp ?? 0, keepsakes: [...(player?.keepsakes ?? [])], highlights: [...(player?.highlights ?? [])], outcomes: [...room.outcomes], chapterHighlights };
}
