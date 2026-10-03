import type { AdventureRoom, PlayerAction, StoryEvent } from './types';
import type { TravelVote } from './journeyTypes';
import { resolveExpeditionRound, validateExpeditionAction, type ExpeditionRuntime } from './expeditionEngine';
import { JOURNEY_EDGES, JOURNEY_NODES, journeyCost, journeyInteractions, journeyLocations, journeyScene, journeyTravelOptions } from './journey';
import { QUEST_ITEMS } from './expedition';
import { isStoryTable, storyTableHas } from './storyTable';
import { recordStoryTableSources, resetStoryTableArea } from './storyTableEngine';
import { storyTableEnding } from './storyTableContent';

export const TRAVEL_MS = 30_000;
const runtime: ExpeditionRuntime = { journey: true, interactions: journeyInteractions, locations: journeyLocations, scene: journeyScene };
const add = (items: string[], item: string) => { if (!items.includes(item)) items.push(item); };
function event(room: AdventureRoom, now: number, data: Omit<StoryEvent, 'id' | 'turn' | 'chapter' | 'at'>) {
  const value = { id: `${room.id}:${room.events.length}`, turn: room.turn, chapter: room.chapter, at: now, ...data };
  room.events.push(value); return value;
}
export function validateJourneyState(room: AdventureRoom) {
  const state = room.expedition;
  if (!state || !state.currentNodeId || !JOURNEY_NODES.some(node => node.id === state.currentNodeId && node.chapter === room.chapter)) throw new Error('This journey is missing its saved run state.');
  if (isStoryTable(room) && (!state.storyTable || !Array.isArray(state.storyTable.facts) || !Number.isInteger(state.storyTable.activeRounds))) throw new Error('This story table is missing its saved situation state.');
  if (room.phase === 'travel' && (!state.travel || state.travel.fromNodeId !== state.currentNodeId || !state.travel.options.some(option => option.edgeId === state.travel!.fallbackEdgeId))) throw new Error('This journey is missing its saved travel decision.');
}
export function validateJourneyAction(room: AdventureRoom, userId: string, action: PlayerAction) { validateExpeditionAction(room, userId, action, runtime); }

/** Record an acquisition once, with every same-round discoverer, rather than deriving ownership from prose. */
function recordDiscoveries(room: AdventureRoom, now: number, previous: string[], batch: StoryEvent[]) {
  const state = room.expedition!;
  for (const itemId of state.questItems.filter(item => !previous.includes(item))) {
    const sources = batch.filter(entry => entry.result?.expedition?.questItems?.includes(itemId)
      || itemId === 'recovered-prism' && entry.kind === 'action' && entry.contribution);
    const sourceEventIds = sources.map(entry => entry.id);
    const gained = event(room, now, { kind: 'consequence', text: `${QUEST_ITEMS[itemId]?.label ?? itemId} is now in the party’s shared quest pouch.`,
      journey: { nodeId: state.currentNodeId!, locationId: sources[0]?.journey?.locationId ?? state.locationId, questChanges: [{ itemId, kind: 'gained', sourceEventIds }] } });
    const edges = JOURNEY_EDGES.filter(edge => edge.from === state.currentNodeId && edge.requires.includes(itemId) && edge.requires.every(required => state.questItems.includes(required)));
    if (edges.length) gained.journey!.unlocks = edges.map(edge => ({ edgeId: edge.id, sourceEventIds: [gained.id] }));
  }
}
export function resolveJourneyRound(room: AdventureRoom, now: number) {
  const state = room.expedition!;
  const beforeItems = [...state.questItems];
  const beforeEvents = room.events.length;
  const closes = resolveExpeditionRound(room, now, runtime);
  const batch = room.events.slice(beforeEvents);
  for (const entry of batch) {
    entry.journey = { nodeId: state.currentNodeId!, locationId: entry.result?.expedition?.locationId ?? state.locationId };
    if (entry.result?.expedition?.questItems?.includes('recovered-prism')) {
      entry.journey.encounter = state.battle?.status === 'escaped' ? 'escaped' : state.battle?.status === 'won' ? 'won' : 'bypassed';
      entry.text = entry.text.replace('Return to the route and prepare the journey home.', 'The recovery is complete. After this reveal, choose the light’s future on the map.').replace('Prepare the return journey on your next turn.', 'The recovery is complete. After this reveal, choose the light’s future on the map.');
      if (entry.change) entry.change.next = 'After the reveal, choose the light’s future on the map.';
    }
  }
  recordDiscoveries(room, now, beforeItems, batch);
  if (isStoryTable(room)) recordStoryTableSources(room, batch);
  if (closes && room.chapter === 2) completeJourneyFinale(room, now);
  return closes;
}
function completeJourneyFinale(room: AdventureRoom, now: number) {
  const state = room.expedition!;
  if (state.ending) return;
  const restore = state.finaleChoice === 'restore';
  const cost = restore ? state.variant === 'smugglers' ? 'The consumed prism destroys the maker-mark evidence.' : 'The living spark survives, bound to the beacon again.' : 'Gemward faces dark evenings until neighbours repair the beacon.';
  add(state.costs, cost);
  state.ending = restore
    ? `Gemward’s beacon shines again. ${cost} Neighbours reopen the evening market beneath its light.`
    : `${state.variant === 'smugglers' ? 'The prism’s maker mark remains evidence against the smugglers.' : 'The living spark is free.'} Gemward shares safe lanterns through dark evenings and begins repairing the beacon together.`;
  if (isStoryTable(room)) state.ending = storyTableEnding(state.variant, restore ? 'restore' : 'release', state.storyTable!.facts.map(fact => fact.id), ['light-ready', 'people-ready'].filter(id => !state.storyTable!.facts.some(fact => fact.id === id)));
  const sourceEventIds = room.events.filter(entry => entry.journey?.questChanges?.some(change => change.itemId === 'recovered-prism' && change.kind === 'gained')).map(entry => entry.id);
  if (restore) state.questItems = state.questItems.filter(item => item !== 'recovered-prism');
  event(room, now, { kind: 'consequence', text: state.ending, result: { changed: true, expedition: { finaleChoice: state.finaleChoice } },
    journey: { nodeId: state.currentNodeId!, locationId: state.locationId, ...(restore ? { questChanges: [{ itemId: 'recovered-prism', kind: 'spent' as const, sourceEventIds }] } : {}) },
    change: { title: restore ? 'The beacon shines' : 'Lanterns light the square', text: state.ending, next: 'The party’s journey and its lasting cost are recorded.' },
  });
}
export function journeyChapterOutcome(room: AdventureRoom): { result: 'success' | 'mixed' | 'setback'; text: string } {
  if (isStoryTable(room) && room.chapter === 0) return { result: room.expedition!.storyTable!.completion === 'gather' ? 'success' : 'mixed', text: 'The party gathers with its recorded leads and preparations. Everyone’s accepted work is complete. Choose the next route together; the hill road remains available.' };
  if (isStoryTable(room) && room.chapter === 2) return { result: storyTableHas(room, 'light-ready') && storyTableHas(room, 'people-ready') ? 'success' : 'mixed', text: room.expedition!.ending! };
  if (room.chapter === 0) return { result: room.progress >= 4 ? 'success' : 'mixed', text: 'The party has finished preparing in Gemward. Its discoveries are shared in the quest pouch. Choose the next route together after this chapter’s reveal; the open hill road is always available.' };
  if (room.chapter === 1) return { result: room.expedition!.battle?.status === 'escaped' ? 'mixed' : 'success', text: `The missing prism is recovered. ${room.expedition!.variant === 'smugglers' ? 'Its maker mark proves the theft.' : 'Nella moved the failing prism to save its living spark.'} ${journeyCost(room, 'beacon')} ${journeyCost(room, 'lantern-square')} Choose the final destination together after this reveal.` };
  return { result: room.progress >= 4 ? 'success' : 'mixed', text: room.expedition!.ending! };
}
/** Called after reveal and admission. Availability and electorate are frozen for this decision. */
export function beginJourneyTravel(room: AdventureRoom, now: number) {
  const state = room.expedition!;
  delete state.travel;
  const options = journeyTravelOptions(room).filter(option => option.available);
  const fallback = state.currentNodeId === 'town' ? 'town-road' : `${state.currentNodeId}-lantern-square`;
  if (!options.some(option => option.edgeId === fallback)) throw new Error('This journey cannot open its next destination.');
  room.turn++; room.phase = 'travel'; room.deadline = now + TRAVEL_MS; room.revealUntil = null; room.revealSkips = []; room.commits = {};
  delete room.enemyIntent; delete state.battle;
  state.travel = { id: `${room.id}:travel:${room.turn}`, fromNodeId: state.currentNodeId!,
    options: options.map(option => ({ edgeId: option.edgeId, toNodeId: option.toNodeId, unlockEventIds: option.unlockEventIds, costIds: option.toNodeId === 'road' ? ['road-supplies'] : option.toNodeId === 'beacon' ? ['restore-cost'] : option.toNodeId === 'lantern-square' ? ['release-cost'] : [] })),
    fallbackEdgeId: fallback, eligibleActorIds: room.seats.filter(seat => seat.kind === 'human' && !seat.leaving).map(seat => seat.actorId).sort(), votes: {},
  };
}
export function acceptJourneyVote(room: AdventureRoom, userId: string, vote: TravelVote | undefined, now: number) {
  const travel = room.expedition!.travel;
  if (room.status !== 'active' || room.phase !== 'travel' || !travel || now >= room.deadline) throw new Error('This travel decision has ended.');
  if (!vote || typeof vote !== 'object' || Array.isArray(vote) || Object.keys(vote).some(key => !['decisionId', 'edgeId'].includes(key)) || vote.decisionId !== travel.id || typeof vote.edgeId !== 'string') throw new Error('Choose a destination in this travel decision.');
  const seat = room.seats.find(seat => seat.actorId === userId && seat.kind === 'human' && !seat.leaving);
  if (!seat || !travel.eligibleActorIds.includes(userId)) throw new Error('Your seat opens when the party reaches its destination.');
  if (travel.votes[userId]) throw new Error('Your destination vote is already committed.');
  if (!travel.options.some(option => option.edgeId === vote.edgeId)) throw new Error('That destination was not available when this decision opened.');
  travel.votes[userId] = { edgeId: vote.edgeId, actorName: seat.character.name };
}
export function journeyVotesReady(room: AdventureRoom) {
  const travel = room.expedition!.travel!;
  const remaining = room.seats.filter(seat => seat.kind === 'human' && !seat.leaving && travel.eligibleActorIds.includes(seat.actorId));
  return (remaining.length > 0 || Object.keys(travel.votes).length > 0) && remaining.every(seat => travel.votes[seat.actorId]);
}
/** Votes change destination once; they never produce actions, XP, missed-turn penalties or chapter credit. */
export function resolveJourneyTravel(room: AdventureRoom, now: number) {
  const state = room.expedition!;
  const travel = state.travel!;
  const tally = travel.options.map(option => ({ option, count: Object.values(travel.votes).filter(vote => vote.edgeId === option.edgeId).length }));
  const best = Math.max(0, ...tally.map(entry => entry.count));
  const leaders = tally.filter(entry => entry.count === best && best > 0);
  const chosen = leaders.length === 1 ? leaders[0].option : travel.options.find(option => option.edgeId === travel.fallbackEdgeId)!;
  const transition = { edgeId: chosen.edgeId, from: travel.fromNodeId, to: chosen.toNodeId, reason: leaders.length === 1 ? 'vote' as const : 'fallback' as const, unlockEventIds: chosen.unlockEventIds, costIds: chosen.costIds, votes: travel.votes };
  event(room, now, { kind: 'consequence', text: `${leaders.length === 1 ? 'The party chooses' : 'Tied or absent votes use the announced fallback'}: ${JOURNEY_NODES.find(node => node.id === chosen.toNodeId)!.label}. ${journeyCost(room, chosen.toNodeId)}`,
    journey: { nodeId: travel.fromNodeId, transition }, result: { changed: true } });
  state.currentNodeId = chosen.toNodeId; state.locationId = chosen.toNodeId;
  state.explorationTurns = 0; add(state.visited, chosen.toNodeId);
  if (travel.fromNodeId === 'town') {
    state.routeId = chosen.toNodeId;
    if (chosen.toNodeId === 'road') { if (!isStoryTable(room)) room.danger++; add(state.costs, isStoryTable(room) ? 'The exposed hill road strengthens each watcher strike by 1 damage.' : 'The open hill road costs time and travel supplies.'); }
  } else state.finaleChoice = chosen.toNodeId === 'beacon' ? 'restore' : 'release';
  delete state.travel;
  room.chapter = JOURNEY_NODES.find(node => node.id === chosen.toNodeId)!.chapter; room.chapterRound = 1; room.progress = 0;
  room.turn++; room.phase = 'choosing'; room.deadline = now + 60_000; room.revealUntil = null; room.revealSkips = []; room.commits = {};
  if (isStoryTable(room)) resetStoryTableArea(room);
  for (const seat of room.seats) { seat.hp = Math.min(seat.character.maxHp, seat.hp + 3); if (seat.kind === 'human') room.players[seat.actorId].character.hp = seat.hp; }
  event(room, now, { kind: 'chapter', text: journeyScene(room).intro, journey: { nodeId: chosen.toNodeId, locationId: chosen.toNodeId } });
}
