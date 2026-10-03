import type { AdventureRoom, PlayerAction, TokenKind } from './types';
import type { ExpeditionInteraction } from './expeditionTypes';
import type { StoryTableFactId, StoryTableMilestone, StoryTableRun, StoryTableView } from './storyTableTypes';
import { CONSUMABLES, QUEST_ITEMS } from './expedition';
import { GEMWARD_STORY_COPY, GEMWARD_STORY_FACT_COPY, storyTableCost, storyTableWarning } from './storyTableContent';
export type { StoryTableFactId, StoryTableResult, StoryTableRun, StoryTableView } from './storyTableTypes';

export const isStoryTable = (room: Pick<AdventureRoom, 'adventureId' | 'adventureVersion'>) => room.adventureId === 'gemward' && room.adventureVersion === 3;
export const createStoryTable = (): StoryTableRun => ({ facts: [], activeRounds: 0, extraOpportunity: false, lanternSpent: false });
export const STORY_TABLE_CAPS = { town: 6, finale: 4 } as const;
const leads: StoryTableFactId[] = ['ledger-copy', 'canal-key', 'road-lead'];
const required: StoryTableFactId[] = ['light-ready', 'people-ready'];
export const storyTableHas = (room: AdventureRoom, id: StoryTableFactId) => !!room.expedition?.storyTable?.facts.some(fact => fact.id === id);
const prior = (room: AdventureRoom, id: StoryTableFactId) => !!room.expedition?.storyTable?.facts.some(fact => fact.id === id && fact.turn < room.turn);
export function storyFactCopy(id: StoryTableFactId) {
  return GEMWARD_STORY_FACT_COPY[id] ?? { label: QUEST_ITEMS[id]?.label ?? id, preview: QUEST_ITEMS[id]?.description ?? 'A shared preparation.', result: QUEST_ITEMS[id]?.description ?? 'The party records a preparation.', repeat: 'The party already knows this; the fact remains available.' };
}
export function getStoryTableState(room: AdventureRoom): StoryTableView {
  const run = room.expedition?.storyTable ?? createStoryTable();
  const finale = room.chapter === 2;
  const ready = finale ? required.every(id => prior(room, id)) : leads.some(id => prior(room, id));
  const activeRoundCap = (finale ? STORY_TABLE_CAPS.finale : STORY_TABLE_CAPS.town) + Number(run.extraOpportunity);
  const entries = (ids: StoryTableFactId[], needed: boolean): StoryTableMilestone[] => ids.map(id => ({ id, label: storyFactCopy(id).label, description: storyFactCopy(id).preview, complete: storyTableHas(room, id), required: needed }));
  const preparations = finale ? [...entries(required, true), ...entries(['repair-plan'], false)] : entries(['watcher-tell', 'packed-lantern'], false);
  const milestoneStates = finale ? preparations : [{ id: 'lead', label: 'A way to the prism', description: 'Find a delivery record, canal key or witness route before gathering.', complete: leads.some(id => storyTableHas(room, id)), required: true }, ...preparations];
  return {
    facts: run.facts.map(fact => ({ ...fact, label: storyFactCopy(fact.id).label, description: storyFactCopy(fact.id).result })),
    preparations, milestoneStates, activeRounds: run.activeRounds, activeRoundCap, remainingActiveRounds: Math.max(0, activeRoundCap - run.activeRounds),
    plan: {
      label: finale ? GEMWARD_STORY_COPY.finishLabel : GEMWARD_STORY_COPY.setOutLabel,
      description: finale ? `${GEMWARD_STORY_COPY.finishPreview} ${storyTableCost(room.expedition?.variant ?? 'smugglers', room.expedition?.finaleChoice ?? 'release')}` : GEMWARD_STORY_COPY.setOutPreview,
      available: isStoryTable(room) && room.status === 'active' && room.phase === 'choosing' && (room.chapter === 0 || finale) && ready,
      action: { token: 'assist', targetId: finale ? 'keeper' : 'iris', targetKind: 'scene', expedition: { locationId: finale ? room.expedition?.currentNodeId ?? 'beacon' : 'shop', interactionId: finale ? 'story-plan:finish' : 'story-plan:gather' } },
      reason: ready ? 'Everyone’s accepted actions settle before the party moves on.' : finale ? 'Prepare the light and the neighbours on an earlier turn first.' : 'Discover a route lead on an earlier turn first.',
    },
  };
}
/** V3-specific item meaning. Earlier versions continue using the original definition. */
export function storyTableConsumable(room: AdventureRoom, kind: string, action?: PlayerAction) {
  const definition = CONSUMABLES.find(item => item.id === kind);
  if (!definition) return { description: 'Unknown item.', usable: false, reason: 'Unknown item.' };
  const battle = room.expedition?.battle?.status === 'active';
  let reason = definition.when === 'combat' && !battle ? 'Use this during a battle.' : definition.when === 'exploration' && battle ? 'Use this while exploring.' : '';
  let description = definition.description;
  if (kind === 'favour' && room.chapter !== 0) reason = 'A local favour opens a town route before departure.';
  if (isStoryTable(room) && kind === 'dust') {
    description = 'Gain one extra active exploration opportunity in this town or finale. The party can extend an area once; several doses do not stack.';
    if (battle || room.chapter === 1) reason = 'Spark dust buys preparation time in town or the finale.';
    else if (room.expedition?.storyTable?.extraOpportunity) reason = 'This area already has its extra opportunity.';
    else if (action?.expedition?.interactionId?.startsWith('story-plan:')) reason = 'Spark dust cannot extend an area while you are setting out or finishing. Keep it for a preparation action.';
  }
  return { description, usable: !reason, reason };
}
export function storyTableInteractions(room: AdventureRoom, locationId: string, targetId: string, token: TokenKind, base: ExpeditionInteraction[]): ExpeditionInteraction[] {
  if (!isStoryTable(room) || room.expedition?.battle?.status === 'active') return base;
  let options = base.map(item => ({ ...item }));
  if (room.chapter === 0) {
    if (targetId === 'iris' && token === 'influence') options = [
      { id: 'iris:pricing', label: 'Ask about gem prices', description: storyFactCopy('ledger-copy').preview, questItem: 'ledger-copy' },
      { id: 'iris:news', label: 'Ask what happened tonight', description: storyFactCopy('road-lead').preview + ' ' + storyFactCopy('watcher-tell').preview, storyFacts: ['road-lead', 'watcher-tell'] },
    ];
    options = options.map(item => {
      const facts = [...item.storyFacts ?? []];
      if (item.questItem && ['ledger-copy', 'canal-key', 'ward-warning'].includes(item.questItem)) facts.push(item.questItem as StoryTableFactId);
      if (targetId === 'oren' && token === 'assist') facts.push('packed-lantern');
      const warnings = item.questItem === 'ward-warning';
      const extra = targetId === 'oren' && token === 'assist' ? ' ' + storyFactCopy('packed-lantern').preview : '';
      return { ...item, storyFacts: [...new Set(facts)], description: warnings ? storyTableWarning(room.expedition!.variant) : item.description + extra };
    });
    if (targetId === 'iris' && token === 'assist' && getStoryTableState(room).plan.available) options.push({ id: 'story-plan:gather', label: GEMWARD_STORY_COPY.setOutLabel, description: GEMWARD_STORY_COPY.setOutPreview, storyPlan: 'gather' });
  } else if (room.chapter === 2) {
    options = options.map(item => {
      const fact: StoryTableFactId | undefined = ['beacon', 'cradle', 'lanterns', 'spark'].includes(targetId) && ['assist', 'fight'].includes(token) ? 'light-ready'
        : ['town', 'neighbours'].includes(targetId) && ['assist', 'influence'].includes(token) ? 'people-ready'
        : targetId === 'keeper' && ['assist', 'investigate'].includes(token) ? 'repair-plan' : undefined;
      return { ...item, ...(fact ? { storyFacts: [fact], description: storyFactCopy(fact).preview } : { description: item.description + ' This confirms the plan; it does not prepare a new task.' }) };
    });
    if (targetId === 'keeper' && token === 'assist' && getStoryTableState(room).plan.available) options.push({ id: 'story-plan:finish', label: GEMWARD_STORY_COPY.finishLabel, description: getStoryTableState(room).plan.description, storyPlan: 'finish' });
  }
  return options.map(item => {
    const known = item.storyFacts?.length && item.storyFacts.every(id => storyTableHas(room, id));
    if (known && !item.storyPlan) return { ...item, description: item.storyFacts!.map(id => storyFactCopy(id).repeat).join(' ') + (item.consumable ? ' Any first personal gift from this person is still available.' : '') };
    if (!item.storyPlan && !item.storyFacts?.length && !item.questItem && !item.consumable) return { ...item, description: `${item.description} This supports the current plan; it adds no new preparation.` };
    return item;
  });
}
