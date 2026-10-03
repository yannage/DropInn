import type { AdventureRoom, StoryEvent } from './types';
import type { ExpeditionInteraction } from './expeditionTypes';
import type { StoryTableFactId, StoryTableResult } from './storyTableTypes';
import { getStoryTableState, storyFactCopy, storyTableHas } from './storyTable';
import { QUEST_ITEMS } from './expedition';
const addEvent = (room: AdventureRoom, now: number, data: Omit<StoryEvent, 'id' | 'turn' | 'chapter' | 'at'>) => room.events.push({ id: `${room.id}:${room.events.length}`, turn: room.turn, chapter: room.chapter, at: now, ...data });

export function applyStoryTableIntention(room: AdventureRoom, frozen: AdventureRoom, intention: ExpeditionInteraction): StoryTableResult {
  const run = room.expedition!.storyTable!;
  const gained = (intention.storyFacts ?? []).filter(id => !storyTableHas(frozen, id));
  for (const id of gained) if (!run.facts.some(fact => fact.id === id)) run.facts.push({ id, turn: room.turn, sourceEventIds: [] });
  if (intention.storyPlan) run.completion = intention.storyPlan;
  const repeated = !!intention.storyFacts?.length && gained.length === 0;
  const gainedItem = intention.questItem && !frozen.expedition!.questItems.includes(intention.questItem) ? intention.questItem : undefined;
  const after = intention.storyPlan ? intention.storyPlan === 'gather' ? 'The party gathers to leave. Every accepted move settles before the route decision.' : 'The prepared light and neighbours are ready. Every accepted move settles before the ending.'
    : gained.length ? gained.map(id => storyFactCopy(id).result).join(' ') : gainedItem ? `${QUEST_ITEMS[gainedItem]?.label ?? gainedItem} is now recorded for the party. ${gainedItem === 'buyer-evidence' ? intention.description : QUEST_ITEMS[gainedItem]?.description ?? ''}`.trim() : repeated ? intention.storyFacts!.map(id => storyFactCopy(id).repeat).join(' ') : 'The party supports the current plan. No new preparation is added.';
  const future = getStoryTableState({ ...room, turn: room.turn + 1, phase: 'choosing' });
  return { factIds: gained, before: intention.storyPlan ? 'The necessary preparation was ready before this turn.' : gained.length ? gained.map(id => `${storyFactCopy(id).label} was not yet prepared.`).join(' ') : 'The party already has the current facts.',
    after, next: intention.storyPlan ? intention.storyPlan === 'gather' ? 'Choose the route together after this result.' : 'See what your preparations changed for Gemward.'
      : room.chapter === 1 ? 'Use the route’s new state on the next turn.' : future.plan.available ? `Next turn: ${future.plan.label}, or complete another useful preparation.` : future.plan.reason,
    ...(repeated ? { repeated: true } : {}), ...(intention.storyPlan ? { completion: intention.storyPlan } : {}) };
}
export function recordStoryTableSources(room: AdventureRoom, batch: StoryEvent[]) {
  for (const fact of room.expedition!.storyTable!.facts) if (fact.turn === room.turn) {
    fact.sourceEventIds = batch.filter(entry => entry.result?.expedition?.storyTable?.factIds.includes(fact.id)).map(entry => entry.id);
  }
}
export function closeStoryTableRound(room: AdventureRoom, now: number, actualActions: number): boolean {
  const run = room.expedition!.storyTable!;
  if (actualActions) run.activeRounds++;
  if (run.completion === 'gather' || run.completion === 'finish') return true;
  if (run.activeRounds < getStoryTableState(room).activeRoundCap) return false;
  run.completion = 'fallback';
  const missing = room.chapter === 0 ? 'The party takes the leads it found; any unmade preparations remain unfinished.' : ['light-ready', 'people-ready'].filter(id => !storyTableHas(room, id as StoryTableFactId)).map(id => storyFactCopy(id as StoryTableFactId).label).join(' and ');
  const after = room.chapter === 0 ? 'The last announced preparation opportunity is complete. Iris gathers the party for departure.' : `The last announced preparation opportunity is complete. The keeper finishes the emergency work${missing ? `; still missing: ${missing}` : ''}.`;
  addEvent(room, now, { kind: 'consequence', text: after, result: { changed: true, expedition: { storyTable: { factIds: [], before: 'The area’s announced opportunity limit was reached.', after, next: room.chapter === 0 ? 'Choose an available route together.' : 'The ending records exactly what was prepared.', completion: 'fallback' } } } });
  return true;
}
export function resetStoryTableArea(room: AdventureRoom) {
  const run = room.expedition!.storyTable!;
  run.activeRounds = 0; run.extraOpportunity = false; delete run.completion;
}
