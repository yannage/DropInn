import type { CharacterClassKey } from '../character';
import type { AdventureRoom, ChapterDefinition } from './types';
import type { QuestAttribute, QuestChallengePreview, QuestHero, QuestMove, QuestOption, QuestRunContent, QuestRunState, QuestRunView } from './questRunTypes';
import { QUEST_RUN_CONTENT as content } from './questRunContent';
import { avalonContent, createAvalonEpisode, AVALON_THREADS } from './avalonContent';
import { avalonDiceContent } from './avalonDiceContent';

export const isAvalon = (room: Pick<AdventureRoom, 'adventureId' | 'adventureVersion'>) => room.adventureId === 'avalon' && (room.adventureVersion === 1 || room.adventureVersion === 2);
export const isAvalonDice = (room: Pick<AdventureRoom, 'adventureId' | 'adventureVersion'>) => room.adventureId === 'avalon' && room.adventureVersion === 2;
export const isQuestRun = (room: Pick<AdventureRoom, 'adventureId' | 'adventureVersion'>) => room.adventureId === 'mosswater' && room.adventureVersion === 1 || isAvalon(room);
/** Saved assignments, rather than a fresh roll, select every episode's content. */
export function questContent(room: Pick<AdventureRoom, 'adventureId' | 'adventureVersion' | 'questRun'>): QuestRunContent {
  if (!isAvalon(room)) return content;
  if (!room.questRun?.avalon) throw new Error('This Avalon episode is missing its saved world manifest.');
  return (isAvalonDice(room) ? avalonDiceContent : avalonContent)(room.questRun.avalon, room.questRun.facts.map(fact => fact.id));
}
export const QUEST_FOCUS_MS = 45_000;
export const QUEST_COMBAT_MS = 25_000;
export const QUEST_REVEAL_MS = 3_000;
export const questHash = (text: string) => { let value = 2166136261; for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619); return value >>> 0; };
export const QUEST_GEAR = [
  { id: 'reed-shield', label: 'Reed shield', description: 'Defend blocks 1 extra damage.' },
  { id: 'sluice-hook', label: 'Sluice hook', description: 'Attack deals 1 extra damage.' },
  { id: 'amber-focus', label: 'Amber focus', description: 'Raise maximum mana by 1 and restore 1 mana when equipped.' },
] as const;
export function createQuestHero(classKey: CharacterClassKey): QuestHero {
  const attributes: Record<CharacterClassKey, Record<QuestAttribute, number>> = {
    fighter: { might: 3, wits: 1, heart: 2 }, rogue: { might: 2, wits: 3, heart: 1 },
    wizard: { might: 1, wits: 3, heart: 2 }, cleric: { might: 1, wits: 2, heart: 3 },
  };
  const maxMana = classKey === 'wizard' || classKey === 'cleric' ? 3 : 2;
  return { level: 1, runXp: 0, points: 0, attributes: { ...attributes[classKey] }, mana: maxMana, maxMana, equipment: [] };
}
export function createQuestRun(seed: string, adventureId = 'mosswater', adventureVersion = 1): QuestRunState {
  if (adventureId === 'avalon') {
    const avalon = createAvalonEpisode(seed);
    if (adventureVersion === 2) avalon.manifest.contentVersion = 2;
    const episode = (adventureVersion === 2 ? avalonDiceContent : avalonContent)(avalon);
    return { schemaVersion: 1, seed, nodeId: episode.startNodeId, visitedNodeIds: [episode.startNodeId], focus: null,
      heroes: {}, facts: [], items: [], supplies: 3, completedObjectives: [], usedOptions: [], lootOffers: [], avalon, ...(adventureVersion === 2 ? { challenges: {} } : {}) };
  }
  return { schemaVersion: 1, seed, nodeId: content.startNodeId, visitedNodeIds: [content.startNodeId], focus: null,
    heroes: {}, facts: [{ id: questHash(seed) % 2 ? 'high-water' : 'low-water', sourceEventId: '', actorId: '', actorName: 'The conditions', nodeId: content.startNodeId }], items: [], supplies: 3, completedObjectives: [], usedOptions: [], lootOffers: [] };
}
export const questHas = (room: AdventureRoom, id: string) => !!room.questRun?.facts.some(fact => fact.id === id);
export function questOptions(room: AdventureRoom, targetId: string): QuestOption[] {
  const content = questContent(room);
  const state = room.questRun;
  if (!state || state.combat?.status === 'active' || room.status === 'completed') return [];
  const target = content.nodes.find(node => node.id === state.nodeId)?.targets.find(target => target.id === targetId);
  return (target?.options ?? []).filter(option => (option.requires ?? []).every(id => questHas(room, id))
    && !(option.absent ?? []).some(id => questHas(room, id))
    && !state.usedOptions.includes(option.id)
    && (!option.challenge || !isAvalonDice(room) || !state.challenges?.[option.challenge.id]?.completedEventId)
    && (!option.avalon?.promise || state.avalon?.promise?.status !== 'owed')
    && (!option.avalon?.fulfillPromise || state.avalon?.promise?.id === option.avalon.fulfillPromise && state.avalon.promise.status === 'owed')
    && (!option.avalon?.resolveThread || state.avalon?.threads.some(thread => thread.id === option.avalon!.resolveThread && thread.status === 'active')));
}
/** Odds read class/run attributes and confirmed setup only; this never samples a die. */
export function questChallengePreview(room: AdventureRoom, actorId: string, option: QuestOption): QuestChallengePreview | undefined {
  if (!isAvalonDice(room) || !option.challenge) return undefined;
  const hero = room.questRun?.heroes[actorId];
  if (!hero) return undefined;
  const challenge = option.challenge, effort = room.questRun!.challenges?.[challenge.id];
  const helper = effort?.contributors.find(person => person.actorId !== actorId);
  const ownSetup = effort?.contributors.find(person => person.actorId === actorId);
  const solo = room.seats.filter(seat => seat.kind === 'human' && !seat.leaving).length === 1;
  const helpKind = helper ? 'party' : ownSetup && solo ? 'learned' : 'none';
  const source = helper ?? (helpKind === 'learned' ? ownSetup : undefined);
  const baseModifier = hero.attributes[challenge.attribute], helpModifier = helpKind === 'party' ? 2 : helpKind === 'learned' ? 1 : 0;
  const modifier = baseModifier + helpModifier, successes = Array.from({ length: 6 }, (_, index) => index + 1).filter(roll => roll + modifier >= challenge.dc).length;
  return { id: challenge.id, attribute: challenge.attribute, dc: challenge.dc, sides: 6, baseModifier, helpModifier, modifier,
    successes, total: 6, chance: successes / 6, helpKind, ...(source ? { helperActorId: source.actorId, helperName: source.actorName, helpSourceEventId: source.sourceEventId } : {}),
    attempts: effort?.attempts ?? 0, complete: !!effort?.completedEventId };
}
export function questMap(room: AdventureRoom) {
  const content = questContent(room);
  const state = room.questRun!;
  const edges = content.edges.map(edge => ({ ...edge, available: edge.from === state.nodeId && (edge.requires ?? []).every(id => questHas(room, id)) && !(edge.absent ?? []).some(id => questHas(room, id)),
    reason: edge.from !== state.nodeId ? `Start from ${content.nodes.find(node => node.id === edge.from)?.label ?? edge.from}.` : (edge.absent ?? []).some(id => questHas(room, id)) ? 'A newer discovered route replaces this approach.' : (edge.requires ?? []).filter(id => !questHas(room, id)).map(id => content.facts[id]?.label ?? id).join(', '),
    taken: room.events.some(event => event.quest?.kind === 'travel' && event.quest.optionId === edge.id) }));
  return { nodes: content.nodes.map(node => ({ ...node, current: node.id === state.nodeId, visited: state.visitedNodeIds.includes(node.id), reachable: edges.some(edge => edge.to === node.id && edge.available) })), edges };
}
export function questCombatNumbers(room: AdventureRoom, actorId: string) {
  const hero = room.questRun!.heroes[actorId], classKey = room.players[actorId].character.classKey, armor = room.questRun!.combat?.enemyArmor ?? 0;
  const { might, wits } = hero.attributes;
  return { attack: Math.max(0, 2 + might + Number(hero.equipment.includes('sluice-hook')) - armor),
    spell: classKey === 'fighter' ? Math.max(0, 2 + might - armor) : classKey === 'rogue' ? 2 + wits : classKey === 'wizard' ? 3 + wits : 1 + wits, armor };
}
export function questCombatMoves(room: AdventureRoom, actorId: string): { id: QuestMove; label: string; description: string; available: boolean; reason?: string }[] {
  const hero = room.questRun?.heroes[actorId]; const seat = room.seats.find(seat => seat.actorId === actorId);
  if (!hero || !seat) return [];
  const { heart } = hero.attributes; const numbers = questCombatNumbers(room, actorId);
  const wounded = room.seats.some(target => target.kind === 'human' && !target.leaving && target.hp < target.character.maxHp);
  const spells: Record<CharacterClassKey, [string, string]> = {
    fighter: ['Shield bash', `Spend 1 mana: deal ${numbers.spell} damage after armor and protect the announced hero for 2.`],
    rogue: ['Shadow feint', `Spend 1 mana: deal ${numbers.spell} damage, ignoring armor.`],
    wizard: ['Arc bolt', `Spend 1 mana: deal ${numbers.spell} damage, ignoring armor.`],
    cleric: ['Kindle', `Spend 1 mana: deal ${numbers.spell} damage, ignoring armor, and heal the most wounded hero by ${2 + heart}.`],
  };
  return [
    { id: 'attack', label: 'Attack', description: `Deal ${numbers.attack} damage${numbers.armor ? ` after ${numbers.armor} armor` : ''}.`, available: seat.hp > 0, ...(seat.hp <= 0 ? { reason: 'Mend or Defend while downed.' } : {}) },
    { id: 'defend', label: 'Defend', description: `Protect the announced hero for ${3 + Number(hero.equipment.includes('reed-shield'))} damage. Restore 1 mana.`, available: true },
    { id: 'spell', label: spells[seat.character.classKey][0], description: spells[seat.character.classKey][1], available: seat.hp > 0 && hero.mana > 0, ...(seat.hp <= 0 || !hero.mana ? { reason: seat.hp <= 0 ? 'Mend or Defend while downed.' : 'Defend to restore mana.' } : {}) },
    { id: 'mend', label: 'Mend', description: `Spend 1 shared supply to heal yourself or an ally by ${2 + heart}. Uses your combat move.`, available: !!room.questRun!.supplies && wounded, ...(!room.questRun!.supplies ? { reason: 'No shared supplies remain.' } : !wounded ? { reason: 'Everyone has full health.' } : {}) },
  ];
}
export function questRunView(room: AdventureRoom, userId: string): QuestRunView {
  const content = questContent(room);
  const state = room.questRun!; const focus = state.focus;
  const activeThreads = state.avalon?.threads.filter(thread => thread.status === 'active') ?? [];
  const avalonObjective = state.avalon && (state.avalon.threads.some(thread => thread.status === 'resolved')
    ? 'Return to Larch Inn, or finish another open thread.'
    : activeThreads.length ? activeThreads.map(thread => AVALON_THREADS[thread.id].question).join(' ')
    : state.avalon.threads.some(thread => thread.status === 'discovered') ? 'Follow a discovered lead, or explore the hills.' : 'Look around. Find out what needs a hand.');
  return { activeActorId: focus?.actorId ?? null, activeActorName: focus ? room.players[focus.actorId]?.character.name ?? 'A hero' : 'No active hero',
    isActive: room.status === 'active' && room.phase === 'choosing' && focus?.actorId === userId,
    actionsRemaining: focus?.remaining ?? 0, node: content.nodes.find(node => node.id === state.nodeId)!, focusEndsAt: room.deadline,
    mode: room.status === 'completed' ? 'completed' : state.combat?.status === 'active' ? 'combat' : 'exploration',
    objective: state.ending?.text ?? avalonObjective ?? (!state.completedObjectives.includes('investigate') ? 'Find what is wrong with Mosswater’s well.' : !state.completedObjectives.includes('source') ? 'Find the source or confirm a clean supply.' : 'Choose how to give Mosswater clean water.'),
    followUp: state.followUp, hero: state.heroes[userId], lootOffers: state.lootOffers.filter(offer => offer.actorId === userId) };
}
export const QUEST_RUN_DEFINITION = {
  id: content.id, version: content.version, title: content.title, pitch: content.pitch,
  chapters: content.chapters.map((chapter, index): ChapterDefinition => ({ ...chapter, location: content.nodes[0].label, intro: index === 0 ? content.opening : chapter.title,
    situation: content.opening, objective: 'Help Mosswater recover its clean water.', threat: 'The well’s trouble remains unresolved.', art: content.nodes[0].art,
    targets: content.nodes[0].targets.map(target => ({ id: target.id, name: target.name, description: target.context, context: target.context, artKey: target.artKey, tokens: ['investigate', 'assist'], effects: [], actionCues: { investigate: 'Inspect the scene freely', assist: 'Choose a displayed quest intention' } })),
    progressGoal: 1, combat: false, endings: { success: 'The party makes a lasting difference to Mosswater.', mixed: 'The party finds a way through the trouble.', setback: 'Mosswater has a safe way forward.' } })),
};
const avalonPreview = avalonContent(createAvalonEpisode('avalon-preview-v1'));
export const AVALON_DEFINITION = {
  id: avalonPreview.id, version: avalonPreview.version, title: avalonPreview.title, pitch: avalonPreview.pitch,
  chapters: avalonPreview.chapters.map((chapter, index): ChapterDefinition => ({
    ...QUEST_RUN_DEFINITION.chapters[index], ...chapter, location: 'Larch Hills of Avalon',
    intro: avalonPreview.opening, situation: avalonPreview.opening, objective: 'Find a local trouble worth following.',
    threat: 'Local troubles change only while the party takes meaningful turns.', art: avalonPreview.nodes.find(node => node.id === avalonPreview.startNodeId)!.art,
    targets: [], endings: { success: 'Your choices leave a changed place in Avalon.', mixed: 'Some troubles are settled; other leads remain.', setback: 'The hills remember what the party discovered.' },
  })),
};
export const AVALON_DICE_DEFINITION = {
  ...AVALON_DEFINITION, version: 2,
  pitch: 'Roll your strengths, build on a friend’s attempt, and make your own way through the Larch Hills.',
};
export function questRunScene(room: AdventureRoom): ChapterDefinition {
  const content = questContent(room);
  const base = (isAvalonDice(room) ? AVALON_DICE_DEFINITION : isAvalon(room) ? AVALON_DEFINITION : QUEST_RUN_DEFINITION).chapters[Math.min(2, room.chapter)]; const state = room.questRun;
  if (!state) return base;
  const view = questRunView(room, ''); const enemy = state.combat && content.enemies[state.combat.enemyId];
  return { ...base, location: view.node.label, art: view.node.art, intro: state.ending?.text ?? view.node.description, situation: state.ending?.text ?? view.node.description,
    catchUp: `${view.objective} ${view.activeActorName} has the current turn.`, objective: view.objective, combat: view.mode === 'combat',
    ...(view.mode === 'combat' && enemy ? { enemySource: state.combat!.enemyId, threat: enemy.description } : {}),
    targets: view.mode === 'combat' && enemy ? [{ id: state.combat!.enemyId, name: enemy.name, description: enemy.description, context: enemy.description, artKey: enemy.artKey, tokens: ['fight', 'assist'], effects: [], actionCues: { fight: 'Choose Attack or your class spell', assist: 'Choose Defend or Mend' } }]
      : view.node.targets.map(target => ({ id: target.id, name: target.name, description: target.context, context: target.context, artKey: target.artKey, tokens: ['investigate', 'assist'], effects: [], actionCues: { investigate: 'Inspect the scene freely', assist: 'Choose a displayed quest intention' }, changed: state.usedOptions.some(id => target.options.some(option => option.id === id)) })),
  };
}
export { QUEST_RUN_CONTENT } from './questRunContent';
export type { QuestRunAction, QuestAction, QuestRunState, QuestRunView } from './questRunTypes';
