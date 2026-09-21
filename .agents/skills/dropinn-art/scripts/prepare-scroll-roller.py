"""Prepare the standalone generated roller; preserve its source alongside the runtime art."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[4]
source = Image.open(root / 'public/art/ui-scroll-roller-source.png').convert('RGBA')
# Remove only the generator's almost-transparent fringe, not the opaque outline.
alpha = source.getchannel('A').point(lambda value: 0 if value <= 16 else value)
source.putalpha(alpha)
# Whole silhouette plus at least 16px of clear air on all four sides.
roller = source.crop((64, 240, 2108, 480))
assert roller.getchannel('A').getbbox() == (16, 21, 2028, 219)
roller.save(root / 'public/art/ui-scroll-roller.png')
roller.save(root / 'public/art/ui-scroll-roller.webp', 'WEBP', lossless=True, exact=True, method=6)
assert roller.tobytes() == Image.open(root / 'public/art/ui-scroll-roller.webp').convert('RGBA').tobytes()
