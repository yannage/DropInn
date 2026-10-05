import type { AvalonConflictId, AvalonEpisode, AvalonPlaceId, AvalonPromiseDefinition, AvalonThreadDefinition } from './avalonTypes';
import type { QuestNode, QuestOption, QuestRunContent, QuestTarget } from './questRunTypes';

/** Geography is shared across visits. Only a saved episode's inhabitants and troubles vary. */
export const AVALON_WORLD = {
  id: 'avalon-larch-hills', version: 1, title: 'The Larch Hills of Avalon',
  description: 'Two streams and one lake, six familiar places, a different visit each time.',
  waters: [
    { id: 'larch-run', name: 'Larch Run', description: 'From Hill Spring through the mill and Old Ford, then into Merewater.' },
    { id: 'reed-brook', name: 'Reed Brook', description: 'From Green Quarry through the reed bank, joining Merewater below the ford.' },
    { id: 'merewater', name: 'Merewater', description: 'The lake below the inn. Its reed shallows shelter mossbacks and nesting birds.' },
  ],
  places: [
    { id: 'larch-inn', label: 'The Larch Inn', biome: 'settlement', art: 'avalon-scene-inn', position: { x: 20, y: 82 }, description: 'Wren keeps the roadside inn above Merewater. Travelers return here with news, and neighbors exchange supplies.' },
    { id: 'old-ford', label: 'Old Ford', biome: 'stream crossing', art: 'avalon-scene-ford', position: { x: 48, y: 61 }, description: 'The old road crosses Larch Run here. A dry footpath remains beside the cart crossing.' },
    { id: 'mill-yard', label: 'The mill yard', biome: 'wooded watercourse', art: 'mosswater-scene-mill', position: { x: 24, y: 39 }, description: 'A little dye mill stands on Larch Run. Its yard drains toward the ford and the lake.' },
    { id: 'reed-bank', label: 'Merewater reeds', biome: 'lake shore', art: 'stage-river', position: { x: 79, y: 81 }, description: 'Reed Brook enters Merewater here. Useful reeds grow beside a safe, well-marked shore path.' },
    { id: 'hill-spring', label: 'Hill Spring', biome: 'wooded hillside', art: 'mosswater-scene-hill-spring', position: { x: 24, y: 15 }, description: 'Larch Run starts above the mill. A fenced grazing shelf overlooks the spring.' },
    { id: 'green-quarry', label: 'Green Quarry', biome: 'limestone clearing', art: 'avalon-scene-quarry', position: { x: 78, y: 36 }, description: 'A shallow abandoned quarry sits above Reed Brook. Carters use its dry track; reed wolves shelter in nearby scrub.' },
  ] as const,
};

export const AVALON_THREADS: Record<AvalonConflictId, AvalonThreadDefinition> = {
  'bitter-water': {
    id: 'bitter-water', title: 'Bitter water', question: 'Why is Larch Run bitter?', teaser: 'Yellow water reaches the ford. The spring above the mill is still clear.', leadNodeId: 'mill-yard', pressureFact: 'water-pressure',
    pressureWarnings: ['Neighbors are using their last clean flasks.', 'Water carriers are waiting. Another active party round will use one shared supply.', 'The party sends one shared supply to the waiting water carriers. The mill remains reachable.'],
    resolutions: {
      seal: { label: 'Seal the dye leak', change: 'The vat is sealed and Larch Run runs clear again. The mossback keeps its dry shelter.', cost: 'Two shared supplies became sealant and clean flushing water.' },
      bargain: { label: 'Make room for a neighbor', change: 'The mossback moves the vat onto dry ground. Larch Run runs clear; the inn washpond becomes its new den.', cost: 'The party promises a reed bed for the washpond. Neighbors lose that storage corner.' },
      haul: { label: 'Clear the vat by force', change: 'The vat is hauled clear after the fight. Larch Run runs clear again.', cost: 'The displaced mossback has lost its old shelter.' },
    },
  },
  'missing-carter': {
    id: 'missing-carter', title: 'The missing carter', question: 'What happened to Pip and the cart?', teaser: 'Pip missed the inn delivery. Fresh cart tracks turn toward Green Quarry.', leadNodeId: 'green-quarry', pressureFact: 'carter-pressure',
    pressureWarnings: ['Pip has not returned for supper.', 'Pip needs provisions. Another active party round will use one shared supply.', 'The party sends one shared supply along the quarry track. Pip can still be reached and helped.'],
    resolutions: {
      repair: { label: 'Repair the axle', change: 'Pip brings the repaired cart and its cargo back to the inn.', cost: 'Finding the shared repair kit and reaching the quarry took the party off its other lead.' },
      brace: { label: 'Brace the cart', change: 'Pip gets the cart and its cargo safely back to the inn.', cost: 'Two shared supply packs became an axle brace and a skid.' },
      leave: { label: 'Bring Pip home on foot', change: 'Pip is safe at the inn. The broken cart is marked for a later recovery trip.', cost: 'The cargo stays at the quarry; the inn must wait for that delivery.' },
    },
  },
  'stranded-herd': {
    id: 'stranded-herd', title: 'Bells above the spring', question: 'How can the hill flock get home?', teaser: 'Sheep bells ring above Hill Spring. A reed-wolf pack holds the downhill trail.', leadNodeId: 'hill-spring', pressureFact: 'herd-pressure',
    pressureWarnings: ['The flock is safe on the shelf, but its shepherd is waiting below.', 'The flock needs fodder. Another active party round will use one shared supply.', 'The party sends one shared supply of fodder uphill. The flock remains safe and its routes stay open.'],
    resolutions: {
      feed: { label: 'Lead the wolves away', change: 'The wolves follow a food trail into the scrub. The flock takes its usual trail home.', cost: 'Two shared supply packs became the food trail; the wolves still live nearby.' },
      fence: { label: 'Open the upper gate', change: 'The repaired upper gate gives the flock a permanent second path home.', cost: 'One shared supply reinforces the gate; the tools remain available to the party.' },
      fight: { label: 'Clear the lower trail', change: 'The party’s opening lets the flock take the lower trail home.', cost: 'The party fought for access; the pack remains beyond the route.' },
    },
  },
};

export const AVALON_PROMISES: Record<string, AvalonPromiseDefinition> = {
  'washpond-reeds': { id: 'washpond-reeds', name: 'A reed bed for the washpond', description: 'After the mossback moves the vat, bring Wren a bundle from Merewater. The washpond becomes the creature’s home.', nodeId: 'larch-inn', optionId: 'inn-deliver-reeds', fulfillmentText: 'Wren spreads your reeds in the washpond. The mossback settles into its promised home.' },
};

const conflictIds: AvalonConflictId[] = ['bitter-water', 'missing-carter', 'stranded-herd'];
const arrivals: AvalonPlaceId[] = ['larch-inn', 'old-ford', 'reed-bank'];
const npc = {
  wren: { name: 'Wren the innkeeper', artKey: 'avalon-npc-innkeeper', introduction: 'Wren keeps the inn and a little common store. Her records and tools belong to this place.' },
  nim: { name: 'Nim the tinker', artKey: 'avalon-npc-tinker', introduction: 'Nim is visiting with a box of tools and news from the hill roads.' },
  sedge: { name: 'Sedge the warden', artKey: 'avalon-npc-warden', introduction: 'Sedge walks the stream paths and notices who passes through.' },
  pip: { name: 'Pip the carter', artKey: 'avalon-npc-courier', introduction: 'Pip brings supplies between the quarry road and the inn.' },
};
function hash(value: string) { let result = 2166136261; for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619); return result >>> 0; }
function order<T>(values: T[], seed: string): T[] { return [...values].sort((a, b) => hash(`${seed}:${a}`) - hash(`${seed}:${b}`) || String(a).localeCompare(String(b))); }

export function createAvalonEpisode(seed: string): AvalonEpisode {
  const selected = order(conflictIds, `${seed}:conflicts`).slice(0, 2);
  const locations = order(arrivals, `${seed}:visitors`);
  const people = order(['nim', 'sedge'], `${seed}:people`);
  const cast: AvalonEpisode['manifest']['cast'] = { host: { npcId: 'wren', nodeId: 'larch-inn', role: 'host' } };
  const clueAssignments: AvalonEpisode['manifest']['clueAssignments'] = {};
  selected.forEach((id, index) => {
    const role = `${id}-witness`;
    cast[role] = { npcId: people[index], nodeId: locations[index], role };
    clueAssignments[id] = { npcRole: role, physicalTargetIds: id === 'bitter-water' ? ['ford-waymark', 'bank-reeds', 'mill-vat', 'spring-pool'] : id === 'missing-carter' ? ['ford-waymark', 'bank-reeds', 'quarry-cart'] : ['bank-reeds', 'spring-flock'] };
  });
  if (selected.includes('missing-carter')) cast.carter = { npcId: 'pip', nodeId: 'green-quarry', role: 'stranded-carter' };
  return {
    schemaVersion: 1,
    manifest: {
      worldId: 'avalon-larch-hills', worldVersion: 1, generatorVersion: 1, contentVersion: 1, seed,
      startNodeId: arrivals[hash(`${seed}:arrival`) % arrivals.length], conflictIds: selected,
      weather: (['mist', 'clear', 'rain'] as const)[hash(`${seed}:weather`) % 3],
      linked: selected.includes('bitter-water') && selected.includes('missing-carter') && hash(`${seed}:connection`) % 2 === 0,
      cast, clueAssignments,
    },
    threads: selected.map(id => ({ id, status: 'hidden', pressure: 0 })),
    director: { cycle: 0, participants: [], finished: [], acted: [], meaningful: false, interest: {}, opportunities: [] },
  };
}

const effect = (threadId: AvalonConflictId) => ({ threadId, discoverThread: threadId });
const resolved = (episode: AvalonEpisode, id: AvalonConflictId) => episode.threads.find(thread => thread.id === id)?.status === 'resolved';
function resolutionOption(threadId: AvalonConflictId, resolutionId: string, option: Omit<QuestOption, 'avalon'>): QuestOption {
  return { ...option, absent: [...(option.absent ?? []), `resolved:${threadId}`], avalon: { ...effect(threadId), resolveThread: threadId, resolutionId } };
}
const returnOptions = (): QuestOption[] => [
  { id: 'inn-tools', label: 'Borrow Wren’s repair kit', preview: 'Take the shared lever and rope. They can repair the cart or the hill gate without being consumed.', result: 'Wren lends the party her lever and sound rope. The shared repair kit is ready for the hill roads.', items: ['repair-tools'], discover: ['tools-found'], absent: ['tools-found'] },
  { id: 'inn-pack', label: 'Pack the common-store lunch', preview: 'Wren can spare this lunch once per visit.', result: 'Wren shares the common-store lunch. The shelf is now empty.', supplyDelta: 2, discover: ['inn-lunch-taken'], absent: ['inn-lunch-taken'] },
  { id: 'inn-deliver-reeds', label: 'Keep the washpond promise', preview: 'Deliver the gathered reeds. The mossback receives its promised bed; the party keeps a record of the delivery.', result: AVALON_PROMISES['washpond-reeds'].fulfillmentText, requires: ['promise:washpond-reeds', 'reeds-gathered'], absent: ['promise-kept:washpond-reeds'], discover: ['promise-kept:washpond-reeds'], avalon: { fulfillPromise: 'washpond-reeds' } },
];

function clueOptions(episode: AvalonEpisode, source: 'ford' | 'bank'): QuestOption[] {
  const options: QuestOption[] = [];
  if (episode.manifest.conflictIds.includes('bitter-water')) options.push({ id: `${source}-check-water`, label: 'Check the yellow stream', preview: 'Compare the stain with the mill mark. Find a lead without drinking the water.', result: 'Yellow dye runs down Larch Run from the mill. The spring above it is clear: the mill yard is the next place to inspect.', discover: ['water-lead'], completeObjective: 'investigate', avalon: effect('bitter-water') });
  if (episode.manifest.conflictIds.includes('missing-carter')) options.push({ id: `${source}-read-waybill`, label: source === 'ford' ? 'Read the dropped waybill' : 'Read the delivery notice', preview: 'Follow Pip’s fresh cart marks toward Green Quarry. The paper survives even if a witness is elsewhere.', result: episode.manifest.linked ? 'Pip’s waybill lists a replacement dye-vat seal. Fresh cart tracks head toward Green Quarry; the mill delivery never arrived.' : 'Pip’s waybill lists flour for the inn. Fresh cart tracks turn toward Green Quarry; this delivery has nothing to do with the mill.', items: ['carter-waybill'], discover: ['carter-lead'], completeObjective: 'investigate', avalon: effect('missing-carter') });
  if (episode.manifest.conflictIds.includes('stranded-herd')) options.push({ id: `${source}-follow-bells`, label: 'Listen for the sheep bells', preview: 'Locate the flock above Hill Spring. Their usual downhill trail is blocked.', result: 'Bells answer from the fenced shelf above Hill Spring. Wolf prints cross the lower trail; the flock is waiting safely above it.', discover: ['herd-lead'], completeObjective: 'investigate', avalon: effect('stranded-herd') });
  return options;
}

function witnessTarget(episode: AvalonEpisode, id: AvalonConflictId): QuestTarget {
  const member = episode.manifest.cast[`${id}-witness`];
  const person = npc[member.npcId as keyof typeof npc];
  const detail = id === 'bitter-water' ? 'The spring ran clear this morning. Yellow dye appeared only below the mill.' : id === 'missing-carter' ? episode.manifest.linked ? 'Pip went for a replacement seal after spotting the dye leak. Their cart never came back from Green Quarry.' : 'Pip took the quarry track with flour for the inn. A cracked axle, not a disappearance plot, may explain the delay.' : 'The hill flock is safe on its shelf. Wolves are lying across the lower path, while the upper fence has a loose gate.';
  const factId = id === 'bitter-water' ? 'water-lead' : id === 'missing-carter' ? 'carter-lead' : 'herd-lead';
  return { id: `witness-${id}`, name: person.name, artKey: person.artKey, context: person.introduction, options: [
    { id: `witness-${id}-ask`, label: id === 'bitter-water' ? 'Ask about the yellow water' : id === 'missing-carter' ? 'Ask who missed a delivery' : 'Ask why bells ring uphill', preview: `Learn a practical lead: ${AVALON_THREADS[id].teaser}`, result: `${person.name} points out a place to look. ${detail}`, discover: [factId], completeObjective: 'investigate', avalon: effect(id) },
  ] };
}

export function avalonContent(episode: AvalonEpisode, evidence: string[] = []): QuestRunContent {
  const { manifest } = episode;
  const active = (id: AvalonConflictId) => manifest.conflictIds.includes(id);
  const nodes: QuestNode[] = AVALON_WORLD.places.map(place => ({ id: place.id, label: place.label, description: place.description, art: place.art, targets: [] }));
  const add = (id: AvalonPlaceId, target: QuestTarget) => nodes.find(node => node.id === id)!.targets.push(target);
  add('larch-inn', { id: 'wren', name: npc.wren.name, artKey: npc.wren.artKey, context: episode.promise?.status === 'kept' ? 'Wren has spread the promised reed bed beside the washpond. The new neighbor has settled in.' : 'Wren offers a common-store lunch and repair kit. Bring the party’s news back here when you are ready to end the visit.', options: returnOptions() });
  add('larch-inn', { id: 'inn-notice', name: 'Today’s deliveries', artKey: 'avalon-waybill', context: 'A fresh note pins down one local problem. Read it, then decide whether it deserves the party’s attention.', options: [
    ...clueOptions(episode, 'ford').slice(0, 1).map(option => ({ ...option, id: `inn-${option.id}`, label: 'Read the urgent note', result: `Wren’s note gives you a place to start. ${option.result}` })),
  ] });
  add('old-ford', { id: 'ford-waymark', name: 'The ford markers', artKey: active('missing-carter') ? 'avalon-waybill' : 'mosswater-clean-sample', context: 'Fresh marks on the dry crossing connect the roads to what is happening nearby.', options: clueOptions(episode, 'ford') });
  add('old-ford', { id: 'ford-kit', name: 'Bridge keeper’s kit', artKey: 'mosswater-repair-kit', context: 'A lever and a coil of rope hang above the flood line. Travelers may borrow them for repairs.', options: [
    { id: 'ford-borrow-tools', label: 'Lift down the repair kit', preview: 'Take the shared tools. They can fix a cart or gate, and are not consumed.', result: 'You take down the sound rope and lever. The party can now attempt a lasting repair.', absent: ['tools-found'], discover: ['tools-found'], items: ['repair-tools'] },
  ] });
  add('reed-bank', { id: 'bank-reeds', name: 'The safe reed shelf', artKey: 'tall-reeds.png', context: 'A dry shelf holds a harvestable reed bundle and a clear view of the hill paths.', options: [
    { id: 'bank-gather-reeds', label: 'Gather a useful bundle', preview: 'Keep a reed bundle even if the supply pack is full. The washpond promise, if made, needs these reeds.', result: 'You gather a soft reed bed and sort the useful bundles. This shelf has no second harvest today.', absent: ['reeds-gathered'], discover: ['reeds-gathered'], items: ['reed-bundle'], supplyDelta: 2 },
    ...clueOptions(episode, 'bank'),
  ] });
  if (active('bitter-water')) {
    const waterResolution = episode.threads.find(thread => thread.id === 'bitter-water')?.resolutionId;
    add('mill-yard', { id: 'mill-vat', name: resolved(episode, 'bitter-water') ? 'The quiet dye yard' : 'The cracked dye vat', artKey: resolved(episode, 'bitter-water') ? waterResolution === 'seal' ? 'mosswater-vat-contained' : 'mosswater-feed-clear' : 'mosswater-dye-vat', context: resolved(episode, 'bitter-water') ? AVALON_THREADS['bitter-water'].resolutions[waterResolution ?? 'seal'].change : 'Yellow dye leaks into Larch Run. A mossback uses the vat as the dry wall of its nest.', options: [
      { id: 'water-inspect-vat', label: 'Trace the leak into the run', preview: 'Confirm the water’s cause. Learn the supply cost before choosing a fix.', result: manifest.linked ? 'The split vat is leaking dye. Its repair docket names Pip as the seal carrier: the missing cart and bitter water began with the same broken delivery.' : 'The split vat is leaking dye. Its old seam failed; no other local trouble caused this leak.', absent: ['resolved:bitter-water'], discover: ['water-source', ...(manifest.linked ? ['shared-cause', 'carter-lead'] : [])], completeObjective: 'source', avalon: { ...effect('bitter-water'), ...(manifest.linked ? { discoverThreads: ['missing-carter'] as AvalonConflictId[] } : {}) }, followUp: ['water-seal-vat', 'water-haul-vat'] },
      resolutionOption('bitter-water', 'seal', { id: 'water-seal-vat', label: 'Seal and flush the leak', preview: 'Spend 2 shared supplies. Restore Larch Run and preserve the creature’s shelter.', result: AVALON_THREADS['bitter-water'].resolutions.seal.change, requires: ['water-source'], absent: ['encounter-cleared:mossback'], supplyDelta: -2, discover: ['water-restored'] }),
      resolutionOption('bitter-water', 'haul', { id: 'water-haul-vat', label: 'Haul the vat onto dry ground', preview: 'After the battle, clear the source without spending supplies. The mossback loses this shelter.', result: AVALON_THREADS['bitter-water'].resolutions.haul.change, requires: ['encounter-cleared:mossback'], discover: ['water-source', 'water-restored'] }),
    ] });
    const bargain = resolutionOption('bitter-water', 'bargain', { id: 'water-offer-washpond', label: 'Offer the inn’s washpond', preview: 'The mossback moves the vat. Promise it a reed bed at Wren’s washpond; the party must bring reeds back.', result: AVALON_THREADS['bitter-water'].resolutions.bargain.change, requires: ['mossback-need'], absent: ['encounter-cleared:mossback'], discover: ['water-restored', 'promise:washpond-reeds'] });
    bargain.avalon!.promise = 'washpond-reeds';
    const mossbackGone = evidence.includes('encounter-cleared:mossback') || (resolved(episode, 'bitter-water') && waterResolution !== 'seal');
    add('mill-yard', { id: 'mill-mossback', name: mossbackGone ? 'The mossback’s tracks' : resolved(episode, 'bitter-water') ? 'The settled mossback' : 'The mossback', artKey: mossbackGone ? 'tracks.png' : 'mosswater-mossback', context: resolved(episode, 'bitter-water') ? 'The water problem is settled. This visit cannot take a second, contradictory route.' : mossbackGone ? 'The party has made an opening. The creature no longer holds the approach; the leaking vat still needs hauling onto dry ground.' : 'The creature shelters behind the vat. It keeps looking toward the inn’s unused washpond.', options: [
      { id: 'water-listen', label: 'Give it room and listen', preview: 'Learn what the creature needs. A promise can solve the water problem without a fight.', result: 'The mossback wants a dry home. Wren’s unused washpond would work if the party brought reeds for a bed.', absent: ['resolved:bitter-water', 'encounter-cleared:mossback'], discover: ['mossback-need', 'water-source'], completeObjective: 'source', avalon: effect('bitter-water'), followUp: ['water-offer-washpond', 'water-fight'] },
      bargain,
      { id: 'water-fight', label: 'Challenge the mossback', preview: 'Start a party battle. Afterward, haul the vat clear; this gives up the peaceful shelter-preserving fixes.', result: 'The mossback braces beside the vat. The party has to make an opening.', absent: ['resolved:bitter-water', 'encounter-cleared:mossback'], encounter: 'mossback', avalon: effect('bitter-water') },
    ] });
  } else add('mill-yard', { id: 'mill-stock', name: 'The dry work shelf', artKey: 'mosswater-repair-kit', context: 'The mill is quiet this visit. A worker has left one dry supply for travelers.', options: [{ id: 'mill-pack', label: 'Pack the spare supply', preview: 'The shelf holds one spare pack; you can collect it once.', result: 'You check the dry work shelf. The quiet mill needs no rescue today.', supplyDelta: 1, absent: ['mill-supply-taken'], discover: ['mill-supply-taken'] }] });
  add('hill-spring', { id: 'spring-pool', name: 'The clear spring', artKey: 'mosswater-spring-pool', context: 'Larch Run starts here, above the mill. Its water is clear in every version of this visit.', options: [
    { id: 'spring-fill', label: 'Fill the travel flask', preview: 'Keep a clean sample. The flask does not repair a polluted stream.', result: 'The flask fills with clear spring water. The party keeps a comparison sample.', absent: ['spring-flask-filled'], discover: ['spring-flask-filled', ...(active('bitter-water') ? ['water-lead'] : [])], items: ['clean-sample'], supplyDelta: 1, ...(active('bitter-water') ? { completeObjective: 'investigate' as const, avalon: effect('bitter-water') } : {}) },
  ] });
  if (active('stranded-herd')) add('hill-spring', { id: 'spring-flock', name: resolved(episode, 'stranded-herd') ? 'The empty grazing shelf' : 'The waiting flock', artKey: resolved(episode, 'stranded-herd') ? episode.threads.find(thread => thread.id === 'stranded-herd')?.resolutionId === 'fence' ? 'gate-sheltered' : 'tracks.png' : 'sheep.png', context: resolved(episode, 'stranded-herd') ? AVALON_THREADS['stranded-herd'].resolutions[episode.threads.find(thread => thread.id === 'stranded-herd')!.resolutionId ?? 'fence'].change : evidence.includes('encounter-cleared:reed-pack') ? 'The lower approach is open. The sheep are still waiting for the party to guide them down.' : 'The sheep wait safely on the shelf. Wolves hold the lower trail; a loose upper gate offers another route.', options: [
    { id: 'herd-survey', label: 'Check both paths home', preview: 'See the wolves below and loose upper gate. Then choose food, tools or a fight.', result: 'The lower trail can be cleared with food or a fight. A repair kit and one supply can make the upper gate a permanent second path.', absent: ['resolved:stranded-herd'], discover: ['herd-paths'], completeObjective: 'source', avalon: effect('stranded-herd'), followUp: ['herd-feed', 'herd-gate', 'herd-fight'] },
    resolutionOption('stranded-herd', 'feed', { id: 'herd-feed', label: 'Lay a food trail for the pack', preview: 'Spend 2 shared supplies. The wolves move away and the flock takes the lower trail.', result: AVALON_THREADS['stranded-herd'].resolutions.feed.change, requires: ['herd-paths'], supplyDelta: -2, discover: ['flock-home'] }),
    resolutionOption('stranded-herd', 'fence', { id: 'herd-gate', label: 'Repair the upper gate', preview: 'Use the shared repair kit and spend 1 supply. Open a lasting second route for the flock.', result: AVALON_THREADS['stranded-herd'].resolutions.fence.change, requires: ['herd-paths', 'tools-found'], supplyDelta: -1, discover: ['flock-home', 'upper-gate-open'] }),
    { id: 'herd-fight', label: 'Challenge the reed wolves', preview: 'Start a party battle. Afterward, guide the sheep down the cleared trail.', result: 'The reed wolves rise from the lower trail. The party makes room for the flock.', absent: ['resolved:stranded-herd', 'encounter-cleared:reed-pack'], encounter: 'reed-pack', avalon: effect('stranded-herd') },
    resolutionOption('stranded-herd', 'fight', { id: 'herd-guide', label: 'Guide the flock down', preview: 'With the pack past, bring the sheep home. Their bells mark the result.', result: AVALON_THREADS['stranded-herd'].resolutions.fight.change, requires: ['encounter-cleared:reed-pack'], discover: ['flock-home'] }),
  ] });
  if (active('missing-carter')) add('green-quarry', { id: 'quarry-cart', name: resolved(episode, 'missing-carter') ? episode.threads.find(thread => thread.id === 'missing-carter')?.resolutionId === 'leave' ? 'Pip’s marked recovery spot' : 'The clear cart track' : 'Pip and the tilted cart', artKey: resolved(episode, 'missing-carter') ? 'avalon-waybill' : 'avalon-cart', context: resolved(episode, 'missing-carter') ? AVALON_THREADS['missing-carter'].resolutions[episode.threads.find(thread => thread.id === 'missing-carter')!.resolutionId ?? 'leave'].change : 'Pip is unhurt beside a tilted cart. The axle has cracked. Both person and cargo can be recovered, at different costs.', options: [
    { id: 'carter-check', label: 'Check Pip and the axle', preview: 'Learn what stopped the cart. Choose tools, supplies or a walk home without the cargo.', result: manifest.linked ? 'Pip is safe. The cart broke while carrying the mill’s replacement seal. The same broken delivery delayed the repair, but the water and cart each need their own solution.' : 'Pip is safe. A stone cracked the axle on an ordinary flour delivery. This accident is independent of the other local trouble.', absent: ['resolved:missing-carter'], discover: ['carter-found', ...(manifest.linked ? ['shared-cause', 'water-lead'] : [])], completeObjective: 'source', avalon: { ...effect('missing-carter'), ...(manifest.linked ? { discoverThreads: ['bitter-water'] as AvalonConflictId[] } : {}) }, followUp: ['carter-repair', 'carter-brace', 'carter-walk'] },
    resolutionOption('missing-carter', 'repair', { id: 'carter-repair', label: 'Repair it with the shared kit', preview: 'Use the lever and rope to secure the axle. Save the cargo and spend no supplies.', result: AVALON_THREADS['missing-carter'].resolutions.repair.change, requires: ['carter-found', 'tools-found'], discover: ['carter-safe'] }),
    resolutionOption('missing-carter', 'brace', { id: 'carter-brace', label: 'Make a supply-pack skid', preview: 'Spend 2 shared supplies. Pip brings the cart and cargo home without needing the repair kit.', result: AVALON_THREADS['missing-carter'].resolutions.brace.change, requires: ['carter-found'], supplyDelta: -2, discover: ['carter-safe'] }),
    resolutionOption('missing-carter', 'leave', { id: 'carter-walk', label: 'Mark the cart; walk Pip home', preview: 'Spend no supplies. Pip returns safely; the cart and its delivery stay here for another day.', result: AVALON_THREADS['missing-carter'].resolutions.leave.change, requires: ['carter-found'], discover: ['carter-safe', 'cargo-left'] }),
  ] });
  if (active('missing-carter') && !resolved(episode, 'missing-carter')) add('green-quarry', { id: 'pip', name: npc.pip.name, artKey: npc.pip.artKey, context: 'Pip is unhurt but cannot shift the loaded cart. The next move can preserve the cargo or leave it for later.', options: [
    { id: 'pip-ask', label: 'Ask Pip what happened', preview: 'Learn why the delivery stopped. Then inspect the cart to choose a recovery plan.', result: manifest.linked ? 'Pip explains that the axle broke while fetching the mill’s replacement seal. Repairing the cart will not itself stop the leak: the party still chooses how to fix the stream.' : 'Pip explains that the axle cracked during a flour delivery. The accident is independent of the other local trouble.', discover: ['carter-found', ...(manifest.linked ? ['shared-cause', 'water-lead'] : [])], completeObjective: 'source', avalon: { ...effect('missing-carter'), ...(manifest.linked ? { discoverThreads: ['bitter-water'] as AvalonConflictId[] } : {}) } },
  ] });
  add('green-quarry', { id: 'quarry-cairn', name: 'The quarry cairn', artKey: 'avalon-lantern', context: 'A sheltered marker holds one dry supply. The road home is clearly marked.', options: [{ id: 'quarry-pack', label: 'Take the traveler’s reserve', preview: 'The cairn can provide its reserve only once.', result: 'You open the dry reserve and turn the marker to show it is empty.', supplyDelta: 1, absent: ['quarry-reserve-taken'], discover: ['quarry-reserve-taken'] }] });
  for (const id of manifest.conflictIds) add(manifest.cast[`${id}-witness`].nodeId, witnessTarget(episode, id));
  const paths: [AvalonPlaceId, AvalonPlaceId, string][] = [
    ['larch-inn', 'old-ford', 'The lake road'], ['larch-inn', 'mill-yard', 'The mill footpath'], ['old-ford', 'reed-bank', 'The safe shore path'],
    ['old-ford', 'green-quarry', 'The cart track'], ['mill-yard', 'hill-spring', 'Upstream through the larches'], ['reed-bank', 'green-quarry', 'The Reed Brook trail'],
    ['hill-spring', 'green-quarry', 'The dry ridge path'],
  ];
  const firstThread = nodes.find(node => node.id === manifest.startNodeId)!.targets.flatMap(target => target.options).find(option => option.avalon?.discoverThread)?.avalon?.discoverThread ?? manifest.conflictIds[0];
  const hook = firstThread === 'bitter-water' ? 'A yellow stain reaches the drinking pails.' : firstThread === 'missing-carter' ? 'A delivery slip flaps beside fresh wheel marks; its carter has not arrived.' : 'Sheep bells ring from the hill, but no flock comes down.';
  const arrival = manifest.startNodeId === 'larch-inn' ? 'Wren slides you a seat at the Larch Inn.' : manifest.startNodeId === 'old-ford' ? 'Your boots reach the dry stones at Old Ford.' : 'You step onto a dry shelf beside the Merewater reeds.';
  return {
    id: 'avalon', version: 1, title: 'Avalon: A Visit to the Larch Hills', pitch: 'Arrive somewhere new in a familiar world. Follow two local troubles, choose what matters, and bring your own ending home.',
    opening: `${arrival} ${hook} Look at what is here, learn a lead, and decide where the party goes next.`, startNodeId: manifest.startNodeId,
    chapters: [
      { id: 'avalon-lead', title: 'Something worth following', keepsake: 'Avalon’s trail knot' },
      { id: 'avalon-truth', title: 'What is happening here', keepsake: 'Avalon’s copper leaf' },
      { id: 'avalon-return', title: 'The hills after your visit', keepsake: 'Avalon’s return cup' },
    ], nodes,
    edges: paths.flatMap(([from, to, label]) => [{ id: `${from}-to-${to}`, from, to, label, description: `Follow the familiar path to ${nodes.find(node => node.id === to)!.label}.` }, { id: `${to}-to-${from}`, from: to, to: from, label, description: `Return along the path to ${nodes.find(node => node.id === from)!.label}.` }]),
    items: {
      'repair-tools': { label: 'Shared repair kit', description: 'Borrowed rope and lever. Repair Pip’s axle or the upper gate; the kit is reusable.' },
      'carter-waybill': { label: 'Pip’s waybill', description: manifest.linked ? 'A replacement seal was due at the leaking dye mill.' : 'An ordinary flour delivery for Wren’s inn.' },
      'clean-sample': { label: 'Clear spring sample', description: 'Larch Run is clear above the mill. This sample records that observation.' },
      'reed-bundle': { label: 'Washpond reeds', description: episode.promise?.status === 'kept' ? 'Delivered to Wren for the promised washpond bed.' : 'Soft reeds from the safe shelf. They can fulfill a promise at the inn.' },
    },
    facts: avalonFacts(episode),
    enemies: {
      mossback: { name: 'The mill mossback', description: 'A frightened creature shelters behind the vat. A battle creates access; it does not itself repair the stream.', artKey: 'mosswater-mossback' },
      'reed-pack': { name: 'The hill reed wolves', description: 'A wary pack occupies the downhill trail. Clear an opening, then guide the flock home.', artKey: 'shadow-pack.png' },
    },
  };
}

function avalonFacts(episode: AvalonEpisode): QuestRunContent['facts'] {
  const facts: QuestRunContent['facts'] = {
    'avalon-arrival': { label: 'A visit to the Larch Hills', description: 'The atlas is familiar; this visit’s starting point, visitors and two local troubles have been saved.' },
    'water-lead': { label: 'Yellow water below the mill', description: 'Inspect the mill yard. Larch Run is still clear above it.' },
    'water-source': { label: 'The vat is the source', description: 'Dye leaks from the cracked mill vat into Larch Run. Seal it, bargain for its removal or clear access by force.' },
    'water-restored': { label: 'Larch Run is clear again', description: 'The party’s chosen fix has stopped the dye reaching the stream.' },
    'carter-lead': { label: 'Pip took the quarry track', description: 'The missing delivery can be followed to Green Quarry.' },
    'carter-found': { label: 'Pip is safe; the axle broke', description: 'Use tools, spend supplies or walk home without the cart.' },
    'carter-safe': { label: 'Pip is home', description: 'The party helped Pip return safely to the Larch Inn.' },
    'cargo-left': { label: 'The cargo awaits recovery', description: 'Pip is safe. The marked cart remains at Green Quarry for another trip.' },
    'herd-lead': { label: 'Bells above Hill Spring', description: 'The flock waits on the grazing shelf above a blocked trail.' },
    'herd-paths': { label: 'Two paths for the flock', description: 'Food or combat can clear the lower trail. Tools and a brace can reopen the upper gate.' },
    'flock-home': { label: 'The flock has come home', description: 'The party’s chosen route has brought the sheep safely down.' },
    'upper-gate-open': { label: 'A lasting upper route', description: 'The repaired gate gives the hill flock a permanent second path.' },
    'shared-cause': { label: 'One delivery connected two troubles', description: 'Pip’s broken cart delayed the mill’s replacement seal. Each problem still needs its own resolution.' },
    'tools-found': { label: 'The shared repair kit', description: 'The reusable lever and rope can repair the axle or the hill gate.' },
    'reeds-gathered': { label: 'The reed shelf is harvested', description: 'Its two supply bundles and soft bed reeds are already gathered.' },
    'mossback-need': { label: 'The mossback needs a dry home', description: 'Wren’s unused washpond can replace its shelter if the party brings a bed of reeds.' },
    'promise:washpond-reeds': { label: 'A promised reed bed', description: AVALON_PROMISES['washpond-reeds'].description },
    'promise-kept:washpond-reeds': { label: 'The washpond promise is kept', description: AVALON_PROMISES['washpond-reeds'].fulfillmentText },
    'inn-lunch-taken': { label: 'The lunch is packed', description: 'Wren’s one common-store lunch supplied two packs.' },
    'spring-flask-filled': { label: 'The flask is filled', description: 'The spring’s one travel flask is already packed.' },
    'mill-supply-taken': { label: 'The mill shelf is empty', description: 'The one spare supply is already in the party kit.' },
    'quarry-reserve-taken': { label: 'The reserve is taken', description: 'The cairn’s one dry supply is already in the kit.' },
  };
  for (const id of episode.manifest.conflictIds) {
    facts[`following:${id}`] = { label: `Following: ${AVALON_THREADS[id].title}`, description: `A player chose to pursue this lead. ${AVALON_THREADS[id].teaser} Other known leads remain available.` };
    facts[`resolved:${id}`] = { label: `${AVALON_THREADS[id].title}: settled`, description: 'The party has chosen a resolution. A contradictory resolution cannot replace it.' };
    const sent = episode.threads.find(thread => thread.id === id)?.pressureSupplySpent;
    facts[AVALON_THREADS[id].pressureFact] = { label: `${AVALON_THREADS[id].title}: ${sent ? 'help sent' : 'help requested'}`, description: sent ? AVALON_THREADS[id].pressureWarnings[2] : 'No shared supply remained to send. The request is recorded without claiming that aid was delivered; all solutions remain available.' };
  }
  for (const enemy of ['mossback', 'reed-pack']) {
    facts[`encounter-cleared:${enemy}`] = { label: 'The blocked approach is open', description: 'The party got past the creature. The local problem still needs its final action.' };
    facts[`defeated:${enemy}`] = { label: 'The creature retreated', description: 'The party won the battle and earned personal gear choices.' };
    facts[`escaped:${enemy}`] = { label: 'Past the creature', description: 'The party reached the approach after a costly escape.' };
  }
  return facts;
}

export function avalonReturnText(episode: AvalonEpisode): string {
  const settled = episode.threads.filter(thread => thread.status === 'resolved').map(thread => AVALON_THREADS[thread.id].resolutions[thread.resolutionId ?? '']?.change ?? `${AVALON_THREADS[thread.id].title} is settled.`);
  const open = episode.threads.filter(thread => thread.status !== 'resolved');
  const unfinished = open.length ? ` Still open: ${open.map(thread => thread.status === 'hidden' ? 'an uninvestigated local trouble' : AVALON_THREADS[thread.id].title.toLowerCase()).join(' and ')}. The inn records what remains; it has not been solved for you.` : ' Both local troubles are settled.';
  const promise = episode.promise ? episode.promise.status === 'kept' ? ' The promised washpond reed bed is ready.' : ' The washpond reed bed is still owed. Wren records the promise; leaving does not pretend it was kept.' : '';
  return `Back at the Larch Inn, Wren records the party’s visit. ${settled.join(' ')}${unfinished}${promise}`;
}
