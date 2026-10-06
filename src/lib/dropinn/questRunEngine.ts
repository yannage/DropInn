import type { AdventureCommand, AdventureRoom, StoryEvent } from './types';
import type { QuestAction, QuestAttribute, QuestEvent, QuestLifecycle } from './questRunTypes';
import { createQuestHero, isAvalon, isAvalonDice, questChallengePreview, questContent, questCombatMoves, questCombatNumbers, questHash, questMap, questOptions, QUEST_COMBAT_MS, QUEST_FOCUS_MS, QUEST_GEAR, QUEST_REVEAL_MS } from './questRun';
import { AVALON_THREADS, AVALON_PROMISES, avalonReturnText, createAvalonEpisode } from './avalonContent';
import type { AvalonConflictId, AvalonOptionEffect } from './avalonTypes';

const humans = (room: AdventureRoom) => room.seats.filter(seat => seat.kind === 'human' && !seat.leaving);
function event(room: AdventureRoom, now: number, data: Omit<StoryEvent, 'id' | 'turn' | 'chapter' | 'at'>) {
  const entry = { id: `${room.id}:${room.events.length}`, turn: room.turn, chapter: room.chapter, at: now, ...data }; room.events.push(entry); return entry;
}
function fact(room: AdventureRoom, id: string, source: StoryEvent) {
  const state = room.questRun!;
  if (!state.facts.some(item => item.id === id)) state.facts.push({ id, sourceEventId: source.id, actorId: source.actorId ?? '', actorName: source.actorName ?? 'The party', nodeId: state.nodeId });
}
function avalonOpportunities(room: AdventureRoom) {
  const episode = room.questRun?.avalon; if (!episode) return;
  const interest = (id: string) => Object.values(episode.director.interest).reduce((sum, values) => sum + (values[id] ?? 0), 0);
  episode.director.opportunities = episode.threads.filter(thread => thread.status === 'discovered' || thread.status === 'active')
    .sort((a, b) => interest(b.id) - interest(a.id) || a.id.localeCompare(b.id)).map(thread => thread.id).slice(0, 2);
}
function noteAvalonAction(room: AdventureRoom, actorId: string, meaningful: boolean, threadId?: AvalonConflictId) {
  const episode = room.questRun?.avalon; if (!episode || !meaningful) return;
  episode.director.meaningful = true;
  if (!episode.director.acted.includes(actorId)) episode.director.acted.push(actorId);
  if (threadId) {
    episode.director.interest[actorId] ??= {};
    // A second click by the same person cannot outweigh another person's interest.
    episode.director.interest[actorId][threadId] = 1;
  }
  avalonOpportunities(room);
}
function finishAvalonFocus(room: AdventureRoom, actorId: string | undefined, now: number) {
  const state = room.questRun!, episode = state.avalon; if (!episode || !actorId || room.status === 'parked') return;
  const director = episode.director;
  if (!director.finished.includes(actorId)) director.finished.push(actorId);
  const eligible = director.participants.filter(id => humans(room).some(seat => seat.actorId === id));
  if (!eligible.length) {
    director.participants = humans(room).map(seat => seat.actorId); director.finished = []; director.acted = []; director.meaningful = false; director.interest = {}; return;
  }
  if (!eligible.every(id => director.finished.includes(id))) return;
  if (director.meaningful && director.acted.some(id => eligible.includes(id))) {
    director.cycle++;
    for (const thread of episode.threads.filter(thread => thread.status === 'active' && thread.pressure < 3)) {
      thread.pressure++;
      const definition = AVALON_THREADS[thread.id];
      const spent = thread.pressure === 3 ? Math.min(1, state.supplies) : 0; state.supplies -= spent;
      if (thread.pressure === 3) thread.pressureSupplySpent = spent > 0;
      const source = event(room, now, { kind: 'consequence', text: thread.pressure === 3 && !spent
        ? `No shared supply remains to send for ${definition.title.toLowerCase()}. The request remains recorded; no aid or reward is claimed. Every solution remains available.`
        : `${definition.pressureWarnings[thread.pressure - 1]}${thread.pressure === 3 ? ' Every solution remains available.' : ''}`,
        quest: { kind: 'director', nodeId: state.nodeId, threadId: thread.id, supplyDelta: spent ? -spent : 0, ...(thread.pressure === 3 ? { factIds: [definition.pressureFact] } : {}) }, result: { changed: true } });
      if (thread.pressure === 3) fact(room, definition.pressureFact, source);
    }
    avalonOpportunities(room);
  }
  director.participants = humans(room).map(seat => seat.actorId); director.finished = []; director.acted = []; director.meaningful = false; director.interest = {};
}
function applyAvalonEffect(room: AdventureRoom, effect: AvalonOptionEffect | undefined, source: StoryEvent, now: number, hooks: QuestLifecycle) {
  const episode = room.questRun?.avalon; if (!episode || !effect) return;
  const record = (id: string) => { fact(room, id, source); source.quest!.factIds ??= []; if (!source.quest!.factIds.includes(id)) source.quest!.factIds.push(id); };
  for (const threadId of new Set([effect.discoverThread, ...(effect.discoverThreads ?? [])].filter(Boolean))) {
    const thread = episode.threads.find(thread => thread.id === threadId);
    if (thread?.status === 'hidden') { thread.status = 'discovered'; thread.sourceEventId = source.id; }
  }
  if (effect.promise) {
    if (!AVALON_PROMISES[effect.promise] || episode.promise?.status === 'owed') throw new Error('Keep the party’s current promise before accepting another.');
    episode.promise = { id: effect.promise, status: 'owed', sourceEventId: source.id };
    record(`promise:${effect.promise}`);
  }
  if (effect.fulfillPromise) {
    if (episode.promise?.id !== effect.fulfillPromise || episode.promise.status !== 'owed') throw new Error('There is no matching promise to keep.');
    episode.promise.status = 'kept';
    if (effect.fulfillPromise === 'washpond-reeds') {
      room.questRun!.items = room.questRun!.items.filter(id => id !== 'reed-bundle');
      source.quest!.spentItemIds = ['reed-bundle'];
    }
    record(`promise-kept:${effect.fulfillPromise}`);
  }
  if (effect.resolveThread) {
    const thread = episode.threads.find(thread => thread.id === effect.resolveThread);
    if (!thread || thread.status !== 'active' || !effect.resolutionId || !AVALON_THREADS[thread.id].resolutions[effect.resolutionId]) throw new Error('Follow this lead before choosing its resolution.');
    thread.status = 'resolved'; thread.resolutionId = effect.resolutionId; thread.sourceEventId = source.id;
    record(`resolved:${thread.id}`);
    milestone(room, 'source', source.text, now, hooks);
  }
  avalonOpportunities(room);
}
export function validateQuestRunState(room: AdventureRoom) {
  const state = room.questRun;
  if (!state || state.schemaVersion !== 1 || !Array.isArray(state.facts) || !Array.isArray(state.completedObjectives)) throw new Error('This quest is missing its saved run state.');
  if (isAvalon(room)) {
    const episode = state.avalon;
    const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
    const expectedManifest = createAvalonEpisode(state.seed).manifest;
    if (isAvalonDice(room)) expectedManifest.contentVersion = 2;
    if (!episode || episode.schemaVersion !== 1 || !episode.manifest || canonical(episode.manifest) !== canonical(expectedManifest)
      || !Array.isArray(episode.threads) || episode.threads.length !== 2 || new Set(episode.threads.map(thread => thread.id)).size !== episode.threads.length
      || episode.threads.some(thread => !episode.manifest.conflictIds.includes(thread.id) || !['hidden', 'discovered', 'active', 'resolved'].includes(thread.status) || !Number.isInteger(thread.pressure) || thread.pressure < 0 || thread.pressure > 3)) throw new Error('This Avalon world version or saved episode is unavailable.');
  }
  const content = questContent(room);
  if (!content.nodes.some(node => node.id === state.nodeId)) throw new Error('This quest is missing its saved run state.');
  if (isAvalonDice(room)) {
    const invalid = () => { throw new Error('This quest is missing valid saved challenge attempts.'); };
    if (!state.challenges || typeof state.challenges !== 'object' || Array.isArray(state.challenges)) invalid();
    if (room.events.some(entry => entry.quest?.check?.challengeId && !state.challenges![entry.quest.check.challengeId])) invalid();
    const authored = content.nodes.flatMap(node => node.targets.flatMap(target => target.options.filter(option => option.challenge).map(option => ({ id: option.challenge!.id, nodeId: node.id, targetId: target.id }))));
    for (const [id, effort] of Object.entries(state.challenges!)) {
      if (!effort || effort.challengeId !== id || !authored.some(entry => entry.id === id && entry.nodeId === effort.nodeId && entry.targetId === effort.targetId)
        || !Number.isSafeInteger(effort.attempts) || effort.attempts < 1 || !Array.isArray(effort.contributors) || !effort.contributors.length
        || effort.contributors.some(person => !person || typeof person.actorId !== 'string' || typeof person.actorName !== 'string' || typeof person.sourceEventId !== 'string')
        || new Set(effort.contributors.map(person => person.actorId)).size !== effort.contributors.length) invalid();
      const attempts = room.events.filter(entry => entry.quest?.check?.challengeId === id);
      if (attempts.length !== effort.attempts || attempts.some((entry, index) => entry.quest!.check!.attempt !== index + 1
        || entry.quest!.check!.sides !== 6 || !Number.isInteger(entry.quest!.check!.roll) || entry.quest!.check!.roll < 1 || entry.quest!.check!.roll > 6)) invalid();
      for (const person of effort.contributors) {
        if (!person || !room.players[person.actorId] || !person.actorName || !attempts.some(entry => entry.id === person.sourceEventId && entry.actorId === person.actorId)) invalid();
      }
      const completed = attempts.find(entry => entry.quest!.check!.success);
      if (completed?.id !== effort.completedEventId || completed && attempts.at(-1)?.id !== completed.id) invalid();
    }
  }
}
function ensureHeroes(room: AdventureRoom) {
  for (const seat of humans(room)) room.questRun!.heroes[seat.actorId] ??= createQuestHero(seat.character.classKey);
}
function announce(room: AdventureRoom) {
  const combat = room.questRun!.combat;
  if (!combat || combat.status !== 'active') { delete room.enemyIntent; return; }
  room.enemyIntent = { turn: room.turn, sourceId: combat.enemyId, targetActorId: combat.intent.targetActorId, baseDamage: combat.intent.damage };
}
function nextActor(room: AdventureRoom, after?: string) {
  const order = Object.keys(room.players); const start = order.indexOf(after ?? '');
  for (let offset = 1; offset <= order.length; offset++) { const id = order[(start + offset) % order.length]; if (humans(room).some(seat => seat.actorId === id)) return id; }
  return undefined;
}
function admit(room: AdventureRoom, now: number, hooks: QuestLifecycle) {
  // Restore named empty seats before replacing companions; retained battle victims can
  // leave a hole whose index differs from the current number of seated heroes.
  hooks.fillCompanions(room);
  const waiting: string[] = [];
  for (const id of room.pendingJoins) {
    const player = room.players[id]; if (!player || player.leftAt !== null) continue;
    if (room.seats.some(seat => seat.kind === 'companion') || room.seats.length < 4) hooks.seatPlayer(room, player, now);
    else waiting.push(id); // A departing announced victim still occupies their seat until the strike.
  }
  room.pendingJoins = waiting; hooks.fillCompanions(room); ensureHeroes(room);
}
function focus(room: AdventureRoom, actorId: string | undefined, now: number, remaining = 2, duration = QUEST_FOCUS_MS) {
  if (!actorId) { room.questRun!.focus = null; room.status = 'parked'; delete room.enemyIntent; return; }
  room.questRun!.focus = { actorId, remaining, endsAt: now + duration }; room.deadline = now + duration; room.status = 'active';
}
export function initializeQuestRun(room: AdventureRoom, now: number) {
  ensureHeroes(room); focus(room, humans(room)[0]?.actorId, now);
  const content = questContent(room);
  if (room.questRun!.avalon) {
    room.questRun!.avalon.director.participants = humans(room).map(seat => seat.actorId);
    event(room, now, { kind: 'consequence', text: content.nodes.find(node => node.id === room.questRun!.nodeId)!.description, quest: { kind: 'discovery', nodeId: room.questRun!.nodeId } });
    return;
  }
  const condition = room.questRun!.facts[0];
  const source = event(room, now, { kind: 'consequence', text: content.facts[condition.id]?.description ?? `${condition.id} changes which paths are open.`, quest: { kind: 'discovery', nodeId: room.questRun!.nodeId, factIds: [condition.id] } });
  condition.sourceEventId = source.id;
}
function rewardAction(room: AdventureRoom, actorId: string, source: StoryEvent, meaningful: boolean) {
  if (!meaningful) return;
  const player = room.players[actorId], hero = room.questRun!.heroes[actorId];
  player.actions++; player.xp += 3; player.highlights = [...player.highlights, source.text].slice(-8);
  hero.runXp++;
  const level = Math.min(4, 1 + Math.floor(hero.runXp / 3));
  if (level > hero.level) { hero.points += level - hero.level; hero.level = level; }
  if (source.quest) source.quest.runXp = 1;
}
function milestone(room: AdventureRoom, id: string, text: string, now: number, hooks: QuestLifecycle) {
  const state = room.questRun!;
  if (state.completedObjectives.includes(id)) return;
  const order = ['investigate', 'source', 'resolve']; const target = order.indexOf(id);
  for (const implied of order.slice(0, target + 1)) if (!state.completedObjectives.includes(implied)) {
    state.completedObjectives.push(implied); state.pendingMilestone = { result: 'success', text: implied === id ? text : `The party’s discovery also settles the earlier question. ${text}` };
    hooks.finishChapter(room, now); delete state.pendingMilestone;
    if (room.status !== 'completed') room.chapter = Math.min(2, state.completedObjectives.length);
  }
}
function reveal(room: AdventureRoom, now: number) {
  room.phase = 'reveal'; room.revealUntil = now + QUEST_REVEAL_MS; room.revealSkips = []; room.commits = {};
}
function health(room: AdventureRoom) { for (const seat of room.seats.filter(seat => seat.kind === 'human')) room.players[seat.actorId].character.hp = seat.hp; }
function damageTarget(room: AdventureRoom, actorId: string, amount: number, now: number, cause = 'the announced strike') {
  const seat = room.seats.find(seat => seat.actorId === actorId); if (!seat) return;
  const damage = Math.min(seat.hp, Math.max(0, amount)); seat.hp -= damage;
  event(room, now, { kind: 'consequence', actorId, actorName: seat.character.name, text: damage ? `${seat.character.name} takes ${damage} damage from ${cause}.` : `${seat.character.name} blocks ${cause}.`, result: { targetKind: 'hero', targetId: actorId, damage, hp: seat.hp } });
}
function heal(room: AdventureRoom, actorId: string, amount: number, now: number) {
  const seat = room.seats.find(seat => seat.actorId === actorId)!;
  const healing = Math.min(seat.character.maxHp - seat.hp, amount); seat.hp += healing;
  event(room, now, { kind: 'consequence', actorId, actorName: seat.character.name, text: `${seat.character.name} recovers ${healing} HP.`, result: { targetKind: 'hero', targetId: actorId, healing, hp: seat.hp } });
}
function startCombat(room: AdventureRoom, enemyId: string, now: number) {
  const content = questContent(room);
  const state = room.questRun!, actor = state.focus!;
  const order = humans(room).map(seat => seat.actorId); const mossback = enemyId === 'mossback'; const hp = (mossback ? 10 : 8) + (mossback ? 6 : 5) * order.length;
  state.combat = { id: `${room.id}:encounter:${enemyId}`, enemyId, round: 1, order, actedActorIds: [], enemyHp: hp, enemyMaxHp: hp, enemyArmor: mossback ? 1 : 0, status: 'active',
    intent: { targetActorId: order[0], damage: mossback ? 3 : 4, label: mossback ? 'Armored shoulder charge' : 'Escalating pack bite' }, protection: {}, returnNodeId: state.nodeId, resumeAfterActorId: actor.actorId, roundContributed: false,
    resumeFocus: { actorId: actor.actorId, remaining: actor.remaining, remainingMs: Math.max(0, actor.endsAt - now) } };
  event(room, now, { kind: 'consequence', text: `${content.enemies[enemyId].name} blocks the way. Each hero gets one combat move before the announced strike. It grows stronger after round three; the party escapes safely after round six.`, quest: { kind: 'combat', nodeId: state.nodeId } });
  focus(room, order[0], now, 1, QUEST_COMBAT_MS); announce(room);
}
function finishCombat(room: AdventureRoom, won: boolean, now: number) {
  const content = questContent(room);
  const state = room.questRun!, combat = state.combat!; combat.status = won ? 'won' : 'escaped';
  const text = isAvalon(room)
    ? won ? `${content.enemies[combat.enemyId].name} retreats. The blocked place is now accessible. Follow the discoveries in this place.` : `At the sixth exchange, the party slips past the tired creature. ${state.supplies ? 'One supply is lost' : 'No supplies remain'}. The discovered leads remain available.`
    : won ? `${content.enemies[combat.enemyId].name} retreats. The blocked place is now accessible; the village still needs clean water.` : `At the sixth exchange, the party slips past the tired creature. ${state.supplies ? 'One supply is lost' : 'No supplies remain'}; the village still needs clean water.`;
  const source = event(room, now, { kind: 'consequence', text,
    result: { changed: true }, quest: { kind: 'combat', nodeId: state.nodeId, encounterId: combat.id, factIds: [`encounter-cleared:${combat.enemyId}`, `${won ? 'defeated' : 'escaped'}:${combat.enemyId}`] } });
  for (const id of source.quest!.factIds!) fact(room, id, source);
  if (!won) state.supplies = Math.max(0, state.supplies - 1);
  if (won) for (const seat of humans(room)) if (room.events.some(entry => entry.actorId === seat.actorId && entry.quest?.encounterId === combat.id && entry.contribution)) {
    const id = `${combat.id}:loot:${seat.actorId}`;
    const available = QUEST_GEAR.filter(gear => !state.heroes[seat.actorId].equipment.includes(gear.id));
    const offset = questHash(`${state.seed}:${combat.enemyId}:${seat.actorId}`) % Math.max(1, available.length);
    if (available.length && !state.lootOffers.some(offer => offer.id === id)) state.lootOffers.push({ id, actorId: seat.actorId, choices: Array.from({ length: Math.min(2, available.length) }, (_, index) => available[(offset + index) % available.length].id), sourceEventId: source.id });
  }
  state.nodeId = combat.returnNodeId; delete room.enemyIntent;
}
function combatRoundEnd(room: AdventureRoom, now: number, hooks: QuestLifecycle) {
  const combat = room.questRun!.combat!;
  if (combat.enemyHp <= 0) { finishCombat(room, true, now); return; }
  const remaining = combat.order.filter(id => !combat.actedActorIds.includes(id) && humans(room).some(seat => seat.actorId === id));
  if (remaining.length) return;
  const companionCover = room.seats.some(seat => seat.kind === 'companion') && combat.roundContributed ? 1 : 0;
  if (companionCover) event(room, now, { kind: 'consequence', text: 'Your labelled companions hold the escape path and provide 1 cover.' });
  damageTarget(room, combat.intent.targetActorId, combat.intent.damage - (combat.protection[combat.intent.targetActorId] ?? 0) - companionCover, now);
  for (const seat of [...room.seats]) if (seat.kind === 'human' && seat.leaving) hooks.releasePlayer(room, seat, now);
  if (combat.round >= 6) { finishCombat(room, false, now); return; }
  combat.round++; combat.order = humans(room).map(seat => seat.actorId); combat.actedActorIds = []; combat.protection = {}; combat.roundContributed = false;
  const upright = humans(room).filter(seat => seat.hp > 0); const candidates = upright.length ? upright : humans(room);
  combat.intent = { targetActorId: candidates[(combat.round - 1) % Math.max(1, candidates.length)]?.actorId ?? '', damage: (combat.enemyId === 'mossback' ? 3 : 4 + Math.floor((combat.round - 1) / 2)) + Math.max(0, combat.round - 3), label: combat.enemyId === 'mossback' ? 'Armored shoulder charge' : 'Escalating pack bite' };
}
function resolveCombat(room: AdventureRoom, actorId: string, action: Extract<QuestAction, {kind: 'combat'}>, now: number, hooks: QuestLifecycle, absent = false) {
  const state = room.questRun!, combat = state.combat!, hero = state.heroes[actorId], seat = room.seats.find(seat => seat.actorId === actorId)!;
  const move = questCombatMoves(room, actorId).find(move => move.id === action.move);
  if (!move?.available) throw new Error(move?.reason ?? 'Choose an available combat move.');
  if (combat.actedActorIds.includes(actorId)) throw new Error('You already acted in this combat round.');
  let damage = 0, manaDelta = 0;
  const targetId = action.targetActorId ?? actorId;
  if (action.move !== 'mend' && action.targetActorId !== undefined) throw new Error('Only Mend chooses a hero.');
  const numbers = questCombatNumbers(room, actorId);
  if (action.move === 'attack') damage = numbers.attack;
  if (action.move === 'defend') {
    const protection = 3 + Number(hero.equipment.includes('reed-shield'));
    combat.protection[combat.intent.targetActorId] = Math.max(combat.protection[combat.intent.targetActorId] ?? 0, protection);
    if (!absent) { manaDelta = Math.min(1, hero.maxMana - hero.mana); hero.mana += manaDelta; }
  }
  if (action.move === 'mend') {
    if (!room.seats.some(target => target.kind === 'human' && target.actorId === targetId && !target.leaving)) throw new Error('Choose a seated hero to Mend.');
    const target = room.seats.find(target => target.actorId === targetId)!;
    if (target.hp >= target.character.maxHp) throw new Error('That hero already has full HP. Choose a wounded hero.');
    state.supplies--; heal(room, targetId, 2 + hero.attributes.heart, now);
  }
  if (action.move === 'spell') {
    hero.mana--; manaDelta = -1;
    damage = numbers.spell;
    if (seat.character.classKey === 'fighter') combat.protection[combat.intent.targetActorId] = Math.max(combat.protection[combat.intent.targetActorId] ?? 0, 2);
    if (seat.character.classKey === 'cleric') {
      const wounded = [...humans(room)].sort((a, b) => a.hp / a.character.maxHp - b.hp / b.character.maxHp || a.actorId.localeCompare(b.actorId))[0];
      if (wounded) heal(room, wounded.actorId, 2 + hero.attributes.heart, now);
    }
  }
  damage = Math.min(combat.enemyHp, damage); combat.enemyHp -= damage; combat.actedActorIds.push(actorId); if (!absent) combat.roundContributed = true;
  const source = event(room, now, { kind: 'action', actorId, actorName: seat.character.name, contribution: !absent,
    text: absent ? `${seat.character.name} defends while away. No action reward or mana is gained.` : `${seat.character.name} uses ${move.label}.${damage ? ` ${damage} damage; ${combat.enemyHp} enemy HP remains.` : ''}${manaDelta ? ` ${manaDelta > 0 ? '+' : ''}${manaDelta} mana.` : ''}`,
    quest: { kind: 'combat', nodeId: state.nodeId, encounterId: combat.id, move: action.move, enemyDamage: damage, manaDelta }, result: { changed: !absent } });
  rewardAction(room, actorId, source, !absent); state.focus!.remaining = 0;
  combatRoundEnd(room, now, hooks); health(room); reveal(room, now);
}
function validateActionShape(action: QuestAction | undefined) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) throw new Error('Choose a valid quest action.');
  const keys: Record<string, string[]> = { interact: ['kind', 'targetId', 'optionId'], travel: ['kind', 'edgeId'], pass: ['kind'], 'follow-thread': ['kind', 'threadId'], 'return-episode': ['kind'], combat: ['kind', 'move', 'targetActorId'], loot: ['kind', 'offerId', 'choiceId'], upgrade: ['kind', 'attribute'] };
  const allowed = keys[action.kind];
  if (!allowed || Object.keys(action).some(key => !allowed.includes(key)) || Object.values(action).some(value => typeof value !== 'string' || !value.length || value.length > 200)) throw new Error('Choose a valid quest action.');
}
function buildAction(room: AdventureRoom, actorId: string, action: Extract<QuestAction, {kind: 'loot' | 'upgrade'}>, now: number) {
  const state = room.questRun!, hero = state.heroes[actorId];
  if (!hero || !humans(room).some(seat => seat.actorId === actorId)) throw new Error('Take a seat before changing your run build.');
  let text: string; let details: QuestEvent;
  if (action.kind === 'upgrade') {
    if (!['might', 'wits', 'heart'].includes(action.attribute) || hero.points < 1) throw new Error('Choose an attribute when you have a run point.');
    hero.points--; hero.attributes[action.attribute as QuestAttribute]++;
    text = `${room.players[actorId].character.name} improves ${action.attribute} for this run.`; details = { kind: 'upgrade', nodeId: state.nodeId, attribute: action.attribute };
  } else {
    const offer = state.lootOffers.find(offer => offer.id === action.offerId && offer.actorId === actorId);
    const gear = QUEST_GEAR.find(gear => gear.id === action.choiceId);
    if (!offer || !gear || !offer.choices.includes(action.choiceId)) throw new Error('Choose one of your current loot offers.');
    if (hero.equipment.includes(gear.id)) throw new Error('That gear is already equipped. Choose a new item.');
    if (!hero.equipment.includes(gear.id)) {
      hero.equipment.push(gear.id);
      if (gear.id === 'amber-focus') { hero.maxMana++; hero.mana = Math.min(hero.maxMana, hero.mana + 1); }
    }
    state.lootOffers = state.lootOffers.filter(item => item.id !== offer.id);
    text = `${room.players[actorId].character.name} equips ${gear.label}. ${gear.description}`;
    details = { kind: 'loot', nodeId: state.nodeId, lootOfferId: offer.id, equipmentId: gear.id, sourceEventId: offer.sourceEventId };
  }
  event(room, now, { kind: 'consequence', actorId, actorName: room.players[actorId].character.name, text, quest: details, result: { changed: true } });
}
function act(room: AdventureRoom, command: AdventureCommand, now: number, hooks: QuestLifecycle) {
  const content = questContent(room);
  const action = command.questAction; validateActionShape(action);
  if (action!.kind === 'loot' || action!.kind === 'upgrade') { buildAction(room, command.userId, action! as Extract<QuestAction, {kind:'loot'|'upgrade'}>, now); return; }
  const state = room.questRun!, actor = state.focus;
  if (command.expectedTurn !== room.turn || room.phase !== 'choosing' || room.status !== 'active' || now >= room.deadline) throw new Error('This quest decision has ended.');
  if (!actor || actor.actorId !== command.userId || !humans(room).some(seat => seat.actorId === command.userId)) throw new Error('Wait for your active turn.');
  const seat = room.seats.find(seat => seat.actorId === command.userId)!; seat.missedTurns = 0;
  if (state.combat?.status === 'active') {
    if (action!.kind !== 'combat') throw new Error('Choose Attack, Defend, your class spell or Mend.');
    resolveCombat(room, command.userId, action! as Extract<QuestAction, {kind:'combat'}>, now, hooks); return;
  }
  if (action!.kind === 'combat') throw new Error('There is no battle here.');
  if (action!.kind === 'follow-thread') {
    const episode = state.avalon;
    const thread = episode?.threads.find(thread => thread.id === (action as Extract<QuestAction, {kind: 'follow-thread'}>).threadId);
    if (!episode || !thread || thread.status !== 'discovered' || !episode.director.opportunities.includes(thread.id)) throw new Error('Choose a discovered lead from the current opportunities.');
    if (episode.threads.filter(thread => thread.status === 'active').length >= 2) throw new Error('Finish an active thread before following another.');
    thread.status = 'active'; actor.remaining--; delete state.followUp;
    const definition = AVALON_THREADS[thread.id];
    const source = event(room, now, { kind: 'action', actorId: command.userId, actorName: seat.character.name, contribution: true,
      text: `${seat.character.name} follows ${definition.title}. ${definition.question} ${definition.pressureWarnings[0]}`,
      quest: { kind: 'follow-up', nodeId: state.nodeId, threadId: thread.id, factIds: [`following:${thread.id}`], sourceEventId: thread.sourceEventId }, result: { changed: true } });
    fact(room, `following:${thread.id}`, source); rewardAction(room, command.userId, source, true); noteAvalonAction(room, command.userId, true, thread.id); reveal(room, now); return;
  }
  if (action!.kind === 'return-episode') {
    if (!state.avalon || state.nodeId !== 'larch-inn' || !state.avalon.threads.some(thread => thread.status === 'resolved')) throw new Error('Resolve a thread, then return to Larch Inn to close this visit.');
    const text = avalonReturnText(state.avalon);
    const source = event(room, now, { kind: 'action', actorId: command.userId, actorName: seat.character.name, contribution: true, text: `${seat.character.name} brings the party’s story home. ${text}`,
      quest: { kind: 'ending', nodeId: state.nodeId }, result: { changed: true } });
    state.ending = { id: 'return', text, sourceEventId: source.id }; actor.remaining = 0; delete state.followUp;
    rewardAction(room, command.userId, source, true); milestone(room, 'resolve', text, now, hooks); room.status = 'completed'; reveal(room, now); return;
  }
  if (action!.kind === 'pass') {
    actor.remaining = 0; delete state.followUp;
    event(room, now, { kind: 'action', actorId: command.userId, actorName: seat.character.name, text: `${seat.character.name} passes the focus.`, contribution: false, quest: { kind: 'pass', nodeId: state.nodeId } });
    reveal(room, now); return;
  }
  if (action!.kind === 'travel') {
    const edge = questMap(room).edges.find(edge => edge.id === (action as Extract<QuestAction,{kind:'travel'}>).edgeId && edge.available);
    if (!edge) throw new Error('That route is not open from here.');
    const firstVisit = !state.visitedNodeIds.includes(edge.to); const from = state.nodeId; state.nodeId = edge.to;
    if (firstVisit) state.visitedNodeIds.push(edge.to); actor.remaining--; delete state.followUp;
    const source = event(room, now, { kind: 'action', actorId: command.userId, actorName: seat.character.name, contribution: firstVisit, text: `${seat.character.name} leads the party to ${content.nodes.find(node => node.id === edge.to)!.label}. ${edge.description}`,
      quest: { kind: 'travel', nodeId: edge.to, optionId: edge.id, fromNodeId: from, toNodeId: edge.to }, result: { changed: true } });
    rewardAction(room, command.userId, source, firstVisit); noteAvalonAction(room, command.userId, firstVisit); reveal(room, now); return;
  }
  const interaction = action as Extract<QuestAction, {kind:'interact'}>;
  const option = questOptions(room, interaction.targetId).find(option => option.id === interaction.optionId);
  if (!option) throw new Error('Choose a currently displayed intention.');
  if ((option.supplyDelta ?? 0) < -state.supplies) throw new Error('The party needs more supplies for this action.');
  if (option.encounter && !content.enemies[option.encounter]) throw new Error('This encounter is unavailable.');
  const challenge = isAvalonDice(room) ? option.challenge : undefined;
  const preview = challenge ? questChallengePreview(room, command.userId, option) : undefined;
  let challengeCheck: QuestEvent['check'];
  if (challenge && preview) {
    const roll = 1 + questHash(`${state.seed}:${room.turn}:${command.userId}:challenge:${challenge.id}`) % 6;
    challengeCheck = { roll, modifier: preview.modifier, dc: challenge.dc, success: roll + preview.modifier >= challenge.dc,
      sides: 6, attribute: challenge.attribute, baseModifier: preview.baseModifier, helpModifier: preview.helpModifier, helpKind: preview.helpKind,
      challengeId: challenge.id, attempt: preview.attempts + 1,
      ...(preview.helperActorId ? { helperActorId: preview.helperActorId, helperName: preview.helperName, helpSourceEventId: preview.helpSourceEventId } : {}) };
    if (!challengeCheck.success) {
      state.challenges ??= {};
      const effort = state.challenges[challenge.id] ??= { challengeId: challenge.id, nodeId: state.nodeId, targetId: interaction.targetId, attempts: 0, contributors: [] };
      const firstFailure = effort.attempts === 0; effort.attempts++; actor.remaining--;
      const nextAttempt = humans(room).length > 1 ? `Another hero can build on ${seat.character.name}’s attempt for +2.` : `${seat.character.name} can retry with +1.`;
      const text = `${challenge.failure}${challenge.setupLabel ? ` Shared setup: ${challenge.setupLabel}.` : ''} ${nextAttempt} No supplies spent; safe choices remain.`;
      const source = event(room, now, { kind: 'action', actorId: command.userId, actorName: seat.character.name, contribution: firstFailure,
        text: `${seat.character.name}: ${text}`, quest: { kind: 'follow-up', nodeId: state.nodeId, optionId: option.id, check: challengeCheck, factIds: [], itemIds: [], supplyDelta: 0,
          ...(option.avalon?.threadId ? { threadId: option.avalon.threadId } : {}) }, result: { changed: true },
        change: { title: `${challenge.label ?? option.label}: unfinished`, text, next: 'Choose an approach here to build on the attempt, or pursue another lead.' } });
      if (!effort.contributors.some(person => person.actorId === command.userId)) effort.contributors.push({ actorId: command.userId, actorName: seat.character.name, sourceEventId: source.id });
      const siblings = content.nodes.find(node => node.id === state.nodeId)!.targets.find(target => target.id === interaction.targetId)!.options.filter(item => item.challenge?.id === challenge.id).map(item => item.id);
      state.followUp = { id: `${source.id}:follow-up`, targetId: interaction.targetId, optionIds: siblings, sourceEventId: source.id };
      rewardAction(room, command.userId, source, firstFailure);
      // A real failed attempt can affect pacing and interest even after its one setup reward.
      noteAvalonAction(room, command.userId, true, option.avalon?.threadId);
      reveal(room, now); return;
    }
  }
  state.usedOptions.push(option.id); actor.remaining--;
  const roll = option.check ? 1 + questHash(`${state.seed}:${room.turn}:${command.userId}:${option.id}`) % 6 : 0;
  const check = challengeCheck ?? (option.check ? { roll, modifier: state.heroes[command.userId].attributes[option.check.attribute], dc: option.check.dc, success: roll + state.heroes[command.userId].attributes[option.check.attribute] >= option.check.dc } : undefined);
  const facts = [...new Set([...(option.discover ?? []), ...(check?.success ? option.check?.successDiscover ?? [] : [])])].filter(id => !state.facts.some(fact => fact.id === id));
  const items = (option.items ?? []).filter(id => !state.items.includes(id)); state.items.push(...items);
  const offeredSupplies = (option.supplyDelta ?? 0) + (check?.success ? option.check?.bonusSupplies ?? 0 : 0);
  const supplies = Math.min(6, Math.max(0, state.supplies + offeredSupplies)) - state.supplies; state.supplies += supplies;
  const meaningful = !!(facts.length || items.length || supplies || option.followUp?.length || option.encounter || option.completeObjective || option.ending || option.avalon || check);
  const excess = Math.max(0, offeredSupplies - supplies);
  const supplyReceipt = isAvalon(room) && (option.supplyDelta ?? 0) > 0
    ? supplies > 0 ? `The party gains ${supplies} shared ${supplies === 1 ? 'supply' : 'supplies'}.${excess ? ` ${excess} extra ${excess === 1 ? 'supply is' : 'supplies are'} left behind.` : ''} `
      : `The shared pack is full; ${excess} ${excess === 1 ? 'supply is' : 'supplies are'} left behind. `
    : '';
  const resultText = `${supplyReceipt}${challenge ? challenge.success : option.result}${!challenge && check ? ` ${check.success ? option.check!.success : option.check!.failure}` : ''}`;
  const source = event(room, now, { kind: 'action', actorId: command.userId, actorName: seat.character.name, contribution: meaningful, text: `${seat.character.name}: ${resultText}`,
    quest: { kind: option.ending ? 'ending' : state.followUp?.optionIds.includes(option.id) ? 'follow-up' : 'discovery', nodeId: state.nodeId, optionId: option.id, factIds: facts, itemIds: items, supplyDelta: supplies, ...(option.avalon?.threadId ? { threadId: option.avalon.threadId } : {}), ...(check ? { check } : {}) }, result: { changed: meaningful },
    change: { title: option.label, text: resultText, next: option.followUp?.length ? 'The discovery opens a follow-up choice.' : 'The party can use this result on its next decision.' } });
  if (challenge) {
    state.challenges ??= {};
    const effort = state.challenges[challenge.id] ??= { challengeId: challenge.id, nodeId: state.nodeId, targetId: interaction.targetId, attempts: 0, contributors: [] };
    effort.attempts++; effort.completedEventId = source.id;
    if (!effort.contributors.some(person => person.actorId === command.userId)) effort.contributors.push({ actorId: command.userId, actorName: seat.character.name, sourceEventId: source.id });
  }
  for (const id of facts) fact(room, id, source);
  state.followUp = option.followUp?.length ? { id: `${source.id}:follow-up`, targetId: interaction.targetId, optionIds: option.followUp, sourceEventId: source.id } : undefined;
  rewardAction(room, command.userId, source, meaningful);
  applyAvalonEffect(room, option.avalon, source, now, hooks);
  noteAvalonAction(room, command.userId, meaningful, option.avalon?.threadId);
  if (check && !check.success && option.check?.damageOnFailure) damageTarget(room, command.userId, option.check.damageOnFailure, now, 'the failed approach');
  if (option.completeObjective) milestone(room, option.completeObjective, option.result, now, hooks);
  if (option.ending) {
    state.ending = { id: option.ending, text: option.result, sourceEventId: source.id };
    milestone(room, 'resolve', option.result, now, hooks); room.status = 'completed';
  }
  if (option.encounter) startCombat(room, option.encounter, now);
  reveal(room, now);
}
function advance(room: AdventureRoom, now: number, hooks: QuestLifecycle) {
  const state = room.questRun!; const old = state.focus;
  room.turn++; room.phase = 'choosing'; room.revealUntil = null; room.revealSkips = [];
  if (state.combat?.status === 'active') {
    admit(room, now, hooks);
    const id = state.combat.order.find(id => !state.combat!.actedActorIds.includes(id) && humans(room).some(seat => seat.actorId === id));
    focus(room, id, now, 1, QUEST_COMBAT_MS); announce(room); return;
  }
  if (state.combat) {
    const resume = state.combat.resumeFocus; state.lastActorId = state.combat.resumeAfterActorId; delete state.combat;
    admit(room, now, hooks);
    if (resume && resume.remaining > 0 && resume.remainingMs > 0 && humans(room).some(seat => seat.actorId === resume.actorId)) { focus(room, resume.actorId, now, resume.remaining, resume.remainingMs); return; }
    finishAvalonFocus(room, state.lastActorId, now); focus(room, nextActor(room, state.lastActorId), now); return;
  }
  if (old && old.remaining > 0 && now < old.endsAt && humans(room).some(seat => seat.actorId === old.actorId)) { room.deadline = old.endsAt; return; }
  state.lastActorId = old?.actorId ?? state.lastActorId; delete state.followUp;
  admit(room, now, hooks); finishAvalonFocus(room, state.lastActorId, now); focus(room, nextActor(room, state.lastActorId), now);
}
function leave(room: AdventureRoom, actorId: string, now: number, hooks: QuestLifecycle, inactive = false) {
  const player = room.players[actorId]; if (!player || player.leftAt !== null && !player.seatId) return false;
  const state = room.questRun!, seat = room.seats.find(seat => seat.actorId === actorId && seat.kind === 'human');
  room.pendingJoins = room.pendingJoins.filter(id => id !== actorId);
  if (seat && state.combat?.status === 'active' && state.combat.intent.targetActorId === actorId && humans(room).length > 1) seat.leaving = true;
  else if (seat) hooks.releasePlayer(room, seat, now, inactive); else player.leftAt = now;
  if (room.status === 'completed') { hooks.fillCompanions(room); health(room); return true; }
  if (!humans(room).length) {
    for (const departing of [...room.seats]) if (departing.kind === 'human' && departing.leaving) hooks.releasePlayer(room, departing, now, inactive);
    admit(room, now, hooks);
    if (!humans(room).length) { room.status = 'parked'; state.focus = null; delete room.enemyIntent; hooks.fillCompanions(room); return true; }
  }
  if (state.focus?.actorId === actorId) {
    state.focus.remaining = 0;
    if (state.combat?.status === 'active') { if (!state.combat.actedActorIds.includes(actorId)) state.combat.actedActorIds.push(actorId); combatRoundEnd(room, now, hooks); }
    advance(room, now, hooks);
  }
  hooks.fillCompanions(room); health(room); return true;
}
/** This pinned mode shares the receipt/revision transaction but owns its sequential lifecycle. */
export function reduceQuestRunCommand(room: AdventureRoom, command: AdventureCommand, now: number, hooks: QuestLifecycle): boolean {
  if (command.type === 'quest-act') { act(room, command, now, hooks); health(room); return true; }
  if (command.type === 'act' || command.type === 'vote-travel') throw new Error('This quest uses its displayed quest actions.');
  if (command.type === 'join') {
    if (room.visibility === 'private' && !room.players[command.userId] && command.inviteKey !== room.inviteKey) throw new Error('Use the invitation link to join this friend table.');
    const existing = room.seats.find(seat => seat.kind === 'human' && seat.actorId === command.userId);
    if (existing) { if (!existing.leaving) return false; existing.leaving = false; return true; }
    if (room.pendingJoins.includes(command.userId)) return false;
    if (humans(room).length + room.pendingJoins.length >= 4) throw new Error('This table is full.');
    let player = room.players[command.userId];
    if (!player) {
      if (!command.character) throw new Error('Choose a hero before joining.');
      player = room.players[command.userId] = { userId: command.userId, character: hooks.normalizeCharacter(command.character), seatId: null, joinedAt: now, leftAt: null, actions: 0, xp: 0, keepsakes: [], spotlightChapters: [], highlights: [] };
    }
    player.leftAt = null;
    if (room.status === 'parked') {
      hooks.seatPlayer(room, player, now); ensureHeroes(room); room.status = 'active'; room.turn++; room.phase = 'choosing'; room.revealUntil = null;
      if (room.questRun!.avalon) {
        const director = room.questRun!.avalon!.director;
        director.participants = humans(room).map(seat => seat.actorId); director.finished = []; director.acted = []; director.meaningful = false; director.interest = {};
      }
      if (room.questRun!.combat?.status === 'active') {
        const combat = room.questRun!.combat!; if (!combat.order.includes(command.userId) || combat.actedActorIds.includes(command.userId)) { combat.order = [command.userId]; combat.actedActorIds = []; }
        // A different hero can resume an empty table. Announce the preserved strike
        // against that seated hero instead of leaving an absent victim in the UI.
        if (!humans(room).some(seat => seat.actorId === combat.intent.targetActorId)) combat.intent.targetActorId = command.userId;
        focus(room, command.userId, now, 1, QUEST_COMBAT_MS); announce(room);
      } else { delete room.questRun!.combat; focus(room, command.userId, now); }
      hooks.fillCompanions(room);
    } else room.pendingJoins.push(command.userId);
    return true;
  }
  if (command.type === 'leave') return leave(room, command.userId, now, hooks);
  if (command.type === 'react') {
    if (!humans(room).some(seat => seat.actorId === command.userId) || !['cheer', 'thanks', 'clever'].includes(command.reaction ?? '')) throw new Error('Choose a table reaction from your seat.');
    const recent = (room.reactions ?? []).filter(reaction => now - reaction.at < 10_000);
    if (recent.some(reaction => reaction.userId === command.userId && now - reaction.at < 4_000)) throw new Error('Give your last reaction a moment.');
    room.reactions = [...recent, { id: command.id, userId: command.userId, kind: command.reaction!, at: now }].slice(-12); return true;
  }
  if (command.type === 'skip-reveal') {
    if (command.expectedTurn !== room.turn || room.phase !== 'reveal' || command.userId !== room.questRun!.focus?.actorId) throw new Error('Wait for the quest result to finish.');
    advance(room, now, hooks); return true;
  }
  if (command.type !== 'tick') throw new Error('Unknown quest command.');
  if (room.status === 'parked') return false;
  if (room.phase === 'reveal') { if (now < (room.revealUntil ?? Infinity)) return false; advance(room, now, hooks); return true; }
  if (now < room.deadline) return false;
  const state = room.questRun!, actor = state.focus?.actorId, seat = room.seats.find(seat => seat.actorId === actor);
  if (!seat || !actor) { advance(room, now, hooks); return true; }
  seat.missedTurns++;
  if (state.combat?.status === 'active') resolveCombat(room, actor, { kind: 'combat', move: 'defend' }, now, hooks, true);
  else {
    state.focus!.remaining = 0; delete state.followUp;
    event(room, now, { kind: 'action', actorId: actor, actorName: seat.character.name, contribution: false, text: `${seat.character.name} passes while away. No discovery or reward is claimed.`, quest: { kind: 'pass', nodeId: state.nodeId } }); reveal(room, now);
  }
  if (seat.missedTurns >= 2) leave(room, actor, now, hooks, true);
  health(room); return true;
}
