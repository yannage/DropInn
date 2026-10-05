"""Copy selected generated originals and encode exact lossless runtime derivatives. No art edits."""
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[4]
manifest_path=root/'.agents/skills/dropinn-art/references/avalon-world-prompts.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
for asset in manifest['assets']:
    source=Path(asset['selectedSource'])
    dest=root/asset['file']
    if dest.exists():
        assert dest.read_bytes()==source.read_bytes(),f'Unexpected existing source: {dest}'
    else:
        shutil.copyfile(source,dest)
    runtime=root/asset['runtimeFile']
    with Image.open(dest) as image:
        rgba=image.convert('RGBA')
        image.save(runtime,'WEBP',lossless=True,exact=True,method=6)
        with Image.open(runtime) as encoded:
            assert rgba.tobytes()==encoded.convert('RGBA').tobytes()
            assert image.size==encoded.size
        alpha=rgba.getchannel('A')
        asset.update(width=image.width,height=image.height,alpha=asset['kind']=='cutout',alphaExtrema=list(alpha.getextrema()),visibleAlphaBounds=alpha.point(lambda a:255 if a>=10 else 0).getbbox())
    asset['sha256']=hashlib.sha256(dest.read_bytes()).hexdigest()
    asset['runtimeSha256']=hashlib.sha256(runtime.read_bytes()).hexdigest()
    asset['runtimeEncoding']='Pillow lossless WebP, exact=True; full canvas and every decoded RGBA byte verified equal to preserved original PNG.'
    print(asset['id'],asset['width'],asset['height'],asset['alphaExtrema'])
manifest['referenceHashes']={ref:hashlib.sha256((root/ref).read_bytes()).hexdigest() for ref in manifest['references']}
manifest_path.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')

