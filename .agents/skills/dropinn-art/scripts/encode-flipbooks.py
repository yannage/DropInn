"""Encode authored sprite sheets without changing, resizing, or redrawing any source pixel."""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[4]
manifest_path = root / '.agents/skills/dropinn-art/references/flipbook-prompts.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
for asset in manifest['assets']:
    source, destination = root / asset['file'], root / asset['runtimeFile']
    with Image.open(source) as image:
        rgba = image.convert('RGBA')
        assert image.size == (asset['width'], asset['height'])
        alpha = rgba.getchannel('A')
        assert alpha.getextrema()[0] == 0 and alpha.getextrema()[1] >= 250
        cell_width, cell_height = image.width // asset['columns'], image.height // asset['rows']
        bounds = []
        for frame in range(asset['frames']):
            x, y = frame % asset['columns'] * cell_width, frame // asset['columns'] * cell_height
            cell = alpha.crop((x, y, x + cell_width, y + cell_height))
            # Inspect visible ink separately from the generator's alpha1–4 edge noise.
            # This threshold is QA only: original alpha and RGB are never modified.
            visible = cell.point(lambda value: 255 if value > 16 else 0).getbbox()
            assert visible and visible[0] > 12 and visible[1] > 12 and visible[2] < cell_width - 12 and visible[3] < cell_height - 12, (asset['id'], frame, visible)
            bounds.append(visible)
        image.save(destination, 'WEBP', lossless=True, exact=True, method=6)
        with Image.open(destination) as encoded:
            assert rgba.tobytes() == encoded.convert('RGBA').tobytes()
        asset.update(sha256=hashlib.sha256(source.read_bytes()).hexdigest(), runtimeSha256=hashlib.sha256(destination.read_bytes()).hexdigest(), alphaExtrema=alpha.getextrema(), visibleFrameBounds=bounds, runtimeEncoding='Lossless WebP; full dimensions and exact RGBA pixels verified against original PNG. No crop, resize, recolor or alpha cleanup.')
        print(f"{asset['id']}: eight intact cells, exact RGBA, {destination.stat().st_size} bytes")
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
