// Technical exports of reviewed image_gen masters. Original canvases stay intact.
// Run prepare-hero-raster.mjs first when rebuilding the five starter assets.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const root = new URL('../', import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const queue = JSON.parse(await readFile(new URL('output/ms-painter/queue.json', root), 'utf8'));
const destination = new URL('public/heroes/raster-v1/', root);
const starter = ['body-bean', 'eyes-dots', 'nose-button', 'mouth-open', 'hat-wizard'];
const nativeExports = ['nose-triangle', 'nose-beak', 'mouth-smirk', 'nose-none'];
const previous = JSON.parse(await readFile(new URL('provenance.json', destination), 'utf8'));
const inputs = [];
for (const job of queue.jobs.filter(job => job.id.startsWith('hero-raster-'))) {
  const name = job.id.replace('hero-raster-', '');
  if (starter.includes(name) || nativeExports.includes(name)) continue;
  if (!job.selected) throw new Error(`Missing reviewed master: ${name}`);
  const path = `output/ms-painter/${job.selected}`;
  const bytes = await readFile(new URL(path, root));
  const attempt = job.attempts.find(attempt => attempt.output === job.selected);
  const native = await readFile(new URL(`public/heroes/${name}.svg`, root), 'utf8');
  inputs.push({ name, path, sha256: hash(bytes), generator: attempt.generator, prompt: attempt.prompt,
    data: `data:image/png;base64,${bytes.toString('base64')}`, native });
}
for (const name of nativeExports) {
  const path = `public/heroes/${name}.svg`, bytes = await readFile(new URL(path, root));
  inputs.push({ name, path, sha256: hash(bytes), generator: 'native-svg-rasterization', native: bytes.toString('utf8') });
}
const beanFill = await readFile(new URL('body-bean-fill.png', destination));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async ({ inputs, beanFill }) => {
    const canvas = (width = 256, height = 256) => Object.assign(document.createElement('canvas'), { width, height });
    const load = async src => { const image = new Image(); image.src = src; await image.decode(); return image; };
    const svg = text => `data:image/svg+xml;base64,${btoa(text)}`;
    function bounds(layer) {
      const { width: w, height: h } = layer, p = layer.getContext('2d').getImageData(0, 0, w, h).data;
      let l = w, t = h, r = 0, b = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (p[(y * w + x) * 4 + 3] > 128) {
        l = Math.min(l, x); t = Math.min(t, y); r = Math.max(r, x + 1); b = Math.max(b, y + 1);
      }
      return [l, t, r, b];
    }
    const outputs = {}, placements = [];
    const clamp = x => Math.min(1, Math.max(0, x));
    function separate(layer, name) {
      const detail = canvas(), mask = canvas();
      const pixels = layer.getContext('2d').getImageData(0, 0, 256, 256);
      const fill = new ImageData(new Uint8ClampedArray(pixels.data), 256, 256);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const p = pixels.data, r = p[i], g = p[i + 1], b = p[i + 2];
        let key = 0;
        if (name.startsWith('body-') || name === 'hat-lantern') key = clamp((b - r) / 65);
        else if (name === 'shoes-ruby') key = clamp((r - g) / 110);
        else if (name === 'hat-teacup' && g > r * .8 && b > r * .65) key = clamp(b / 170);
        else if (name === 'hat-shepherd' && g < b * 2.5 && r < g * 1.7) key = clamp((r - b) / 75);
        // The silhouette underlay shares exactly the original alpha. Opaque
        // accent details (boots, clasp, tea, lantern) cover it without seams.
        fill.data[i] = fill.data[i + 1] = fill.data[i + 2] = 255;
        if (key > 0) {
          p[i + 3] = Math.round(p[i + 3] * (1 - key));
          p[i] = p[i + 1] = p[i + 2] = 0;
        }
      }
      detail.getContext('2d').putImageData(pixels, 0, 0);
      mask.getContext('2d').putImageData(fill, 0, 0);
      return { detail, mask };
    }
    for (const input of inputs) {
      const native = canvas(); native.getContext('2d').drawImage(await load(svg(input.native)), 0, 0, 256, 256);
      let layer = native;
      if (input.data) {
        const image = await load(input.data), source = canvas(image.width, image.height), ctx = source.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const opaque = bounds(source), target = bounds(native);
        const pixels = ctx.getImageData(0, 0, source.width, source.height);
        for (let i = 3; i < pixels.data.length; i += 4) if (pixels.data[i] < 16) pixels.data[i] = 0;
        ctx.putImageData(pixels, 0, 0);
        const sx = (target[2] - target[0]) / (opaque[2] - opaque[0]), sy = (target[3] - target[1]) / (opaque[3] - opaque[1]);
        const dx = target[0] - opaque[0] * sx, dy = target[1] - opaque[1] * sy;
        layer = canvas(); layer.getContext('2d').drawImage(source, dx, dy, source.width * sx, source.height * sy);
        placements.push({ name: input.name, sourceSize: [image.width, image.height], opaqueBounds: opaque, anchors: target, transform: [sx, sy, dx, dy] });
      }
      const name = input.name;
      outputs[`${name}.png`] = layer.toDataURL();
      if (name.startsWith('body-') || ['hat-shepherd', 'hat-teacup', 'hat-lantern', 'shoes-ruby'].includes(name)) {
        const { detail, mask } = separate(layer, name);
        outputs[`${name}${name.startsWith('body-') ? '' : '-outline'}.png`] = detail.toDataURL();
        outputs[`${name}-fill.png`] = mask.toDataURL();
        if (name.startsWith('body-')) {
          // Custom shoes begin at y217; remove the built-in boots below y221
          // from BOTH body layers so they cannot show through another pair.
          detail.getContext('2d').clearRect(0, 221, 256, 35);
          mask.getContext('2d').clearRect(0, 221, 256, 35);
          outputs[`${name}-bare.png`] = detail.toDataURL();
          outputs[`${name}-bare-fill.png`] = mask.toDataURL();
        }
      }
    }
    const bareBean = canvas(); bareBean.getContext('2d').drawImage(await load(beanFill), 0, 0);
    bareBean.getContext('2d').clearRect(0, 221, 256, 35);
    outputs['body-bean-bare-fill.png'] = bareBean.toDataURL();
    return { outputs, placements };
  }, { inputs, beanFill: `data:image/png;base64,${beanFill.toString('base64')}` });
  const assets = previous.assets.filter(asset => starter.some(name => asset.file.endsWith(`/${name}.png`) || asset.file.endsWith(`/${name}-fill.png`) || asset.file.endsWith(`/${name}-bare.png`)));
  for (const [file, data] of Object.entries(result.outputs)) {
    const bytes = Buffer.from(data.split(',')[1], 'base64');
    await writeFile(new URL(file, destination), bytes);
    assets.push({ file: `public/heroes/raster-v1/${file}`, sha256: hash(bytes) });
  }
  await writeFile(new URL('provenance.json', destination), JSON.stringify({
    method: 'Full-canvas aligned raster exports from style A image_gen masters, with matching tint detail/mask and footwear-free derivatives. Catalog IDs preserved.',
    limitations: 'Bean retains native limbs and boots around its supplied raster torso. Crooked nose, Little beak and Crooked smirk use native raster exports after generation failures; No nose is an empty native raster. Original SVGs are retained as source history.',
    sources: [...previous.sources.filter(source => starter.includes(source.name)), ...inputs.map(({ data, native, ...source }) => source)],
    placements: [...previous.placements.filter(p => starter.includes(p.name)), ...result.placements], assets,
  }, null, 2) + '\n');
  console.log(`Exported ${Object.keys(result.outputs).length} additional layers; ${assets.length} total production layers.`);
} finally { await browser.close(); }
