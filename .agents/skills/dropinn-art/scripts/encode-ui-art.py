"""Format conversion and provenance only: no crop, resize, recoloring or pixel edits."""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[4]
references = root / '.agents/skills/dropinn-art/references'
prompts = json.loads((references / 'ui-tabletop-prompts.json').read_text(encoding='utf-8'))
inventory_path = references / 'asset-inventory.json'
inventory = json.loads(inventory_path.read_text(encoding='utf-8'))
for resource in prompts['resources']:
    source = root / f"public/art/{resource['id']}.png"
    destination = source.with_suffix('.webp')
    with Image.open(source) as image:
        rgba = image.convert('RGBA')
        assert rgba.getchannel('A').getextrema() == (0, 255), source
        bounds = rgba.getchannel('A').getbbox()
        assert bounds[0] > 0 and bounds[1] > 0 and bounds[2] < image.width and bounds[3] < image.height, source
        image.save(destination, 'WEBP', lossless=True, exact=True, method=6)
        with Image.open(destination) as encoded:
            assert rgba.tobytes() == encoded.convert('RGBA').tobytes(), source
        entry = next((item for item in inventory['assets'] if item['id'] == resource['id']), None)
        if entry is None:
            entry = {'id': resource['id'], 'review': 'Generated output inspected full-size; pending in-game thumbnail and frame review.'}
            inventory['assets'].append(entry)
        entry.update(purpose=resource['purpose'], file=source.relative_to(root).as_posix(),
            promptFile='.agents/skills/dropinn-art/references/ui-tabletop-prompts.json',
            generator=prompts['generator'], generatedSource=resource['source'], width=image.width,
            height=image.height, alpha=True, sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
            runtimeFile=destination.relative_to(root).as_posix(), runtimeSha256=hashlib.sha256(destination.read_bytes()).hexdigest(),
            runtimeEncoding='Lossless WebP, original dimensions and exact RGBA equality verified against PNG.')
        print(f"{resource['id']}: {image.size}, alpha bounds {bounds}, {destination.stat().st_size} bytes")
inventory_path.write_text(json.dumps(inventory, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
