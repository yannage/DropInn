# Gemward art and painted animation

The October 3 style repair replaces all twenty new Gemward illustrations with the established coarse MS Paint direction: crooked outlines, broad restrained colors, simple silhouettes and sparse interior detail. The visual anchors are `public/art/sheep.png`, `shadow-pack.png`, the approved `.agents/skills/dropinn-art/assets/hero-style-a.png`, and `public/art/stage-village.png` for environments. Existing hero layers, NPCs, item IDs and story rules stay compatible.

## Artwork

Eight environment plates cover the shop, inn, docks, warehouse, canal, road, beacon and Lantern square. Twelve cutouts cover the ledger, canal key, prism, empty gem stand, price board, hired guard, ward construct and five consumables. Existing `public/art/gemward-v2-*` filenames point to the repaired art.

All assets and animation frames were generated with Codex's built-in `image_gen`. Exact prompts, inspected references, tool source paths, hashes, rejected drafts and review notes are retained in:

- [Environment repairs](../.agents/skills/dropinn-art/references/gemward-style-repair-environments.json).
- [Cutout repairs](../.agents/skills/dropinn-art/references/gemward-style-repair-cutouts.json).
- [Eight-frame atlases](../.agents/skills/dropinn-art/references/flipbook-prompts.json).
- [Current Gemward inventory and superseded source history](../.agents/skills/dropinn-art/references/gemward-v2-prompts.json).

Original PNG outputs remain alongside exact, lossless WebP derivatives. Encoding preserves RGBA pixels, including faint generator alpha noise outside visible ink. Every visible animation frame has safe cell margins. Art was reviewed at source size, at 128/64/48px on paper and dark backgrounds, and in landscape and portrait scene crops. Live checks cover both complete played routes; crop review separately covers every environment.

## Animation behavior

| Moment | Runtime asset | Playback |
| --- | --- | --- |
| Loading or restoring the game; opening/joining a table | `flipbook-sheep-loading.webp` | Eight drawn sheep poses; 1,120ms loop during actual loading |
| A confirmed shared quest discovery | `flipbook-discovery.webp` | Eight pouch-opening poses; 800ms once alongside the actual discovered item |
| Confirmed encounter progress | `flipbook-encounter.webp` | Eight contact/puff drawings; 600ms once over the enemy |

`FrameAnimation.tsx` steps through four columns and two rows of each 1536×1024 atlas. Frames change discretely; the player does not interpolate between drawings. `LoadingInn.tsx` is available before the lazy game module, so the real Suspense fallback can show the sheep. It ends immediately when loading completes, without a minimum waiting period.

Discovery and contact use the existing confirmed-event presentation window, keyed by event ID. Draft selections, repeated synchronization and reload do not manufacture another effect. Their images prewarm at low priority when motion is enabled, without blocking play. Wall-clock age prevents slow downloads or returning from a hidden tab from replaying an expired animation. The winning blow still plays against the displayed encounter while the next scene is being prepared. Existing impact feedback stays available until the new atlas is ready. Reduced motion and quiet effects retain readable results; the loader shows a static poster. A failed loading atlas leaves a static lantern and loading text. Animation completion never controls a command, turn or deadline.

## Verification

- `npm run art:check`: 118 asset entries passed path, dimensions, source and runtime hash checks. Separate visual inspection checked style, alpha and actual composition.
- Focused Vitest: 55 tests passed across `frameAnimation`, `stagePlayback` and `playerGuidance`.
- `npm run test:flipbooks`: eight local Chromium checks passed, including all eight raster cells, 320/390px loading layouts, reduced motion, hidden/late playback, real Suspense entry and failed-image recovery. Evidence: `output/playwright/flipbook-loading.json`.
- `npm run test:journey -- http://127.0.0.1:5204`: 43 local two-player checks passed with zero errors. Both complete routes, shared inventory, confirmed frames, final battle contact, nonblocking prewarm, delayed/failed atlases and reduced-motion results verified. Evidence: `output/playwright/journey-results.json`; source/art fingerprint `a025e10377d86320adfc3b8394a696fa33570911292c297c71a45455996466b8`. Fingerprints reject screenshots captured during edits.
- Production TypeScript/Vite build passed; Vite still reports its existing large-chunk warning.

The browser checks use an isolated local command handler and Chromium viewports, not hosted persistence, Realtime or physical phones. They verify behavior and layout; human enjoyment still needs playtesting.

With Vite running locally, `output/playwright/flipbook-gallery.html` previews all three animations with replay, slow motion and paper/dark backgrounds. That gallery and captured screenshots are ignored review artifacts; the game uses the production components above.
