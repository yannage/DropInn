import type { CharacterProfile, TraitSet } from '../character';
import type { StoryEntry, RollResult } from '../engine';
import {
  createInitialBattleState,
  deterministicD20,
  resolveBattleTurn,
  type BattleCommit,
  type BattleParticipant,
  type BattleResolution,
  type BattleState,
} from '../battle/engine';

export type StorySceneId =
  | 'town_square'
  | 'inn_scene'
  | 'market_scene'
  | 'pens_scene'
  | 'hunt_choice'
  | 'pack_battle'
  | 'final_prep'
  | 'final_battle'
  | 'ending';

export type StoryChapter = 'beginning' | 'middle' | 'end';
export type StoryPhase = 'choice' | 'challenge' | 'battle' | 'ending';

export interface StoryActionDefinition {
  id: string;
  label: string;
  description: string;
  trait?: keyof TraitSet;
  dc?: number;
}

export interface StoryArcState {
  sceneId: StorySceneId;
  clueIds: string[];
  flags: string[];
  visitedSceneIds: string[];
  setbackCount: number;
  xpPenalty: number;
  checkpointSceneId: StorySceneId;
  battleState: BattleState | null;
  lastChoiceSummary: string | null;
}

export interface StoryArcView {
  sceneId: StorySceneId;
  chapter: StoryChapter;
  phase: StoryPhase;
  sceneTitle: string;
  objective: string;
  prompt: string;
  hint: string;
  actions: StoryActionDefinition[];
  clues: Array<{ id: string; label: string }>;
  clueTarget: number;
  setbackCount: number;
  xpPenalty: number;
  checkpointLabel: string;
}

export interface StoryArcTurnResult {
  storyState: StoryArcState;
  currentStoryText: string;
  storyEntries: StoryEntry[];
  battleResults: BattleResolution[];
  sceneRound: number;
  completed: boolean;
}

interface StoryScene {
  id: StorySceneId;
  chapter: StoryChapter;
  phase: StoryPhase;
  title: string;
  objective: string;
  prompt: string;
  hint: string;
  actions: StoryActionDefinition[];
}

interface WinningAction {
  action: StoryActionDefinition;
  voteCount: number;
  totalVotes: number;
  supporters: BattleParticipant[];
  tieBrokenByHost: boolean;
}

const STORY_CLUE_TARGET = 2;

export const STORY_ARC_TITLE = 'The Night Harvest of Briar Glen';
export const STORY_ARC_THEME = 'Story Arc';
export const STORY_ARC_OPENING_TEXT = [
  'Briar Glen bars its doors before sunset.',
  'Something out in the wet fields keeps stealing livestock and leaving only black reeds, silver fur, and snapped bell-cords behind.',
  'The headwoman needs answers before night closes in. Where does the party start?',
].join(' ');
export const STORY_ARC_BASE_XP = 140;
export const STORY_ARC_ITEM = 'Moonbell Charm';
export const STORY_ARC_SETBACK_PENALTY_XP = 40;

const CLUE_LABELS: Record<string, string> = {
  old_mill: 'Lantern light was seen near the old mill after moonrise.',
  river_reeds: 'The thief reeks of river reeds and marsh mud.',
  silver_bell: 'Blessed bells make the creature recoil.',
};

const checkpointLabelFor = (sceneId: StorySceneId) => {
  switch (sceneId) {
    case 'hunt_choice':
      return 'Town regroup';
    case 'final_prep':
      return 'Last approach';
    default:
      return 'Village square';
  }
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const addUnique = <T,>(items: T[], value: T) => (items.includes(value) ? items : [...items, value]);

const hasClue = (state: StoryArcState, clueId: string) => state.clueIds.includes(clueId);
const hasFlag = (state: StoryArcState, flag: string) => state.flags.includes(flag);

const getClues = (state: StoryArcState) => state.clueIds.map((id) => ({
  id,
  label: CLUE_LABELS[id] ?? id,
}));

const createConfiguredBattleState = (
  characters: CharacterProfile[],
  enemyName: string,
  enemyMaxHp: number,
  enemyIntent: string,
) => {
  const base = createInitialBattleState(characters);

  return {
    ...base,
    enemyName,
    enemyHp: enemyMaxHp,
    enemyMaxHp,
    enemyIntent,
    rewardClaimedByCharacterId: {},
  };
};

const createPackBattleState = (characters: CharacterProfile[], state: StoryArcState) => {
  let enemyMaxHp = 18 + characters.length * 8;

  if (hasFlag(state, 'trail_advantage')) enemyMaxHp -= 6;
  if (hasFlag(state, 'bait_plan')) enemyMaxHp -= 3;

  return createConfiguredBattleState(
    characters,
    'Reedfang Pack',
    Math.max(14, enemyMaxHp),
    'The pack will slash every standing hero for 5 damage unless the line holds.',
  );
};

const createFinalBattleState = (characters: CharacterProfile[], state: StoryArcState) => {
  let enemyMaxHp = 30 + characters.length * 10;
  enemyMaxHp -= state.clueIds.length * 2;

  if (hasFlag(state, 'bell_advantage')) enemyMaxHp -= 8;
  if (hasFlag(state, 'snare_advantage')) enemyMaxHp -= 6;
  if (hasFlag(state, 'roof_advantage')) enemyMaxHp -= 4;
  if (hasFlag(state, 'storm_advantage')) enemyMaxHp -= 2;
  if (hasFlag(state, 'prep_failure')) enemyMaxHp += 4;

  return createConfiguredBattleState(
    characters,
    'Gloamfang, Byre Wraith',
    Math.max(20, enemyMaxHp),
    'Gloamfang will rake every standing hero for 5 damage unless the party braces.',
  );
};

const getTownPrompt = (state: StoryArcState) => {
  if (state.clueIds.length === 0) return STORY_ARC_OPENING_TEXT;

  return [
    `The party has ${state.clueIds.length} lead${state.clueIds.length === 1 ? '' : 's'}.`,
    'One more solid thread should be enough to hunt the raider before midnight.',
    'Where next?',
  ].join(' ');
};

const getStoryScene = (state: StoryArcState, promptOverride?: string): StoryScene => {
  const prompt = promptOverride;

  switch (state.sceneId) {
    case 'town_square':
      return {
        id: 'town_square',
        chapter: 'beginning',
        phase: 'choice',
        title: 'Village Square',
        objective: `Collect ${STORY_CLUE_TARGET} leads before heading out.`,
        prompt: prompt ?? getTownPrompt(state),
        hint: 'One vote per player. Majority decides where the party goes next.',
        actions: [
          { id: 'visit_inn', label: 'Go to the inn', description: 'Talk to drovers, barkeeps, and late travelers.' },
          { id: 'check_market', label: 'Check the market', description: 'Inspect stalls, carts, and butchers\' scraps.' },
          { id: 'ask_pens', label: 'Ask around', description: 'Question shepherds and inspect the livestock pens.' },
          { id: 'leave_town', label: 'Leave town', description: 'Push out early with almost no certainty.' },
        ],
      };
    case 'inn_scene':
      return {
        id: 'inn_scene',
        chapter: 'beginning',
        phase: 'challenge',
        title: 'The Crooked Tankard',
        objective: 'Shake one real lead loose from the room.',
        prompt: prompt ?? [
          'The Crooked Tankard is loud with wet cloaks and spooked teamsters.',
          'A scarred drover keeps checking the north road, the barkeep misses nothing, and a stablehand boasts he can pin any hero in three breaths.',
          'How does the party press for information?',
        ].join(' '),
        hint: 'The winning coin becomes the party approach. Supporters add a small bonus to the roll.',
        actions: [
          { id: 'charm_drover', label: 'Charm the drover', description: 'Use warmth and patience to loosen a guarded witness.', trait: 'CHA', dc: 11 },
          { id: 'read_barkeep', label: 'Read the barkeep', description: 'Catch the one detail everybody else missed.', trait: 'INT', dc: 10 },
          { id: 'arm_wrestle_hand', label: 'Arm wrestle the hand', description: 'Beat the stablehand and earn his respect.', trait: 'ATH', dc: 12 },
          { id: 'intimidate_room', label: 'Intimidate the room', description: 'Throw enough steel and menace around to silence the tavern.', trait: 'ATH', dc: 13 },
        ],
      };
    case 'market_scene':
      return {
        id: 'market_scene',
        chapter: 'beginning',
        phase: 'challenge',
        title: 'Market Row',
        objective: 'Turn scraps, tracks, and witnesses into a usable lead.',
        prompt: prompt ?? [
          'Half the market has already shuttered.',
          'A butcher keeps a torn harness under his counter, a trapper is selling slick black fur, and wagon ruts score the mud toward the river road.',
          'What angle does the party take?',
        ].join(' '),
        hint: 'Winning with the right approach adds another clue before the trail goes cold.',
        actions: [
          { id: 'inspect_butcher', label: 'Inspect the butcher', description: 'Study blood, harness leather, and what got dragged off.', trait: 'INT', dc: 11 },
          { id: 'bribe_vendor', label: 'Bribe a vendor', description: 'Spend a little coin to get straight answers fast.', trait: 'ING', dc: 11 },
          { id: 'charm_trapper', label: 'Charm the trapper', description: 'Get the fur trader talking before he packs up.', trait: 'CHA', dc: 12 },
          { id: 'track_carts', label: 'Track the carts', description: 'Read the wagon marks and foot traffic through the mud.', trait: 'ING', dc: 10 },
        ],
      };
    case 'pens_scene':
      return {
        id: 'pens_scene',
        chapter: 'beginning',
        phase: 'challenge',
        title: 'Livestock Pens',
        objective: 'Find what the villagers missed at the scene itself.',
        prompt: prompt ?? [
          'The pens smell of wet hay and fear.',
          'A shepherd boy will not stop shaking, the fence is broken clean through, and a snapped bell-cord hangs from the post nearest the road.',
          'What does the party focus on?',
        ].join(' '),
        hint: 'This is the cleanest crime scene in town. A precise choice pays off.',
        actions: [
          { id: 'calm_shepherd', label: 'Calm the shepherd', description: 'Steady the witness and get a clear account.', trait: 'CHA', dc: 10 },
          { id: 'inspect_bell', label: 'Inspect the bell', description: 'Examine the snapped bell-cord and the metal itself.', trait: 'INT', dc: 11 },
          { id: 'follow_drag_marks', label: 'Follow the drag marks', description: 'Read the broken ground before the rain washes it out.', trait: 'ING', dc: 11 },
          { id: 'test_fence', label: 'Test the fence', description: 'Measure the force it took to break through.', trait: 'ATH', dc: 10 },
        ],
      };
    case 'hunt_choice':
      return {
        id: 'hunt_choice',
        chapter: 'middle',
        phase: 'choice',
        title: 'The Hunt',
        objective: 'Commit to one strong plan and flush the creature from hiding.',
        prompt: prompt ?? [
          'The party finally has enough to move.',
          'Lantern light, marsh reeds, and chapel bells all point toward the same stretch of flooded pasture beyond the village.',
          'How does the party spring the hunt?',
        ].join(' '),
        hint: 'The plan you vote for sets the tone and the bonuses for the next encounter.',
        actions: [
          { id: 'stake_old_mill', label: 'Stake the old mill', description: 'Catch the raider where the north road narrows.' },
          { id: 'follow_reeds', label: 'Follow the reeds', description: 'Trail the marsh sign straight into the dark.' },
          { id: 'visit_chapel', label: 'Visit the chapel', description: 'Take the bell clue seriously before the fight starts.' },
          { id: 'set_bait', label: 'Set fresh bait', description: 'Use the next goat as a trap and force the attack.' },
        ],
      };
    case 'pack_battle':
      return {
        id: 'pack_battle',
        chapter: 'middle',
        phase: 'battle',
        title: 'Riverside Ambush',
        objective: 'Break the lesser pack and find where the true raider nests.',
        prompt: prompt ?? 'The reeds explode as reed-wolves and shadow-hounds burst from cover.',
        hint: 'Combat coins are back for this scene. Hold the line and finish the pack.',
        actions: [],
      };
    case 'final_prep':
      return {
        id: 'final_prep',
        chapter: 'end',
        phase: 'challenge',
        title: 'Ruined Moon Chapel',
        objective: 'Choose one clean approach before facing Gloamfang.',
        prompt: prompt ?? [
          'Among the broken collars and half-eaten tack you find the lair: the drowned moon chapel east of Briar Glen.',
          'The bells are cracked, the rafters are weak, and the creature inside is old enough to fear prepared hunters.',
          'How does the party set the final approach?',
        ].join(' '),
        hint: 'A good setup shaves health off the final fight. A bad one wakes Gloamfang angry.',
        actions: [
          { id: 'ring_bell', label: 'Ring the bell', description: 'Drive it into the open with sound and silver.', trait: 'CHA', dc: 11 },
          { id: 'set_snare', label: 'Set a snare', description: 'Wire the approach with hooks, rope, and bait.', trait: 'ING', dc: 12 },
          { id: 'storm_lair', label: 'Storm the lair', description: 'Hit hard before it can gather the dark around itself.', trait: 'ATH', dc: 11 },
          { id: 'sneak_roof', label: 'Sneak the roof', description: 'Slip over the rafters and strike from above.', trait: 'ING', dc: 13 },
        ],
      };
    case 'final_battle':
      return {
        id: 'final_battle',
        chapter: 'end',
        phase: 'battle',
        title: 'Gloamfang\'s Nest',
        objective: 'Kill or break Gloamfang before it reaches the village again.',
        prompt: prompt ?? 'Gloamfang uncoils from the chapel dark with bells tangled in its mane.',
        hint: 'Commit battle coins fast. If the party wipes, you wake back at the inn with a penalty.',
        actions: [],
      };
    case 'ending':
    default:
      return {
        id: 'ending',
        chapter: 'end',
        phase: 'ending',
        title: 'Briar Glen Saved',
        objective: 'Collect the reward and return to the lobby.',
        prompt: prompt ?? 'Briar Glen sees dawn without another animal missing from the pens.',
        hint: 'The chronicle closes here.',
        actions: [],
      };
  }
};

const chapterToRound = (chapter: StoryChapter) => {
  if (chapter === 'middle') return 2;
  if (chapter === 'end') return 3;
  return 1;
};

const getActiveParticipants = (
  participants: BattleParticipant[],
  battleState: BattleState | null,
) => participants.filter((participant) => (
  participant.leftAt == null
  && participant.online
  && (battleState == null || !battleState.downedCharacterIds.includes(participant.character.id))
));

const pickWinningAction = (
  actions: StoryActionDefinition[],
  participants: BattleParticipant[],
  commits: Record<string, { actionId: string; committedAt: number }>,
  hostSessionId: string,
): WinningAction => {
  const activeParticipants = getActiveParticipants(participants, null);
  const counts = new Map<string, number>();
  const firstCommitAt = new Map<string, number>();

  activeParticipants.forEach((participant) => {
    const commit = commits[participant.sessionId];
    const actionId = commit?.actionId;
    if (!actionId) return;
    counts.set(actionId, (counts.get(actionId) ?? 0) + 1);
    if (!firstCommitAt.has(actionId)) {
      firstCommitAt.set(actionId, commit?.committedAt ?? 0);
    }
  });

  const ranked = actions
    .map((action, index) => ({
      action,
      index,
      votes: counts.get(action.id) ?? 0,
      firstCommitAt: firstCommitAt.get(action.id) ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => b.votes - a.votes || a.firstCommitAt - b.firstCommitAt || a.index - b.index);

  const topVotes = ranked[0]?.votes ?? 0;
  const tiedTop = ranked.filter((entry) => entry.votes === topVotes);
  const hostChoice = commits[hostSessionId]?.actionId;
  const hostTieWinner = hostChoice
    ? tiedTop.find((entry) => entry.action.id === hostChoice)
    : undefined;
  const winner = hostTieWinner ?? tiedTop[0] ?? ranked[0];
  const supporters = activeParticipants.filter((participant) => commits[participant.sessionId]?.actionId === winner.action.id);

  return {
    action: winner.action,
    voteCount: winner.votes,
    totalVotes: activeParticipants.length,
    supporters: supporters.length > 0 ? supporters : activeParticipants.slice(0, 1),
    tieBrokenByHost: Boolean(hostTieWinner && tiedTop.length > 1),
  };
};

const makeRollResult = (
  roll: number,
  mod: number,
  total: number,
  success: boolean,
  narrative: string,
  trait: keyof TraitSet,
  dc: number,
): RollResult => ({
  roll,
  mod,
  total,
  success,
  narrative,
  trait,
  dc,
});

const makeSceneTransition = (
  state: StoryArcState,
  nextSceneId: StorySceneId,
  storyText?: string,
) => {
  const nextState = {
    ...state,
    sceneId: nextSceneId,
    visitedSceneIds: addUnique(state.visitedSceneIds, nextSceneId),
  };
  const nextScene = getStoryScene(nextState, storyText);

  return {
    state: nextState,
    scene: nextScene,
  };
};

const clueCountWith = (state: StoryArcState, clueId?: string) => (
  clueId && !hasClue(state, clueId) ? state.clueIds.length + 1 : state.clueIds.length
);

const applyTownClue = (
  state: StoryArcState,
  clueId: string | undefined,
) => {
  if (!clueId || hasClue(state, clueId)) return state;
  return {
    ...state,
    clueIds: [...state.clueIds, clueId],
  };
};

const resolveInquiryOutcome = (
  state: StoryArcState,
  sceneId: StorySceneId,
  actionId: string,
  speaker: BattleParticipant,
  success: boolean,
): {
  state: StoryArcState;
  narrative: string;
  clueId?: string;
  nextSceneId: StorySceneId;
} => {
  let clueId: string | undefined;
  let narrative = '';

  switch (sceneId) {
    case 'inn_scene':
      if (actionId === 'charm_drover') {
        clueId = 'old_mill';
        narrative = success
          ? `${speaker.character.name} coaxes the drover into admitting he saw lantern light by the old mill after moonrise.`
          : `${speaker.character.name} gets only grunts and half-truths from the drover before the room goes wary again.`;
      } else if (actionId === 'read_barkeep') {
        clueId = 'silver_bell';
        narrative = success
          ? `${speaker.character.name} spots the barkeep flinch at the mention of chapel bells. The creature hates blessed sound.`
          : `${speaker.character.name} catches the barkeep watching the bell-cord on the wall, but not enough to prove anything.`;
      } else if (actionId === 'arm_wrestle_hand') {
        clueId = 'river_reeds';
        narrative = success
          ? `${speaker.character.name} slams the stablehand flat and wins a useful boast: the stolen calf dripped marsh water and black reeds.`
          : `${speaker.character.name} loses the wager, and the stablehand laughs instead of talking.`;
      } else {
        clueId = 'old_mill';
        narrative = success
          ? `${speaker.character.name} silences the inn long enough for someone to point north toward the old mill.`
          : `${speaker.character.name} freezes the room for a heartbeat, but fear shuts every mouth before a clean lead emerges.`;
      }
      break;
    case 'market_scene':
      if (actionId === 'inspect_butcher') {
        clueId = 'river_reeds';
        narrative = success
          ? `${speaker.character.name} finds marsh grit in the torn harness leather. Whatever took the stock crossed wet ground.`
          : `${speaker.character.name} learns the harness was torn in one violent pull, but the rest of the trail is too muddy to read.`;
      } else if (actionId === 'bribe_vendor') {
        clueId = 'old_mill';
        narrative = success
          ? `${speaker.character.name} spends just enough to hear that someone bought blood sausage and lamp oil for the old mill ruins.`
          : `${speaker.character.name} burns coin, but the vendor only shrugs and pockets it.`;
      } else if (actionId === 'charm_trapper') {
        clueId = 'silver_bell';
        narrative = success
          ? `${speaker.character.name} gets the trapper talking: the black fur he found was tangled with silver bell shavings.`
          : `${speaker.character.name} almost gets the trapper there, but he closes shop before saying anything useful.`;
      } else {
        clueId = 'old_mill';
        narrative = success
          ? `${speaker.character.name} follows the cart ruts to the north road and pins the pattern on the old mill route.`
          : `${speaker.character.name} tracks plenty of wagon traffic, but the road splits too many ways to prove the right one.`;
      }
      break;
    case 'pens_scene':
      if (actionId === 'calm_shepherd') {
        clueId = 'silver_bell';
        narrative = success
          ? `${speaker.character.name} steadies the shepherd boy, and he remembers the raider screaming when the warning bell rang.`
          : `${speaker.character.name} gets the boy breathing again, but not enough for a clear account.`;
      } else if (actionId === 'inspect_bell') {
        clueId = 'silver_bell';
        narrative = success
          ? `${speaker.character.name} studies the snapped cord and finds soot where blessed silver burned against something foul.`
          : `${speaker.character.name} confirms the bell snapped in the struggle, but not why it mattered.`;
      } else if (actionId === 'follow_drag_marks') {
        clueId = 'river_reeds';
        narrative = success
          ? `${speaker.character.name} reads the drag marks through the churned mud. They angle east, straight into the reeds.`
          : `${speaker.character.name} gets a direction for twenty paces before the ground turns to soup and swallows the rest.`;
      } else {
        clueId = 'old_mill';
        narrative = success
          ? `${speaker.character.name} tests the break and judges the angle. Whatever hit the fence came from the mill road side.`
          : `${speaker.character.name} proves the fence took a heavy impact, but not from where.`;
      }
      break;
    default:
      break;
  }

  const nextState = success ? applyTownClue(state, clueId) : state;
  const nextSceneId: StorySceneId = clueCountWith(nextState, undefined) >= STORY_CLUE_TARGET
    ? 'hunt_choice'
    : 'town_square';

  return {
    state: nextState,
    narrative,
    clueId: success ? clueId : undefined,
    nextSceneId,
  };
};

const resolveFinalPrepOutcome = (
  state: StoryArcState,
  actionId: string,
  speaker: BattleParticipant,
  success: boolean,
) => {
  let successFlag = '';
  let successText = '';
  let failureText = '';

  switch (actionId) {
    case 'ring_bell':
      successFlag = 'bell_advantage';
      successText = `${speaker.character.name} rings the cracked chapel bell at exactly the right moment. The sound drives Gloamfang into the open, snarling.`;
      failureText = `${speaker.character.name} pulls the rope too early. The bell clangs once, then dies, and something furious stirs in the dark above.`;
      break;
    case 'set_snare':
      successFlag = 'snare_advantage';
      successText = `${speaker.character.name} turns rope, hooks, and tack into a brutal snare line across the chapel floor.`;
      failureText = `${speaker.character.name} sets the snare, but the wet stone gives way and the trap slips with a sharp crack.`;
      break;
    case 'storm_lair':
      successFlag = 'storm_advantage';
      successText = `${speaker.character.name} leads a brutal entry that keeps Gloamfang from settling into the shadows.`;
      failureText = `${speaker.character.name} forces the door wide, but the crash gives Gloamfang all the warning it needs.`;
      break;
    case 'sneak_roof':
    default:
      successFlag = 'roof_advantage';
      successText = `${speaker.character.name} ghosts over the rafters and marks the best drop point above the altar.`;
      failureText = `${speaker.character.name} nearly clears the roofline, then sends slate skittering into the chapel below.`;
      break;
  }

  let nextState = {
    ...state,
    flags: state.flags.filter((flag) => !['bell_advantage', 'snare_advantage', 'storm_advantage', 'roof_advantage', 'prep_failure'].includes(flag)),
  };

  if (success) {
    nextState = { ...nextState, flags: addUnique(nextState.flags, successFlag) };
  } else {
    nextState = { ...nextState, flags: addUnique(nextState.flags, 'prep_failure') };
  }

  return {
    state: nextState,
    narrative: success ? successText : failureText,
  };
};

const buildBattleIntro = (sceneId: StorySceneId, actionLabel: string) => {
  if (sceneId === 'pack_battle') {
    return `The plan holds for a heartbeat, then the reeds burst. ${actionLabel} draws out a whole pack instead of one clean target.`;
  }

  return `The party commits to ${actionLabel.toLowerCase()}, and Gloamfang answers from the chapel dark.`;
};

const makeRecoveryText = (sceneId: StorySceneId, nextState: StoryArcState) => {
  const destination = nextState.checkpointSceneId === 'final_prep'
    ? 'the chapel plan'
    : 'the hunt';

  return [
    'The party wakes in Briar Glen\'s inn under borrowed blankets and too much lamp smoke.',
    `The villagers dragged everyone back before the dark could finish the job. Setback ${nextState.setbackCount}: ${nextState.xpPenalty >= 0 ? '-' : ''}${Math.abs(STORY_ARC_SETBACK_PENALTY_XP)} XP from the final payout.`,
    `You are patched up, fully recovered, and back to ${destination}.`,
  ].join(' ');
};

export const createInitialStoryArcState = (): StoryArcState => ({
  sceneId: 'town_square',
  clueIds: [],
  flags: [],
  visitedSceneIds: ['town_square'],
  setbackCount: 0,
  xpPenalty: 0,
  checkpointSceneId: 'town_square',
  battleState: null,
  lastChoiceSummary: null,
});

export const buildStoryArcView = (
  state: StoryArcState,
  currentStoryText: string,
): StoryArcView => {
  const scene = getStoryScene(state, currentStoryText);

  return {
    sceneId: scene.id,
    chapter: scene.chapter,
    phase: scene.phase,
    sceneTitle: scene.title,
    objective: scene.objective,
    prompt: scene.prompt,
    hint: scene.hint,
    actions: scene.actions,
    clues: getClues(state),
    clueTarget: STORY_CLUE_TARGET,
    setbackCount: state.setbackCount,
    xpPenalty: state.xpPenalty,
    checkpointLabel: checkpointLabelFor(state.checkpointSceneId),
  };
};

export const getStoryArcReward = (
  state: StoryArcState | null,
  completed: boolean,
) => {
  if (!state || !completed) {
    return { xp: 0, item: undefined as string | undefined, label: 'No reward yet' };
  }

  const xp = STORY_ARC_BASE_XP - state.xpPenalty;
  const signedXp = xp >= 0 ? `+${xp}` : `${xp}`;

  return {
    xp,
    item: STORY_ARC_ITEM,
    label: `${signedXp} XP + ${STORY_ARC_ITEM}`,
  };
};

export const resolveStoryArcTurn = (
  roomCode: string,
  turn: number,
  storyStateInput: StoryArcState,
  participantsInput: BattleParticipant[],
  commits: Record<string, { actionId: string; committedAt: number }>,
  hostSessionId: string,
): StoryArcTurnResult => {
  const storyState = clone(storyStateInput);
  const participants = clone(participantsInput);
  const scene = getStoryScene(storyState);

  if (scene.phase === 'battle' && storyState.battleState) {
    const battleCommits = Object.fromEntries(
      Object.entries(commits).map(([sessionId, commit]) => [
        sessionId,
        { actionId: commit.actionId as BattleCommit['actionId'], committedAt: commit.committedAt },
      ]),
    ) as Record<string, BattleCommit>;
    const result = resolveBattleTurn(roomCode, turn, storyState.battleState, participants, battleCommits);
    const nextState = { ...storyState, battleState: result.battleState };
    const storyEntries = result.logLines.map<StoryEntry>((text) => {
      const roll = result.results.find((entry) => text.includes(entry.characterName));
      return {
        turn,
        text,
        kind: 'resolution',
        roll: roll
          ? makeRollResult(roll.roll, roll.mod, roll.total, roll.success, roll.narrative, roll.trait, roll.dc)
          : undefined,
      };
    });

    if (result.battleState.status === 'victory') {
      if (scene.id === 'pack_battle') {
        const postBattleState = {
          ...nextState,
          sceneId: 'final_prep' as StorySceneId,
          battleState: null,
          checkpointSceneId: 'final_prep' as StorySceneId,
          flags: addUnique(nextState.flags, 'found_lair'),
        };
        const finalPrep = getStoryScene(postBattleState);

        return {
          storyState: postBattleState,
          currentStoryText: finalPrep.prompt,
          storyEntries: [
            ...storyEntries,
            {
              turn,
              text: 'With the lesser pack broken, the party finds tack, bells, and blood leading to the ruined moon chapel beyond the reeds.',
              kind: 'intro',
            },
          ],
          battleResults: result.results,
          sceneRound: chapterToRound(finalPrep.chapter),
          completed: false,
        };
      }

      const endingState = {
        ...nextState,
        sceneId: 'ending' as StorySceneId,
        battleState: null,
      };
      const endingText = [
        'Gloamfang falls across the chapel stones and the bells finally stop shaking.',
        'By dawn the livestock pens are quiet, the roads are safe, and Briar Glen knows exactly who saved it.',
      ].join(' ');

      return {
        storyState: endingState,
        currentStoryText: endingText,
        storyEntries: [
          ...storyEntries,
          { turn, text: endingText, kind: 'scene-complete' },
        ],
        battleResults: result.results,
        sceneRound: 3,
        completed: true,
      };
    }

    if (result.battleState.status === 'failure') {
      const recoveredState = {
        ...storyState,
        sceneId: storyState.checkpointSceneId,
        battleState: null,
        setbackCount: storyState.setbackCount + 1,
        xpPenalty: storyState.xpPenalty + STORY_ARC_SETBACK_PENALTY_XP,
      };
      const recoveryText = makeRecoveryText(scene.id, recoveredState);

      return {
        storyState: recoveredState,
        currentStoryText: recoveryText,
        storyEntries: [
          ...storyEntries,
          { turn, text: recoveryText, kind: 'resolution' },
        ],
        battleResults: result.results,
        sceneRound: chapterToRound(getStoryScene(recoveredState, recoveryText).chapter),
        completed: false,
      };
    }

    return {
      storyState: nextState,
      currentStoryText: result.logLines.join(' '),
      storyEntries,
      battleResults: result.results,
      sceneRound: chapterToRound(scene.chapter),
      completed: false,
    };
  }

  const winner = pickWinningAction(scene.actions, participants, commits, hostSessionId);
  const summary = `${winner.action.label} wins the vote ${winner.voteCount}/${winner.totalVotes}${winner.tieBrokenByHost ? ' on the host tie-break' : ''}.`;

  if (scene.phase === 'choice') {
    if (scene.id === 'town_square') {
      const nextSceneId = ({
        visit_inn: 'inn_scene',
        check_market: 'market_scene',
        ask_pens: 'pens_scene',
        leave_town: 'hunt_choice',
      } as Record<string, StorySceneId>)[winner.action.id] ?? 'town_square';

      let nextState = {
        ...storyState,
        lastChoiceSummary: summary,
      };

      let nextText = '';
      if (winner.action.id === 'leave_town') {
        nextState = {
          ...nextState,
          clueIds: addUnique(nextState.clueIds, 'river_reeds'),
          flags: addUnique(nextState.flags, 'trail_advantage'),
        };
        nextText = [
          'The party leaves town early and finds the trail by instinct more than certainty.',
          'It is rough going, but the marsh sign is fresh enough to force the hunt forward.',
        ].join(' ');
      }

      const transition = makeSceneTransition(nextState, nextSceneId, nextText || undefined);

      return {
        storyState: transition.state,
        currentStoryText: transition.scene.prompt,
        storyEntries: [
          { turn, text: summary, kind: 'resolution' },
          { turn, text: transition.scene.prompt, kind: 'intro' },
        ],
        battleResults: [],
        sceneRound: chapterToRound(transition.scene.chapter),
        completed: false,
      };
    }

    if (scene.id === 'hunt_choice') {
      let nextState: StoryArcState = {
        ...storyState,
        sceneId: 'pack_battle' as StorySceneId,
        checkpointSceneId: 'hunt_choice' as StorySceneId,
        battleState: null,
        lastChoiceSummary: summary,
        flags: storyState.flags.filter((flag) => !['trail_advantage', 'bait_plan'].includes(flag)),
      };

      if (winner.action.id === 'stake_old_mill' && hasClue(storyState, 'old_mill')) {
        nextState.flags = addUnique(nextState.flags, 'trail_advantage');
      }
      if (winner.action.id === 'follow_reeds' && hasClue(storyState, 'river_reeds')) {
        nextState.flags = addUnique(nextState.flags, 'trail_advantage');
      }
      if (winner.action.id === 'visit_chapel' && hasClue(storyState, 'silver_bell')) {
        nextState.flags = addUnique(nextState.flags, 'bell_advantage');
      }
      if (winner.action.id === 'set_bait') {
        nextState.flags = addUnique(nextState.flags, 'bait_plan');
      }

      nextState.battleState = createPackBattleState(
        participants.map((participant) => participant.character),
        nextState,
      );
      const battleIntro = buildBattleIntro('pack_battle', winner.action.label);
      const nextScene = getStoryScene(nextState, battleIntro);

      return {
        storyState: nextState,
        currentStoryText: nextScene.prompt,
        storyEntries: [
          { turn, text: summary, kind: 'resolution' },
          { turn, text: nextScene.prompt, kind: 'intro' },
        ],
        battleResults: [],
        sceneRound: chapterToRound(nextScene.chapter),
        completed: false,
      };
    }
  }

  if (scene.phase === 'challenge') {
    const supporters = winner.supporters.length > 0 ? winner.supporters : participants.slice(0, 1);
    const spokesperson = [...supporters].sort((a, b) => (
      (b.character.traits[winner.action.trait ?? 'CHA'] ?? 0)
      - (a.character.traits[winner.action.trait ?? 'CHA'] ?? 0)
    ))[0] ?? participants[0];
    const supportBonus = Math.min(2, Math.max(0, supporters.length - 1));
    const trait = winner.action.trait ?? 'CHA';
    const dc = winner.action.dc ?? 10;
    const roll = deterministicD20([roomCode, turn, scene.id, winner.action.id, spokesperson.sessionId].join(':'));
    const mod = (spokesperson.character.traits[trait] ?? 0) + supportBonus;
    const total = roll + mod;
    const success = total >= dc;

    if (scene.id === 'inn_scene' || scene.id === 'market_scene' || scene.id === 'pens_scene') {
      const inquiry = resolveInquiryOutcome(storyState, scene.id, winner.action.id, spokesperson, success);
      const nextState = {
        ...inquiry.state,
        lastChoiceSummary: summary,
      };
      const transition = makeSceneTransition(nextState, inquiry.nextSceneId);
      const rollResult = makeRollResult(roll, mod, total, success, inquiry.narrative, trait, dc);
      const logText = inquiry.clueId && success && !hasClue(storyState, inquiry.clueId)
        ? `${inquiry.narrative} New lead: ${CLUE_LABELS[inquiry.clueId]}.`
        : inquiry.narrative;

      return {
        storyState: transition.state,
        currentStoryText: transition.scene.prompt,
        storyEntries: [
          { turn, text: summary, kind: 'resolution' },
          { turn, text: logText, kind: 'resolution', roll: rollResult },
          { turn, text: transition.scene.prompt, kind: 'intro' },
        ],
        battleResults: [],
        sceneRound: chapterToRound(transition.scene.chapter),
        completed: false,
      };
    }

    if (scene.id === 'final_prep') {
      const prep = resolveFinalPrepOutcome(storyState, winner.action.id, spokesperson, success);
      const nextState: StoryArcState = {
        ...prep.state,
        sceneId: 'final_battle' as StorySceneId,
        checkpointSceneId: 'final_prep' as StorySceneId,
        lastChoiceSummary: summary,
      };
      nextState.battleState = createFinalBattleState(
        participants.map((participant) => participant.character),
        nextState,
      );
      const battleIntro = buildBattleIntro('final_battle', winner.action.label);
      const nextScene = getStoryScene(nextState, battleIntro);
      const rollResult = makeRollResult(roll, mod, total, success, prep.narrative, trait, dc);

      return {
        storyState: nextState,
        currentStoryText: nextScene.prompt,
        storyEntries: [
          { turn, text: summary, kind: 'resolution' },
          { turn, text: prep.narrative, kind: 'resolution', roll: rollResult },
          { turn, text: nextScene.prompt, kind: 'intro' },
        ],
        battleResults: [],
        sceneRound: chapterToRound(nextScene.chapter),
        completed: false,
      };
    }
  }

  return {
    storyState,
    currentStoryText: scene.prompt,
    storyEntries: [{ turn, text: summary, kind: 'resolution' }],
    battleResults: [],
    sceneRound: chapterToRound(scene.chapter),
    completed: false,
  };
};
