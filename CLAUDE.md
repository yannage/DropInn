# DropInn - Multiplayer Battle MVP

## Project Overview

DropInn is a browser-based co-op D&D-inspired battle prototype. V1 validates the loop:

1. Create or select a saved character.
2. Create or join a room by code.
3. Fight a shared "Ash Hollow Ambush" encounter.
4. Resolve simultaneous party actions against enemy HP.
5. Take damage, win or fail, claim XP/items, and persist progression.

Supabase is the production source of truth for anonymous users, characters, rooms, battle state, turn actions, logs, and rewards. Localhost falls back to localStorage when Supabase env vars are missing so development and Browser QA still work without a live project.

## Stack

- Vite + React 18 + TypeScript
- Zustand for UI state and local cache
- Supabase JS for anonymous auth, Postgres persistence, and Realtime room updates
- Vitest for pure engine coverage
- Netlify for static hosting

## Active Code Map

```text
src/
  App.tsx                         Screen router and player initialization
  data/                           Legacy campaign/social data used by older room components
  lib/
    battle/engine.ts              Pure battle mechanics and deterministic turn resolution
    multiplayer/api.ts            Supabase/local room repository
    multiplayer/roomEngine.ts     Room state machine around the battle engine
    progression.ts                XP thresholds and reward application
    supabase/client.ts            Supabase client, anonymous auth, session namespacing
    supabase/characters.ts        Character persistence repository
  store/
    playerStore.ts                Anonymous user/session, characters, selected character, rewards
    multiplayerStore.ts           Room actions, sync, Realtime subscription bridge
    lobbyStore.ts                 Screen and overlay state
  components/
    Lobby/                        Character selection and multiplayer room setup
    Room/MultiplayerRoom.tsx      Battle-first room UI
    modals/                       Profile, inventory, help, leave, etc.
supabase/migrations/
  202605100001_battle_mvp.sql     Tables, indexes, RLS, and Realtime publication
```

The archived CDN prototype remains in `_archive/` and is not imported by the Vite app.

## Battle MVP

The first playable room is "Ash Hollow Ambush". The room stores a `battleState` object with enemy HP, round, enemy intent, party HP by character id, downed characters, last resolved turn, and reward claims.

Core actions:

- `Strike`: DC 11, reliable damage, 6 on success and 2 on failure.
- `Heavy`: DC 15, risky damage, 11 on success and 0 on failure.
- `Guard`: reduces incoming damage by 6 and deals 2 on success.
- `Aid`: heals the lowest damaged ally by 5, or grants +2 momentum if nobody is hurt.

Resolution order:

1. Aid effects resolve.
2. Damage/guard actions resolve.
3. Enemy HP updates.
4. Enemy attacks if still alive for `4 + round` damage.
5. Downed state updates.
6. Battle continues, wins, or fails.

Rewards:

- Victory: `+75 XP` and `Ashhide Charm`.
- Failure: `+15 XP` and `Cracked Ash Token`.
- Level 4 unlocks at 300 XP. Level 5 unlocks at 450 XP.

## Supabase

Required production env vars:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

The Supabase auth storage key is namespaced by `?session=` in local dev. This allows Browser QA to simulate two anonymous users in one browser:

```text
http://localhost:5173/?session=host
http://localhost:5173/?session=guest
```

Run the migration in `supabase/migrations/202605100001_battle_mvp.sql` before deploying with Supabase env vars. See `SUPABASE_SETUP.md` for full setup.

## Commands

```bash
npm install
npm run dev
npm run test
npm run build
npm run preview
```

The build command intentionally calls local binaries through `node ./node_modules/...` so Netlify does not hit executable-bit issues with `tsc` or `vite`.

## Current V1 Non-Goals

- Tactical grid movement.
- Public matchmaking.
- Account upgrade from anonymous auth.
- Server-authoritative anti-cheat.
- LLM-generated narration.
- Multiple campaigns.

These are post-V1 items. The current milestone is a working co-op battle MVP with saved progression.

