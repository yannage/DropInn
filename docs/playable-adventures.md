# Playable adventures — runtime and local verification

The Last Flight of the Teacup, The Inn That Misplaced Tomorrow and The Orchard That Walked Away are implemented as selectable adventures alongside Briar Glen. Each has three chapters, twelve scene targets, authored success/mixed/setback outcomes, keepsakes and an irreversible finale route. This working-tree version has not been deployed.

## Runtime contract

`src/lib/dropinn/registry.ts` pins adventure ID/version. Old rooms and recaps without those fields use Briar Glen v1; unavailable versions fail explicitly. Matching filters by identity/version, and invitations retain the selected story. The existing JSON snapshot transaction stores the added fields without a schema migration (`dropinn_apply_snapshot` in `supabase/migrations/202609190001_dropinn_v2.sql`). This is a code-path assessment; it is not new hosted persistence evidence.

`scripts/build-story-data.mjs` combines the reviewed packet tables with explicit runtime outcomes, art mappings and branch policy to generate `src/lib/dropinn/adventures.ts`. Run `npm run stories:build` after authoring edits, review the generated diff, restart Vite if output changed, then test. The helper skips identical output. Markdown is never interpreted by the running game. Preserve released definitions when adding future versions.

On chapter three's first choosing turn, Help on a route target opens its cost review before the normal timed commitment. Unique most human votes wins; ties/no votes use the displayed fallback. The roll and release bonus do not affect preference. Committed votes survive departure, companions do not vote, and later actions support the fixed route. Ordinary actions retain their normal progress and reward behavior. Mandatory discoveries are included in every chapter outcome, including the round cap.

| Story | Routes | Tie/no-vote fallback |
| --- | --- | --- |
| Teacup | Tear the sail to save the ship; salvage the sail and evacuate | Lifeboat; the ship is lost |
| Tomorrow | Spend the perfect recipe; spend only Tock's breakfast routine | Spend recipe, preserve memories |
| Orchard | Open the private wall; retire the ornamental mill | Small reversible spillway |

## Art scope

The baseline uses three new reusable stage plates and 31 new cutouts, with existing herd, boat and gate assets where appropriate. Retained PNG originals and exact-pixel lossless WebP derivatives live in `public/art/`. Generation prompts/provenance are under `.agents/skills/dropinn-art/references/generated/`; the inventory records hashes. `encode-story-art.py` verifies source alpha, unclipped opaque bounds and RGBA equality, and produces `output/playwright/story-art-review.png` for light/dark thumbnail review.

Neutral props remain visible after development; cost variants show the torn sail, blank recipe, empty spool and open wall. The small spillway uses the sluice cutout. Endings show a relevant object and short caption. This baseline does not claim the larger art wish list in each packet is complete: distinct backgrounds for every chapter, all before/after compositions, additional enemy poses and elaborate closing tableaux remain future art work.

## Verification

Locally verified on 2026-09-20 against working-tree changes based on `1daa5b0`:

- `npm test`: 200 tests passed across 17 files. New coverage includes all six explicit routes with one human and companions, tied votes in reversed arrival order, duplicate delivery, downed/departing voters, parked rooms, round-cap facts, story-specific matching/history and signed authored Spotlight previews.
- `npm run build`: TypeScript and production build passed with the complete art set.
- `npm run test:adventures -- http://127.0.0.1:5198`: all three stories completed all three chapters with two browsers, chapter-two reload/reconnect, route review and journal ending. Teacup/vent, Tomorrow/recipe and Orchard/wall were exercised through the UI; alternative routes are reducer evidence. All nine chapter screens passed loaded-art, 44px-target and no-document-overflow checks at 390×844 and 320×568. All three small-screen finale overlays fit. Report: `output/playwright/adventures-results.json`, zero browser errors.
- `npm run test:scene -- --base-url http://127.0.0.1:5198`: existing scene regression passed, including real pointer release, keyboard and assisted Protect, cancellation, reviewed Spotlight, lost-response/reload retry with identical command/timing, drawer focus, dragging and expiry. Snapshot-render fixtures remain labeled separately from service evidence.
- `npm run art:check` and format-only encoding passed. All 34 new assets were visually inspected in the generated contact sheet on light/dark backgrounds; the neutral silhouettes and explicit cost variants remain legible at thumbnail size. Teacup/Tomorrow/Orchard mobile screenshots and closing overlays were inspected, plus the Orchard stage and story library at 1280×800. The desktop stage had no document overflow or browser errors.
- Authored target IDs, first-target hints, enemy sources and referenced PNG sources resolved. `git diff --check` passed.

Browser checks use two independent Chromium contexts per story and the real local command handler with an injected synchronized clock, no external inference, and no hosted writes. Generated reports/screenshots are in ignored `output/playwright/`. They establish local UI/API integration, not Supabase, Realtime transport, physical-phone accessibility or human comprehension.

The test runner originally shared Vite's optimized-dependency cache with the preview server, causing a blank page with a 504 stale dependency response. Separate caches and disabled test HMR resolve that development configuration issue. A later run after hot-regenerating shared definitions read an empty store during reconnect; restarting Vite restored consistent results across the complete run. Restart after changed generated definitions, and do not edit shared runtime modules during browser verification. The helper now avoids invalidating modules for unchanged output.

## Follow-ups

Human-playtest the cost previews, first meaningful action, target recognition and pacing. Physical-phone text scaling, screen readers and keyboards remain separate checks. Deploy only through a separately authorized rollout, then verify hosted API persistence and independent-browser Realtime/reconnect.

The optional Teacup setup bonus, Tomorrow symbol-matching bonus and Orchard shared watering can remain proposals. The playable versions use ordinary authored actions and developments. AI preparation remains Briar Glen-only; authored Spotlight suggestions work in each new story without inference. No new live model-quality claim is made.
