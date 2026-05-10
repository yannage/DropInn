# DropInn — D&D One-Shot Prototype

## Project overview

A browser-based D&D one-shot adventure prototype validating the **drop-in async play loop**: lobby → drop in → complete a scene → earn XP/items → leave gracefully → rejoin seamlessly. V1 is a fully hardcoded single-scene demo, no backend.

## Architecture

**No build system.** Vanilla React 18 loaded via CDN + Babel standalone transpiling JSX at runtime.

```
DropInn/
├── Stick Figure Quest.html   # Entry point — all CSS + script tags
├── icons.jsx                 # SVG icon library (loaded first)
├── app.jsx                   # Game engine + scene UI components
├── screens.jsx               # Screen router + all modals/overlays
├── CLAUDE.md                 # This file
└── DESIGN.md                 # Full v3 brief and success criteria
```

**Load order matters:** `icons.jsx` → `app.jsx` → `screens.jsx`. Each file attaches exports to `window.*`. Babel transforms JSX at runtime — no npm, no node_modules.

## State management

`screens.jsx / OuterShell` owns top-level state:
- `screen`: `'lobby' | 'previously' | 'room'`
- `overlay`: modal name or null
- `completed`, `xp`, `hasSalve`, `spotlightTokens`
- `toast`: transient message string

`app.jsx / App` owns in-scene game state:
- `phase`: `Idle → Bots → Player → Reveal → Resolve → Reward`
- `envelopes`, `drag`, `timer`, `storyText`

Cross-component communication uses `window.dispatchEvent(new CustomEvent('sfq-event', { detail: { type: '...' } }))`.

## Key design decisions

- **Phase state machine** drives the entire game loop. Never break out of it with direct state mutations.
- **Drag gesture** is the primary commit mechanic — pointer events on the stage div, distance math vs. drop zone center.
- **Bot plays** are hardcoded: Bram intimidates, Aria examines. Player must pick from the remaining 4 coins.
- **All narrative outcomes are pre-written strings** — no LLM in V1.
- **d20 + trait roll** determines success/failure per action. DC is hardcoded per action type.
- `localStorage` key: `sfq-v1-state` — saves XP, hasSalve, spotlightTokensLeft, completed, turn_count.

## NPC framework (V1: one hardcoded NPC)

Pip Bramblebottom — goblin merchant, suspicious demeanor, greed motivation, "constantly counts coins" quirk. All NPC dialogue and resolution narrative must reference his traits. See DESIGN.md for full framework spec.

## V1 explicit non-goals

Do NOT add: real multiplayer, backend, LLM calls, NPC generator, functional lobby filters (except Theme), character creation, multiple campaigns, Scenes 2+, custom art.

## Palette

| Token | Hex |
|---|---|
| Parchment cream | `#F4E8D0` / `#E8D9B4` |
| Leather brown | `#6B4423` / `#5C3F09` |
| Forest green | `#3D5A3F` |
| Deep red | `#8B2E2E` |
| Ink black | `#1F1F1F` / `#1F1408` |
| Gold | `#E8C760` |
| Navy | `#0F1B2D` |

## Running locally

Open `Stick Figure Quest.html` directly in a browser. No server required (Babel transpiles at load time). For file:// CORS issues with the JSX src imports, serve with any static server:

```
npx serve .
# or
python -m http.server 8080
```

## V2 roadmap hooks

- Replace `window.sfq-v1-state` localStorage with WebSocket room state
- Replace hardcoded narrative strings with Claude API calls (constrained to engine outcomes)
- NPC generation pipeline: sample trait axes → generate name + dialogue → cache at world creation
- Add Scenes 2 (bandit ambush) and 3 (dragon confrontation)
- Real presence indicators from WebSocket heartbeats
