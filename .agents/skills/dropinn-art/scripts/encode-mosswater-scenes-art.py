"""Encode the four Mosswater scene plates without changing any source pixels.

Only updates this batch's metadata; the shared asset inventory is merged separately.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[4]
batch_path = root / '.agents/skills/dropinn-art/references/mosswater-scenes-prompts.json'
batch = json.loads(batch_path.read_text(encoding='utf-8'))
for asset in batch['assets']:
    source = root / asset['file']
    destination = root / asset['runtimeFile']
    with Image.open(source) as original:
        original.save(destination, 'WEBP', lossless=True, exact=True, method=6)
        with Image.open(destination) as encoded:
            assert original.size == encoded.size
            assert original.convert('RGBA').tobytes() == encoded.convert('RGBA').tobytes(), source
        asset.update(width=original.width, height=original.height,
                     alpha='A' in original.getbands(),
                     opaque=original.convert('RGBA').getchannel('A').getextrema() == (255, 255))
    asset['sha256'] = hashlib.sha256(source.read_bytes()).hexdigest()
    asset['runtimeSha256'] = hashlib.sha256(destination.read_bytes()).hexdigest()
    asset['runtimeBytes'] = destination.stat().st_size
    asset['runtimeEncoding'] = 'Lossless WebP; full dimensions and exact RGBA pixels verified against PNG source.'
batch_path.write_text(json.dumps(batch, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f"Verified exact RGBA equality for {len(batch['assets'])} scene plates.")
