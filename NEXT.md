# DropInn — Next Steps

## 1. Smoke-test the core loop (do this first)

Open `http://localhost:5173` and walk through:

- [ ] Lobby renders — filter chips, room card, XP in header
- [ ] Tap room card → Previously-on overlay with 8s countdown + skip
- [ ] Drop-in banner appears for ~4.5s with arrival text
- [ ] **CampaignBanner** visible above SceneHeader (title + Yanni/Bram/Aria avatars with online dots)
- [ ] Bram + Aria envelopes appear on table (~1s, ~2s delays)
- [ ] Persuade coin glows; hand cursor hint appears
- [ ] Drag coin to table → envelopes flip → resolution narrative appears in scroll
- [ ] d20 roll badge shown in StoryScroll (bottom-left)
- [ ] "Turn 1 / 3" reward card slides up → tap Continue
- [ ] Round 2 loads with different bot plays + new intro text
- [ ] Round 3 completes → "SCENE COMPLETE" card with +50 XP + Healing Salve
- [ ] Tap book icon → HistoryLog overlay shows all 3 turns scrollable
- [ ] Spotlight: tap token → type text → Commit → next resolution shows spotlight in story
- [ ] LEAVE button → confirm modal → returns to lobby
- [ ] Lobby shows "Scene Complete" badge, 50% progress bar
- [ ] Tap room again → V2Stub modal appears
- [ ] Hard-refresh → XP and `completed` state persist (localStorage `sfq-v1-state`)

## 2. Known issues to fix

- [ ] **React import missing** in `Seals.tsx`, `Misc.tsx`, `AppBar.tsx`, `gameStore.ts` — they use
  `React.FC` / `React.CSSProperties` without `import React from 'react'`; add the import or switch
  to named imports (`FC`, `CSSProperties` from `'react'`)
- [ ] **`Envelope` component** in `Seals.tsx` uses `foreignObject` to render `SealIcon` — this may
  not render cross-browser. Replace with direct SVG paths or a separate overlay div positioned
  over the envelope SVG
- [ ] **StoryScroll** currently only shows the current round's text, not accumulated log entries.
  Decide: show only current text (current behavior, fine for V1) or render all `storyLog[]`
  entries stacked (richer but needs scroll logic)
- [ ] **HistoryLog** reads from `gameStore.storyLog` which resets on `clearStoryLog`. Confirm
  entries persist across rounds (they should — `appendStoryEntry` accumulates; `resetForNewRound`
  does NOT clear the log)
- [ ] **`coinRef` type** in `ActionTray.tsx` — prop is `React.RefObject<HTMLDivElement>` but the
  `ref` is attached to a `<div>`, which is correct; verify no ref warnings in console
- [ ] **Timer auto-commit** calls `commitAction(ACTIONS.find(a => a.id === 'move')!)` inside a
  `useEffect` but `commitAction` is defined with `useCallback` referencing stale closure —
  verify move auto-fires correctly at 0s

## 3. Framer Motion drag (deferred from migration)

The plan specified replacing raw `onPointerDown` / `window.addEventListener` drag with Framer
Motion. Currently using the pointer-event approach (works, but less polished).

- [ ] Replace `ActionTray` coin drag with `motion.div` + `drag` + `dragConstraints`
- [ ] Use `onDragEnd` with bounding-rect comparison for drop detection
- [ ] Add `whileDrag={{ scale: 1.1 }}` for visual feedback
- [ ] Add `dragElastic={0.2}` for resistance feel
- [ ] Remove `useEffect` pointer-move/pointer-up listeners from `Room.tsx`

## 4. Spotlight → inline story scroll

Currently spotlight text goes into `storyLog` (HistoryLog shows it) but StoryScroll only renders
the single `currentStoryText` string per round.

- [ ] In `StoryScroll`, add a "spotlight entry" section below the main text when the last
  `storyLog` entry is `kind: 'spotlight'`
- [ ] Style in Caveat font with gold left border: `border-left: 3px solid #E8C760`
- [ ] Show `entry.spotlightText` (player's words) in Caveat, then `entry.text` (outcome) below it

## 5. Polish pass

- [ ] Timer color turns red at ≤5s (already coded — verify it works)
- [ ] `AppBar` hamburger button should open `help` overlay (wired; verify)
- [ ] Lobby bell icon badge count (hardcoded "2") — leave as-is for V1
- [ ] `DropInBanner` z-index: confirm it appears above the scene but below modals
- [ ] Mobile viewport: test on a physical phone or Chrome DevTools 390×844. Check that all 7
  regions of the Room fit without needing to scroll

## 6. Archive cleanup

- [ ] Delete or gitignore `dist/` (build output)
- [ ] Confirm `_archive/` JSX files are not imported anywhere in `src/`
- [ ] Update `CLAUDE.md` to reflect the new Vite + Zustand stack (currently describes CDN/Babel)

## 7. V2 foundations (when ready)

- [ ] Replace Zustand `persist` localStorage key with WebSocket room state
- [ ] Add `StoryEntry[]` type to a shared API contract (for backend narrative log)
- [ ] Scene 2 — "Ash Hollow" bandit ambush — new scene data in `campaign.ts`
- [ ] Scene 3 — Dragon confrontation — finale with binary success/fail branch
- [ ] Real presence indicators from WebSocket heartbeats (replace `player.online` hardcoded bools)
- [ ] Replace hardcoded `OUTCOMES` strings with Claude API calls (constrained to engine outcomes)
