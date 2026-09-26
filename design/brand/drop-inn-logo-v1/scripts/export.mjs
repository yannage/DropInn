// Render every print PNG directly from its SVG at 3000 px / 300 PPI.
// SHARP_MODULE may point to the installed sharp package in a bundled runtime.
import { createRequire } from 'node:module';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
const sharp=require(process.env.SHARP_MODULE || 'sharp');
const root=fileURLToPath(new URL('../',import.meta.url));
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const manifest=[];
function bounds(data,info) {
  let x0=info.width,y0=info.height,x1=-1,y1=-1;
  for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
    if(data[(y*info.width+x)*4+3]>0) {
      x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
    }
  }
  return {x:x0,y:y0,width:x1-x0+1,height:y1-y0+1};
}
function sizeSvg(svg,w,h) {
  return svg.replace(/<svg\b[^>]*>/,tag=>tag.replace(/\bwidth="[^"]*"/,`width="${w}"`).replace(/\bheight="[^"]*"/,`height="${h}"`));
}
for(const filename of (await readdir(path.join(root,'svg'))).filter(x=>x.endsWith('.svg')&&!x.includes('master'))) {
  const svgPath=path.join(root,'svg',filename);
  let svg=await readFile(svgPath,'utf8');
  // Reset bounds for deterministic reruns, then inspect a high resolution render.
  svg=svg.replace(/viewBox="[^"]*"/,'viewBox="0 0 1374 1145"');
  const raw=await sharp(Buffer.from(sizeSvg(svg,2748,2290))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const bb=bounds(raw.data,raw.info);
  const box={x:bb.x/2-2,y:bb.y/2-2,width:bb.width/2+4,height:bb.height/2+4};
  svg=svg.replace(/viewBox="[^"]*"/,`viewBox="${box.x} ${box.y} ${box.width} ${box.height}"`);
  const height=Math.round(3000*box.height/box.width);
  const printSvg=sizeSvg(svg,3000,height);
  // Keep the editable SVG easy to view at native source-unit scale.
  await writeFile(svgPath,sizeSvg(svg,box.width,box.height));
  const name=filename.replace('.svg','');
  const dest=path.join(root,'png',`${name}-10in-300ppi.png`);
  let rendered=sharp(Buffer.from(printSvg));
  if(name.includes('only')) {
    // libvips may round overlapping antialiased strokes by one RGB level.
    // Preserve coverage alpha while keeping the single-ink RGB mathematically exact.
    const single=await rendered.ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const rgb=name.includes('black')?[0,0,0]:[255,244,214];
    for(let i=0;i<single.data.length;i+=4)for(let c=0;c<3;c++)single.data[i+c]=rgb[c];
    rendered=sharp(single.data,{raw:{width:single.info.width,height:single.info.height,channels:4}});
  }
  await rendered.withMetadata({density:300}).withIccProfile('srgb').png().toFile(dest);
  const meta=await sharp(dest).metadata();
  const pixels=await sharp(dest).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const ink=bounds(pixels.data,pixels.info);
  if(meta.width!==3000||meta.density!==300||!meta.hasAlpha||!meta.icc||meta.space!=='srgb')throw Error(`Invalid export ${name}`);
  if(ink.x===0||ink.y===0||ink.x+ink.width>=meta.width||ink.y+ink.height>=meta.height)throw Error(`Clipped ink ${name}`);
  if(/<(image|text|foreignObject)\b/.test(svg)||/href=/.test(svg))throw Error(`Non-path dependency ${name}`);
  const palette=new Set();
  let transparent=0,opaque=0,partial=0;
  for(let i=0;i<pixels.data.length;i+=4){
    const a=pixels.data[i+3];
    if(a===0)transparent++;else if(a===255){opaque++;palette.add(pixels.data.subarray(i,i+3).toString('hex'));}else partial++;
  }
  if(name.includes('only')&&palette.size!==1)throw Error(`Not one ink: ${name}`);
  manifest.push({name,svg:`svg/${filename}`,png:`png/${name}-10in-300ppi.png`,width:meta.width,height:meta.height,ppi:300,printWidthIn:10,printHeightIn:Number((meta.height/300).toFixed(3)),space:meta.space,embeddedIcc:true,alpha:{transparent,opaque,antialiasedEdge:partial},opaqueColors:[...palette],inkBounds:ink,pathCount:(svg.match(/<path\b/g)||[]).length});
}
await writeFile(path.join(root,'svg/drop-inn-master.svg'),await readFile(path.join(root,'svg/drop-inn-light-website.svg')));
await writeFile(path.join(root,'export-manifest.json'),JSON.stringify({generatedBy:'scripts/export.mjs',exports:manifest},null,2)+'\n');

function nested(svg,x,y,w,h){return svg.replace(/<svg\b[^>]*>/,tag=>tag.replace(/\bwidth="[^"]*"/,`width="${w}"`).replace(/\bheight="[^"]*"/,`height="${h}"`).replace('<svg ',`<svg x="${x}" y="${y}" `));}
const variants={};for(const m of manifest)variants[m.name]=await readFile(path.join(root,m.svg),'utf8');
const label=(x,y,text,size=18,color='#60675D')=>`<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" fill="${color}">${escape(text)}</text>`;
let sheet=`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1540" viewBox="0 0 1800 1540"><rect width="1800" height="1540" fill="#F4F0E6"/>`;
sheet+=label(72,75,'DROP INN / TAVERN SIGN',40,'#161A16')+label(73,111,'Logo kit 01  ·  Flat colors. Original path lettering. Made for little adventures.',21);
sheet+='<rect x="55" y="152" width="825" height="790" rx="24" fill="#FFFBF2"/><rect x="920" y="152" width="825" height="790" rx="24" fill="#202620"/>';
sheet+=label(87,199,'01 / LIGHT FABRIC',19)+label(952,199,'02 / DARK FABRIC',19,'#D5DBCB');
sheet+=nested(variants['drop-inn-light-website'],120,230,690,635)+nested(variants['drop-inn-dark-website'],985,230,690,635);
sheet+=label(88,910,'Optional website plaque: playdropinn.com',19)+label(952,910,'Cream edge keeps the silhouette visible.',19,'#D5DBCB');
sheet+='<rect x="55" y="980" width="525" height="405" rx="24" fill="#FFFBF2"/><rect x="617" y="980" width="525" height="405" rx="24" fill="#202620"/><rect x="1180" y="980" width="565" height="405" rx="24" fill="#E7E4D8"/>';
sheet+=label(85,1024,'03 / BLACK INK',17)+label(647,1024,'04 / CREAM INK',17,'#D5DBCB')+label(1210,1024,'05 / SMALL PLACEMENT',17);
sheet+=nested(variants['drop-inn-black-only'],109,1052,415,293)+nested(variants['drop-inn-cream-only'],670,1052,415,293)+nested(variants['drop-inn-light'],1300,1076,310,222);
sheet+=label(1210,1349,'Use the name-only mark at 3.5 inches.',17);
for(const [i,c] of ['#161A16','#FFF4D6','#E6B84A','#64784B'].entries())sheet+=`<rect x="${72+i*273}" y="1430" width="48" height="48" rx="10" fill="${c}" stroke="#B6BCAD"/>`+label(133+i*273,1461,c,21);
sheet+=label(1250,1461,'playdropinn.com',27,'#161A16')+'</svg>';
await writeFile(path.join(root,'previews/logo-kit.svg'),sheet);
await sharp(Buffer.from(sheet)).withIccProfile('srgb').png().toFile(path.join(root,'previews/logo-kit.png'));

// A visual scale proof at 100 display pixels per inch: 10 in = 1000 px;
// 3.5 in = 350 px. This is a comparison sheet, not a physical paper proof.
let proof=`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1250"><rect width="1800" height="1250" fill="#F4F0E6"/>`;
proof+=label(60,66,'SIZE & TRANSPARENCY REVIEW',32,'#161A16');
proof+=label(60,103,'Relative scale: 100 screen pixels = 1 print inch. Screen display is not a physical ruler.',20);
proof+=nested(variants['drop-inn-light-website'],60,160,1000,900)+label(60,1110,'10-inch chest graphic / website included',24);
proof+=nested(variants['drop-inn-light'],1270,210,350,260)+label(1180,528,'3.5-inch placement / name only',21);
proof+='<rect x="1140" y="600" width="600" height="485" rx="20" fill="#202620"/>';
proof+=nested(variants['drop-inn-dark'],1265,668,350,270)+label(1176,1036,'Dark-fabric edge at the same 3.5-inch scale',18,'#D5DBCB')+'</svg>';
await sharp(Buffer.from(proof)).withIccProfile('srgb').png().toFile(path.join(root,'previews/size-review.png'));
let all='<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1800"><rect width="1600" height="1800" fill="#F4F0E6"/>';
const order=['light','dark','black-only','cream-only'].flatMap(style=>[`drop-inn-${style}`,`drop-inn-${style}-website`]);
for(const [i,name] of order.entries()){
  const x=(i%2)*800,y=Math.floor(i/2)*450;
  const dark=name.includes('dark')||name.includes('cream-only');
  all+=`<rect x="${x+15}" y="${y+15}" width="770" height="420" rx="16" fill="${dark?'#202620':'#FFFBF2'}"/>`;
  all+=label(x+42,y+54,name,19,dark?'#D5DBCB':'#60675D')+nested(variants[name],x+175,y+80,450,330);
}
all+='</svg>';
await sharp(Buffer.from(all)).withIccProfile('srgb').png().toFile(path.join(root,'previews/all-variants.png'));
console.log(JSON.stringify({exports:manifest.map(({name,width,height,pathCount})=>({name,width,height,pathCount})),checks:'dimensions, 300 PPI, sRGB ICC, alpha, unclipped ink, path-only SVG, one-ink variants passed'},null,2));
