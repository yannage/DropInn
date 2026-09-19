import { CHAPTERS } from './content';
import type { AdventureRoom, PlayerAction, SceneChange, SceneTarget } from './types';

const developments: Record<string, { flag: string; name: string; description: string; tokens: SceneTarget['tokens']; change: SceneChange }> = {
  mara: { flag: 'mara-helped', name: 'Mara’s river lead', description: 'Mara is safe. Ask what she saw or help her mark a route through the reeds.', tokens: ['influence', 'investigate', 'assist'], change: { title: 'Mara is safe', text: 'She crawls clear of the gate and points toward the river.', next: 'Follow her lead or examine the tracks.' } },
  gate: { flag: 'gate-cleared', name: 'The sheltered pen', description: 'The timbers are braced. Guide animals into shelter or examine the snapped ward charms.', tokens: ['influence', 'investigate', 'assist'], change: { title: 'A shelter takes shape', text: 'The broken timbers now protect a corner of the pen.', next: 'Calm the herd or search the ward charms.' } },
  tracks: { flag: 'tracks-read', name: 'The silver ward fragment', description: 'The tracks led to a silver fragment. Its markings match the old chapel.', tokens: ['investigate', 'influence', 'assist'], change: { title: 'A clue in the mud', text: 'A silver ward fragment lies among the claw marks.', next: 'Study its markings or ask Mara about the chapel.' } },
  herd: { flag: 'herd-calmed', name: 'The gathered herd', description: 'The animals are calmer. One has a torn ribbon that could reveal where the others went.', tokens: ['influence', 'investigate', 'assist'], change: { title: 'The herd settles', text: 'The animals gather close enough to guide to safety.', next: 'Inspect the torn ribbon or help secure the pen.' } },
  boat: { flag: 'boat-freed', name: 'The boat at the crossing', description: 'The boat is afloat. Guide the crossing or help keep everyone steady.', tokens: ['influence', 'investigate', 'assist'], change: { title: 'The boat is afloat', text: 'Its keel slips free of the mud, opening a way across.', next: 'Guide the party aboard or distract the pack.' } },
  reeds: { flag: 'reed-path', name: 'The concealed path', description: 'A narrow path hides the party from the pack. Help others through or scout its far end.', tokens: ['investigate', 'assist'], change: { title: 'A hidden way through', text: 'The reeds part around a sheltered path to the bank.', next: 'Scout ahead or help the party through.' } },
  ferryman: { flag: 'ferryman-spoke', name: 'The ferryman’s warning', description: 'He remembers the guardian. Ask how the chapel bell could break its curse.', tokens: ['influence', 'investigate', 'assist'], change: { title: 'The guardian had a purpose', text: 'The ferryman remembers Gloamfang protecting this river.', next: 'Ask about the bell or study the pack’s ward-light.' } },
  ward: { flag: 'ward-repaired', name: 'The restored ward', description: 'The stones are joined. Sustain their light or call the guardian back to its purpose.', tokens: ['influence', 'assist'], change: { title: 'The ward answers', text: 'Light passes between the repaired stones. The curse begins to loosen.', next: 'Appeal to Gloamfang or guide the captives out.' } },
  bell: { flag: 'bell-rung', name: 'The ringing chapel bell', description: 'The bell is sounding. Keep its rhythm steady or use it to guide the captives.', tokens: ['influence', 'investigate', 'assist'], change: { title: 'A note cuts through the shadow', text: 'The bell’s first clear note gives the party an opening.', next: 'Reach the ward or help the captives escape.' } },
  captives: { flag: 'captives-guided', name: 'The open escape route', description: 'The first animals are outside. Guide the rest or keep their escape route clear.', tokens: ['influence', 'investigate', 'assist'], change: { title: 'The captives have a way out', text: 'The first frightened animals slip past the altar into daylight.', next: 'Keep the route safe while the party faces Gloamfang.' } },
};

/** One shared scene projection for browser, rules, and model context. */
export function getScene(room: AdventureRoom) {
  const chapter = CHAPTERS[room.chapter];
  const targets = chapter.targets.map(target => {
    const update = developments[target.id];
    return update && room.flags.includes(update.flag)
      ? { ...target, name: update.name, description: update.description, tokens: update.tokens, changed: true }
      : { ...target };
  });
  let intro = chapter.intro;
  let objective = chapter.objective;
  if (room.chapter === 0 && room.flags.includes('mara-helped')) {
    intro = 'Mara is safe beside the pen. She points toward claw marks vanishing into the reeds; a few frightened animals still need guiding home.';
    objective = 'Follow Mara’s river lead and gather the remaining animals.';
  }
  if (room.chapter === 1 && room.flags.includes('boat-freed')) {
    intro = 'The boat rocks at the crossing, ready to carry the party. The shadow pack prowls along the bank while the ferryman steadies the rope.';
    objective = 'Get everyone across and learn how to break the guardian’s curse.';
  }
  if (room.chapter === 2 && room.flags.includes('ward-repaired')) {
    intro = 'The restored ward shines beneath the bell. Gloamfang falters as its old purpose stirs; the captives need a clear path home.';
    objective = 'Bring the guardian back to its purpose and lead the captives home.';
  }
  return { ...chapter, intro, objective, targets };
}

export function developScene(room: AdventureRoom, action: PlayerAction): SceneChange | undefined {
  const update = developments[action.targetId];
  if (!update || room.flags.includes(update.flag)) return;
  // Creative outcomes follow the reviewed effect: a distraction alone does
  // not silently rescue someone or repair the ward.
  if (action.token === 'spotlight') {
    const effects: Record<string, string[]> = {
      mara: ['rescue'], gate: ['cover', 'rescue'], tracks: ['reveal'], herd: ['rescue', 'distract'],
      boat: ['rescue'], reeds: ['cover', 'reveal'], ferryman: ['reveal'],
      ward: ['reveal'], bell: ['distract'], captives: ['rescue'],
    };
    if (!action.proposal || !effects[action.targetId]?.includes(action.proposal.effect)) return;
  }
  room.flags.push(update.flag);
  return update.change;
}

export function spotlightExample(room: AdventureRoom) {
  return [
    'I brace the broken gate with my staff so Mara can crawl free.',
    'I rock the boat against the mud while the others pull its rope.',
    'I swing the bell rope across the aisle to distract Gloamfang.',
  ][room.chapter];
}
