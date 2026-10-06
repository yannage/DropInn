import { AVALON_THREADS, avalonContent } from './avalonContent';
import type { AvalonConflictId, AvalonEpisode } from './avalonTypes';
import type { QuestChallenge, QuestOption, QuestRunContent, QuestTarget } from './questRunTypes';

/** A v2 result records the actual accepted method through success-only evidence. */
export function avalonDiceResolutionCost(threadId: AvalonConflictId, resolutionId: string, evidence: string[]): string {
  if (threadId === 'bitter-water' && resolutionId === 'seal') return evidence.includes('vat-sealed-economically')
    ? 'One shared supply sealed and flushed the leak. The party’s successful approach preserved its second pack.'
    : 'Two shared supplies became sealant and clean flushing water.';
  if (threadId === 'stranded-herd' && resolutionId === 'fence') return evidence.includes('gate-repaired-without-supplies')
    ? 'The reusable kit realigned the hinge. The lasting upper route cost no shared supply.'
    : 'One shared supply became a lasting gate brace.';
  if (threadId === 'missing-carter' && resolutionId === 'repair') return 'The reusable kit repaired the axle. The party spent no shared supplies.';
  if (threadId === 'missing-carter' && resolutionId === 'brace') return evidence.includes('cart-braced-with-one-pack')
    ? 'The successful lift used one shared supply for the axle brace.'
    : 'Two shared supply packs became an axle brace and a skid.';
  return AVALON_THREADS[threadId].resolutions[resolutionId]?.cost ?? 'The accepted action records this resolution’s cost.';
}

/** V2 adds authored uncertainty to selected obstacles. The saved v1 content stays unchanged. */
export function avalonDiceContent(episode: AvalonEpisode, evidence: string[] = []): QuestRunContent {
  const content = avalonContent(episode, evidence);
  content.version = 2;
  content.pitch = 'Explore a familiar world, roll for bold approaches, and build on a companion’s attempt. Safe clues keep every visit moving.';
  const target = (id: string) => content.nodes.flatMap(node => node.targets).find(entry => entry.id === id);
  const add = (id: string, options: QuestOption[]) => target(id)?.options.push(...options);
  const copy = (id: string, optionId: string) => {
    const option = target(id)?.options.find(entry => entry.id === optionId);
    return option ? { ...option, absent: [...(option.absent ?? [])], discover: [...(option.discover ?? [])] } : undefined;
  };
  const attempted = (id: string, label: string, attribute: QuestChallenge['attribute'], dc: number, success: string, failure: string, setupLabel: string): QuestChallenge => ({ id, label, attribute, dc, success, failure, setupLabel });

  const lunch = copy('wren', 'inn-pack')!;
  add('wren', [
    { ...lunch, id: 'inn-request-reserve', label: 'Make a case for reserve rations', preview: 'Ask Wren to add her emergency pack to the ordinary lunch. A miss leaves the guaranteed lunch untouched.', result: 'Wren trusts the party with the extra reserve alongside the common-store lunch.', supplyDelta: 3,
      challenge: attempted('inn-rations', 'Wren’s reserve', 'heart', 6, 'Reassured, Wren opens her reserve cupboard and offers its emergency pack alongside the ordinary lunch.', 'Wren hesitates but shows you where the cupboard sticks. You mark its bent pin; the ordinary lunch is still available.', 'The reserve cupboard’s bent pin is marked') },
    { ...lunch, id: 'inn-release-reserve', label: 'Unstick the reserve-cupboard latch', preview: 'Carefully open the jammed cupboard and recover the reserve with the lunch. This is harder than asking; no tools or supplies are spent.', result: 'The cupboard opens without spoiling the food. The party can pack its reserve and the lunch.', supplyDelta: 3,
      challenge: attempted('inn-rations', 'Wren’s reserve', 'wits', 7, 'The latch clicks free. Wren offers the recovered reserve alongside the ordinary lunch.', 'The latch catches again. You mark the bent pin for the next attempt; the ordinary lunch remains reachable.', 'The reserve cupboard’s bent pin is marked') },
  ]);
  if (!evidence.includes('inn-lunch-taken')) target('wren')!.context += ' A jammed reserve cupboard could provide one extra pack; Wren also needs reassurance before sharing that reserve.';

  const skiff = target('ford-kit')!;
  skiff.name = evidence.includes('skiff-afloat') ? 'The working skiff landing' : 'The grounded skiff';
  skiff.artKey = evidence.includes('skiff-afloat') ? 'boat-afloat' : 'stranded-boat.png';
  skiff.context = evidence.includes('skiff-afloat')
    ? 'The skiff is free and its towline marks a direct water route to the mill. The landing’s repair kit can still be borrowed.'
    : 'A skiff is wedged beside the ford. Freeing it opens a direct water route to the mill. The landing’s rope and lever remain available to borrow.';
  add('ford-kit', [
    { id: 'ford-skiff-shove', label: 'Rock the skiff off the stones', preview: 'Use Might to free the skiff without spending supplies. The difficult shove can open the direct mill route.', result: 'The skiff slides clear. Its towline now opens a direct route between Old Ford and the mill.', absent: ['skiff-afloat'], discover: ['skiff-afloat'],
      challenge: attempted('ford-skiff', 'The grounded skiff', 'might', 7, 'A strong heave frees the skiff without spending supplies. The direct mill route opens.', 'The hull shifts but catches. You wedge its bow so the next attempt has a better starting point.', 'The skiff’s bow is wedged') },
    { id: 'ford-skiff-lever', label: 'Rig a padded lever', preview: 'A Wits check is easier, but success spends 1 shared supply on a protective cradle. A miss keeps the pack.', result: 'The padded lever floats the skiff clear. Its towline now opens the direct mill route.', absent: ['skiff-afloat'], discover: ['skiff-afloat'], supplyDelta: -1,
      challenge: attempted('ford-skiff', 'The grounded skiff', 'wits', 5, 'The cradle holds and the skiff floats free. One supply becomes padding; the direct mill route opens.', 'The lever tips before the pack is used. You mark a stable pivot for the next attempt.', 'A stable skiff pivot is marked') },
  ]);
  content.edges.push(
    { id: 'ford-skiff-to-mill', from: 'old-ford', to: 'mill-yard', label: 'Use the skiff route', description: 'The freed skiff and towline provide a direct route along Larch Run.', requires: ['skiff-afloat'] },
    { id: 'mill-skiff-to-ford', from: 'mill-yard', to: 'old-ford', label: 'Use the skiff route', description: 'Return directly to Old Ford along the opened water route.', requires: ['skiff-afloat'] },
  );
  content.facts['skiff-afloat'] = { label: 'The skiff route is open', description: 'The party freed the grounded skiff. A direct path now connects Old Ford and the mill; the ordinary footpaths remain open.' };

  const reeds = copy('bank-reeds', 'bank-gather-reeds')!;
  add('bank-reeds', [
    { ...reeds, id: 'bank-haul-reeds', label: 'Haul in the deeper reed mat', preview: 'Risk a difficult Might attempt for 3 supplies and the bed reeds. The safe shelf still offers 2 if the attempt fails.', result: 'You draw the deeper mat onto the safe shelf and sort its extra usable bundles.', supplyDelta: 3,
      challenge: attempted('bank-harvest', 'The deep reed mat', 'might', 7, 'The whole mat comes free. You keep the soft bed reeds and offer the useful bundles to the shared pack.', 'The mat holds fast. You secure its loose end; the safe bundle remains untouched.', 'The reed mat has a secure handhold') },
    { ...reeds, id: 'bank-rig-reeds', label: 'Snare the mat with borrowed rope', preview: 'Use the shared kit for a gentler Wits attempt: 3 supplies and the bed reeds. The reusable tools are not consumed.', result: 'The rope draws the deeper mat safely within reach. You sort its extra usable bundles.', requires: ['tools-found'], supplyDelta: 3,
      challenge: attempted('bank-harvest', 'The deep reed mat', 'wits', 6, 'The snare holds. You keep the soft bed reeds and offer the useful bundles to the shared pack.', 'The loop slips. You find the mat’s firm root; the safe bundle remains untouched.', 'The reed mat’s firm root is located') },
  ]);

  const seal = copy('mill-vat', 'water-seal-vat');
  if (seal) {
    add('mill-vat', [
      { ...seal, id: 'water-press-patch', label: 'Hold a patch against the split', preview: 'Try a difficult Might seal using 1 supply. A miss spends nothing; the guaranteed two-pack seal remains available.', result: 'The held patch seals the leak. The feed is flushed and Larch Run clears; the mossback keeps its shelter.', supplyDelta: -1, discover: [...seal.discover!, 'vat-sealed-economically'],
        challenge: attempted('mill-vat-seal', 'The leaking vat seam', 'might', 7, 'One supply seals and flushes the leak. Larch Run clears, and the mossback keeps its dry shelter.', 'Pressure pushes the patch loose before it is used. You brace the weak seam for the next attempt.', 'The weak vat seam is braced') },
      { ...seal, id: 'water-fit-patch', label: 'Fit a patch with the repair kit', preview: 'Use Wits and the reusable kit to seal the leak with 1 supply. A miss keeps the supply; the safe two-pack seal remains available.', result: 'The fitted patch seals the leak. The feed is flushed and Larch Run clears; the mossback keeps its shelter.', requires: [...(seal.requires ?? []), 'tools-found'], supplyDelta: -1, discover: [...seal.discover!, 'vat-sealed-economically'],
        challenge: attempted('mill-vat-seal', 'The leaking vat seam', 'wits', 6, 'Your fitted patch and flush use one supply. Larch Run clears, and the mossback keeps its dry shelter.', 'The joint will not seat. You expose the warped edge for the next attempt; no supplies are spent.', 'The warped vat edge is exposed') },
    ]);
    content.facts['vat-sealed-economically'] = { label: 'A careful one-pack seal', description: 'The successful Might or Wits approach repaired the vat using one shared supply, preserving the mossback’s shelter.' };
  }

  const gate = copy('spring-flock', 'herd-gate');
  if (gate) {
    add('spring-flock', [
      { ...gate, id: 'herd-lift-gate', label: 'Lift and brace the upper gate', preview: 'Try Might without the toolkit. Success spends 1 supply on a lasting brace; a miss leaves both sheep and supplies safe.', result: 'You lift the gate square and secure it. The flock comes home through its lasting second route.', requires: ['herd-paths'], supplyDelta: -1,
        challenge: attempted('hill-gate', 'The upper flock gate', 'might', 7, 'The heavy gate rises and one supply braces it. The flock comes home through a lasting second route.', 'The gate slips back. You get a firm block under its corner so the next attempt starts higher.', 'The gate’s low corner is blocked') },
      { ...gate, id: 'herd-rig-gate', label: 'Realign the hinge with the kit', preview: 'Use Wits and the shared tools to repair the gate without spending supplies. The guaranteed tool-and-pack brace stays available after a miss.', result: 'The hinge sits true. The flock comes home through a lasting second route without using a supply.', supplyDelta: 0, discover: [...gate.discover!, 'gate-repaired-without-supplies'],
        challenge: attempted('hill-gate', 'The upper flock gate', 'wits', 6, 'You reset the hinge with the tools alone. The flock comes home through a lasting second route; no supplies are spent.', 'A bent pin stops the hinge. You expose the pin for the next attempt; the flock stays safely on the shelf.', 'The bent gate pin is exposed') },
    ]);
    content.facts['gate-repaired-without-supplies'] = { label: 'A lasting repair without a pack', description: 'The party realigned the hinge with its reusable kit. The flock’s upper route cost no shared supply.' };
  }

  const cart = copy('quarry-cart', 'carter-repair');
  if (cart) {
    // Free repair now asks for skill; the old two-pack skid and walk-home choices remain guaranteed.
    const repaired = target('quarry-cart')!.options.find(option => option.id === 'carter-repair')!;
    repaired.label = 'Rig the axle with the borrowed kit';
    repaired.preview = 'Try Wits with the shared tools to save both cart and cargo without supplies. A miss keeps the toolkit; the two-pack skid and walk home remain available.';
    repaired.challenge = attempted('quarry-axle', 'Pip’s broken axle', 'wits', 6, 'Your rope rig holds. Pip brings the cart and cargo home without using supplies.', 'The axle shifts before the knot tightens. You expose its straight edge for the next attempt; Pip remains safe.', 'The axle’s straight edge is exposed');
    add('quarry-cart', [
      { ...cart, id: 'carter-shoulder-cart', label: 'Shoulder the cart onto a brace', preview: 'Try Might without the toolkit. Success spends 1 supply to carry the cart and cargo home; a miss keeps the pack.', result: 'You shoulder the cart onto a sound brace. Pip brings the cargo safely home using one shared supply.', requires: ['carter-found'], supplyDelta: -1, discover: [...cart.discover!, 'cart-braced-with-one-pack'], avalon: { ...cart.avalon!, resolutionId: 'brace' },
        challenge: attempted('quarry-axle', 'Pip’s broken axle', 'might', 7, 'One supply becomes a stable axle brace. Pip returns safely with the cart and cargo.', 'The loaded cart is too low to lift cleanly. You settle a firm foothold for the next attempt; Pip and the pack stay safe.', 'A firm cart-lifting foothold is made') },
    ]);
    content.facts['cart-braced-with-one-pack'] = { label: 'A one-pack axle brace', description: 'The successful Might approach returned Pip’s cart and cargo using one shared supply instead of the guaranteed two-pack skid.' };
  }

  // Safe methods close their risky alternatives too; these are competing approaches, not a checklist.
  const mutuallyExclusive = (entry: QuestTarget | undefined, fact: string) => {
    if (!entry) return;
    for (const option of entry.options.filter(option => option.challenge)) option.absent = [...new Set([...(option.absent ?? []), fact])];
  };
  mutuallyExclusive(target('wren'), 'inn-lunch-taken');
  mutuallyExclusive(target('bank-reeds'), 'reeds-gathered');

  // The immediate follow-up is a focused menu: include v2 methods beside the inherited safe choices.
  const followUps: [string, string, string[]][] = [
    ['mill-vat', 'water-inspect-vat', ['water-press-patch', 'water-fit-patch']],
    ['spring-flock', 'herd-survey', ['herd-lift-gate', 'herd-rig-gate']],
    ['quarry-cart', 'carter-check', ['carter-repair', 'carter-shoulder-cart']],
  ];
  for (const [targetId, sourceId, alternatives] of followUps) {
    const source = target(targetId)?.options.find(option => option.id === sourceId);
    if (source) source.followUp = [...new Set([...(source.followUp ?? []), ...alternatives])];
  }
  return content;
}
