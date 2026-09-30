# Hero raster conversion — user-approved style A

## Scope and approval

The user selected blue-hero-A as the best style and clarified that the intended work is converting the customizable player heroes from native SVG artwork to matching MS Paint raster artwork. NPCs, wolves, sheep, story characters, props and scenes are outside this batch. Cancel the mistaken hero-align-* jobs; preserve their saved attempts only as history.

Approved visual anchor: `../assets/hero-style-a.png`. The original `public/art/sheep.png` and `public/art/shadow-pack.png` are supporting style references. The earlier phone screenshots and rejected blue sample are no longer primary references. Approval is for style A, not every new part or a flattened production hero.

## Repeatable prompt core

Match the approved A image's coarse MS Paint raster drawing: blunt irregular black outlines with small natural jagged steps, slightly variable weight, awkward asymmetry, off-center simple features and broad restrained fills. Keep its balance of chunky shapes and readable edges. Do not progressively increase wobble, thicken every contour, or reinterpret it as a smooth mascot. Match the actual reference more closely than adjectives. Preserve the source part's identity, expression, placement and function. Generate one isolated transparent part on the complete shared square canvas; include only the requested part. No other layers, text, alignment guides, scene or UI.

Use the same approved A file for every call, not the most recent generated part as a drifting style reference. For targeted corrections, capture the prior attempt as editTarget and preserve everything outside the correction. Record exact prompt, reference hashes, source output and review.

## Queue output and production handoff

The queue's single-image jobs produce raster art masters for each visible component. These must remain separate parts. A whole-character reference is only a reference; never flatten the hero customization into a fixed image. The SVG source for each job and `public/heroes/alignment-template.svg` specify geometry, not the drawing style. Render/inspect the source before prompting; source SVGs need raster previews if used as imagegen image inputs.

Use `docs/hero-art.md` for the 256×256 production alignment: body approximately x50–205/y82–208, hands x22–238, boots to y244; eyes around (98,132)/(157,132), nose (128,148), mouth x105–152/y163–186; hat brim y85–100. Translate coordinates proportionally for larger generated masters. Do not crop or independently recenter parts. Generation may return a larger canvas; report source dimensions honestly. Never call a raw master production-ready solely because it passes standalone thumbnail QA.

Start with the Bean body, Curious eyes, Round nose, Little gasp mouth and Spellbound hat, then remaining catalog entries. Check those first five together for scale and face/hat placement before expanding the same alignment recipe. If a part cannot align, correct it within the attempt budget and report the concrete failure.

Production conversion work after generation:

- Export aligned transparent 256×256 PNGs without trimming the common canvas; preserve original masters.
- For each body derive a matching color silhouette mask and detail/outline image, plus the bare-footwear detail variant used when shoes are equipped. Masks must match their drawing; do not independently invent another silhouette. Keep tintable interiors transparent in the detail layer.
- Preserve the no-nose option as an empty transparent layer; no image generation needed.
- Preserve separate hair, eyes, nose, mouth, shoes and hat layers and optional shepherd feather.
- Preserve palette masks/outlines for Shepherd, Teacup and Lantern hats and Ruby shoes. These are technical derivatives of the matching master, not separate creative jobs.
- Keep all catalog IDs, unlock conditions, reward strings, saved colors and placement semantics. PNG layers already work in HeroAvatar; the SVG composition container need not be removed.
- Update catalog sources plus HeroAvatar's hardcoded body-*-bare.svg and ruby shoe paths when integrating. Evaluate its existing pencil displacement with raster art so it does not apply extra distortion accidentally. This is integration work, not completed by draft queue review.
- Use the existing native hero review matrix for body/hat/color combinations at 256/64/48px. Check face alignment, tint seams, hair overlap, custom shoes, palette hats, transparency and clipping. Complete relevant build/tests and hero save/reload checks when integration occurs.

The worker's ready-for-review status means the generated master passed visual draft checks. Track production derivatives and integration separately; never imply draft status proves tint masks or live rendering.
