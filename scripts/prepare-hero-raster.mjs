// Technical production export of the five supplied masters. No image generation.
// Keep the originals and their complete canvas; map them to reviewed shared anchors.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const root = new URL('../', import.meta.url);
const names = ['body-bean', 'eyes-dots', 'nose-button', 'mouth-open', 'hat-wizard'];
const queue = JSON.parse(await readFile(new URL('output/ms-painter/queue.json', root), 'utf8'));
const inputs = [];
for (const name of names) {
  const job = queue.jobs.find(job => job.id === `hero-raster-${name}`);
  if (!job?.selected) throw new Error(`Missing selected master: ${name}`);
  const path = `output/ms-painter/${job.selected}`;
  const bytes = await readFile(new URL(path, root));
  const attempt = job.attempts.find(attempt => attempt.output === job.selected);
  inputs.push({ name, path, sha256: createHash('sha256').update(bytes).digest('hex'),
    generator: attempt.generator, prompt: attempt.prompt, data: `data:image/png;base64,${bytes.toString('base64')}` });
}
const native = {};
for (const variant of ['', '-bare', '-fill']) native[variant || 'detail'] = await readFile(new URL(`public/heroes/body-bean${variant}.svg`, root), 'utf8');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async ({ inputs, native }) => {
    const canvas = () => Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
    const load = async src => { const img = new Image(); img.src = src; await img.decode(); return img; };
    const svg = source => `data:image/svg+xml;base64,${btoa(source)}`;
    // Reviewed opaque bounds, not faint alpha specks, establish the affine transform.
    // Every draw uses the complete master; nothing is trimmed or auto-centered.
    const anchors = { 'body-bean': [63, 80, 190, 209], 'eyes-dots': [77, 112, 177, 150],
      'nose-button': [116, 143, 140, 162], 'mouth-open': [115, 164, 139, 187], 'hat-wizard': [55, 12, 198, 105] };
    const outputs = {}, placements = [];
    let torso;
    for (const input of inputs) {
      const image = await load(input.data);
      const source = document.createElement('canvas'); source.width = image.width; source.height = image.height;
      const ctx = source.getContext('2d'); ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, source.width, source.height);
      let left = source.width, top = source.height, right = 0, bottom = 0;
      for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
        const i = (y * source.width + x) * 4;
        if (pixels.data[i + 3] > 128) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1); }
        // Remove nearly invisible background residue; preserve antialiased contours.
        if (pixels.data[i + 3] < 16) pixels.data[i + 3] = 0;
      }
      ctx.putImageData(pixels, 0, 0);
      const [x, y, r, b] = anchors[input.name];
      const sx = (r - x) / (right - left), sy = (b - y) / (bottom - top);
      const layer = canvas(), target = layer.getContext('2d');
      target.drawImage(source, x - left * sx, y - top * sy, source.width * sx, source.height * sy);
      placements.push({ name: input.name, sourceSize: [source.width, source.height], opaqueBounds: [left, top, right, bottom], anchors: anchors[input.name], transform: [sx, sy, x - left * sx, y - top * sy] });
      if (input.name === 'body-bean') torso = layer;
      else outputs[`${input.name}.png`] = layer.toDataURL();
    }
    // Retain the established Bean gesture and footwear until their raster masters exist.
    // Remove only the native torso, deriving its replacement mask from the supplied alpha.
    const torsoPath = /<path d="M86 104[^>]*\/>/g;
    const detailPixels = torso.getContext('2d').getImageData(0, 0, 256, 256);
    for (let i = 0; i < detailPixels.data.length; i += 4) {
      const p = detailPixels.data;
      // Blue-key separation: retain dark contour, make the flat blue interior tintable.
      p[i + 3] = Math.round(p[i + 3] * (1 - Math.min(1, Math.max(0, (p[i + 2] - p[i]) / 70))));
      p[i] = 0; p[i + 1] = 0; p[i + 2] = 0;
    }
    const outline = canvas(); outline.getContext('2d').putImageData(detailPixels, 0, 0);
    for (const variant of ['detail', '-bare']) {
      const layer = canvas(), ctx = layer.getContext('2d');
      ctx.drawImage(await load(svg(native[variant].replace(torsoPath, ''))), 0, 0);
      ctx.globalCompositeOperation = 'destination-out'; ctx.drawImage(torso, 0, 0);
      ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(outline, 0, 0);
      outputs[variant === 'detail' ? 'body-bean.png' : 'body-bean-bare.png'] = layer.toDataURL();
    }
    const fill = canvas(), ctx = fill.getContext('2d');
    ctx.drawImage(await load(svg(native['-fill'].replace(torsoPath, ''))), 0, 0);
    ctx.drawImage(torso, 0, 0); ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 256, 256);
    outputs['body-bean-fill.png'] = fill.toDataURL();
    return { outputs, placements };
  }, { inputs, native });
  const destination = new URL('public/heroes/raster-v1/', root);
  await mkdir(destination, { recursive: true });
  const assets = [];
  for (const [file, data] of Object.entries(result.outputs)) {
    const bytes = Buffer.from(data.split(',')[1], 'base64');
    await writeFile(new URL(file, destination), bytes);
    assets.push({ file: `public/heroes/raster-v1/${file}`, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  await writeFile(new URL('provenance.json', destination), JSON.stringify({
    method: 'Aligned full-canvas PNG exports; blue-key torso tint separation; original native Bean limbs and boots rasterized into matching detail, bare and mask layers.',
    limitations: 'Five supplied masters only. Bean limbs and boots retain native geometry. Other catalog choices remain SVG.',
    sources: inputs.map(({ data, ...source }) => source), placements: result.placements, assets,
  }, null, 2) + '\n');
  console.log(`Exported ${assets.length} full-canvas hero layers and provenance.`);
} finally { await browser.close(); }
