"""Format-only encoding and a QA contact sheet; preserves exact source pixels."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[4]
sources = sorted((root / 'public/art').glob('story-*.png')) + [root / f'public/art/stage-{name}.png' for name in ['teacup', 'tomorrow', 'orchard']]
inventory_path = root / '.agents/skills/dropinn-art/references/asset-inventory.json'
inventory = json.loads(inventory_path.read_text(encoding='utf-8'))
sheet = Image.new('RGB', (800, ((len(sources)+4)//5)*180), '#fff4d6')
draw = ImageDraw.Draw(sheet)
for index, source in enumerate(sources):
    with Image.open(source) as original:
        rgba = original.convert('RGBA')
        destination = source.with_suffix('.webp')
        original.save(destination, 'WEBP', lossless=True, exact=True, method=6)
        with Image.open(destination) as encoded:
            assert rgba.tobytes() == encoded.convert('RGBA').tobytes(), source
        if source.name.startswith('story-'):
            assert rgba.getchannel('A').getextrema() == (0,255), source
            bounds = rgba.getchannel('A').point(lambda a: 255 if a > 240 else 0).getbbox()
            assert bounds and bounds[0] > 0 and bounds[1] > 0 and bounds[2] < rgba.width and bounds[3] < rgba.height, source
        preview = rgba.copy(); preview.thumbnail((128,128))
        x, y = index % 5 * 160, index // 5 * 180
        sheet.paste(preview, (x+(160-preview.width)//2,y), preview)
        draw.text((x+3,y+132),source.stem.replace('story-','').replace('stage-',''),fill='#26322c')
        for size, color, dx in [(48,'#fff4d6',0),(48,'#26322c',65)]:
            tiny = rgba.copy(); tiny.thumbnail((size,32)); sheet.paste(Image.new('RGB',(60,32),color),(x+dx,y+147)); sheet.paste(tiny,(x+dx,y+147),tiny)
        prompt = root / f'.agents/skills/dropinn-art/references/generated/{source.stem}.json'
        entry = dict(id=source.stem, purpose='Playable story stage or target', file=source.relative_to(root).as_posix(), width=rgba.width,height=rgba.height,alpha=source.name.startswith('story-'),sha256=hashlib.sha256(source.read_bytes()).hexdigest(),generator='Codex built-in imagegen',review='Alpha, unclipped opaque bounds and exact-pixel lossless conversion checked; visual review recorded in playable-adventures evidence.',runtimeFile=destination.relative_to(root).as_posix(),runtimeSha256=hashlib.sha256(destination.read_bytes()).hexdigest(),runtimeEncoding='Lossless WebP; exact RGBA equality verified against retained PNG.')
        if prompt.exists(): entry['promptFile']=prompt.relative_to(root).as_posix()
        else: entry['review'] += ' Generated before shutdown; source retained, prompt recovery recorded separately.'
        inventory['assets']=[item for item in inventory['assets'] if item['id'] != source.stem]+[entry]
inventory_path.write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(root / 'output/playwright').mkdir(parents=True,exist_ok=True)
sheet.save(root / 'output/playwright/story-art-review.png')
print(f'Encoded and checked {len(sources)} story assets.')
