# DropInn — D&D One-Shot Prototype

## Project overview

A browser-based D&D one-shot adventure prototype validating the **drop-in async play loop**: lobby → drop in → complete a scene → earn XP/items → leave gracefully → rejoin seamlessly. V1 is a fully hardcoded single-scene demo, no backend.

## Architecture

**Vite + React 18 + TypeScript + Zustand.** The CDN/Babel prototype (`app.jsx`, `screens.jsx`, `icons.jsx`) lives in `_archive/` — the active codebase is `src/`.

```
DropInn/
├── index.html                    # Vite entry point
├── src/
│   ├── main.tsx                  # ReactDOM.createRoot
│   ├── App.tsx                   # Screen router
│   ├── data/
│   │   ├── campaign.ts           # Actions (social/combat/dragon), players, NPC, bot plays
│   │   └── outcomes.ts           # All narrative outcomes + round intro texts
│   ├── lib/engine.ts             # d20 resolution engine
│   ├── store/
│   │   ├── gameStore.ts          # In-scene phase state (Zustand)
│   │   └── lobbyStore.ts         # Lobby + persistence (Zustand persist)
│   └── components/
│       ├── AppBar.tsx
│       ├── Room/                 # Full scene UI
│       ├── Lobby/
│       ├── overlays/
│       ├── modals/
│       └── icons/                # Defs, Coins, Seals, Misc
├── _archive/                     # Old CDN/Babel version — not imported
├── CLAUDE.md                     # This file
└── DESIGN.md                     # Full v3 brief and success criteria
```

## State management

`lobbyStore` (persisted to `sfq-v1-state`) owns:
- `screen`: `'lobby' | 'previously' | 'room'`
- `overlay`: modal name or null
- `completed`, `xp`, `hasSalve`, `spotlightTokens`

`gameStore` (in-memory) owns in-scene state:
- `phase`: `idle → bots → player → reveal → resolve → reward`
- `envelopes`, `drag`, `timer`, `storyLog`, `rollResult`

## Action system

Scene type determines which actions appear in the tray:
- **`social`** — Charm (CHA), Bluff (ING), Read Room (INT), Bribe (ING) — used in town/NPC scenes
- **`combat`** — Fire Bolt (INT), Thunderwave (INT), Shield (INT), Disengage (ATH) — bandit ambush
- **`dragon`** — Arcane Burst (INT), Commune (CHA), Dispel (INT), Dash (ATH) — finale

V1 (Scene 1) uses `social` for all 3 rounds. `ACTIONS_BY_ROUND` and `SCENE_TYPE_BY_ROUND` in `campaign.ts` control this — swap values there to change scene types per round.

`disengage` and `dash` are auto-succeed (low-DC repositioning moves).

## Key design decisions

- **Phase state machine** drives the entire game loop. Never break out of it with direct state mutations.
- **Drag gesture** is the primary commit mechanic — pointer events on the stage div, distance math vs. drop zone center.
- **Bot plays vary by round** — see `BOT_PLAYS_BY_ROUND` in `campaign.ts`.
- **All narrative outcomes are pre-written strings** — no LLM in V1. See `outcomes.ts`.
- **d20 + trait roll** determines success/failure per action. DC is hardcoded per action.
- `localStorage` key: `sfq-v1-state` — saves XP, hasSalve, spotlightTokens, completed.

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

```
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs to dist/
```

## V2 roadmap hooks

- Replace `window.sfq-v1-state` localStorage with WebSocket room state
- Replace hardcoded narrative strings with Claude API calls (constrained to engine outcomes)
- NPC generation pipeline: sample trait axes → generate name + dialogue → cache at world creation
- Add Scenes 2 (bandit ambush) and 3 (dragon confrontation)
- Real presence indicators from WebSocket heartbeats
