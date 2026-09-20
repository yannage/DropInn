# Interactive stage art

`SceneStageArt` supplies one background-only environment for each chapter. All actual targets remain native buttons with independent decorative `TargetArtwork` cutouts. Layout and target hit regions belong to HTML/CSS, never to the image.

The exact one-asset-per-call built-in image generation prompts and original output filenames are in [scene-stage-prompts.json](scene-stage-prompts.json). Original generated PNGs remain in `public/art/`. Runtime `.webp` siblings are lossless format conversions, retaining full dimensions, source alpha and exact RGBA pixels; the inventory records both hashes.

| State or pose | Runtime art filename |
| --- | --- |
| Village, river, chapel environment | `stage-village.webp`, `stage-river.webp`, `stage-chapel.webp` |
| Mara rescued / gate braced | `mara-safe.webp`, `gate-sheltered.webp` |
| Silver fragment found / herd calmed | `tracks-fragment.webp`, `herd-gathered.webp` |
| Boat freed / concealed reed path | `boat-afloat.webp`, `reeds-path.webp` |
| Ferryman explained the warning | `ferryman-warning.webp` |
| Ward joined / bell sounding / captives escaping | `ward-restored.webp`, `bell-ringing.webp`, `captives-free.webp` |
| Shadow pack wind-up / recoil | `shadow-pack-windup.webp`, `shadow-pack-reaction.webp` |
| Gloamfang wind-up / recoil | `gloamfang-windup.webp`, `gloamfang-reaction.webp` |

The `changed` scene flag selects developed art before enemy poses. `pose="windup"` or `pose="reaction"` affects only the two authored enemies; all other targets retain their correct state. Unknown or failed sources remain text-only. The stage image is decorative and disappears on load failure, leaving the CSS backdrop and controls intact.

Run `node .agents/skills/dropinn-art/scripts/review-scenes.mjs` to create `output/playwright/scene-art-review.html`, then serve it through local Vite and inspect its full/portrait crops and 128/64/48px light/dark examples. For transparent cutouts, inspect real transparent surroundings and opaque content; confirm the nontransparent bounds do not touch canvas edges. The portrait crop must keep the environment recognizable with empty room for separate targets.

When generated PNGs change, use `encode-scene-art.py` with a Python runtime containing Pillow to create lossless derivatives. It refuses any pixel difference and updates derivative hashes; it does not generate art, resize, crop, recolor or alter illustrations. Retain source hashes for separate visual review. Run `npm run art:check` and focused `TargetArtwork` tests after mapping or source changes, then verify target interaction in the live scene.
