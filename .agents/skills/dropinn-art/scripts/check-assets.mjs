import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, relative, isAbsolute } from 'node:path';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const inventory = JSON.parse(await readFile(new URL('../references/asset-inventory.json', import.meta.url), 'utf8'));
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const seen = new Set();
let failures = 0;
for (const asset of inventory.assets) {
  try {
    if (seen.has(asset.id)) throw new Error('Duplicate asset ID');
    seen.add(asset.id);
    for (const path of [asset.file, asset.reference, asset.promptFile, asset.runtimeFile].filter(Boolean)) {
      const full = resolve(root, path);
      const rel = relative(root, full);
      if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('Asset paths must stay in this repository');
      await readFile(full);
    }
    const png = await readFile(resolve(root, asset.file));
    if (png.length < 33 || !png.subarray(0, 8).equals(signature) || png.toString('ascii', 12, 16) !== 'IHDR') {
      throw new Error('Expected a PNG with an IHDR header');
    }
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    if (width !== asset.width || height !== asset.height) throw new Error(`Dimensions changed: ${width}x${height}`);
    if (asset.alpha && ![4, 6].includes(png[25])) throw new Error('Expected an explicit alpha channel');
    const hash = createHash('sha256').update(png).digest('hex');
    if (hash !== asset.sha256) throw new Error('File changed; inspect it and refresh the recorded SHA-256');
    if (asset.runtimeFile) {
      const runtime = await readFile(resolve(root, asset.runtimeFile));
      if (runtime.toString('ascii', 0, 4) !== 'RIFF' || runtime.toString('ascii', 8, 12) !== 'WEBP') throw new Error('Expected a WebP runtime derivative');
      if (createHash('sha256').update(runtime).digest('hex') !== asset.runtimeSha256) throw new Error('Runtime derivative changed; verify it against the source');
      if (!asset.runtimeEncoding) throw new Error('Record runtime encoding provenance');
    }
    if (!asset.generator || !asset.review) throw new Error('Record generation source and review status');
    console.log(`OK ${asset.id}: ${width}x${height}, ${Math.round(png.length / 1024)} KiB, ${asset.review}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${asset.id}: ${error.message}`);
  }
}
console.log('File checks only: visually inspect actual transparency, style, and the in-game display.');
process.exitCode = failures ? 1 : 0;
