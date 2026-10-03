"""Register reviewed replacements and authored flipbooks. This changes metadata only."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[4]
refs = root / '.agents/skills/dropinn-art/references'
manifest_path = refs / 'gemward-v2-prompts.json'
inventory_path = refs / 'asset-inventory.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
inventory = json.loads(inventory_path.read_text(encoding='utf-8'))
repairs = {}
for name in ('gemward-style-repair-environments.json', 'gemward-style-repair-cutouts.json'):
    document = json.loads((refs / name).read_text(encoding='utf-8'))
    for asset in document['assets']:
        references = asset.get('reference', asset.get('references', []))
        relative_references = [Path(reference).relative_to(root).as_posix() if Path(reference).is_absolute() else reference for reference in references]
        qa = asset.get('qa', {})
        repairs[asset['id']] = {**asset, 'reference': relative_references, 'transparent': asset['alpha'],
            'review': asset.get('review') or ' '.join(str(value) for value in qa.values()),
            'repairProvenance': f'.agents/skills/dropinn-art/references/{name}'}

for index, old in enumerate(manifest['assets']):
    replacement = repairs[old['id']]
    if old['source'] != replacement['source']:
        manifest['drafts'].append({**old, 'id': old['id'] + '-before-style-repair', 'status': 'Superseded after the user identified art-style drift. Original tool source retained.'})
    manifest['assets'][index] = {**old, **replacement}
manifest['style'] = 'Original DropInn sheep/wolves and approved hero A: sparse crude MS Paint shapes, irregular black raster contours and restrained broad fills. Environments match stage-village. Polished lighting, perspective and RPG-detail variants are superseded.'
manifest['status'] = 'All twenty replacement assets integrated and visually reviewed; see current art-polish verification for live results.'
if 'integrationReview' in manifest and 'previousIntegrationReview' not in manifest:
    manifest['previousIntegrationReview'] = manifest.pop('integrationReview')

flipbooks = json.loads((refs / 'flipbook-prompts.json').read_text(encoding='utf-8'))
for asset in flipbooks['assets']:
    asset['review'] = 'Eight distinct drawn frames reviewed at source size and through the real CSS atlas player on pale paper and dark backgrounds. Visible ink stays within every cell; no neighboring frame appears. Original alpha is preserved, including generator alpha1–4 noise outside ink. Exact PNG/WebP RGBA equality verified. Loading, reduced motion, hidden state and failed-image recovery verified separately in output/playwright/flipbook-loading.json; confirmed event integration is recorded in docs/gemward-art-polish.md.'

for asset in manifest['assets'] + flipbooks['assets']:
    prompt_file = '.agents/skills/dropinn-art/references/flipbook-prompts.json' if asset['id'].startswith('flipbook-') else '.agents/skills/dropinn-art/references/gemward-v2-prompts.json'
    entry = {
        'id': asset['id'], 'purpose': asset['purpose'], 'file': asset['file'], 'runtimeFile': asset['runtimeFile'],
        'reference': asset['reference'][0], 'promptFile': prompt_file, 'generator': asset['generator'],
        'generatedSource': Path(asset['source']).name, 'width': asset['width'], 'height': asset['height'],
        'alpha': asset['transparent'], 'sha256': asset['sha256'], 'runtimeSha256': asset['runtimeSha256'],
        'runtimeEncoding': asset['runtimeEncoding'], 'review': asset['review'],
    }
    index = next((i for i, current in enumerate(inventory['assets']) if current['id'] == entry['id']), None)
    if index is None:
        inventory['assets'].append(entry)
    else:
        inventory['assets'][index] = entry
for path, data in ((manifest_path, manifest), (inventory_path, inventory), (refs / 'flipbook-prompts.json', flipbooks)):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f"Registered {len(repairs)} replacements and {len(flipbooks['assets'])} eight-frame atlases; original prompt/source history retained.")
