import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, relative, isAbsolute, extname } from 'node:path';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const runtime = await createServer({ root, configFile: false, server: { middlewareMode: true }, appType: 'custom' });
const failures = [];
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
function inside(path) {
  const full = resolve(root, path), rel = relative(root, full);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Path escapes repository: ${path}`);
  return full;
}
try {
  const { HERO_PARTS, HERO_HATS, DEFAULT_APPEARANCE } = await runtime.ssrLoadModule('/src/lib/cosmetics.ts');
  const { HERO_COLORS } = await runtime.ssrLoadModule('/src/lib/character.ts');
  const { HeroAvatar } = await runtime.ssrLoadModule('/src/components/DropInn/HeroAvatar.tsx');
  const manifest = JSON.parse(await readFile(new URL('../references/native-hero-art.json', import.meta.url), 'utf8'));
  const catalog = [...Object.values(HERO_PARTS).flat(), ...HERO_HATS];
  const sources = [...new Set(catalog.flatMap(part => [part.art.src, part.art.maskSrc].filter(Boolean)))];
  const encoded = new Map();
  for (const source of sources) {
    if (!source.startsWith('/heroes/') || source.includes('?') || source.includes('#')) throw new Error(`Expected local hero source: ${source}`);
    const path = `public${source}`;
    const bytes = await readFile(inside(path));
    const extension = extname(source).toLowerCase();
    if (extension === '.svg') {
      const svg = bytes.toString('utf8');
      const box = svg.match(/\bviewBox\s*=\s*["']([^"']+)["']/)?.[1].trim().split(/[\s,]+/).map(Number);
      if (!box || box.join(',') !== '0,0,256,256') failures.push(`${path}: expected viewBox 0 0 256 256`);
      if (/<script\b|\bon\w+\s*=|(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/)|url\(\s*["']?https?:/i.test(svg)) failures.push(`${path}: review active or external SVG content`);
    } else if (extension === '.png') {
      if (bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.readUInt32BE(16) !== 256 || bytes.readUInt32BE(20) !== 256) failures.push(`${path}: expected 256x256 PNG`);
    } else throw new Error(`Unsupported hero source: ${path}`);
    const entry = manifest.assets.find(asset => asset.file === path);
    if (!entry) failures.push(`${path}: absent from native manifest`);
    else if (entry.sha256 !== createHash('sha256').update(bytes).digest('hex')) failures.push(`${path}: hash changed; inspect before updating manifest`);
    encoded.set(source, `data:image/${extension === '.svg' ? 'svg+xml' : 'png'};base64,${bytes.toString('base64')}`);
  }
  for (const entry of manifest.assets) {
    const bytes = await readFile(inside(entry.file));
    if (entry.sha256 !== createHash('sha256').update(bytes).digest('hex') && !sources.includes(entry.file.replace(/^public/, ''))) failures.push(`${entry.file}: non-catalog manifest hash changed`);
  }
  const inventory = HERO_HATS.map(hat => hat.keepsake).filter(Boolean);
  const examples = [];
  const add = (label, appearance, hat = null, accent = HERO_COLORS[0].value) => examples.push({ label, hero: { name: label, classKey: 'wizard', accent, inventory, appearance, equipment: { hat } } });
  for (const body of HERO_PARTS.body) for (const hat of [null, ...HERO_HATS]) add(`${body.label} / ${hat?.label ?? 'No hat'}`, { ...DEFAULT_APPEARANCE, body: body.id }, hat?.id ?? null);
  for (const category of ['eyes', 'nose', 'mouth']) for (const part of HERO_PARTS[category]) add(`${category}: ${part.label}`, { ...DEFAULT_APPEARANCE, [category]: part.id });
  for (const body of HERO_PARTS.body) for (const color of HERO_COLORS) add(`${body.label} / ${color.name}`, { ...DEFAULT_APPEARANCE, body: body.id }, null, color.value);
  // One render tree ensures useId-generated mask IDs are unique across the sheet.
  let markup = renderToStaticMarkup(React.createElement('main', null, examples.map(({ label, hero }) => React.createElement('section', { key: label },
    React.createElement('h2', null, label),
    ...[256, 64, 48].map(size => React.createElement('div', { className: 'pair', key: size },
      ...['light', 'dark'].map(background => React.createElement('div', { className: background, key: background, style: { width: size, height: size } }, React.createElement(HeroAvatar, { hero })))))))));
  markup = markup.replace(/href="(\/heroes\/[^"#]+)"/g, (_, source) => `href="${encoded.get(source) ?? source}"`);
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>DropInn hero review</title><style>body{font:14px system-ui;background:#eee4cb;color:#252923;margin:20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(560px,1fr));gap:16px}section{border:1px solid #8c856f;padding:12px}h2{font-size:16px}.pair{display:flex;gap:8px;margin:8px 0}.light{background:#fff5dc}.dark{background:#20352f}svg{width:100%;height:100%}pre{white-space:pre-wrap}</style><h1>DropInn hero review</h1><p>${examples.length} catalog-driven examples. 256px, 64px and 48px on light/dark backgrounds. File checks do not establish visual quality.</p><pre>${escape(failures.length ? failures.join('\n') : 'File and manifest checks passed.')}</pre>${markup}</html>`;
  await mkdir(resolve(root, 'output'), { recursive: true });
  await writeFile(resolve(root, 'output/hero-review.html'), html);
  for (const failure of failures) console.error(failure);
  console.log(`Wrote output/hero-review.html: ${sources.length} sources, ${examples.length} examples, ${failures.length} file issues.`);
  if (failures.length) process.exitCode = 1;
} finally { await runtime.close(); }
