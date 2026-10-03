import type { AdventureRoom, PlayerAction, StoryEvent } from './types';
import { journeyActionPreview, journeyScene, journeyTarget, JOURNEY_NODES } from './journey';
import { CONSUMABLES, QUEST_ITEMS } from './expedition';
import { getStoryTableState, isStoryTable, storyFactCopy } from './storyTable';

export interface StoryTableMoment {
  id: string;
  title: string;
  text: string;
  detail: string;
  actorNames: string[];
  items: string[];
}
export interface StoryTableView {
  title: string;
  situation: string;
  question: string;
  chapterSteps: { label: string; state: 'done' | 'current' | 'ahead' }[];
  lastTurn?: StoryTableMoment;
  focus?: { title: string; body: string; stake: string; alreadyDone: boolean };
  opportunities: { id: string; label: string; detail: string; done: boolean; itemId?: string }[];
  plan?: { label: string; description: string; action: PlayerAction; available: boolean; reason?: string };
  remaining?: string;
  remainingLabel?: string;
}

const unique = (values: string[]) => [...new Set(values)];
const itemLead: Record<string, { title: string; next: string }> = {
  'ledger-copy': { title: 'A delivery leads to the warehouse', next: 'The copied mark opens the warehouse path.' },
  'canal-key': { title: 'Bram opens another way', next: 'His key opens a sheltered canal approach.' },
  'road-lead': { title: 'An escort took the hill road', next: 'The watcher’s habit can give the party an opening in battle.' },
  'ward-warning': { title: 'Putting the light back has a cost', next: 'Keep the warning in mind when you find the prism.' },
  'buyer-evidence': { title: 'The delivery has a name behind it', next: 'The record explains who moved the prism. Prepare for its watcher.' },
  'mooring-line': { title: 'The landing is secure', next: 'A distraction or a search along the light can now avoid a fight.' },
  'quiet-passage': { title: 'Your preparation avoided a battle', next: 'The secured landing let the party slip past the watcher.' },
  'recovered-prism': { title: 'The missing light is in your hands', next: 'Decide together what its light should become.' },
};

function namesFor(events: StoryEvent[], userId: string) {
  return unique(events.filter(event => event.actorName).map(event => event.actorId === userId ? 'You' : event.actorName!));
}

/** A durable reading surface, derived only from accepted history. Never a playback clock. */
export function storyTableLastTurn(room: AdventureRoom, userId: string): StoryTableMoment | undefined {
  const relevant = room.events.filter(event => event.journey?.transition || event.journey?.questChanges?.length || event.result?.expedition?.storyTable
    || event.change || event.kind === 'action' && event.contribution === true);
  if (!relevant.length) return;
  const latestTurn = Math.max(...relevant.map(event => event.turn));
  const batch = relevant.filter(event => event.turn === latestTurn);
  const transitionEvent = batch.find(event => event.journey?.transition);
  if (transitionEvent) {
    const transition = transitionEvent.journey!.transition!;
    const destination = JOURNEY_NODES.find(node => node.id === transition.to)?.label ?? 'the next place';
    const sources = transition.unlockEventIds.flatMap(id => room.events.find(event => event.id === id)?.journey?.questChanges ?? []);
    const items = unique(sources.filter(change => change.kind === 'gained').map(change => change.itemId));
    const actors = room.events.filter(event => sources.some(change => change.sourceEventIds.includes(event.id)));
    return { id: transitionEvent.id, title: `The party ${transition.reason === 'fallback' ? 'took' : 'chose'} ${destination}`,
      text: transition.reason === 'fallback' ? 'Tied or absent votes used the announced route.'
        : items.length ? `${items.map(id => QUEST_ITEMS[id]?.label ?? id).join(' and ')} made this path possible.` : 'Your route vote brought the party here.',
      detail: transitionEvent.text, actorNames: namesFor(actors, userId), items };
  }
  const final = room.status === 'completed' ? [...batch].reverse().find(event => event.kind === 'consequence' && event.change) : undefined;
  if (final) return { id: final.id, title: final.change!.title, text: final.change!.text, detail: final.text, actorNames: [], items: [] };

  const acquisitions = batch.filter(event => event.journey?.questChanges?.some(change => change.kind === 'gained'));
  const items = unique(acquisitions.flatMap(event => event.journey!.questChanges!.filter(change => change.kind === 'gained').map(change => change.itemId)));
  const actions = batch.filter(event => event.kind === 'action' && event.contribution);
  if (items.length) {
    const primary = items.includes('recovered-prism') ? 'recovered-prism' : items.find(id => id !== 'ward-warning') ?? items[0];
    const acquisition = acquisitions.find(event => event.journey!.questChanges!.some(change => change.itemId === primary))!;
    const sourceIds = acquisition.journey!.questChanges!.find(change => change.itemId === primary)!.sourceEventIds;
    const sourceActions = room.events.filter(event => sourceIds.includes(event.id));
    const source = sourceActions.find(event => event.actorId === userId) ?? sourceActions[0];
    const cause = itemLead[primary] ?? { title: QUEST_ITEMS[primary]?.label ?? 'A new shared discovery', next: QUEST_ITEMS[primary]?.description ?? 'The party has a new fact to use.' };
    const actorNames = namesFor(sourceActions, userId);
    const recordedChange = source?.result?.expedition?.storyTable?.after;
    return { id: acquisition.id, title: cause.title,
      text: recordedChange ? `${actorNames.length ? `${actorNames.join(' and ')}: ` : ''}${recordedChange}` : `${actorNames.length ? `${actorNames.join(' and ')} found this. ` : ''}${cause.next}`,
      detail: unique([source?.text ?? '', cause.next, ...items.filter(id => id !== primary).map(id => itemLead[id]?.next ?? QUEST_ITEMS[id]?.description ?? '')].filter(Boolean)).join(' '),
      actorNames, items };
  }

  const action = actions.find(event => event.actorId === userId) ?? actions.find(event => event.result?.changed) ?? actions[0];
  const consequence = [...batch].reverse().find(event => (event.change || event.result?.expedition?.storyTable) && event.kind === 'consequence');
  const chosen = consequence ?? action;
  if (!chosen) return;
  const recorded = chosen.result?.expedition?.storyTable;
  const gift = CONSUMABLES.find(item => item.id === chosen.result?.expedition?.reward?.item.kind);
  const title = recorded?.lanternSpent ? 'Oren’s help protected the party' : recorded?.completion === 'gather' ? 'Ready to follow your lead'
    : recorded?.completion === 'finish' ? 'The party finishes together' : recorded?.extraOpportunity ? 'One more chance to prepare'
      : recorded?.factIds.length ? `${storyFactCopy(recorded.factIds[0]).label} · ready`
        : gift ? `${gift.label} · offered` : chosen.change?.title ?? (chosen.result?.changed === false ? 'A familiar part of the plan' : 'Your party’s last move');
  return { id: chosen.id, title,
    text: recorded?.after ?? chosen.change?.text ?? chosen.text, detail: unique([chosen.text, recorded?.next ?? chosen.change?.next ?? '', ...actions.filter(event => event.id !== chosen.id).map(event => event.text)].filter(Boolean)).join(' '),
    actorNames: namesFor(actions, userId), items: [] };
}

export function buildStoryTable(room: AdventureRoom, userId: string, selectedAction?: PlayerAction | null): StoryTableView {
  const state = room.expedition;
  const items = state?.questItems ?? [];
  const recovered = items.includes('recovered-prism') || !!state?.encounterResolved;
  const scene = journeyScene(room, selectedAction?.expedition?.locationId);
  const table = isStoryTable(room) ? getStoryTableState(room) : undefined;
  const battle = state?.battle?.status === 'active';
  const completed = room.status === 'completed';
  const title = completed ? 'The evening you changed' : room.chapter === 0 ? 'A town without its light' : room.chapter === 1 ? recovered ? 'A light with a price' : 'Follow the missing light' : 'Make your choice real';
  let situation = room.chapter === 0 ? 'Gemward’s beacon has gone dark. Iris’s prism is missing, and the neighbours need its light to get home.'
    : room.chapter === 1 ? recovered ? state?.variant === 'smugglers' ? 'The maker mark proves the theft. Relighting the beacon will destroy that evidence.' : 'Nella moved the prism to save its living spark. Putting it back will bind it again.'
      : state?.routeId === 'canal' ? 'Bram’s key brought you to a guarded landing. A little preparation could get everyone past quietly.'
        : state?.routeId === 'warehouse' ? 'Iris’s delivery mark led here. Find who moved the prism before facing its watcher.'
          : 'You followed the exposed hill road. The watcher stands between the party and the missing light.'
    : state?.finaleChoice === 'restore' ? 'You chose to restore the beacon. Prepare the light and the people who will live with its cost.'
      : 'You chose to release the light. Prepare safe lanterns and help the neighbours through the dark.';
  if (battle) situation = scene.threat;
  if (completed) situation = state?.ending ?? room.outcomes.at(-1)?.text ?? scene.situation ?? situation;
  const hasLead = table ? table.milestoneStates.some(item => item.id === 'lead' && item.complete) : items.some(item => ['ledger-copy', 'canal-key', 'road-lead'].includes(item));
  let question = room.chapter === 0 ? hasLead ? 'Follow a lead now, or help someone before you go?' : 'Who knows where the missing prism went?'
    : room.chapter === 1 ? recovered ? 'What should the light become?' : battle ? 'How will you get everyone past the watcher?' : state?.questItems.includes('mooring-line') ? 'Who can use the landing to slip past?' : 'What could make this approach safer?'
      : 'What should be ready before you finish together?';
  if (completed) question = 'Your route and the people you helped are part of this story.';
  if (room.phase === 'travel') question = room.chapter === 0 ? 'Which lead will your party follow?' : 'Restore the beacon, or release its light?';

  let opportunities: StoryTableView['opportunities'] = room.chapter === 0 ? [
    { id: 'warehouse', label: 'The delivery trail', detail: 'Ask Iris about prices or inspect the delivery seal.', done: items.includes('ledger-copy'), itemId: 'ledger-copy' },
    { id: 'canal', label: 'A quieter way', detail: 'Bram can lend a key to the canal.', done: items.includes('canal-key'), itemId: 'canal-key' },
    { id: 'warning', label: 'The keeper’s warning', detail: 'Find out what putting a prism back might cost.', done: items.includes('ward-warning'), itemId: 'ward-warning' },
  ] : room.chapter === 1 ? [
    { id: 'approach', label: state?.routeId === 'canal' ? 'A secure landing' : 'A prepared approach', detail: state?.routeId === 'canal' ? 'Help moor the skiff before trying a quiet recovery.' : 'A traced record explains the guarded delivery.', done: items.includes(state?.routeId === 'canal' ? 'mooring-line' : 'buyer-evidence') },
    { id: 'recover', label: 'The missing prism', detail: 'Recover it by overcoming the watcher or using the quiet passage.', done: recovered, itemId: 'recovered-prism' },
  ] : [];
  let focus: StoryTableView['focus'];
  if (selectedAction) {
    const preview = journeyActionPreview(room, userId, selectedAction);
    const target = scene.targets.find(item => item.id === selectedAction.targetId)
      ?? journeyTarget(selectedAction.expedition?.locationId ?? state?.locationId, selectedAction.targetId);
    const previous = [...room.events].reverse().find(event => event.actorId === userId && event.result?.expedition?.interactionId === selectedAction.expedition?.interactionId && selectedAction.expedition?.interactionId);
    focus = { title: preview.label, body: preview.description, stake: target?.context ?? target?.description ?? question,
      alreadyDone: !!previous && previous.result?.changed === false && !selectedAction.expedition?.consumableId };
  }
  const chapterSteps: StoryTableView['chapterSteps'] = table && (room.chapter === 0 || room.chapter === 2)
    ? table.milestoneStates.map(milestone => ({ label: milestone.label + (milestone.required ? '' : ' · optional'), state: milestone.complete ? 'done' : milestone.required ? 'current' : 'ahead' }))
    : ['A light goes missing', 'What you discover', 'The evening you change'].map((label, index) => ({ label, state: completed || index < room.chapter ? 'done' : index === room.chapter ? 'current' : 'ahead' }));
  if (table && (room.chapter === 0 || room.chapter === 2)) {
    opportunities = table.milestoneStates.map(milestone => ({ id: milestone.id, label: milestone.label, detail: milestone.description, done: milestone.complete }));
    if (room.chapter === 2 && table.plan.available) question = table.preparations.some(item => item.id === 'repair-plan' && item.complete)
      ? 'The preparations are ready. Finish together when you are ready.' : 'Finish together now, or arrange the morning repairs first?';
  }
  const remaining = table && !completed && room.phase !== 'travel' && (room.chapter === 0 || room.chapter === 2)
    ? `${table.remainingActiveRounds} active ${table.remainingActiveRounds === 1 ? 'round' : 'rounds'} left here. ${room.chapter === 0 ? 'Then the party gathers with the leads it has.' : 'Then the keeper completes the ending with the preparations you made.'}` : undefined;
  const remainingLabel = remaining && table ? `${table.remainingActiveRounds} ${table.remainingActiveRounds === 1 ? 'round' : 'rounds'} ${room.chapter === 0 ? 'before departure' : 'to prepare'}` : undefined;
  return { title, situation, question, focus, lastTurn: storyTableLastTurn(room, userId), opportunities,
    chapterSteps, remaining, remainingLabel, ...(table && !completed && room.phase !== 'travel' && (room.chapter === 0 || room.chapter === 2) ? { plan: table.plan } : {}),
  };
}
