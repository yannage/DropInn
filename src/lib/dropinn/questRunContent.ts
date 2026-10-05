import type { QuestRunContent } from './questRunTypes';

/** Authored Mosswater v1 choices. The quest reducer owns requirements and effects. */
export const QUEST_RUN_CONTENT: QuestRunContent = {
  id: 'mosswater', version: 1,
  title: 'Mosswater: The Well That Growled',
  pitch: 'Find why the well is poisoned, face what lives upstream, and bring clean water home your way.',
  opening: 'Mara catches your bucket before it reaches the well. “The water turned bitter overnight.” A growl rolls up the rope. Her kettle is empty. Where will you start?',
  startNodeId: 'well-yard',
  chapters: [
    { id: 'mosswater-investigate', title: 'What happened to the water?', keepsake: 'Mosswater’s marked cup' },
    { id: 'mosswater-source', title: 'A way to clean water', keepsake: 'Mosswater’s knotted reed' },
    { id: 'mosswater-resolve', title: 'What the village keeps', keepsake: 'Mosswater’s well token' },
  ],
  nodes: [
    {
      id: 'well-yard', label: 'The well yard', art: 'stage-village',
      description: 'The village well is bitter and growling. Mara keeps everyone away while you find a lead.',
      targets: [
        {
          id: 'well', name: 'The growling well', context: 'A yellow stain marks the rope. The growl echoes through a pipe below.', artKey: 'mosswater-well',
          options: [
            { id: 'well-inspect', label: 'Lower the bucket carefully', preview: 'Inspect the stain without drinking. Find something you can follow.', result: 'The bucket catches a scrap stained with bitterroot dye. The growl comes through the feed pipe.', discover: ['dye-stain'], items: ['stained-cloth'], followUp: ['well-trace-stain', 'well-show-mara'] },
            { id: 'well-trace-stain', label: 'Trace the stained pipe', preview: 'Follow the dye toward the old watercourse. Opens the upstream route.', result: 'The stained pipe leads to the old watercourse. You have a place to look.', requires: ['dye-stain'], discover: ['yard-route'], completeObjective: 'investigate' },
            { id: 'well-show-mara', label: 'Show Mara the scrap', preview: 'Ask where this water used to come from. Opens the old spring route.', result: 'Mara recognizes the dye and points out the old spring arch: another way to clean water.', requires: ['dye-stain'], discover: ['spring-route'], completeObjective: 'investigate' },
          ],
        },
        {
          id: 'mara', name: 'Mara', context: 'Mara has stopped drawing water. She knows the village’s older supply route.', artKey: 'mara.png',
          options: [
            { id: 'mara-ask-route', label: 'Ask about another supply', preview: 'Learn where the village drew water before this well. Opens the spring route.', result: 'Mara marks the old spring arch. Its channel is blocked, but the spring may still be clean.', discover: ['spring-route'], completeObjective: 'investigate', followUp: ['mara-pack-water', 'mara-ask-growl'] },
            { id: 'mara-pack-water', label: 'Pack the last clean flask', preview: 'Take one shared supply from Mara’s reserve. It helps the expedition, not the whole village.', result: 'Mara adds her last clean flask to the party’s supplies. The village still needs a working supply.', requires: ['spring-route'], supplyDelta: 1, discover: ['reserve-packed'] },
            { id: 'mara-ask-growl', label: 'Ask about the growling', preview: 'Find a path to the creature upstream. Opens the watercourse route.', result: 'Mara has heard a mossback by the abandoned dye yard. She shows you the upstream path.', requires: ['spring-route'], discover: ['yard-route'] },
          ],
        },
        {
          id: 'tool-cache', name: 'Rope and tools', context: 'A forgotten repair kit holds rope, tools and one usable supply pack.', artKey: 'story-rope',
          options: [
            { id: 'cache-open', label: 'Sort the repair tools', preview: 'Find a shared repair kit. It can clear the old channel without spending supplies.', result: 'The chest holds a lever and sound rope. The party now has tools for the old channel.', discover: ['tools-found'], items: ['repair-tools'], followUp: ['cache-pack-supplies', 'cache-read-sketch'] },
            { id: 'cache-pack-supplies', label: 'Pack the dry supplies', preview: 'Add one shared supply. The chest can provide it only once.', result: 'One dry supply pack joins the party’s kit. The chest holds no more provisions.', requires: ['tools-found'], discover: ['cache-packed'], supplyDelta: 1 },
            { id: 'cache-read-sketch', label: 'Read the channel sketch', preview: 'Find the old spring route without using the supply pack.', result: 'A repair sketch shows a walkable route to the old spring arch.', requires: ['tools-found'], discover: ['spring-route'], completeObjective: 'investigate' },
          ],
        },
      ],
    },
    {
      id: 'watercourse', label: 'The dye watercourse', art: 'stage-river',
      description: 'A cracked dye vat leaks toward the well. A mossy creature shelters behind it and growls at anyone approaching.',
      targets: [
        {
          id: 'dye-vat', name: 'Cracked dye vat', context: 'Yellow dye seeps into the well’s feed. The vat also shelters a muddy nest.', artKey: 'mosswater-dye-vat',
          options: [
            { id: 'vat-inspect', label: 'Compare the water and dye', preview: 'Find whether the leaking vat explains the poisoned well. Opens a way to isolate it.', result: 'The dye matches the well’s stain. The cracked vat is the poison source; the growling creature is guarding its shelter.', discover: ['dye-source'], completeObjective: 'source', followUp: ['vat-isolate', 'vat-find-bypass'] },
            { id: 'vat-isolate', label: 'Seal and cleanse the source', preview: 'Spend 2 shared supplies to seal the leak, absorb the dye and flush the well. The party keeps less for healing.', result: 'You spend two supply packs sealing the vat and cleansing the feed. Clean water reaches Mara’s kettle. The creature keeps its dry shelter; the party’s healing supplies are lighter.', requires: ['dye-source'], supplyDelta: -2, discover: ['source-isolated'], ending: 'isolate' },
            { id: 'vat-find-bypass', label: 'Find a way around it', preview: 'Keep the supplies and open the old spring route. The vat stays poisoned until dealt with.', result: 'A disused channel skirts the dye yard. It leads to the old spring; the leaking vat remains untouched.', requires: ['dye-source'], discover: ['spring-route'] },
            { id: 'vat-haul-after-fight', label: 'Haul the vat clear', preview: 'Move the poison source now the creature’s hold is broken. Flush the well; the displaced creature loses this shelter.', result: 'You drag the leaking vat onto dry ground and flush the feed. Mara draws clean water again. The displaced mossback has left its old shelter behind.', requires: ['encounter-cleared:mossback'], discover: ['dye-source', 'source-isolated'], completeObjective: 'source', ending: 'isolate' },
          ],
        },
        {
          id: 'mossback', name: 'The mossback', context: 'The creature hugs the vat with muddy paws. It watches the dry nest more than your weapons.', artKey: 'mosswater-mossback',
          options: [
            { id: 'mossback-listen', label: 'Give it room and listen', preview: 'Find what the creature is protecting. Opens a bargain instead of a fight.', result: 'The mossback points at its flooded burrow. It uses the vat as a dry wall; it will help remove it for another home.', absent: ['encounter-cleared:mossback'], discover: ['mossback-need', 'dye-source'], completeObjective: 'source', followUp: ['mossback-bargain', 'mossback-challenge'] },
            { id: 'mossback-bargain', label: 'Offer the old washpond', preview: 'Give the mossback the village’s unused washpond. It will haul the vat clear; neighbours must keep that space for its new home.', result: 'The mossback hauls the vat away and helps flush the well. Mara fills her kettle. The old washpond belongs to a new neighbour, and the village agrees to leave its den undisturbed.', requires: ['mossback-need'], absent: ['encounter-cleared:mossback'], discover: ['washpond-promised', 'source-isolated'], ending: 'bargain' },
            { id: 'mossback-challenge', label: 'Drive it from the vat', preview: 'Start a battle to reach the leak by force. Winning offers personal gear; you must still remove the poison source afterward.', result: 'The mossback plants its paws across the feed. A battle begins; the poisoned vat still needs dealing with.', absent: ['encounter-cleared:mossback'], encounter: 'mossback' },
          ],
        },
      ],
    },
    {
      id: 'old-conduit', label: 'The spring arch', art: 'gemward-v2-canal',
      description: 'An older spring lies beyond a clogged channel. Reopen this route and the village can leave its poisoned well closed.',
      targets: [
        {
          id: 'old-sluice', name: 'Jammed water gate', context: 'Silt holds the gate down. Tools can shift it; using supply pack braces costs more.', artKey: 'story-sluice',
          options: [
            { id: 'sluice-inspect', label: 'Check what is jammed', preview: 'Find how to clear the gate. Then choose tools or one shared supply.', result: 'A silt-packed brace holds the gate. A lever will clear it; a supply pack can serve as a brace.', discover: ['sluice-jam'], followUp: ['sluice-use-tools', 'sluice-use-supply'] },
            { id: 'sluice-use-tools', label: 'Clear it with the tools', preview: 'Use the shared repair kit to reopen the channel. No supply is spent.', result: 'Your lever lifts the brace. The old channel opens toward the spring.', requires: ['sluice-jam', 'tools-found'], absent: ['channel-open'], discover: ['channel-open'] },
            { id: 'sluice-use-supply', label: 'Brace it with a pack', preview: 'Spend 1 shared supply to reopen the channel. The repair tools are not needed.', result: 'A supply pack braces the gate while you clear the silt. The old channel opens.', requires: ['sluice-jam'], absent: ['channel-open'], supplyDelta: -1, discover: ['channel-open'] },
          ],
        },
        {
          id: 'carry-rope', name: 'Carrier’s handline', context: 'A safe handline will connect the reopened channel to the village’s water carriers.', artKey: 'story-rope',
          options: [
            { id: 'relay-rig', label: 'Rig the water relay', preview: 'With a clear channel and tested water, prepare a reliable carrying route.', result: 'The handline is ready. Neighbours can now carry clean spring water past the arch.', requires: ['channel-open', 'spring-tested'], discover: ['relay-ready'], followUp: ['relay-open', 'relay-pack-spare'] },
            { id: 'relay-open', label: 'Bring the spring water home', preview: 'Open the clean-water route and seal the village well. Neighbours will carry water farther until the old supply is repaired.', result: 'The first clean spring water reaches Mara’s kettle. The poisoned well is sealed. Neighbours keep a longer carrying route; the leaking dye vat still needs permanent disposal.', requires: ['relay-ready'], discover: ['alternate-supply'], ending: 'repair' },
            { id: 'relay-pack-spare', label: 'Prepare one spare carrier', preview: 'Add 1 shared supply before opening the route. The village’s water delivery still needs your final go-ahead.', result: 'A spare clean carrier is packed. The relay is ready when the party chooses to open it.', requires: ['relay-ready'], discover: ['spare-carrier'], supplyDelta: 1 },
          ],
        },
      ],
    },
    {
      id: 'derelict-mill', label: 'The derelict mill', art: 'gemward-v2-warehouse',
      description: 'Reed wolves shelter around an old work chest. A fight can earn gear and open the direct dye-yard path; the outside trail avoids them.',
      targets: [
        {
          id: 'reed-pack', name: 'Reed-wolf pack', context: 'The wolves guard the dry floor and the short passage through the mill.', artKey: 'shadow-pack.png',
          options: [
            { id: 'mill-watch-pack', label: 'Study the mill entrance', preview: 'Locate the guarded shortcut and an outside path. Then decide whether the gear is worth a fight.', result: 'The pack blocks a dry work chest and the direct dye-yard exit. An outside trail leads back around the mill.', discover: ['mill-surveyed'], followUp: ['mill-fight-pack', 'mill-mark-detour'] },
            { id: 'mill-fight-pack', label: 'Challenge the reed wolves', preview: 'Enter combat. Victory offers personal gear; overcoming or escaping the pack opens the mill passage.', result: 'The reed wolves rush the doorway. Protect the threatened hero while making room to pass.', absent: ['encounter-cleared:reed-pack'], encounter: 'reed-pack' },
            { id: 'mill-mark-detour', label: 'Take the outside lead', preview: 'Learn the longer route to the dye yard. The pack and its gear remain untouched.', result: 'The outside track leads toward the dye yard by way of the well yard. You can avoid this fight.', discover: ['yard-route'], completeObjective: 'investigate' },
          ],
        },
        {
          id: 'mill-cache', name: 'Mill repair kit', context: 'The old chest has repair tools and two dry supply packs, if the doorway can be reached.', artKey: 'story-rope',
          options: [
            { id: 'mill-open-cache', label: 'Recover the work supplies', preview: 'After the encounter, collect the repair kit and 2 shared supplies. This chest pays out once.', result: 'You recover sound repair tools and two dry supply packs. The emptied chest cannot reward another search.', requires: ['encounter-cleared:reed-pack'], discover: ['tools-found', 'mill-cache-opened'], items: ['repair-tools'], supplyDelta: 2 },
          ],
        },
      ],
    },
    {
      id: 'herb-bank', label: 'The reed bank', art: 'stage-river',
      description: 'Dry reeds hold useful expedition supplies. Bram knows a safe hill path and where the growling began.',
      targets: [
        {
          id: 'reed-patch', name: 'Useful bank reeds', context: 'A safe bundle sits close by. More grow on the slippery bank; only one harvest is available.', artKey: 'tall-reeds.png',
          options: [
            { id: 'herbs-safe', label: 'Gather the easy bundle', preview: 'Gain 1 shared supply safely and mark the spring path. Leaves the deeper herbs alone.', result: 'You gather one usable bundle and mark the hill-spring path.', absent: ['herbs-picked'], discover: ['herbs-picked', 'spring-route'], supplyDelta: 1, completeObjective: 'investigate' },
            { id: 'herbs-risk', label: 'Search the slippery bank', preview: 'Roll d6 + Wits, needing 5: gain 3 supplies. A miss costs 1 HP and yields none; the spring path is found either way.', result: 'Your search reveals the hill-spring path.', absent: ['herbs-picked'], discover: ['herbs-picked', 'spring-route'], completeObjective: 'investigate', check: { attribute: 'wits', dc: 5, success: 'You find three good bundles without slipping.', failure: 'The muddy shelf gives way. You lose 1 HP; its herbs wash away.', bonusSupplies: 3, damageOnFailure: 1 } },
          ],
        },
        {
          id: 'bram', name: 'Bram the ferryman', context: 'Bram watched something large leave the flooded reeds for the dye yard.', artKey: 'ferryman.png',
          options: [
            { id: 'bram-ask', label: 'Ask what came upstream', preview: 'Learn a route to the growling creature. Then ask for supplies or help with a crossing.', result: 'Bram saw a mossback sheltering at the dye yard. He marks a route from the village.', discover: ['yard-route'], completeObjective: 'investigate', followUp: ['bram-pack', 'bram-flood-path'] },
            { id: 'bram-pack', label: 'Carry Bram’s spare pack', preview: 'Take 1 shared supply from the ferryman. He has only one to spare.', result: 'Bram hands over one spare supply pack for the expedition.', discover: ['bram-pack-taken'], supplyDelta: 1 },
            { id: 'bram-flood-path', label: 'Rig the flood crossing', preview: 'In high water, open a direct reed-bank route to the dye yard. The crossing is unnecessary in low water.', requires: ['high-water'], result: 'Bram secures a floating handline across the flooded bend. The dye yard is now a direct crossing away.', discover: ['flood-crossing'] },
          ],
        },
      ],
    },
    {
      id: 'hill-spring', label: 'The hill spring', art: 'stage-river',
      description: 'A sheltered spring bypasses the dye yard. Test its water, then prepare a carrying route through the old arch.',
      targets: [
        {
          id: 'spring-pool', name: 'Sheltered spring', context: 'A narrow trickle bypasses the dye yard. Compare a sample before using it.', artKey: 'reeds-path',
          options: [
            { id: 'spring-test', label: 'Test the spring water', preview: 'Use Mara’s reed test to check this supply. It can offer a solution even if the growl remains unexplained.', result: 'The spring sample passes Mara’s reed test. This water is clean, even while the village well remains poisoned.', discover: ['spring-tested'], items: ['clean-sample'], completeObjective: 'source', followUp: ['spring-fill-flask', 'spring-mark-feed'] },
            { id: 'spring-fill-flask', label: 'Fill one travel flask', preview: 'Add 1 shared supply from the clean spring. This sample alone will not supply the village.', result: 'A clean flask joins the party’s kit. A working route is still needed for the village.', requires: ['spring-tested'], discover: ['spring-flask-filled'], supplyDelta: 1 },
            { id: 'spring-mark-feed', label: 'Mark a route for carriers', preview: 'Locate the old channel’s jammed gate. No supplies are spent.', result: 'The safe carrying line reaches the old gate. Its silt-packed brace must be cleared first.', requires: ['spring-tested'], discover: ['sluice-jam'] },
          ],
        },
        {
          id: 'ridge-path', name: 'Broken ridge fence', context: 'The broken fence cannot support a safe handline home. The long bank path remains open.', artKey: 'gate.png',
          options: [
            { id: 'ridge-survey', label: 'Study the ridge gap', preview: 'Find a shortcut home. Then choose a reliable supply brace or a Might attempt.', result: 'A stable handline would make a direct path home. The reed-bank trail remains available.', discover: ['ridge-surveyed'], followUp: ['ridge-brace', 'ridge-risk'] },
            { id: 'ridge-brace', label: 'Brace it with a supply', preview: 'Spend 1 shared supply to open the direct hill-spring path to the well yard.', result: 'Your pack braces a handline. The direct path between the spring and well yard opens.', requires: ['ridge-surveyed'], absent: ['ridge-shortcut'], discover: ['ridge-shortcut'], supplyDelta: -1 },
            { id: 'ridge-risk', label: 'Haul the handline across', preview: 'Roll d6 + Might, needing 5: open the shortcut without spending supplies. A miss costs 1 HP; the long path stays open.', result: 'You try to span the gap while keeping the safe trail in reach.', requires: ['ridge-surveyed'], absent: ['ridge-shortcut'], check: { attribute: 'might', dc: 5, success: 'The handline holds. The direct spring-to-village route opens.', failure: 'The line slips and you scrape a knee: lose 1 HP. Use the safe trail or brace the gap later.', damageOnFailure: 1, successDiscover: ['ridge-shortcut'] } },
          ],
        },
      ],
    },
  ],
  edges: [
    { id: 'yard-to-watercourse', from: 'well-yard', to: 'watercourse', label: 'Follow the stained pipe', description: 'Find the poison source and the growling creature. A bargain or a battle may open access.', requires: ['yard-route'] },
    { id: 'watercourse-to-yard', from: 'watercourse', to: 'well-yard', label: 'Return to Mara', description: 'Revisit the repair chest or use a different lead.' },
    { id: 'yard-to-arch-flood', from: 'well-yard', to: 'old-conduit', label: 'Follow the flooded lane', description: 'High water opens a boat-side path to the old arch. Its blocked channel can support an alternate supply.', requires: ['high-water'], absent: ['spring-route'] },
    { id: 'yard-to-arch-lead', from: 'well-yard', to: 'old-conduit', label: 'Follow the old spring lead', description: 'The party’s directions open a direct route to the spring arch. Its channel still needs clearing.', requires: ['spring-route'] },
    { id: 'yard-to-mill-dry', from: 'well-yard', to: 'derelict-mill', label: 'Cross the dry mill yard', description: 'Low water opens this shortcut. The mill offers a wolf encounter, personal gear and a supply chest.', requires: ['low-water'] },
    { id: 'yard-to-bank', from: 'well-yard', to: 'herb-bank', label: 'Visit the reed bank', description: 'Gather safe supplies or risk a larger harvest; Bram knows useful routes.' },
    { id: 'spring-to-yard', from: 'old-conduit', to: 'well-yard', label: 'Return to the well yard', description: 'Bring the facts back or collect the repair tools.' },
    { id: 'watercourse-to-spring', from: 'watercourse', to: 'old-conduit', label: 'Bypass the dye yard', description: 'Leave the vat and creature alone while reopening a clean supply.', requires: ['spring-route'] },
    { id: 'spring-to-watercourse', from: 'old-conduit', to: 'watercourse', label: 'Visit the dye yard', description: 'Follow a known upstream lead instead of finishing the bypass.', requires: ['yard-route'] },
    { id: 'arch-to-hill', from: 'old-conduit', to: 'hill-spring', label: 'Find the spring above', description: 'Test the alternate water before delivering it through the arch.' },
    { id: 'hill-to-arch', from: 'hill-spring', to: 'old-conduit', label: 'Prepare the water route', description: 'Clear the old gate and rig a carrier’s handline for the clean spring.' },
    { id: 'bank-to-yard', from: 'herb-bank', to: 'well-yard', label: 'Return to Mara', description: 'Use a new lead or collect the shared repair kit.' },
    { id: 'bank-to-hill', from: 'herb-bank', to: 'hill-spring', label: 'Climb the safe spring path', description: 'Reach the alternate water without a fight. Testing and a carrying route still need work.' },
    { id: 'hill-to-bank', from: 'hill-spring', to: 'herb-bank', label: 'Take the safe bank trail', description: 'A longer way home with supplies and the ferryman along the route.' },
    { id: 'bank-flood-crossing', from: 'herb-bank', to: 'watercourse', label: 'Use Bram’s flood crossing', description: 'The prepared handline skips a return through the village.', requires: ['high-water', 'flood-crossing'] },
    { id: 'mill-to-yard', from: 'derelict-mill', to: 'well-yard', label: 'Leave by the mill yard', description: 'Return to the village without confronting the pack.' },
    { id: 'mill-to-bank', from: 'derelict-mill', to: 'herb-bank', label: 'Follow the outside bank', description: 'Avoid the wolves and gather supplies on the safe approach to the hill spring.' },
    { id: 'bank-to-mill', from: 'herb-bank', to: 'derelict-mill', label: 'Approach the mill store', description: 'Find the optional wolf encounter, a supply chest and a direct dye-yard exit.' },
    { id: 'mill-to-dye', from: 'derelict-mill', to: 'watercourse', label: 'Use the mill passage', description: 'The cleared encounter opens the direct way to the poison source.', requires: ['encounter-cleared:reed-pack'] },
    { id: 'dye-to-mill', from: 'watercourse', to: 'derelict-mill', label: 'Search the mill store', description: 'Try an optional fight for gear and shared supplies before fixing the water.' },
    { id: 'hill-shortcut-home', from: 'hill-spring', to: 'well-yard', label: 'Use the ridge shortcut', description: 'Your secured handline skips the reed-bank detour.', requires: ['ridge-shortcut'] },
    { id: 'yard-shortcut-hill', from: 'well-yard', to: 'hill-spring', label: 'Use the ridge handline', description: 'Revisit the tested spring by the shortcut the party prepared.', requires: ['ridge-shortcut'] },
  ],
  items: {
    'stained-cloth': { label: 'Dye-stained cloth', description: 'The well bucket caught this bitterroot-dye scrap. It points toward the old watercourse.' },
    'repair-tools': { label: 'Repair kit', description: 'Shared rope and a lever can clear the old channel without spending supplies.' },
    'clean-sample': { label: 'Clean spring sample', description: 'Mara’s reed test confirmed this alternate supply. A sample is not yet a village water route.' },
  },
  facts: {
    'high-water': { label: 'High water', description: 'The village lane reaches the old arch by water. Bram can prepare a direct flood crossing from the reed bank.' },
    'low-water': { label: 'Low water', description: 'The dry mill yard is reachable directly from the village. The reed-bank flood crossing is unavailable.' },
    'dye-stain': { label: 'A dye stain in the well', description: 'The bucket caught bitterroot-dyed cloth; the growl echoes through the feed pipe.' },
    'yard-route': { label: 'Path to the dye yard', description: 'The party knows how to reach the old watercourse.' },
    'spring-route': { label: 'Path to the old spring', description: 'An older supply may bypass the poisoned well.' },
    'reserve-packed': { label: 'Mara’s last clean flask', description: 'Mara supplied one extra expedition provision.' },
    'tools-found': { label: 'Repair tools found', description: 'A rope and lever can clear the old channel.' },
    'cache-packed': { label: 'The chest is packed out', description: 'Its single dry supply pack has already been collected.' },
    'dye-source': { label: 'The cracked vat poisons the feed', description: 'Bitterroot dye leaks into the well. The mossback guards the vat as a shelter wall.' },
    'mossback-need': { label: 'The creature needs a home', description: 'A dry replacement den can win its help hauling the vat away.' },
    'washpond-promised': { label: 'The mossback’s washpond', description: 'The village has promised the old washpond as an undisturbed den.' },
    'source-isolated': { label: 'The poison source is isolated', description: 'The leaking dye can no longer reach the well.' },
    'encounter-cleared:mossback': { label: 'The vat can be reached', description: 'The party overcame or slipped past the mossback. The vat still needs removing.' },
    'defeated:mossback': { label: 'The mossback yielded', description: 'The party won the encounter and earned personal gear choices.' },
    'escaped:mossback': { label: 'A costly opening', description: 'The party got past the mossback without winning a clean victory.' },
    'sluice-jam': { label: 'The jammed brace', description: 'A silt-packed brace can be levered free or propped with a supply pack.' },
    'channel-open': { label: 'The old channel is open', description: 'The water carriers can reach the sheltered spring.' },
    'spring-tested': { label: 'The spring is clean', description: 'Mara’s reed test confirmed an alternate supply.' },
    'spring-flask-filled': { label: 'A clean travel flask', description: 'One supply has been taken from the tested spring.' },
    'relay-ready': { label: 'The carrying relay is ready', description: 'The channel, tested spring and handline make a working route possible.' },
    'spare-carrier': { label: 'A spare carrier is packed', description: 'The party packed one extra supply at the finished relay.' },
    'alternate-supply': { label: 'Spring water reaches the village', description: 'The clean carrying route is open and the poisoned well is sealed.' },
    'mill-surveyed': { label: 'The mill’s guarded passage', description: 'The wolves guard its chest and a direct route to the dye yard.' },
    'mill-cache-opened': { label: 'The mill chest is emptied', description: 'Its tools and two supplies are already in the party kit.' },
    'encounter-cleared:reed-pack': { label: 'The mill passage is open', description: 'The party can reach the chest and direct dye-yard exit after the encounter.' },
    'defeated:reed-pack': { label: 'The reed pack yielded', description: 'The party won the optional fight and earned personal gear choices.' },
    'escaped:reed-pack': { label: 'Past the reed pack', description: 'The party reached the passage after a costly escape.' },
    'herbs-picked': { label: 'The bank harvest is finished', description: 'The party took one harvest opportunity; repeating it cannot add supplies.' },
    'bram-pack-taken': { label: 'Bram’s pack is taken', description: 'The ferryman supplied his one spare pack.' },
    'flood-crossing': { label: 'Bram’s crossing is ready', description: 'The high-water handline opens a direct bank-to-dye-yard route.' },
    'ridge-surveyed': { label: 'A possible ridge shortcut', description: 'A supply brace or a successful Might attempt can secure the handline.' },
    'ridge-shortcut': { label: 'The ridge handline holds', description: 'The direct path between the hill spring and village is open.' },
  },
  enemies: {
    mossback: { name: 'The mossback', description: 'A frightened bog creature defends its dry shelter. Read its intent, protect the threatened hero, and make an opening.', artKey: 'mosswater-mossback' },
    'reed-pack': { name: 'Reed-wolf pack', description: 'A wary wolf pack guards the dry mill store. Overcome it for personal gear, or get through at a cost.', artKey: 'shadow-pack.png' },
  },
};
