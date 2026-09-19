import type { ChapterDefinition } from './types';

/** Authored facts stay authoritative, including when optional narration is unavailable. */
export const CHAPTERS: ChapterDefinition[] = [
  {
    id: 'missing-livestock', title: 'The missing livestock', location: 'Briar Glen', art: 'village',
    intro: 'The evening bell rings over empty pens. Mara, the shepherd, is trapped beside a shattered gate while something moves in the reeds.',
    objective: 'Help Mara and find where the missing animals were taken.',
    threat: 'The frightened herd is scattering. Every round without a lead gives the creature more time.',
    progressGoal: 24, combat: false, keepsake: 'Mara’s copper bell',
    targets: [
      { id: 'mara', name: 'Mara the shepherd', description: 'Pinned by a gate, Mara saw the creature and needs a hand.', tokens: ['influence', 'assist'], effects: ['rescue', 'distract'] },
      { id: 'tracks', name: 'Tracks in the mud', description: 'Hoofprints cross strange claw marks toward the riverside.', tokens: ['investigate', 'assist'], effects: ['reveal', 'cover'] },
      { id: 'gate', name: 'The broken gate', description: 'Lift the timbers, secure a shelter, or search the snapped ward charms.', tokens: ['fight', 'investigate', 'assist'], effects: ['cover', 'rescue', 'reveal'] },
      { id: 'herd', name: 'The frightened herd', description: 'Calm the animals before they disappear into the reeds.', tokens: ['influence', 'assist'], effects: ['distract', 'rescue'] },
    ],
    endings: {
      success: 'Mara is safe and the herd gathers around her bell. She shows you a hidden river path and gives you the chapel’s broken ward charm.',
      mixed: 'You rescue what you can before the herd scatters. Mara points to the river: the creature wore a broken chapel ward around its neck.',
      setback: 'The herd escapes into the reeds, but Mara reaches shelter. A torn chapel ward in the mud gives you the lead you need: follow the river.',
    },
  },
  {
    id: 'riverside-hunt', title: 'The riverside hunt', location: 'The Whispering River', art: 'river',
    intro: 'Beyond the reeds, a shadow pack guards a narrow crossing. A stranded boat and the old ferryman offer another way to the ruined chapel.',
    objective: 'Get the party across and discover what binds the shadow pack.',
    threat: 'The pack circles closer. Distracting it or making cover protects the party from its next lunge.',
    progressGoal: 26, combat: true, keepsake: 'A silver river reed',
    targets: [
      { id: 'pack', name: 'The shadow pack', description: 'Drive it back, distract it, or study the ward-light in its eyes.', tokens: ['fight', 'influence', 'investigate', 'assist'], effects: ['distract', 'reveal', 'cover'] },
      { id: 'reeds', name: 'The tall reeds', description: 'A concealed path could shelter the party from the pack.', tokens: ['investigate', 'assist'], effects: ['cover', 'distract', 'reveal'] },
      { id: 'boat', name: 'The stranded boat', description: 'Free the rope, push off, and bring everyone across together.', tokens: ['fight', 'investigate', 'assist'], effects: ['rescue', 'cover'] },
      { id: 'ferryman', name: 'The old ferryman', description: 'He remembers when the chapel guardian protected this river.', tokens: ['influence', 'investigate', 'assist'], effects: ['reveal', 'rescue'] },
    ],
    endings: {
      success: 'The pack falls back as you cross together. The ferryman reveals the truth: Gloamfang is the chapel’s guardian, corrupted by its shattered ward.',
      mixed: 'You reach the far bank with the pack close behind. The ferryman calls after you: restore the chapel bell, and the guardian may remember its purpose.',
      setback: 'A desperate crossing costs you supplies, but gets everyone to the chapel. A ward-mark on the boat reveals how its fallen guardian can be freed.',
    },
  },
  {
    id: 'the-chapel', title: 'The chapel', location: 'The Hollow Chapel', art: 'chapel',
    intro: 'Gloamfang coils beneath a silent bell. Livestock huddle behind the altar, and three broken ward stones pulse with the same darkness as the guardian’s eyes.',
    objective: 'Free the captives and restore the ward—or drive Gloamfang away.',
    threat: 'Gloamfang gathers shadow for a sweeping strike. Cover and distractions blunt the attack; repairing the ward weakens the curse.',
    progressGoal: 30, combat: true, keepsake: 'The guardian’s moonstone',
    targets: [
      { id: 'gloamfang', name: 'Gloamfang', description: 'Hold off the corrupted guardian or appeal to the protector it once was.', tokens: ['fight', 'influence', 'investigate', 'assist'], effects: ['distract', 'cover', 'reveal'] },
      { id: 'ward', name: 'The broken ward', description: 'Piece together the stones to unravel the guardian’s curse.', tokens: ['investigate', 'influence', 'assist'], effects: ['reveal', 'rescue', 'cover'] },
      { id: 'bell', name: 'The chapel bell', description: 'Its rope hangs within reach. The right note could interrupt the shadows.', tokens: ['fight', 'investigate', 'assist'], effects: ['distract', 'reveal', 'cover'] },
      { id: 'captives', name: 'The hidden captives', description: 'Guide the animals out while the guardian’s attention is elsewhere.', tokens: ['influence', 'assist'], effects: ['rescue', 'cover'] },
    ],
    endings: {
      success: 'The bell rings over Briar Glen again. The captives return home, and your choices decide whether the guardian stays to protect the valley.',
      mixed: 'The captives escape while the chapel shudders. Gloamfang retreats into the hills, leaving Briar Glen safe for now and the ward waiting to be rebuilt.',
      setback: 'You lead the evacuation before the chapel falls. The villagers survive and light a new beacon together; Gloamfang remains a story for another night.',
    },
  },
];
