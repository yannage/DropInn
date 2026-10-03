"""Lossless Gemward v2 format conversion and metadata; never redraw or resize sources."""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[4]
references = root / '.agents/skills/dropinn-art/references'
manifest = json.loads((references / 'gemward-v2-prompts.json').read_text(encoding='utf-8'))
inventory_path = references / 'asset-inventory.json'
inventory = json.loads(inventory_path.read_text(encoding='utf-8'))
summary = []
for asset in manifest['assets']:
    source = root / asset['file']
    if not source.exists():
        continue
    destination = root / asset['runtimeFile']
    with Image.open(source) as original:
        rgba = original.convert('RGBA')
        original.save(destination, 'WEBP', lossless=True, exact=True, method=6)
        with Image.open(destination) as encoded:
            assert original.size == encoded.size
            assert rgba.tobytes() == encoded.convert('RGBA').tobytes(), source
        alpha = rgba.getchannel('A')
        extrema = alpha.getextrema()
        bounds = alpha.getbbox()
        if asset['transparent']:
            assert extrema == (0, 255), (asset['id'], extrema)
            assert bounds and bounds[0] > 0 and bounds[1] > 0 and bounds[2] < rgba.width and bounds[3] < rgba.height, (asset['id'], bounds)
        else:
            assert extrema == (255, 255), (asset['id'], extrema)
        entry = {
            'id': asset['id'], 'purpose': asset['purpose'], 'file': asset['file'],
            'reference': asset['reference'][0],
            'promptFile': '.agents/skills/dropinn-art/references/gemward-v2-prompts.json',
            'generator': asset['generator'], 'generatedSource': Path(asset['source']).name,
            'width': original.width, 'height': original.height, 'alpha': asset['transparent'],
            'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'runtimeFile': asset['runtimeFile'],
            'runtimeSha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
            'runtimeEncoding': 'Lossless WebP; full dimensions and exact RGBA pixels verified against PNG source.',
            'review': asset.get('review', 'Viewed generated full-size output for subject, style, empty environment or complete cutout silhouette. Crop/thumbnail and live UI review pending.'),
        }
        index = next((i for i, item in enumerate(inventory['assets']) if item['id'] == asset['id']), None)
        if index is None:
            inventory['assets'].append(entry)
        else:
            inventory['assets'][index] = entry
        summary.append({'id': asset['id'], 'size': original.size, 'alpha': extrema, 'bounds': bounds, 'webpBytes': destination.stat().st_size})
inventory_path.write_text(json.dumps(inventory, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps(summary, separators=(',', ':')))
