import type { ChapterChoiceDefinition } from './types';

/** Version overlays only: released chapter definitions keep their original rules. */
export const CHAPTER_CHOICES: Record<string, ChapterChoiceDefinition> = {
  'missing-livestock': {
    id: 'briar-shelter', mode: 'prepare', primaryId: 'gate', secondaryId: 'herd', riskToken: 'influence',
    title: 'A shelter for the herd', resource: 'Shelter',
    labels: { prepare: 'Brace the shelter', risk: 'Call the herd in', secure: 'Guide the herd safely', recover: 'Rebrace the shelter' },
    context: 'Brace the broken gate, then guide the herd into shelter or risk a swift roundup. Loose timbers can be braced again.',
    endings: {
      full: 'The braced pen helped Mara gather animals during the search.',
      partial: 'The shelter is braced, though its planned roundup went unused.',
      lost: 'The coordinated roundup remains unfinished; Mara and the ward fragment still point toward the river.',
    },
  },
  'the-chapel': {
    id: 'briar-bell-rhythm', mode: 'prepare', primaryId: 'bell', secondaryId: 'ward', riskToken: 'investigate',
    title: 'A note for the ward', resource: 'Bell rhythm',
    labels: { prepare: 'Hold a steady note', risk: 'Match the ward pattern', secure: 'Sustain the ward gently', recover: 'Find the note again' },
    context: 'A steady bell gives the ward an opening. Sustain its light safely or investigate a faster pattern while Gloamfang gathers shadow.',
    endings: {
      full: 'Bell and ward answer one another as the party completes its work.',
      partial: 'A steady bell note remains, though its ward opening went unused.',
      lost: 'The planned bell-and-ward sequence remains unfinished; the captives still have a way out.',
    },
  },
  'teacup-dock': {
    id: 'teacup-spare-cord', mode: 'rescue', primaryId: 'teacup-mooring', secondaryId: 'teacup-parcels', riskToken: 'fight',
    title: 'Save the spare boarding cord', resource: 'Spare cord', deadlineRound: 3,
    labels: { prepare: 'Tie down the spare coil', risk: 'Haul the coil aboard', secure: 'Tie down the spare coil', recover: 'Recover the spare cord' },
    context: 'A spare coil is slipping from the mooring. Save it before round 3 ends to steady the next crossing; everyone boards even if it is lost.',
    endings: {
      full: 'The full spare cord is aboard, ready to steady the next stretch.',
      partial: 'A salvaged length of cord gives the crew a little support.',
      lost: 'The spare coil slips away. The crew improvises, and everyone still gets aboard.',
    },
  },
  'teacup-cloudline': {
    id: 'teacup-steam', mode: 'press', primaryId: 'teacup-engine', secondaryId: 'teacup-lifeboat', riskToken: 'investigate',
    title: 'Build steam or put it to work', resource: 'Steam',
    labels: { prepare: 'Steady the lifeboat', risk: 'Build more steam', secure: 'Power the lifeboat winch', recover: 'Steady the equipment' },
    context: 'Trace the engine to build up to two heads of steam, then use them at the lifeboat winch. A failed pressure check vents unused steam; both ways home stay open.',
    endings: {
      full: 'The crew puts a full head of steam to work before the approach home.',
      partial: 'A small burst of steam does useful work on the deck.',
      lost: 'Unused steam vents into the clouds. Pella still prepares both ways home.',
    },
  },
  'teacup-homecoming': {
    id: 'teacup-home-signal', mode: 'prepare', primaryId: 'teacup-return-beacon', secondaryId: 'teacup-return-guests', riskToken: 'influence',
    title: 'A clear signal home', resource: 'Beacon signal',
    labels: { prepare: 'Hold the beacon steady', risk: 'Coordinate a swift arrival', secure: 'Guide the line safely', recover: 'Find the signal again' },
    context: 'The beacon prepares the passenger line. Guide the last approach safely or call for a faster arrival; the chosen ship or sail sacrifice stays unchanged.',
    endings: {
      full: 'The beacon guides the passenger line into the waiting dock.',
      partial: 'The beacon is steady; its extra passenger signal went unused.',
      lost: 'The dock crew finishes the approach without the planned shared signal.',
    },
  },
  'tomorrow-breakfast': {
    id: 'tomorrow-repeat-pattern', mode: 'press', primaryId: 'tomorrow-spoon', secondaryId: 'tomorrow-brindle', riskToken: 'investigate',
    title: 'Follow the repeat or explain it', resource: 'Pattern',
    labels: { prepare: 'Discuss the first clue', risk: 'Trace another repeat', secure: 'Share the pattern', recover: 'Start a fresh observation' },
    context: 'Trace one or two repeats, then share the pattern with Brindle. A missed observation loses the unshared pattern; the workshop and its essential clue remain reachable.',
    endings: {
      full: 'Brindle sees the repeated pattern clearly before the party enters the workshop.',
      partial: 'One useful observation gives Brindle a starting point.',
      lost: 'The unshared pattern slips away, but the clock still reveals Brindle’s instruction.',
    },
  },
  'tomorrow-workshop': {
    id: 'tomorrow-chime-cushion', mode: 'rescue', primaryId: 'tomorrow-jars', secondaryId: 'tomorrow-helper', riskToken: 'investigate',
    title: 'Save the chime cushion', resource: 'Chime cushion', deadlineRound: 3,
    labels: { prepare: 'Secure the padded wrap', risk: 'Find a clear lift', secure: 'Secure the padded wrap', recover: 'Recover the padded wrap' },
    context: 'A padded wrap slips behind the jars. Save it before round 3 ends for quieter clock work; the dawn itself always reaches the party safely.',
    endings: {
      full: 'The padded wrap will steady the chime when it reaches the window clock.',
      partial: 'A folded corner will soften some of the chime’s vibration.',
      lost: 'The wrap slips beyond reach. The dawn can still reach the clock safely.',
    },
  },
  'tomorrow-new-morning': {
    id: 'tomorrow-shared-rhythm', mode: 'prepare', primaryId: 'tomorrow-return-clock', secondaryId: 'tomorrow-return-table', riskToken: 'influence',
    title: 'Give the morning a rhythm', resource: 'Clock rhythm',
    labels: { prepare: 'Steady the chime', risk: 'Call the whole table together', secure: 'Share breakfast in time', recover: 'Dampen the echo' },
    context: 'Steady the freed chime, then gather the breakfast table at a careful or ambitious pace. A spent recipe or breakfast memory cannot be restored.',
    endings: {
      full: 'The clock’s new rhythm reaches an imperfect breakfast shared by everyone.',
      partial: 'The chime is steady, though its breakfast cue was left unused.',
      lost: 'The table finds its own rhythm without the planned clock cue.',
    },
  },
  'orchard-departure': {
    id: 'orchard-trail-marks', mode: 'press', primaryId: 'orchard-root-trail', secondaryId: 'orchard-ladder', riskToken: 'investigate',
    title: 'Read ahead or mark the ladder route', resource: 'Trail marks',
    labels: { prepare: 'Steady the ladder', risk: 'Follow another root sign', secure: 'Set the ladder’s route', recover: 'Regroup on the trail' },
    context: 'Follow up to two root signs before marking the route for the ladder. A missed sign loses unmarked ground; the trees still wait at a reachable bank.',
    endings: {
      full: 'Two clear root signs guide the rescue equipment toward the trees.',
      partial: 'A single marked sign helps the villagers move their equipment onward.',
      lost: 'Scuffed soil hides the unmarked signs, but the trees pause beside a reachable low bank.',
    },
  },
  'orchard-dry-stream': {
    id: 'orchard-welcome-ribbon', mode: 'rescue', primaryId: 'orchard-treehouse', secondaryId: 'orchard-sluice', riskToken: 'influence',
    title: 'Save the orchard’s welcome ribbon', resource: 'Welcome ribbon', deadlineRound: 3,
    labels: { prepare: 'Tie the ribbon safely', risk: 'Ask the branches to lift it', secure: 'Tie the ribbon safely', recover: 'Recover the ribbon' },
    context: 'A homemade welcome ribbon is caught below the treehouse. Save it before round 3 ends to guide the returning trees; the child always reaches the bank safely.',
    endings: {
      full: 'The welcome ribbon will show the returning trees where the village is waiting.',
      partial: 'A few saved ribbon ends can still mark part of the welcome route.',
      lost: 'The ribbon tears away; the child’s safe route down remains open, and the trees can follow the wet ground.',
    },
  },
  'orchard-shared-harvest': {
    id: 'orchard-welcome-trail', mode: 'prepare', primaryId: 'orchard-return-roots', secondaryId: 'orchard-return-baskets', riskToken: 'influence',
    title: 'Make a place for the harvest', resource: 'Welcome trail',
    labels: { prepare: 'Mark the wet welcome trail', risk: 'Gather the whole harvest', secure: 'Carry the baskets together', recover: 'Mark the trail again' },
    context: 'Guide the roots along wet ground, then carry the harvest carefully or organize a bigger gathering. The chosen wall or mill change remains in place.',
    endings: {
      full: 'Neighbors use the wet trail to carry harvest baskets together.',
      partial: 'The welcome trail is marked, though its harvest handoff went unused.',
      lost: 'The planned harvest handoff remains unfinished; neighbors still carry the baskets together.',
    },
  },
};
