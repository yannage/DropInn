import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const batch = JSON.parse(await readFile(new URL('../references/gemward-v2-prompts.json', import.meta.url), 'utf8'));
const sections = { environment: [], cutout: [] };
for (const asset of batch.assets) {
  const src = `data:image/webp;base64,${(await readFile(resolve(root, asset.runtimeFile))).toString('base64')}`;
  const samples = asset.kind === 'environment'
    ? `<div class="crops"><img src="${src}"><img class="portrait" src="${src}"></div>`
    : `<div class="samples">${[128, 64, 48].map(size => `<div class="pair">${['light', 'dark'].map(background => `<div class="${background}" style="width:${size}px;height:${size}px"><img src="${src}"></div>`).join('')}</div>`).join('')}</div>`;
  sections[asset.kind === 'environment' ? 'environment' : 'cutout'].push(`<section><h2>${asset.id}</h2>${samples}</section>`);
}
await mkdir(resolve(root, 'output/playwright'), { recursive: true });
for (const [kind, rows] of Object.entries(sections)) {
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Gemward v2 ${kind} review</title><style>body{margin:18px;color:#26322c;background:#e7ddc4;font:14px system-ui}main{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}section{border:1px solid #99907a;padding:10px;background:#f3e9d0}h2{font-size:14px;margin:0 0 8px}.samples{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.pair{display:flex;gap:6px}.light{background:#fff4d6}.dark{background:#20352f}img{display:block;width:100%;height:100%;object-fit:contain}.crops{display:flex;gap:10px;height:190px}.crops img{width:285px}.crops .portrait{width:130px;object-fit:cover;object-position:center}</style><h1>Gemward v2 ${kind} review</h1><p>Environments: 3:2 and central portrait crops. Cutouts: 128, 64 and 48 pixels on parchment and dark surfaces.</p><main>${rows.join('')}</main></html>`;
  await writeFile(resolve(root, `output/playwright/gemward-v2-${kind}-review.html`), html);
}
console.log(`Prepared environment and cutout review pages for ${batch.assets.length} assets.`);
