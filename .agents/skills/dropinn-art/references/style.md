# DropInn's MS painter direction

Use `assets/sheep.png` as the primary creature reference, with `assets/mara.png` and `assets/gate.png` for people and props. `assets/sheep-expressive.png` is the richer alternative, not the default. These are original built-in image-generator outputs, not images from the local Qwen preset.

Aim for chunky uneven black outlines, slightly jagged edges, broad flat colors, lopsided silhouettes, expressive mismatched features, and one funny detail. The drawing should look lovingly awkward and legible. Add character, not intricate shading. The references have some soft tonal variation; they define the chosen look more closely than a strict color-count rule.

## Current direction: primitive mouse doodles

The [user's original goblin prompt](user-goblin-prompt.txt) is the style authority. Use deliberately wonky old Windows MS Paint mouse drawing: heavy **true black**, jagged stair-stepped pixel outlines; clumsy asymmetrical anatomy; off-center features; flat bucket fills; uneven contours with small overshoots; funny deadpan expressions. Think chunky pencil tool on a 256-pixel canvas enlarged with nearest-neighbor. Keep broad shapes recognizable at small sizes. Use cream, moss green, dusty teal, mustard gold, coral, and brown.

The user explicitly rejected the polished cartoon direction in the earlier homemade-adventure batch. Do not use that batch as a visual reference. Avoid smooth vector contours, elegant anatomy, detailed fur or clothing, shaded RPG pixel art, gradients, texture, hatching, glossy lighting, and dithering. Do not add detail to make a drawing feel more finished. Favor one awkward silhouette, mismatched eyes, tiny limbs, and a single funny detail. Scenes use sparse flat hills, crooked buildings and timber, and broad empty sky. Keep all text and UI outside the image.

The replacement set and exact per-asset prompts are in [primitive-ms-paint-prompts.json](primitive-ms-paint-prompts.json), based on the user's supplied goblin prompt. The original sheep, Mara, tracks, and gate remain the references. Match these first; the current UI colors do not prescribe brighter illustration colors. The cast mixes blob heroes, human NPCs, and goofy monsters with comic mischief rather than menace.

UI palette: paper #fff4d6, panel #fffaf0, ink #26322c, readable secondary ink #526052, yellow #f1c75b, coral #ed8b78, green #a9cf8b, blue #aed7ed, and lavender #c7b5e7. Use Caveat for large headings and occasional notes, Inter for readable controls and body text. Preserve labels and symbols alongside state colors. Put cutouts on pale paper so their outlines remain visible. Decorative frames can be uneven; text and controls stay straight.

The superseded batch's prompts remain in [homemade-adventure-prompts.json](homemade-adventure-prompts.json) for provenance only. Standalone target art displays at 72–96px with 14px descriptions; also inspect 48–64px thumbnails. All three chapter landscapes are local PNGs. Chapter headers show their complete 3:2 composition; lobby banners and thumbnails crop responsively. Keepsake art uses existing reward strings without changing save IDs. Changed encounters keep the text-only fallback until an accurate changed-state illustration exists.

Avoid glossy 3D, smooth vector-perfect contours, tiny RPG shading, detailed textures, photorealism, baked-in text, watermarks, and a face on every object. A gate or footprint should have no face unless requested. Preserve clear space around the full silhouette. Standalone objects can have a centered square composition; modular hero layers cannot be independently centered or trimmed.

## Reusable prompt recipe

Use case: stylized-concept.
Asset: [NPC / creature / prop / landscape] for DropInn, a whimsical short fantasy adventure.
Subject: [clear recognizable subject, pose, one silly detail].
Style: match the inspected DropInn sheep/Mara/gate references; deliberately low-skill old Windows MS Paint mouse drawing, true black stair-stepped outlines, clumsy lopsided shapes, flat restrained bucket fills, mismatched off-center eyes and no shading. Never use the superseded homemade-adventure set as a style reference.
Composition: [square isolated full silhouette with clear margin / wide chapter plate with negative space for separate HTML title].
Readability: broad shapes readable at the intended [size]px; remove small detail that competes with the silhouette.
Background: [actual alpha transparency / full-bleed scene].
Constraints: no text, UI, watermark, glossy light, detailed texture, or extra subjects. [Preserve invariants for an edit.]

The earlier concepts needed prompting, inspection, and one sheep simplification edit, not manual brush touch-up. The agent can perform that same loop. Do not promise every generation is usable on its first attempt or that independent hero layers align automatically.

## Tokens, heroes, and supporting paper

Action tokens use four generated cutouts: coral crossed swords, teal speech bubble, gold magnifying glass, and green heart. Use `TokenArtwork` for the hand, placed coin, and floating drag preview. Labels, selected outlines and existing button gestures stay in HTML; the image never receives pointer events. Load failures retain an icon and the accessible button label.

Customizable heroes retain native SVG layers with heavy near-black outlines and flat fills. Following feedback that limbs and faces felt too linear, the bodies now use hand-shaped uneven curves, distinct gestures, mitten hands and bent legs with oversized boots. Four eye expressions and four nose choices include side-eye and a little snout. All 24 files, including the three matching body masks, preserve the 256×256 canvas and existing saved IDs. This keeps future supplied parts replaceable and body colors functional.

The user explicitly requested subtle background texture. `public/art/paper-cork.png` is the exception to the no-texture rule for foreground art: pale paper with sparse low-contrast blocky flecks, repeated behind the app at 640px and softened by a cream wash. Keep cards and controls opaque and readable. No black outlines, realistic lighting or conspicuous stains in the background. Generation prompts and the resource list are in [tokens-paper-prompts.json](tokens-paper-prompts.json).
