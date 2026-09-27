// Adapt the approved vector logo, preserving its seven outlined letter shapes.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const root = new URL('./', import.meta.url);
const letters = JSON.parse(await fs.readFile(new URL('../drop-inn-logo-v1/source/lettering-paths.json', root), 'utf8')).name;
const path = (id, d, fill, extra='') => `<path id="${id}" d="${d}" fill="${fill}" ${extra}/>`;
const gold = '#FFCC00', green = '#01784E', white = '#FFFFFF', black = '#000000';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="100 60 1160 840" width="1200" height="869">
<title>Drop Inn — embroidery tavern badge</title>
<desc>Four flat thread colors. Simplified sign, seven original outlined letters, broad doorway. No website or fine decorative rays. Intended width 4 inches.</desc>
<g id="sign">
${path('beam','M128 150 Q190 124 250 136 L390 146 Q485 164 550 153 L620 148 Q790 184 960 155 L1215 100 L1222 171 L1070 193 Q900 226 775 224 L617 192 Q530 190 470 207 L293 217 Q205 213 135 242 Z',gold)}
${path('board','M225 280 L393 269 L517 300 L862 275 L1038 250 L1174 252 L1192 450 L1178 502 L1194 615 L1210 833 L1091 852 L995 837 L858 847 L614 874 L444 876 L238 857 L219 803 L229 679 L213 619 L229 456 L215 398 Z',green)}
${path('left-strap','M319 102 Q346 91 369 107 Q406 193 391 273 L376 307 L338 294 Q362 238 342 166 Z',gold,'stroke="#000000" stroke-width="20" stroke-linejoin="round"')}
${path('right-strap','M1017 107 Q1047 90 1069 111 Q1100 208 1081 295 L1044 294 Q1056 230 1037 163 Z',gold,'stroke="#000000" stroke-width="20" stroke-linejoin="round"')}
</g>
<g id="lettering-Drop-Inn" fill="${white}">${letters.map(p=>`<path id="${p.id}" d="${p.d}" transform="${p.transform}"/>`).join('\n')}</g>
<g id="doorway">
${path('gold-arch','M925 800 L931 704 Q942 603 1043 599 L1086 620 L1083 800 Z',gold)}
${path('dark-opening','M958 790 L962 706 Q975 639 1046 641 L1050 790 Z',black)}
${path('open-door','M1080 619 L1140 581 L1159 814 L1080 791 Z',gold)}
</g></svg>`;
await fs.mkdir(root,{recursive:true});
await fs.writeFile(new URL('drop-inn-embroidery.svg',root),svg);
const png = new URL('drop-inn-embroidery-4in-300ppi.png',root);
await sharp(Buffer.from(svg)).resize(1200).withMetadata({density:300}).withIccProfile('srgb').png().toFile(fileURLToPath(png));
await sharp(Buffer.from(svg)).resize(720).flatten({background:'#1b1b1c'}).png().toFile(fileURLToPath(new URL('preview-on-black.png',root)));
const meta=await sharp(fileURLToPath(png)).metadata();
console.log(JSON.stringify({width:meta.width,height:meta.height,density:meta.density,alpha:meta.hasAlpha,icc:!!meta.icc,letterPaths:letters.length}));

// Official Printful exports, downloaded via the saved product's mockup UI.
const mockups = {
  front: 'unisex-garment-dyed-heavyweight-t-shirt-black-front-6ab96d6509ce6.png',
  detail: 'unisex-garment-dyed-heavyweight-t-shirt-black-front-6ab96d650a103.png',
  back: 'unisex-garment-dyed-heavyweight-t-shirt-black-back-6ab96d6509f9c.png',
};
for (const [view, filename] of Object.entries(mockups)) {
  const target = fileURLToPath(new URL(`../../../public/merch/embroidered-tee-${view}.webp`, root));
  await sharp(fileURLToPath(new URL(`mockups/${filename}`, root))).resize(1000).webp({ quality: 86 }).toFile(target);
}
