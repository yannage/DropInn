"""Lossless format conversion only; preserve originals, canvas and every RGBA pixel."""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[4]
references = root / '.agents/skills/dropinn-art/references'
batch = json.loads((references / 'scene-stage-prompts.json').read_text(encoding='utf-8'))
inventory_path = references / 'asset-inventory.json'
inventory = json.loads(inventory_path.read_text(encoding='utf-8'))
original_bytes = encoded_bytes = 0
for asset in batch['assets']:
    source = root / asset['file']
    destination = source.with_suffix('.webp')
    with Image.open(source) as image:
        image.save(destination, 'WEBP', lossless=True, exact=True, method=6)
        with Image.open(destination) as encoded:
            assert image.size == encoded.size
            assert image.convert('RGBA').tobytes() == encoded.convert('RGBA').tobytes(), source
    original_bytes += source.stat().st_size
    encoded_bytes += destination.stat().st_size
    entry = next(item for item in inventory['assets'] if item['id'] == asset['id'])
    entry['runtimeFile'] = destination.relative_to(root).as_posix()
    entry['runtimeSha256'] = hashlib.sha256(destination.read_bytes()).hexdigest()
    entry['runtimeEncoding'] = 'Lossless WebP; full dimensions and exact RGBA pixels verified against PNG source.'
inventory_path.write_text(json.dumps(inventory, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f'{len(batch["assets"])} lossless assets: {original_bytes:,} -> {encoded_bytes:,} bytes ({100 * encoded_bytes / original_bytes:.1f}% of PNG transfer).')
