# Reproducible hero review

Read [the hero contract](../../../../docs/hero-art.md) before changing parts. Its canvas, mask, layer-order, and saved-ID requirements are authoritative. Use `dropinn-playtest` for save/Cancel/admission/rejoin checks when behavior or catalog choices change.

From the repository root:

```text
node .agents/skills/dropinn-art/scripts/review-heroes.mjs
```

This checks catalog sources, native SVG/PNG canvas declarations, and hashes from `native-hero-art.json`, then generates `output/hero-review.html` using the actual `HeroAvatar` renderer. Sources are embedded so the HTML can be opened without a dev server. The sheet includes each body with each hat and no hat, every face option, color variations, and 256px/64px/48px previews on light and dark backgrounds. The module loader uses Vite with config disabled; it starts no gameplay endpoint and makes no model requests.

Inspect the sheet in a browser and capture affected rows at readable scale. Look for hat/eye collisions, mask seams, clipping, recognizable expressions, color response, and details lost at table size. File checks cannot prove visual alignment, actual transparency, or readability. For a new face part, inspect representative combinations beyond its default row where overlaps are plausible; the sheet is not the Cartesian product of every option.

The script exits nonzero on file/manifest problems but still writes a sheet when sources are readable, allowing review before updating hashes. Missing or changed manifest entries require inspection and intentional inventory maintenance; never refresh hashes merely to make the check pass. After review, update `native-hero-art.json` with source hashes and only the checks actually performed. PNG scene-art inventory is separate and remains covered by `npm run art:check`.

Acceptance on the next part replacement: the same command produces the new matrix, a misaligned test fixture is visibly apparent, existing IDs/tints remain correct, and the targeted browser lifecycle check passes without inventing a new gallery script. Record setup time and any script repair needed.
