# Living tabletop human comparison

Prepared 2026-09-29. First human feedback received the same day; recorded below.

## Builds

| Label | Address | Source | Rules |
| --- | --- | --- | --- |
| A | http://127.0.0.1:5200 | `36849c1`, immediately before the living-table implementation | Briar Glen v1 |
| B | http://127.0.0.1:5199 | Current working tree after `1f88867` | Briar Glen v2 |

This compares the complete revision, including the added combinations. It does not isolate animation from mechanical changes.

The baseline lives in the attached managed worktree at `C:\Users\Yanni\.codex\worktrees\tabletop-baseline\DropInn`. Its Vite server is explicitly local-only, uses a separate optimized-dependency cache, and shares installed packages through an ignored `node_modules` junction. It does not copy hosted credentials or change the revised checkout. Keep the worktree while its comparison server is in use.

## Participant page

Generate with `node scripts/prepare-feel-comparison.mjs`, then open:

http://127.0.0.1:5199/output/playtest/comparison.html

The page provides two play links with isolated browser-session IDs, a suggested randomized order, notes after each build, and a JSON download. Notes stay in that browser. Empty answers remain empty; no result is inferred from opening a build or downloading the form. The generated page is under ignored `output/`, outside production public assets.

Use a fresh browser profile/private window for each participant. Both links are loopback addresses on the development computer; these do not provide remote phone access.

## Session protocol

Use the same device, input, class and sound settings. Ask participants to take a few turns in Briar Glen or finish its first chapter. Let them choose moves without explaining the combination beforehand. Alternate starting builds across participants; note prior familiarity and fatigue.

For the waiting-time question, use two humans at a friend table in each build. Solo rounds resolve immediately after commitment, so solo play cannot establish whether waiting for another human is enjoyable. Record the literal behavior: inspecting, changing moves, tapping the hero, reacting, reading history, waiting, or leaving.

After each build ask:

1. What did you choose, and what did you expect it to do?
2. What visibly changed after your move?
3. Did you discover moves that combine? What did you find?
4. If you found an extra payoff choice, why did you choose it?
5. What did you do after preparing or committing? How did it feel?
6. Do you want another turn: yes, maybe, or no?

Then ask which build felt more satisfying and request a specific flat, confusing or slow moment. Keep observation separate from interpretation. Record voluntary requests for another turn separately from answers to the prompted question. A preference alone does not prove every planned outcome was understood.

For a separate listening pass, enable effects and narration at a comfortable volume. Listen to pickup, placement, ordinary outcomes, combinations and rewards. Note whether speech stays intelligible, routine cues become repetitive, or an outcome lacks an audible response. Do not use mocked audio tests as listening evidence.

## Readiness evidence

`node scripts/check-playtest-builds.mjs` passed against the actual two running local handlers. Both returned `backend: local`, created the expected Briar Glen version, and resolved a real action without browser errors. Baseline resolution automatically opened history; revised resolution stayed on the stage. This was a smoke check, not a human playtest.

The comparison page was checked at 390px: links point to the correct ports, notes survive reload, and downloaded JSON preserves entered text and blank fields. The QA-only persistence string was used in an isolated browser context and is not a participant observation.

Generated screenshots and readiness results are in `output/playwright/comparison/`. The initial human feedback is recorded below; no questionnaire result is inferred. Hosted publication is separate.

Screenshot review also exposed a one-tick countdown overshoot: a newly received reveal could briefly say 11 seconds. The revised UI now caps displayed choosing/reveal time at the existing 60/10-second ceilings without changing authoritative deadlines. All 20 guidance tests, the production build and both real-server smoke checks passed after this correction.

## First human feedback and resulting revision

The participant preferred B overall: click/selection feedback, character hover motion, and the bottom tokens’ sizing, interactions and animations. They preferred A’s scroll appearing immediately. Throwing a token at a character sometimes felt silly; they want to think further about that visual.

The resulting hybrid restores immediate round parchment opening while retaining B’s interactions and motion. View scene dismisses the parchment for the current round. The token-throw visual is unchanged. This revision changes B after the initial comparison; the observations above describe the pre-hybrid builds.

No answer about wanting another turn, combination understanding, or a separate sound-listening pass was supplied. Those outcomes remain unverified.
