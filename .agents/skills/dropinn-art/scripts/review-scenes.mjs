import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const batch = JSON.parse(await readFile(new URL('../references/scene-stage-prompts.json', import.meta.url), 'utf8'));
const rows = await Promise.all(batch.assets.map(async asset => {
  const bytes = await readFile(resolve(root, asset.file));
  const src = `data:image/png;base64,${bytes.toString('base64')}`;
  if (asset.id.startsWith('stage-')) return `<section class="stage"><h2>${asset.id}</h2><div class="crops"><img data-asset="${asset.id}" src="${src}"><img class="portrait" src="${src}"></div></section>`;
  return `<section><h2>${asset.id}</h2><div class="samples">${[128, 64, 48].map(size => `<div class="pair">${['light', 'dark'].map((background, i) => `<div class="${background}" style="width:${size}px;height:${size}px"><img ${size === 128 && i === 0 ? `data-asset="${asset.id}"` : ''} src="${src}"></div>`).join('')}</div>`).join('')}</div></section>`;
}));
await mkdir(resolve(root, 'output/playwright'), { recursive: true });
await writeFile(resolve(root, 'output/playwright/scene-art-review.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>DropInn scene art review</title><style>body{margin:20px;color:#26322c;background:#e7ddc4;font:14px system-ui}main{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}section{border:1px solid #99907a;padding:10px;background:#f3e9d0}h2{font-size:14px;margin:0 0 8px}.samples{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.pair{display:flex;gap:6px}.light{background:#fff4d6}.dark{background:#20352f}img{display:block;width:100%;height:100%;object-fit:contain}.stage{grid-column:span 3}.crops{display:flex;gap:12px;height:150px}.crops img{width:225px}.crops .portrait{width:100px;object-fit:cover}</style><h1>Scene plates and state cutouts</h1><p>Full crop and portrait crop; cutouts at 128px, 64px and 48px on parchment and dark backgrounds.</p><main>${rows.join('')}</main></html>`);
console.log(`Wrote output/playwright/scene-art-review.html for ${batch.assets.length} images.`);
