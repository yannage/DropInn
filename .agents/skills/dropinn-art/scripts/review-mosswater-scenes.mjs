import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const batch = JSON.parse(await readFile(new URL('../references/mosswater-scenes-prompts.json', import.meta.url), 'utf8'));
const rows = await Promise.all(batch.assets.map(async asset => {
  const bytes = await readFile(resolve(root, asset.runtimeFile));
  const src = `data:image/webp;base64,${bytes.toString('base64')}`;
  return `<section id="${asset.id}"><h2>${asset.id}</h2><div class="crops"><figure><img class="full" src="${src}"><figcaption>Full 3:2 composition</figcaption></figure><figure><img class="portrait" src="${src}"><figcaption>Center portrait crop</figcaption></figure><figure><img class="wide" src="${src}"><figcaption>Wide table crop at vertical 25%</figcaption></figure></div><div class="thumbs">${[128, 64, 48].map(size => `<figure><img width="${size}" height="${Math.round(size / 1.5)}" src="${src}"><figcaption>${size}px</figcaption></figure>`).join('')}</div></section>`;
}));
const out = resolve(root, 'output/playwright');
await mkdir(out, { recursive: true });
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Mosswater scene crop review</title><style>body{margin:16px;background:#26322c;color:#26322c;font:14px system-ui}section{margin-bottom:16px;padding:12px;background:#fff4d6}h2{font-size:18px;margin:0 0 12px}.crops{display:flex;gap:12px;align-items:flex-start}figure{margin:0}figcaption{font-size:12px;padding-top:4px}img{display:block;object-fit:cover}.full{width:330px;height:220px}.portrait{width:147px;height:220px}.wide{width:390px;height:210px;object-position:50% 25%}.thumbs{display:flex;gap:12px;margin-top:12px;align-items:flex-start}</style>${rows.join('')}</html>`;
await writeFile(resolve(out, 'mosswater-scene-art-review.html'), html);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 970, height: 500 }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
  for (const asset of batch.assets) await page.locator(`#${asset.id}`).screenshot({ path: resolve(out, `${asset.id}-review.png`) });
} finally { await browser.close(); }
console.log(`Wrote full/portrait/table crop review for ${batch.assets.length} scene plates.`);
