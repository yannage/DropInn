# Drop Inn — tavern sign logo kit, v1

Start with **previews/logo-kit.png** for the logo family, or **index.html** for the complete local gallery and downloads. The editable master is **svg/drop-inn-master.svg**. Upload the matching file from **png/** for printing.

## Choose a version

| File stem | Intended use |
| --- | --- |
| `drop-inn-light` | Full color on white, cream, or other pale fabric |
| `drop-inn-dark` | Full color with a cream perimeter for black and dark fabric |
| `drop-inn-black-only` | One black ink; transparent interior areas show the garment |
| `drop-inn-cream-only` | One cream ink for dark fabric; transparent interior areas show the garment |

Every stem has a second version ending in `-website`, which adds the hanging **playdropinn.com** plaque. Each has an SVG and a corresponding `-10in-300ppi.png` export. The master duplicates the full-color light-fabric website version for a convenient editing starting point.

## Size and placement

- All eight print PNGs are **3000 pixels wide**, with **300 PPI metadata**, an embedded **sRGB ICC profile**, and actual alpha transparency. At 300 PPI the canvas is **10 inches wide**. It is tightly fitted, with about 0.02 inch of transparent safety margin per edge.
- The name-only full-color designs are approximately **10 × 7.2 inches**. Website versions are approximately **10 × 9 inches**. Exact dimensions are in `export-manifest.json`.
- Use the **name-only** design for a **3.5-inch-wide** small placement. The included 3000-pixel export can be placed smaller without loss of detail. Keep the website plaque for larger chest prints; it was visually reviewed at 10 inches, not approved as tiny text on fabric.
- Leave clear space around the mark equal to at least **5% of its width**: 0.5 inch at 10 inches, or about 0.18 inch at 3.5 inches. This is placement space outside the tightly fitted file canvas.
- Preserve proportions. Do not stretch, crop the hanging beam, separate the lettering from the sign, or recolor individual letters. Use the dark-fabric version when the ink-colored edge would disappear.
- For a larger print, render a new PNG from the SVG at `desired width in inches × 300` pixels. Do not enlarge a PNG and merely change its DPI label.

## Printful handoff

The files follow Printful's general transparent-PNG and sRGB guidance, checked on September 26, 2026: [Printful print-file guidelines](https://help.printful.com/hc/en-us/articles/50264019148177-How-should-I-prepare-my-print-file-for-the-best-results).

**One shirt was created and verified in Printful on September 26, 2026:** “Drop Inn Tavern Sign Tee — Ivory,” Comfort Colors 1717, DTG front, sizes S–4XL, in the “DroppInn merch” store. The selected product's guidelines specify a 12 × 16 inch front area. The light-fabric website PNG was placed at 10 × 8.95 inches; Design Maker reported **Good / 300 DPI**. All seven variants are synced. See `printful-product.json` for the product link and saved configuration. No order was placed or physical sample inspected.

Other garments and placements still need their own template checks. A hoodie needs enough vertical room above its pocket; the name-only mark is the better starting point. A physical sample is the way to verify fabric color and print feel.

The cream-shirt and black-hoodie images are **AI-generated illustrative mockups**, not Printful product photographs, guaranteed scale measurements, or production proofs. They must not be uploaded as print files. Final production artwork is in `svg/` and `png/`. This kit does not contain embroidery stitch files or digitization.

## Palette and editing

| Color | sRGB hex | Role |
| --- | --- | --- |
| Ink | `#161A16` | Structure, contours, doorway interior |
| Cream | `#FFF4D6` | Lettering and dark-fabric perimeter |
| Mustard | `#E6B84A` | Beam, straps, doorway, welcome marks |
| Moss | `#64784B` | Main board and optional website plaque |
| Single-ink black | `#000000` | Black-only variant |

The SVGs contain real vector paths, named groups, and editable strokes. All lettering is outlined: **no installed fonts, embedded bitmap, external image, filter, or network resource is needed**. Font-like title and URL shapes were traced from the original generated lettering and cleaned into spline paths. Structural sign and doorway shapes were redrawn as editable paths. Open the SVG in any compatible vector editor. Preview captions use a system font; it is not part of the print logo.

## Files and provenance

- `source/`: original generated concept, exact generation prompts, and extracted lettering paths.
- `svg/`: editable master plus all eight variants.
- `png/`: final transparent print exports only.
- `previews/`: logo sheet, all-variant review, relative-size review, and illustrative garment mockups.
- `export-manifest.json`: dimensions, color/alpha checks, path counts, and ink bounds.
- `provenance.json`: generation sources, vector-conversion steps, hashes, and review boundaries.
- `printful-product.json`: subsequently saved shirt configuration and Printful verification record.
- `scripts/`: reproducible vector construction and exports, separate from application code.

Rebuild vectors with Python + Pillow + numpy + `vtracer==0.6.15` using `scripts/build_vectors.py`. Its optional `--tools` argument accepts an isolated dependency directory. Render with Node.js + `sharp` using `scripts/export.mjs`; `SHARP_MODULE` may point to an installed sharp package. The export script renders straight from vector at output resolution and verifies alpha, embedded sRGB, 300 PPI, unclipped edges, and single-ink variants. Direct SVG edits should be exported without rerunning vector construction, which recreates the SVGs.

Reviewed: exact visible brand and URL spelling; flat palette; full-size edges; light/dark contrast; all eight variants; relative 10-inch and 3.5-inch layouts; transparent gaps; and both garment illustrations. The Ivory Comfort Colors 1717 placement was subsequently checked in Printful and saved as a product. No physical print was inspected, no order placed, and no website integration or external storefront publication performed.
