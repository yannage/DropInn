import type { AdventureRoom, ChapterDefinition, PlayerAction, SceneTarget, TokenKind } from './types';
import type { ExpeditionInteraction } from './expeditionTypes';
import type { JourneyMapEdge, JourneyMapNode, JourneyNodeId, JourneyTravelOption } from './journeyTypes';
import { createExpedition, expeditionActionPreview, expeditionInteractions, expeditionLocations, expeditionScene, expeditionTarget, GEMWARD_DEFINITION, QUEST_ITEMS } from './expedition';
import { createStoryTable, getStoryTableState, isStoryTable, storyTableConsumable, storyTableInteractions } from './storyTable';
import { GEMWARD_STORY_COPY } from './storyTableContent';
export type { JourneyNodeId, JourneyMapNode, JourneyMapEdge, JourneyTravelOption, TravelVote } from './journeyTypes';

export const isJourney = (room: Pick<AdventureRoom, 'adventureId' | 'adventureVersion'>) => room.adventureId === 'gemward' && (room.adventureVersion === 2 || room.adventureVersion === 3);
export const createJourney = (seed: string, version = 2) => ({ ...createExpedition(seed), currentNodeId: 'town' as const, ...(version === 3 ? { storyTable: createStoryTable() } : {}) });
export const JOURNEY_DEFINITION = { ...GEMWARD_DEFINITION, version: 2,
  pitch: 'Explore an illustrated town, unlock a shared branching journey, and decide the missing light’s future.',
  chapters: GEMWARD_DEFINITION.chapters.map((chapter, index) => ({ ...chapter,
    objective: ['Explore Gemward and prepare a lead together.', 'Recover the prism along the party’s chosen route.', 'Carry out the party’s decision and help the neighbours.'][index],
    progressGoal: index === 1 ? 8 : 4,
  })),
};
export const STORY_TABLE_DEFINITION = { ...JOURNEY_DEFINITION, version: 3,
  pitch: 'Follow a missing light, prepare your own departure, and bring your choices home.',
  chapters: JOURNEY_DEFINITION.chapters.map((chapter, index) => ({ ...chapter,
    ...(index === 0 ? { intro: GEMWARD_STORY_COPY.opening, situation: GEMWARD_STORY_COPY.opening, objective: GEMWARD_STORY_COPY.townObjective, catchUp: GEMWARD_STORY_COPY.townCatchUp } : index === 2 ? { objective: GEMWARD_STORY_COPY.finaleObjective } : {}),
  })),
};
export const JOURNEY_NODES: { id: JourneyNodeId; label: string; chapter: number; description: string; locations: string[] }[] = [
  { id: 'town', label: 'Gemward', chapter: 0, description: 'Explore the shop, inn and docks. Shared discoveries open the next paths.', locations: ['shop', 'tavern', 'docks'] },
  { id: 'warehouse', label: 'Old warehouse', chapter: 1, description: 'Trace a delivery record, then confront the guard with an advantage.', locations: ['warehouse'] },
  { id: 'canal', label: 'Hidden canal', chapter: 1, description: 'Secure a mooring, then distract the watcher or trace the light to avoid a battle.', locations: ['canal'] },
  { id: 'road', label: 'Open hill road', chapter: 1, description: 'Follow an exposed trail to a short battle. The detour costs supplies.', locations: ['road'] },
  { id: 'beacon', label: 'Beacon tower', chapter: 2, description: 'Prepare the tower and restore Gemward’s light at the agreed cost.', locations: ['beacon'] },
  { id: 'lantern-square', label: 'Lantern square', chapter: 2, description: 'Prepare shared lanterns, release the light and begin repairing the beacon.', locations: ['lantern-square'] },
];
export const JOURNEY_EDGES = [
  ...(['warehouse', 'canal', 'road'] as const).map(to => ({ id: `town-${to}`, from: 'town' as const, to, requires: to === 'warehouse' ? ['ledger-copy'] : to === 'canal' ? ['canal-key'] : [] })),
  ...(['warehouse', 'canal', 'road'] as const).flatMap(from => (['beacon', 'lantern-square'] as const).map(to => ({ id: `${from}-${to}`, from, to, requires: ['recovered-prism'] }))),
];
export function journeyCost(room: AdventureRoom, to: JourneyNodeId): string {
  if (to === 'road') return isStoryTable(room) ? 'The exposed hill road gives the watcher +1 damage on every announced battle strike.' : 'The open hill road costs time and travel supplies, adding 1 danger.';
  if (to === 'beacon') return room.expedition?.variant === 'smugglers'
    ? 'At completion the beacon consumes the prism: Gemward shines again, but the maker-mark evidence against the smugglers is destroyed.'
    : 'At completion the beacon absorbs the prism: the living spark survives and protects Gemward, but is bound to the beacon again.';
  if (to === 'lantern-square') return room.expedition?.variant === 'smugglers'
    ? 'At completion the prism’s light is released and its maker mark remains evidence. Gemward relies on safe shared lanterns through dark evenings until repairs.'
    : 'At completion the living spark is freed. Gemward relies on safe shared lanterns through dark evenings while neighbours repair the beacon.';
  return to === 'warehouse' ? 'The copied ledger opens the yard. Investigation leads to a guarded recovery.' : 'The canal key opens the gate. Two coordinated preparations can recover the prism without a fight.';
}
const acquisitionEvents = (room: AdventureRoom, id: string) => room.events.filter(event => event.journey?.questChanges?.some(change => change.itemId === id && change.kind === 'gained')).map(event => event.id);
export function journeyTravelOptions(room: AdventureRoom): JourneyTravelOption[] {
  const state = room.expedition;
  const from = state?.currentNodeId ?? 'town';
  return JOURNEY_EDGES.filter(edge => edge.from === from).map(edge => {
    const node = JOURNEY_NODES.find(node => node.id === edge.to)!;
    const frozen = state?.travel?.options.find(option => option.edgeId === edge.id);
    return { edgeId: edge.id, toNodeId: edge.to, label: edge.to === 'beacon' ? 'Restore at the beacon tower' : edge.to === 'lantern-square' ? 'Release at Lantern square' : node.label,
      description: node.description, cost: journeyCost(room, edge.to), requires: edge.requires,
      available: state?.travel ? !!frozen : edge.requires.every(item => state?.questItems.includes(item)),
      unlockEventIds: frozen?.unlockEventIds ?? edge.requires.flatMap(item => acquisitionEvents(room, item)),
    };
  });
}
export function journeyMap(room: AdventureRoom): { nodes: JourneyMapNode[]; edges: JourneyMapEdge[]; currentNodeId: JourneyNodeId } {
  const currentNodeId = room.expedition?.currentNodeId ?? 'town';
  const transitions = room.events.filter(event => event.journey?.transition);
  const visited = new Set<JourneyNodeId>(['town', ...transitions.map(event => event.journey!.transition!.to)]);
  const options = journeyTravelOptions(room);
  const currentChapter = JOURNEY_NODES.find(node => node.id === currentNodeId)!.chapter;
  return { currentNodeId,
    nodes: JOURNEY_NODES.map(node => ({ ...node,
      label: node.chapter > currentChapter + 1 ? 'Beyond the missing light' : node.label,
      description: node.chapter > currentChapter + 1 ? 'Recover the prism to discover where the journey can end.' : node.description,
      state: node.id === currentNodeId ? 'current' : visited.has(node.id) ? 'visited' : node.chapter > currentChapter + 1 ? 'mystery' : options.some(option => option.toNodeId === node.id && option.available) ? 'available' : 'locked',
    })),
    edges: JOURNEY_EDGES.map(edge => {
      const taken = transitions.find(event => event.journey!.transition!.edgeId === edge.id);
      const option = options.find(option => option.edgeId === edge.id);
      return { ...edge, label: JOURNEY_NODES.find(node => node.id === edge.to)!.label,
        state: taken ? 'taken' : JOURNEY_NODES.find(node => node.id === edge.to)!.chapter > currentChapter + 1 ? 'mystery' : option?.available ? 'available' : 'locked',
        unlockEventIds: taken?.journey?.transition?.unlockEventIds ?? option?.unlockEventIds ?? edge.requires.flatMap(item => acquisitionEvents(room, item)),
        ...(taken ? { transitionEventId: taken.id } : {}),
      };
    }),
  };
}
export function journeyPouch(room: AdventureRoom) {
  const ids = new Set([...room.expedition?.questItems ?? [], ...room.events.flatMap(event => event.journey?.questChanges?.map(change => change.itemId) ?? [])]);
  return [...ids].map(id => {
    const gained = room.events.find(event => event.journey?.questChanges?.some(change => change.itemId === id && change.kind === 'gained'));
    const spent = room.events.find(event => event.journey?.questChanges?.some(change => change.itemId === id && change.kind === 'spent'));
    const sourceIds = gained?.journey?.questChanges?.find(change => change.itemId === id && change.kind === 'gained')?.sourceEventIds ?? [];
    const definition = QUEST_ITEMS[id] ?? { label: id, description: 'A shared discovery.' };
    let description = definition.description;
    if (id === 'recovered-prism') {
      if (spent) description = room.expedition?.variant === 'smugglers'
        ? 'The beacon consumed the prism. Gemward shines again, but its maker-mark evidence against the smugglers is gone.'
        : 'The beacon absorbed the prism. Its living spark survives and protects Gemward, bound to the beacon again.';
      else if (room.expedition?.ending && room.expedition.finaleChoice === 'release') description = room.expedition.variant === 'smugglers'
        ? 'The prism’s light was released at Lantern square. Its maker mark remains evidence against the smugglers; Gemward shares safe lanterns until repairs.'
        : 'The living spark was freed at Lantern square. The party keeps the prism, while Gemward shares safe lanterns and repairs its beacon.';
      else if (room.expedition?.finaleChoice) description = `The prism remains in the shared pouch while the party prepares its chosen ${room.expedition.finaleChoice === 'restore' ? 'restoration' : 'release'}. ${journeyCost(room, room.expedition.finaleChoice === 'restore' ? 'beacon' : 'lantern-square')}`;
    }
    return { id, ...definition, description,
      status: room.expedition?.questItems.includes(id) ? 'held' as const : 'spent' as const,
      acquiredAt: gained?.turn, spentAt: spent?.turn,
      sources: sourceIds.map(eventId => { const event = room.events.find(event => event.id === eventId); return { eventId, actorId: event?.actorId, actorName: event?.actorName, locationId: event?.journey?.locationId, turn: event?.turn ?? gained!.turn }; }),
      // These are this run's confirmed openings, including ones the party did not take.
      unlocks: [...new Set(room.events.flatMap(event => event.journey?.unlocks?.filter(unlock => gained && unlock.sourceEventIds.includes(gained.id)).map(unlock => unlock.edgeId) ?? []))],
    };
  });
}
export function journeyHighlights(room: AdventureRoom) {
  return room.outcomes.map(outcome => {
    const events = room.events.filter(event => event.chapter === outcome.chapter);
    const departure = events.find(event => event.journey?.transition);
    const transition = departure?.journey?.transition;
    let text = outcome.text;
    if (transition) {
      const destination = JOURNEY_NODES.find(node => node.id === transition.to)!.label;
      const causes = transition.unlockEventIds.flatMap(eventId => {
        const acquisition = room.events.find(event => event.id === eventId);
        return acquisition?.journey?.questChanges?.filter(change => change.kind === 'gained').map(change => {
          const names = [...new Set(change.sourceEventIds.map(sourceId => room.events.find(event => event.id === sourceId)?.actorName).filter((name): name is string => !!name))];
          return `${names.length ? names.join(' and ') : 'The party'} ${change.itemId === 'recovered-prism' ? 'recovered' : 'discovered'} ${QUEST_ITEMS[change.itemId]?.label ?? change.itemId}, opening this path.`;
        }) ?? [];
      });
      const reason = transition.reason === 'fallback' ? 'Tied or absent votes used the announced fallback.' : 'The party’s vote chose this destination.';
      if (outcome.chapter === 0) text = `The party prepared in Gemward, then took the path to ${destination}. ${causes.join(' ') || 'The open hill road needed no quest item and cost time and travel supplies.'} ${reason}`;
      else if (outcome.chapter === 1) {
        const recovered = events.find(event => event.journey?.encounter)?.journey?.encounter;
        const truth = room.expedition?.variant === 'smugglers' ? 'The prism’s maker mark proved the theft.' : 'Nella had moved the failing prism to save its living spark.';
        text = `${recovered === 'bypassed' ? 'A quiet recovery avoided battle.' : recovered === 'escaped' ? 'The party escaped with the prism, leaving supplies behind.' : 'The party overcame the watcher and recovered the prism.'} ${truth} The party chose ${transition.to === 'beacon' ? 'restoration at' : 'release at'} ${destination}. ${causes.join(' ')} ${reason}`;
      }
    }
    return { chapter: outcome.chapter, title: JOURNEY_DEFINITION.chapters[outcome.chapter].title, text,
      eventIds: events.filter(event => event.journey?.questChanges?.length || event.journey?.transition || event.journey?.encounter || event.kind === 'chapter').map(event => event.id),
    };
  });
}
export function journeyLocations(room: AdventureRoom) {
  const node = room.expedition?.currentNodeId ?? 'town';
  const original = expeditionLocations(room).filter(location => location.id !== 'beacon').map(location => ({ ...location, available: node === 'town' ? ['shop', 'tavern', 'docks'].includes(location.id) : node === location.id }));
  return [...original, ...JOURNEY_NODES.filter(node => node.chapter === 2).map(finale => ({ id: finale.id, label: finale.label, description: finale.description, available: node === finale.id }))];
}
const finaleTarget = (id: string, name: string, context: string, physical = false): SceneTarget => ({ id, name, description: context, context, tokens: physical ? ['fight', 'influence', 'investigate', 'assist'] : ['influence', 'investigate', 'assist'], effects: ['cover', 'distract', 'reveal', 'rescue'], actionCues: { fight: 'Clear a practical obstacle', influence: 'Coordinate the preparations', investigate: 'Check the plan', assist: 'Prepare together' } });
const finaleTargets = (node: JourneyNodeId) => node === 'beacon' ? [
  finaleTarget('beacon', 'The beacon lens', 'The dark lens waits for the agreed restoration. Clear its braces and align the light.', true),
  finaleTarget('keeper', 'Keeper at the tower', 'The keeper can prepare a safe restoration and repeat its lasting cost.'),
  finaleTarget('cradle', 'Prism cradle', 'The prism remains safe in the shared pouch until the preparations finish.', true),
  finaleTarget('town', 'Waiting neighbours', 'Arrange safe working places while neighbours prepare for the returning light.'),
] : [
  finaleTarget('lanterns', 'Shared lanterns', 'Prepare safe lanterns for the dark evenings ahead.', true),
  finaleTarget('keeper', 'Keeper in the square', 'Plan repairs with the keeper before releasing the light.'),
  finaleTarget('spark', 'The sheltered prism', 'Prepare a safe release. The shared prism stays intact until this chapter finishes.', true),
  finaleTarget('neighbours', 'Neighbours at dusk', 'Arrange lantern sharing and a repair rota together.'),
];
export function journeyTarget(locationId: string | undefined, targetId: string | undefined) {
  return locationId === 'beacon' || locationId === 'lantern-square' ? finaleTargets(locationId).find(target => target.id === targetId) : expeditionTarget(locationId, targetId);
}
export function journeyInteractions(room: AdventureRoom, locationId: string, targetId: string, token: TokenKind): ExpeditionInteraction[] {
  if (room.expedition?.battle?.status === 'active') return [];
  if (room.chapter !== 2) return storyTableInteractions(room, locationId, targetId, token, expeditionInteractions(room, locationId, targetId, token).map(interaction => ({ ...interaction,
    description: interaction.description.replace(/(becomes available|will be available|opens the warehouse route) next turn/g, '$1 when the party travels'),
  })));
  const node = room.expedition?.currentNodeId ?? 'beacon';
  if (locationId !== node) return [];
  const target = finaleTargets(node).find(target => target.id === targetId);
  if (!target?.tokens.includes(token)) return [];
  const labels: Record<string, Partial<Record<TokenKind, string>>> = {
    beacon: { fight: 'Clear the lens braces', influence: 'Coordinate the lens alignment', investigate: 'Check the damaged lens', assist: 'Align the beacon lens' },
    cradle: { fight: 'Steady the stone cradle', influence: 'Call for the fitting team', investigate: 'Check the prism fitting', assist: 'Prepare the prism cradle' },
    keeper: { influence: 'Confirm the lasting cost', investigate: 'Review the repair plans', assist: 'Prepare tomorrow’s repair rota' },
    town: { influence: 'Explain the returning light', investigate: 'Check the evening work route', assist: 'Prepare safe working places' },
    lanterns: { fight: 'Split wood for lantern stands', influence: 'Organize lantern sharing', investigate: 'Check the lantern shutters', assist: 'Light the shared lanterns' },
    spark: { fight: 'Clear a safe release space', influence: 'Reassure the waiting neighbours', investigate: 'Check the prism’s maker mark', assist: 'Prepare a gentle release' },
    neighbours: { influence: 'Agree on the repair rota', investigate: 'Map the dark streets', assist: 'Distribute spare lanterns' },
  };
  const explanatory = isStoryTable(room) ? token === 'influence' ? ({ beacon: 'Discuss the lens alignment', cradle: 'Discuss the prism fitting', lanterns: 'Discuss lantern sharing', spark: 'Discuss a gentle release' } as Record<string, string>)[targetId] : token === 'investigate' && targetId === 'neighbours' ? 'Inspect the evening route' : undefined : undefined;
  return storyTableInteractions(room, locationId, targetId, token, [{ id: `${node}:${targetId}:${token}`, label: explanatory ?? labels[targetId]?.[token] ?? 'Prepare the chosen future', description: `${target.context} ${journeyCost(room, node)} The travel decision is already recorded; this action helps carry it out.` }]);
}
export function journeyScene(room: AdventureRoom, locationId?: string): ChapterDefinition {
  if (!room.expedition) { const chapter = (isStoryTable(room) ? STORY_TABLE_DEFINITION : JOURNEY_DEFINITION).chapters[room.chapter]; return { ...chapter, situation: chapter.intro }; }
  const node = room.expedition.currentNodeId ?? 'town';
  if (room.expedition.battle?.status === 'active') {
    const battle = expeditionScene(room, locationId);
    return { ...battle, art: `gemward-v2-${room.expedition.locationId}`, objective: 'Overcome the encounter and recover the prism.',
      targets: battle.targets.map(target => target.id === 'encounter' ? { ...target, artKey: room.expedition!.variant === 'smugglers' ? 'gemward-v2-hired-guard' : 'gemward-v2-ward-construct' } : target) };
  }
  const location = locationId ?? room.expedition.locationId;
  const scene = room.chapter < 2 ? expeditionScene(room, location) : { ...JOURNEY_DEFINITION.chapters[2], targets: finaleTargets(node), location: JOURNEY_NODES.find(item => item.id === node)!.label, intro: node === 'beacon' ? 'The party chose restoration. Prepare the beacon together; the prism remains safe until the final work is complete.' : 'The party chose release. Prepare shared lanterns and repairs before setting the light free.' };
  const cost = journeyCost(room, node);
  const table = isStoryTable(room) ? getStoryTableState(room) : undefined;
  const opening = table && room.chapter === 0 ? GEMWARD_STORY_COPY.opening : undefined;
  return { ...scene, ...(opening ? { intro: opening } : {}), art: `gemward-v2-${location === 'tavern' ? 'inn' : location}`, progressGoal: room.chapter === 1 ? 8 : 4,
    objective: room.phase === 'travel' ? 'Choose the party’s next destination together.' : room.chapter === 0 ? 'Follow leads and prepare the party. Then choose a route on the map.' : room.chapter === 2 ? node === 'beacon' ? 'Prepare the beacon and carry out the restoration.' : 'Prepare lanterns and carry out the release.' : scene.objective,
    situation: room.chapter === 2 ? room.expedition.ending ?? `${scene.intro} ${cost}` : room.chapter === 1 && room.expedition.encounterResolved ? 'The prism is safe. After this reveal, choose its future and the party’s final destination on the map.' : opening ?? scene.situation,
    catchUp: room.phase === 'travel' ? `The chapter is settled. Choose one of the frozen routes; ties or silence use ${node === 'town' ? 'the open hill road' : 'Lantern square'}.` : room.chapter === 2 ? `${scene.intro} ${cost}` : opening ? GEMWARD_STORY_COPY.townCatchUp : scene.catchUp,
    ...(table && room.phase !== 'travel' && room.chapter !== 1 ? { objective: room.chapter === 0 ? GEMWARD_STORY_COPY.townObjective : GEMWARD_STORY_COPY.finaleObjective } : {}),
    targets: scene.targets.map(target => { const changed = isStoryTable(room) ? room.events.some(entry => entry.result?.changed && entry.result.targetId === target.id && entry.journey?.locationId === location) : room.expedition!.discoveries.some(id => id.startsWith(`${node}:${target.id}:`)) || target.changed; return { ...target, changed,
      context: room.chapter === 2 ? `${target.context} ${cost}` : isStoryTable(room) && target.id === 'price-board' ? 'The estimate explains what the beacon changes when it uses a prism.' : target.context,
      actionCues: Object.fromEntries(target.tokens.map(token => [token, journeyInteractions(room, location, target.id, token)[0]?.label ?? target.actionCues?.[token]])),
    }; }),
  };
}
export function journeyActionPreview(room: AdventureRoom, userId: string, action: PlayerAction) {
  if (room.expedition?.battle?.status === 'active' || action.token === 'spotlight' || action.targetKind === 'hero') return expeditionActionPreview(room, userId, action);
  const location = action.expedition?.locationId ?? room.expedition?.locationId ?? 'shop';
  const options = journeyInteractions(room, location, action.targetId, action.token);
  const option = options.find(option => option.id === action.expedition?.interactionId) ?? options[0];
  const item = isStoryTable(room) && action.expedition?.consumableId ? room.expedition?.stashes[userId]?.find(item => item.id === action.expedition!.consumableId) : undefined;
  const description = isStoryTable(room) && option?.id === 'warehouse:identify-buyer' && !room.expedition?.questItems.includes('buyer-evidence') ? 'Read the delivery record to learn who moved the prism. Prepare an approach to the guarded crate.' : option?.description ?? 'Choose a target and token.';
  return { label: option?.label ?? 'Prepare an intention', description: description + (item ? ` ${storyTableConsumable(room, item.kind).description}` : '') };
}
