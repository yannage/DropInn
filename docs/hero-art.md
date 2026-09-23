# Hero artwork and customization

The V2 builder uses `src/lib/cosmetics.ts` as its catalog and `HeroAvatar` as its shared renderer. Body, eyes, nose, mouth, and hat are independent layers. The legacy builder remains available unchanged.

## Replace a drawing

1. Make a transparent PNG or SVG on a **256 × 256 canvas**. Start with [the alignment template](../public/heroes/alignment-template.svg). Keep the full canvas when exporting; do not trim transparent margins.
2. Put the exported file in `public/heroes/`. SVGs must be self-contained: no scripts, external fonts, or embedded remote references.
3. Change the matching catalog entry's `art.src`, or replace the file at its existing path. Keep the entry's `id` unchanged so saved heroes keep their selection.

For example, replace the wide-eye entry with:

```ts
{ id: 'wide', label: 'Wide eyes', art: { src: '/heroes/my-wide-eyes.png' } }
```

No builder code or save migration is necessary. The renderer supports the same source types for every layer. Use optional `x`, `y`, `width`, and `height` in `art` for artwork exported on another canvas; they apply to both the image and its tint mask. Transparent, full-canvas exports are easiest to align.

## Alignment and color

- Canvas: 256 × 256; all parts are front-facing.
- Torso: approximately x 50–205, y 82–208. Gesturing hands extend to x 22–238; boots end near y 244.
- Hat brim: y 85–100, centered at x 128. Hat tips stay above the eyes and inside the canvas.
- Eyes: centers near (98, 132) and (157, 132).
- Nose: center near (128, 148). Mouth: approximately x 105–152, y 163–186.
- Layer order: body → eyes → nose → mouth → hat.

A tintable body uses **two files**: `art.maskSrc` is an opaque silhouette on transparency; `art.src` contains outlines, feet, and other details over a transparent interior. The renderer fills the silhouette with the saved hero color, then draws details over it. PNG alpha and SVG transparency both work. A single precolored body file can omit `maskSrc`, but then it will not change color with the palette.

Art must read at both a 256px preview and a small table avatar. Use strong silhouettes, chunky outlines, simple expressions, and generous gaps. Face thumbnails crop to the face area; wardrobe thumbnails show the upper part of the shared canvas. Check all six bodies when replacing a hat.

The current native drawings use flat fills, heavy near-black outlines, hand-shaped uneven curves, lopsided silhouettes, mitten hands, bent legs, oversized boots, and crooked hats. Six body shapes range from Bean, Round, and Squish to Pear, Puff, and Lanky, with distinct arm poses and silhouettes. Seven eye expressions, six nose choices, and six mouths give distinct combinations. Body tint masks include the limbs; the outline layer masks overlapping limb roots behind the torso. The full canvas and existing IDs remain unchanged. Keep the face/hat layers independent; do not flatten a hero into one raster sprite or introduce shading when replacing parts.

## Catalog and saves

The shared renderer adds a static, stepped pencil-edge displacement to the assembled hero and wardrobe previews. It roughens contours without adding shaded fills or animated noise. Apply it to the composite, never independently to the body and tint mask, to avoid seams. The fixed seed keeps expressions stable; SVG sources and saved customization IDs remain unchanged. The effect is deliberately subtle at 48–64px and most visible in the larger builder preview.

Pencil-effect review: inspected the actual renderer's six bodies, eye and mouth rows at large/64/48px on parchment and dark backgrounds, plus the body/hat and body/color matrix. No source assets or hashes changed. This was a local Chromium visual review, not a hosted or physical-phone performance test.

`appearance` stores body/eyes/nose/mouth IDs; `equipment.hat` stores a hat ID or explicit `null` for no hat. Missing fields on older heroes receive defaults. Invalid face IDs receive defaults; invalid or unowned hats are unequipped. The existing `accent` is the body color. There are no cosmetic stat modifiers.

All four class-themed hats are available to everyone. The other three are derived from exact existing keepsake strings in `inventory`, so existing players receive their unlocks automatically and repeated rewards cannot duplicate hats. Do not rename those strings without a compatibility migration. Earning a hat never equips it automatically.

The draft only becomes the saved hero after Save succeeds. Appearance is pinned for an adventure, including rejoining it; edits between visits apply when entering a new adventure.

## Deploy and verify

Apply `supabase/migrations/202609200001_hero_customization.sql` **before deploying** the new client/server. It adds nullable JSON columns, preserves existing rows, and is safe to rerun. Existing row ownership policies remain in force. Identity updates write appearance/equipment but never overwrite XP or keepsake inventory.

Run `npm test`, `npm run build`, and `node scripts/test-database.mjs <disposable-dropinn-container>`. The database script requires a fresh disposable Postgres container and must never target a hosted project. Check the builder at desktop and mobile widths, verify an old hero and a returning player with keepsakes, save/reload, Cancel, and join/rejoin behavior.
