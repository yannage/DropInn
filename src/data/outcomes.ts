export interface OutcomePair {
  success: string;
  failure?: string;
}

export const OUTCOMES: Record<string, OutcomePair> = {

  // ── Social actions — Scene 1, Thornwick Market ───────────────────────────

  charm: {
    success: "You flash a disarming smile and lean casually against the counter. Pip's coin-counting slows — one, two — then stops. The suspicious gleam leaves his gold-flecked eyes, just for a moment. 'You're not like the others,' he mutters. Then, almost against his will: 'Ash Hollow. Three nights past. Now buy something.'",
    failure:  "Pip's eyes narrow at your smile. 'What do you want?' he asks, counting coppers with pointed deliberateness. Your warmth bounces off him like rain off leather. He's seen every friendly face in Thornwick. He doesn't trust a single one.",
  },

  bluff: {
    success: "You spin a tale of dragon hunters already en route — poorly sourced, but convincingly delivered. Pip's brows creep upward. His counting hand stalls mid-stack. 'If hunters are coming,' he says, slowly, 'they'd head north. Past the smoke.' He pats his coin purse and says no more, but it's enough.",
    failure:  "Pip tilts his head and counts a coin. Counts it again. 'You're not a very good liar,' he observes, pleasantly. He resumes stacking. Your story dissolves in the market air like cheap incense.",
  },

  scrutinize: {
    success: "You study Pip's twitching hands, the way his eyes flick north each time the wind shifts. Behind the stall, half-buried under a bolt of sackcloth, you spot boot prints in the ash — leading away from the market, toward the northern road. Toward Ash Hollow.",
    failure:  "The stall is a masterwork of deliberate clutter. Pip has arranged his wares, his coin stacks, even his posture, to give nothing away. Whatever he knows is buried deep. He counts another copper. Click.",
  },

  bribe: {
    success: "You slide two silvers across the counter without a word. Pip stares at them. Counts them with his eyes. His jaw tightens. 'Ash Hollow,' he says quietly, pocketing the coins in one practiced motion. 'North road past the old mill. Don't go after dark.' He's already moved on to the next customer.",
    failure:  "The goblin glances at your coins. Does a quick mental appraisal. 'Not enough,' he says flatly, the tone of a merchant who has been lowballed a thousand times before. He pushes them back. His counting resumes. Information in Thornwick costs more than you thought.",
  },

  // ── Combat actions — Scene 2, Bandit Ambush ─────────────────────────────

  firebolt: {
    success: "You snap your fingers and a shard of orange fire streaks from your palm, trailing sparks. It catches the nearest bandit square in the chest — he stumbles hard into his companions with a strangled yelp. The ambush breaks formation. The smell of singed wool fills the treeline.",
    failure:  "The bolt sputters wide, kicking up a spray of dirt beside the bandit's boot. He grins. 'Wizard can't aim,' he calls back to the others. They laugh. The distraction buys nothing and costs you an opening.",
  },

  thunderwave: {
    success: "You slam your palm down and a percussive pulse of force erupts outward in a perfect ring. The two closest bandits are hurled back into the treeline — one loses his sword entirely. The ringing silence that follows is almost beautiful. The others hesitate.",
    failure:  "The wave crests and dissipates. Something in the air — a ward, a lucky gust, sheer bad timing — absorbs the burst before it reaches them. The bandits don't even flinch. You feel the effort echo through your teeth. That spell is gone for the round.",
  },

  shield: {
    success: "A shimmering wall of force snaps into place around the party just as a volley of crossbow bolts fills the air. They scatter harmlessly off the barrier with sharp pinging sounds. Bram catches your eye and nods, once. The shield buys the party precious seconds to regroup.",
    failure:  "The shield flickers into existence — and immediately fractures under a barrage of magic-tipped bolts. Your concentration shatters like glass. The party dives for cover. It held for a single heartbeat. You'll need a different approach.",
  },

  disengage: {
    success: "You twist low, duck under a swinging blade, and put a clean fifteen feet between yourself and the melee. From the high ground at the trail's edge, you have a clear sightline — and a clear shot at whoever steps forward next. The initiative is yours.",
    failure:  "A bandit cuts off your escape route. You pivot — another is already there. You're still in the thick of it, breathing hard, and now they know you were trying to run. That makes you their priority.",
  },

  // ── Dragon confrontation actions — Scene 3 ──────────────────────────────

  arcaneburst: {
    success: "You pull every remaining thread of magic from your core and release it in a single blinding burst. The dragon recoils — actually recoils — scales shimmering where the light touched. It blinks once. Something in its ancient eyes recalibrates. For a moment, you have its full, grudging attention.",
    failure:  "The burst blazes toward the dragon. It opens its maw, and the magic dissipates against its exhaled breath like smoke in a gale. The creature watches the last sparks fade. Its expression, if dragons have expressions, is something close to boredom.",
  },

  commune: {
    success: "You speak the old words — the ones from the codex your mentor made you memorize until you could recite them feverish and half-asleep. The dragon's enormous head tilts. It is listening. When you finish, a long silence. Then, in a voice like falling stone: 'Small mage. You know the old speech. So. Speak.'",
    failure:  "The words come out wrong — mispronounced, rushed, frantic with urgency. The dragon watches you struggle through the syllables with something that might be contempt. It exhales a slow curl of smoke. Perhaps you misremembered. Perhaps it simply doesn't care.",
  },

  dispel: {
    success: "You read the gathering weave of the dragon's breath — a braid of heat and intention — and throw a counter-pattern into it with both hands. The fire sputters. Fades. Dies in its throat. The dragon blinks. Its head tilts slowly to one side. That has not happened to it before.",
    failure:  "The dispel unravels cleanly — but you hit the wrong strand. The dragon's breath comes anyway, a wall of orange-white, and the party dives. Your magic spent itself on nothing. The trees behind you are ash. You'll need to be smarter about this.",
  },

  dash: {
    success: "You sprint for the ridge at full speed, legs pumping, lungs burning. Behind you, the dragon sweeps its head in a wide arc — and misses by a yard. From the high ground you can see the pattern of its movements, the blind spot behind its left wing. That's something you can use.",
    failure:  "Your boot catches a root and you go down hard, tasting dirt. By the time you're back on your feet, the dragon has repositioned. You're exactly where you started — and breathing harder. It watches you with patient, amber eyes.",
  },
};

// Round-specific intro texts (1-indexed)
export const ROUND_INTROS: Record<number, string> = {
  1: "Thornwick Market buzzes nervously. Smoke curls from the northern road as villagers whisper and stare. A wiry goblin merchant clutches a satchel of trinkets and watches your party very closely.",
  2: "Pip counts his coins faster now. He's nervous about something, and it isn't you. The smoke outside thickens — whatever is out there is getting closer, and the market is emptying.",
  3: "One last chance with the gremlin. The smell of ash is unmistakable now. Whatever happens in the next few moments will be your final word at Thornwick Market.",
};

// Spotlight outcomes — Pip reacts to player improvisation
export const SPOTLIGHT_OUTCOMES = [
  "Pip's hand freezes mid-count. He stares at you for a long, measuring moment, coin half-raised. Then — against what you suspect is every instinct he has — he slides something across the counter. You've actually gotten through.",
  "The gremlin squints at you with those gold-flecked eyes. 'That's... new,' he says. He pockets a coin. Then another. Then, barely — almost invisibly — he nods.",
  "Pip's suspicious nature flickers with something unexpected: a grudging flicker of respect. He sets three coins aside with precise care, and for the first time, he meets your gaze directly.",
];
