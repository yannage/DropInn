import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const batch = JSON.parse(await readFile(new URL('../references/mosswater-rewards-states-prompts.json', import.meta.url), 'utf8'));
const rows = await Promise.all(batch.assets.map(async asset => {
  const src = `data:image/webp;base64,${(await readFile(resolve(root, asset.runtimeFile))).toString('base64')}`;
  return `<section id="${asset.id}"><h2>${asset.id}</h2><div class="samples">${[256, 128, 64, 48].map(size => `<figure>${['light', 'dark'].map(background => `<div class="${background}" style="width:${size}px;height:${size}px"><img src="${src}"></div>`).join('')}<figcaption>${size}px</figcaption></figure>`).join('')}</div></section>`;
}));
const out = resolve(root, 'output/playwright');
await mkdir(out, { recursive: true });
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Mosswater rewards and state art</title><style>body{margin:16px;background:#e7ddc4;color:#26322c;font:14px system-ui}section{margin-bottom:16px;padding:12px;background:#fff4d6}h2{font-size:18px;margin:0 0 12px}.samples{display:flex;gap:16px;align-items:flex-start}figure{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:0}figcaption{grid-column:span 2;font-size:12px}.light{background:#fff4d6}.dark{background:#20352f}img{display:block;width:100%;height:100%;object-fit:contain}</style>${rows.join('')}</html>`;
await writeFile(resolve(out, 'mosswater-reward-art-review.html'), html);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1130, height: 500 }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
  for (const asset of batch.assets) await page.locator(`#${asset.id}`).screenshot({ path: resolve(out, `${asset.id}-review.png`) });
} finally { await browser.close(); }
console.log(`Wrote 256/128/64/48px light/dark review for ${batch.assets.length} reward/state cutouts.`);
