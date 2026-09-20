---
name: dropinn-art
description: Generate and integrate DropInn's whimsical MS painter raster art, or review modular hero SVG layers, tint masks, and catalog compositions. Use for MS Paint characters, props, scenes, and hero-part changes; preserve native functional icons and modular layers.
---

# MS painter

Make charmingly imperfect artwork inside the DropInn development task. The visual target is the saved concept sheep, Mara, and gate, generated with Codex image generation. It is not the much cruder local Qwen sprite preset.

For modular hero work, start with [hero-review.md](references/hero-review.md) and the hero art contract; load raster generation references only if that task needs raster artwork.

## Start with the reference and destination

- Read [style.md](references/style.md), then view the relevant PNGs in [assets](assets/). Use these as visual references; prose alone is less reliable for consistency.
- Read [asset-inventory.json](references/asset-inventory.json) to reuse existing assets and understand their destinations. Exact past prompts are in [concept-prompts.json](references/concept-prompts.json), [sheep-edit-prompt.txt](references/sheep-edit-prompt.txt), and [tracks-prompt.txt](references/tracks-prompt.txt).
- For a batch, make a short resource list: subject, purpose, UI location, required canvas/transparency, and new generation versus reuse. Do the work in this task; no separate art conversation is required.

## Generate and integrate

1. Use the available built-in image generation tool by default, following its current input/reference instructions and the installed imagegen skill when available. Request actual alpha transparency for cutouts. Do not substitute hand-coded SVG for requested raster illustrations.
2. If the built-in tool is unavailable, report the missing capability. Do not silently switch to a paid API, local Qwen, or another model. [local-qwen.md](references/local-qwen.md) is an optional route when the user asks for local drafts; it produces a different look.
3. Generate or edit one asset per call. Keep enough margin to avoid clipping. Inspect the result; use a targeted edit/regeneration when its silhouette, subject, or style is wrong. Routine assets do not require manual painting.
4. Copy the selected tool output into the repository. Save the exact prompt and generator provenance with the inventory. Preserve source alpha and keep reference originals. Use a new descriptive/versioned filename for variants rather than overwriting existing artwork without a replacement request.
5. For standalone encounter art, place files under `public/art/`. Add the existing target ID to `src/components/DropInn/TargetArtwork.tsx`. The image is decorative; the target's visible text and button accessible name carry its meaning. Keep the parchment backing and compact dimensions. Unknown targets and changed targets without matching art remain text-only. Do not draw a broken gate after it has been repaired.
6. For chapter banners, keep titles and gameplay text in HTML, with safe negative space in the image. Fit the existing `SceneArt` usage and test its responsive crop. A request for a prop does not imply replacing all backgrounds.
7. For hero parts, first read [the hero art contract](../../../docs/hero-art.md). Keep the **full 256×256 canvas**, its existing alignment template, tint-mask separation, and catalog IDs. Never run those parts through the local sprite crop/center exporter. Prefer editing existing SVG layers for small shape changes; AI-generated parts need alignment checks across bodies and hats.

## Review the result in context

- Inspect on pale parchment and the dark game UI at 48–64px, not only at full size. Check opaque content, real transparency, clipped edges, and whether the expression/prop is recognizable. A PNG alpha channel alone does not prove correct transparency.
- Run `npm run art:check` from the repository root for inventory paths, PNG dimensions, alpha-channel support, and recorded file hashes. This is a file check, not a substitute for looking at the artwork.
- For native hero layers, run `node .agents/skills/dropinn-art/scripts/review-heroes.mjs` and inspect its generated contact sheet as described in [hero-review.md](references/hero-review.md). It checks the separate native manifest without rewriting hashes.
- After integration, check mobile and desktop layouts, selection/check marks, token placement and confirmation. Artwork must not intercept gestures or hide copy. Preserve a text-only fallback on load failure.
- Run relevant tests and `npm run build` for code changes. Record what was actually inspected in the inventory's review field; do not mark unviewed assets reviewed.
- Report the selected files, prompt location, generator, and any remaining limitation. Generation occurs during development; do not add image-model keys or image generation services to the running game.
