import { mkdir, writeFile } from 'node:fs/promises';

// A local observation sheet, intentionally outside production public assets.
const html = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>DropInn play comparison</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f3eedf;color:#243e35;font:16px/1.5 system-ui,sans-serif}main{max-width:850px;margin:auto;padding:24px}h1{font-size:30px;line-height:1.15}h2{font-size:20px}p{max-width:70ch}.muted{color:#58685c;font-size:14px}section{background:#fffaf0;border:1px solid #b7bd9e;border-radius:16px;padding:20px;margin:20px 0}label{display:block;font-weight:650;margin:16px 0 5px}input,textarea,select{display:block;width:100%;font:inherit;background:white;color:#243e35;border:1px solid #8a9c88;border-radius:7px;padding:10px;min-height:44px}textarea{min-height:86px;resize:vertical}button,a.play{display:inline-flex;align-items:center;justify-content:center;min-height:44px;border:2px solid #365e49;border-radius:9px;padding:9px 16px;background:#315b47;color:#fff8db;font:700 15px system-ui;cursor:pointer;text-decoration:none}button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid #c18a2f;outline-offset:3px}.row{display:flex;gap:12px;flex-wrap:wrap}.row>*{flex:1;min-width:160px}#status{font-size:13px}footer{margin:28px 0;font-size:13px}.hidden{display:none}@media(max-width:420px){main{padding:14px}section{padding:14px}h1{font-size:26px}}
</style>
<main>
<p class="muted">Local playtest · observations, not an automated score</p>
<h1>Try two DropInn tables</h1>
<p>Play the same adventure in each build. Take a few turns, or finish the first chapter if you want to. Use the same device, hero class and sound settings. Choose your own moves.</p>
<p id="order"></p>
<p class="muted">For waiting-time feedback, use two human players: start a friend table in each build and share that build’s invitation. A solo turn resolves as soon as you commit.</p>
<div class="row"><a class="play" id="openA" target="_blank" rel="noopener">Open Build A</a><a class="play" id="openB" target="_blank" rel="noopener">Open Build B</a></div>
<form id="notes">
<section><h2>Session</h2>
<label for="device">Device and input</label><input id="device" name="device" placeholder="For example: laptop + mouse, phone + touch">
<label for="familiarity">Prior DropInn experience</label><select id="familiarity" name="familiarity"><option value="">Choose…</option><option>First visit</option><option>A few visits</option><option>Frequent player</option></select>
<label for="players">Human players at the table</label><select id="players" name="players"><option value="">Choose…</option><option>1</option><option>2</option><option>3</option><option>4</option></select>
<label for="sound">Sound settings used in both builds</label><input id="sound" name="sound" placeholder="Effects on/off; narration on/off">
</section>
<div id="buildNotes"></div>
<section><h2>After both</h2><label for="comparison">Which felt more satisfying, and why?</label><textarea id="comparison" name="comparison"></textarea>
<label for="flat">Describe a specific moment that still felt flat, confusing or slow.</label><textarea id="flat" name="flat"></textarea>
<label for="mix">If you listened: could you follow narration over the effects? Any harsh, repetitive or missing sounds?</label><textarea id="mix" name="mix"></textarea></section>
<button type="button" id="export">Download observations</button><p id="status" role="status"></p>
</form>
<footer>Notes stay in this browser until you download or share them. Nothing here sends observations to a server. Missing answers remain missing; the sheet does not infer enjoyment or mark the project complete.</footer>
</main>
<script>
const key='dropinn-feel-comparison-v1';
let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null')}catch{}
const record=saved||{id:crypto.randomUUID(),startedAt:new Date().toISOString(),first:Math.random()<.5?'A':'B',builds:{A:{revision:'36849c1',url:'http://127.0.0.1:5200',adventureVersion:1},B:{revision:'working-tree-after-1f88867',url:'http://127.0.0.1:5199',adventureVersion:2}},answers:{}};
try{localStorage.setItem(key,JSON.stringify(record))}catch{}
document.querySelector('#order').textContent='Start with Build '+record.first+', then try Build '+(record.first==='A'?'B':'A')+'. Write notes after each, before switching.';
for(const build of ['A','B']){
 document.querySelector('#open'+build).href=record.builds[build].url+'/?session=feel-'+record.id+'-'+build;
 const section=document.createElement('section');
 const heading=document.createElement('h2');heading.textContent='After Build '+build;section.append(heading);
 const fields=[['move','What did you choose, and what did you expect it to do?'],['consequence','What visibly changed after your move?'],['combination','Did you discover moves that combine? Describe what you found, or say you did not find any.'],['choice','If you found an extra payoff choice, why did you choose it?'],['wait','What did you do after preparing or committing? How did that time feel?']];
 for(const [name,text] of fields){const label=document.createElement('label');label.htmlFor=build+'-'+name;label.textContent=text;const input=document.createElement('textarea');input.id=input.name=label.htmlFor;section.append(label,input)}
 const label=document.createElement('label');label.htmlFor=build+'-another';label.textContent='Do you want another turn?';const select=document.createElement('select');select.id=select.name=label.htmlFor;for(const text of ['Choose…','Yes','Maybe','No']){const option=document.createElement('option');option.textContent=text;option.value=text==='Choose…'?'':text;select.append(option)}section.append(label,select);document.querySelector('#buildNotes').append(section);
}
const form=document.querySelector('#notes'),status=document.querySelector('#status');
for(const [name,value] of Object.entries(record.answers)){const control=form.elements.namedItem(name);if(control)control.value=value}
function capture(){record.answers=Object.fromEntries(new FormData(form));record.updatedAt=new Date().toISOString();try{localStorage.setItem(key,JSON.stringify(record));status.textContent='Saved in this browser.'}catch{status.textContent='Browser storage unavailable. Download to keep your notes.'}return record}
form.addEventListener('input',capture);form.addEventListener('submit',event=>event.preventDefault());
document.querySelector('#export').addEventListener('click',()=>{const data=capture();const blob=new Blob([JSON.stringify({...data,evidence:'Human-entered observations; not automatically validated.'},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='dropinn-observations-'+record.id+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
</script></html>`;
await mkdir('output/playtest', { recursive: true });
await writeFile('output/playtest/comparison.html', html);
console.log('Local comparison sheet: http://127.0.0.1:5199/output/playtest/comparison.html');
