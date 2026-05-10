# D&D One-Shot — Design Brief v3

Source of truth for V1 scope and success criteria.

## Goal

Validate the core loop: discover a campaign in the lobby → drop in → see "previously on..." → complete a scene → gain XP/items → leave gracefully → feel pulled to come back.

**The question this prototype answers:** does dropping into a campaign for 10–15 minutes feel rewarding and immersive enough that a player would return tomorrow?

## Audience

13+ D&D enthusiasts. Lunch-break friendly. Depth and atmosphere over casual vibes.

**Aesthetic:** Hearthstone / Slay the Spire territory — painted storybook fantasy, approachable but not childish. Stick-figure character art is intentional (Order of the Stick), not placeholder.

## Stack (V1)

- Vanilla React 18 + Babel standalone (no build)
- Tailwind-style inline CSS (no framework — all styles in HTML `<style>`)
- localStorage for persistence
- No backend, no LLM, no real multiplayer

## Screens

### Lobby

- Header: "Adventures" title + profile avatar + notifications bell
- Filter bar: Progress / Players / Turn Duration / Theme / Visibility (decorative except Theme)
- Theme filter → non-Dragon selection shows empty state
- Room card: title, status badge, theme tag, party avatars, progress bar, turn duration, visibility
- One active room: "The Dragon of Ash Hollow" — Sleeping, 2 bots (Yanni + Bram), 30% progress
- Bottom: disabled "Create Adventure" + "My Campaigns" button

### Room (6 stacked regions)

1. **Campaign Banner** (~8%) — title + party avatars, tappable
2. **Scene Header** (~8%) — location, turn counter, dragon progress bar
3. **Story Scroll** (~30%) — parchment narrative, book button → history
4. **Shared Table** (~20%) — round wood table, sealed envelopes → flip reveal
5. **Action Tray** (~22%) — 4 coins + 2 spotlight tokens + turn timer
6. **Player Card** (~12%) — avatar, name, class, HP bar, trait chips, inventory/help/leave

## Engine types

```typescript
type Campaign = {
  id: string;
  title: string;
  theme: 'dragon' | 'princess' | 'heist' | 'mystery' | 'horror';
  scenes: Scene[];
  current_scene_id: string;
  world_state: WorldState;
  party: PartyMember[];
  history_summary: string;
  status: 'active' | 'sleeping';
  visibility: 'private' | 'public';
  max_players: 2 | 3 | 4;
  turn_duration_seconds: 15 | 30 | 60 | 120;
  progress_percent: number;
  last_activity: number;
};

type Player = {
  id: string; name: string; class: 'wizard' | 'fighter' | 'rogue';
  level: number; xp: number; hp: number; max_hp: number; ac: number;
  traits: { INT: number; ATH: number; ING: number; CHA: number };
  inventory: Item[];
  spotlight_tokens: number;
};

type NPCTraits = {
  race: 'human'|'goblin'|'dragonborn'|'elf'|'halfling'|'orc'|'tiefling';
  gender: 'male'|'female'|'nonbinary';
  demeanor: 'friendly'|'suspicious'|'anxious'|'boisterous'|'aloof'|'bold'|'melancholy';
  appearance: 'shabby'|'polished'|'weathered'|'striking'|'plain'|'imposing'|'unkempt';
  build: 'tall'|'short'|'stocky'|'slim'|'broad';
  motivation: 'greed'|'fame'|'revenge'|'boredom'|'philanthropy'|'survival'|'loyalty'|'curiosity';
  quirk: string;
};
```

## Hardcoded NPC: Pip Bramblebottom

```typescript
{
  id: 'thornwick_gremlin_merchant',
  name: 'Pip Bramblebottom',
  role: 'merchant',
  traits: {
    race: 'goblin', gender: 'male', demeanor: 'suspicious',
    appearance: 'shabby', build: 'slim', motivation: 'greed',
    quirk: 'constantly counts coins, even mid-conversation',
  },
  dialogue_topics: [
    { topic: 'dragon', response: 'Aye, the beast was last seen near Ash Hollow. Shame about Greenholt — gone in a single night.' },
    { topic: 'wares', response: "Best prices in Thornwick! Quality... varies. Caveat emptor and all that." },
    { topic: 'town', response: "Folk are scared. Not buying like they used to. Coins go further when no one's spending them." },
  ],
}
```

## Resolution loop

1. Scene loads → 3–4 action coins available
2. Each online player drags/taps a coin onto the table (sealed envelopes)
3. Bots auto-commit after ~1s delay (scripted for V1)
4. When all online players committed or timer expires → envelopes flip face-up
5. Engine rolls d20 + relevant trait modifier per player vs. DC
6. Outcome narrative appended to story scroll
7. World state updates
8. Scene complete → XP + item drop → party can leave or continue

## Action DCs and trait mods (V1)

| Action | Trait | DC |
|--------|-------|----|
| Persuade | CHA | 12 |
| Intimidate | ATH | 14 |
| Examine | INT | 10 |
| Move | ATH | 8 |

## Hardcoded narrative outcomes (Scene 1: Thornwick Market)

All outcomes reference Pip's traits (suspicious, greed, counts coins):

### Persuade success (CHA roll ≥ 12)
"The suspicious gremlin pauses his coin-counting. Your words cut through his greed — he pockets his coins and leans forward. 'The dragon,' he mutters, 'was last seen near Ash Hollow. Don't tell anyone I said that.' He resumes counting immediately."

### Persuade failure (CHA roll < 12)
"Pip's eyes narrow as he counts another coin. 'Don't know nothin',' he mutters, clearly lying. His shabby coat rustles as he shuffles away. You'll need a different approach."

### Intimidate success (ATH roll ≥ 14)
"Bram looms over the stall. The slim goblin's coin-counting stutters — he drops three coppers. 'Fine, fine! Ash Hollow! Just — just don't break anything, the profit margins are already terrible.'"

### Intimidate failure (ATH roll < 14)
"The gremlin barely looks up. 'Seen bigger,' he says, resuming his count. Bram's threat lands like a wet scroll."

### Examine success (INT roll ≥ 10)
"Aria spots a crude map half-hidden beneath Pip's scales. The suspicious merchant snatches it back, but not before she notes a red X near Ash Hollow. He pockets a coin, pointedly."

### Examine failure (INT roll < 10)
"The wares are a jumble of junk. Whatever Pip knows, he's buried it well under layers of suspicious clutter and coin stacks."

### Move (always succeeds — narrative only)
"The party moves deeper into the market, noting the fearful eyes of the townsfolk. One direction leads toward the tavern; another toward the smoke."

## V1 demo flow

1. Lobby → tap "The Dragon of Ash Hollow" card
2. Previously-on overlay (8s countdown, skippable)
3. Drop-in banner appears: *"You arrive at Thornwick Market..."*
4. Scene 1 loads: Pip Bramblebottom at his stall. Bram and Aria bot-commit within 1s.
5. Player drags/taps a coin → all envelopes flip → d20 + trait resolves → narrative updates
6. Scene complete → +50 XP, Bram found Healing Salve
7. Leave → confirm modal → graceful narrative → lobby (sleeping status)
8. Rejoin → V2Stub ("Scene 2: Bandit Ambush — Coming in V2")

## Critical interaction details

- **Drop-in/drop-out always narrated.** Brand-defining — invest real polish.
- **Pause/resume seamless.** Under 5 seconds from tap to playable.
- **"Previously on" under 15s reading time.** 2–3 sentences max.
- **Action commit feels weighty.** Drag resistance + snap + particle trail.
- **Sealed envelopes flip face-up** when timer expires or all commit.
- **Spotlight tokens** open free-text modal; 3 hardcoded outcomes if player submits.
- **Leave button frictionless.** Confirm modal, graceful narrative.
- **NPC dialogue references traits.** Pip's suspicion + greed + coin-counting must show in lines.

## V1 non-goals

❌ Real multiplayer | ❌ Backend | ❌ LLM | ❌ NPC generator | ❌ Functional filters (except Theme) | ❌ Character creation | ❌ Multiple campaigns | ❌ Scenes 2+ | ❌ Custom art

## Success criteria

1. Lobby clearly communicates what kinds of games exist
2. Drop-in feels diegetic and welcoming
3. Complete-a-scene → gain XP → leave loop rewards 10–15 min play
4. Rejoining feels like resuming an adventure, not loading a save file
5. Pip feels like a real character — suspicion, greed, coin-counting evident in dialogue

## V2 roadmap

- WebSocket real multiplayer (room state synced)
- Claude API narration (constrained to engine outcomes)
- 3–5 starter campaigns
- NPC generation pipeline using trait framework
- Scenes 2 (bandit ambush) + 3 (dragon confrontation)
- Polished art pass
