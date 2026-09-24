import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';

// Explicit real-model check: downloads public weights, uses only the local game server.
const base = process.env.NARRATOR_TEST_URL ?? 'http://localhost:5198';
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) throw Error('Use a loopback development server.');
await mkdir('output/playwright', { recursive: true });
const ssr = await createServer({configFile:false,cacheDir:'node_modules/.vite-narrator-tests',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
const fixedNow = Date.now();
const handler = createDropinnHandler({local:true,env:{},now:()=>fixedNow,fetch:async()=>{throw Error('No server inference in this check.');}});
for (const [name, browserType] of Object.entries({ chromium, webkit })) {
  if (process.env.NARRATOR_TEST_BROWSER && process.env.NARRATOR_TEST_BROWSER !== name) continue;
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.route('**/api/dropinn', async route => {
    const response=await handler(new Request(`${base}/api/dropinn`,{method:'POST',headers:{'content-type':'application/json'},body:route.request().postData()}));
    await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
  });
  const requests = [], errors = [];
  page.on('request', request => { if (/huggingface|hf\.co|xethub|jsdelivr/.test(new URL(request.url()).hostname)) requests.push({ url: request.url(), method: request.method() }); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' || message.text().includes('[Kitten]')) console.error(name, message.text().slice(0, 500)); });
  await page.addInitScript(() => {
    window.__narratorModel = { messages: [], firstAudio: null, started: performance.now() };
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      constructor(...args) {
        super(...args);
        this.addEventListener('error', event => { window.__narratorModel.messages.push({ type: 'error', message: event.message }); });
        this.addEventListener('message', ({ data }) => {
          const record = { type: data.type, at: performance.now(), id: data.id, message: data.message };
          if (data.type === 'audio') {
            record.duration = data.samples.length / data.sampleRate;
            record.peak = data.samples.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0);
            if (!window.__narratorModel.firstAudio) window.__narratorModel.firstAudio = { samples: Array.from(data.samples), sampleRate: data.sampleRate };
          }
          window.__narratorModel.messages.push(record);
        });
      }
    };
  });
  try {
    await page.goto(`${base}/?session=voicecheck${name}${Date.now()}`);
    await page.getByRole('button', { name: 'Start a friend table', exact: true }).click();
    await page.getByRole('region', { name: 'Story narrator', exact: true }).waitFor();
    assert.equal(requests.length, 0, 'No model request before opt-in');
    const hasAudio = await page.evaluate(() => typeof AudioContext !== 'undefined');
    if (!hasAudio) {
      assert.equal(await page.getByRole('button',{name:'Narrator voice unavailable',exact:true}).isDisabled(),true);
      if (!base.endsWith(':5198')) {
        console.log(JSON.stringify({browser:name,playback:'Unavailable: this browser build has no AudioContext; physical Safari remains unverified.'}));
        continue;
      }
      const runWorker = async (download, expectAudio = true) => {
        await page.evaluate(async download => {
          window.__narratorModel.messages=[];
          const { createNarratorWorker } = await import('/src/lib/dropinn/narratorDownload.ts');
          try {
            const {worker, assets} = await createNarratorWorker(download);
            window.__qaWorker=worker;
            worker.addEventListener('message',({data})=>{if(data.type==='ready')worker.postMessage({id:2,type:'generate',text:'And then Yanni got into the boat and started swimming away.'});});
            worker.postMessage({id:1,type:'init',assets},Object.values(assets));
          } catch(error) { window.__narratorModel.messages.push({type:'error',message:error.message}); }
        },download);
        await page.waitForFunction(()=>window.__narratorModel.messages.some(item=>item.type==='audio'||item.type==='error'),{},{timeout:210000});
        const messages=await page.evaluate(()=>{window.__qaWorker?.terminate();return window.__narratorModel.messages.filter(item=>item.type!=='progress');});
        if(expectAudio) assert.ok(messages.some(item=>item.type==='audio'&&item.peak>0.01),JSON.stringify(messages));
        else assert.ok(messages.some(item=>item.type==='error'&&item.message.includes('download')),JSON.stringify(messages));
        return messages;
      };
      const initial=await runWorker(true);
      const cacheAvailable=await page.evaluate(async()=> (await import('/src/lib/dropinn/narratorDownload.ts')).narratorDownloaded());
      requests.length=0;
      const cached=await runWorker(false,cacheAvailable);
      assert.equal(requests.length,0,JSON.stringify(requests));
      const report={browser:name,playback:'Unavailable: this browser build has no AudioContext. Subtitles verified; real worker synthesis tested separately.',cacheAvailable,initial,cached,errors};
      await writeFile(`output/playwright/narrator-model-${name}.json`,JSON.stringify(report,null,2));
      console.log(JSON.stringify(report));
      continue;
    }
    await page.getByRole('button', { name: 'Enable narrator voice', exact: true }).click();
    await page.getByRole('button', { name: 'Download natural voice', exact: true }).waitFor();
    assert.equal(requests.length, 0, 'No model request before download consent');
    const started = Date.now();
    await page.getByRole('button', { name: 'Download natural voice', exact: true }).click();
    await page.waitForFunction(() => window.__narratorModel.messages.some(item => item.type === 'audio' || item.type === 'error') || document.querySelector('.di-narrator-error'), { }, { timeout: 210000 });
    const record = await page.evaluate(() => window.__narratorModel);
    const failure = record.messages.find(item => item.type === 'error');
    assert.equal(failure, undefined, failure?.message);
    assert.ok(record.messages.some(item => item.type === 'audio' && item.peak > 0.01), await page.locator('.di-narrator-error').allTextContents());
    assert.ok(requests.every(request=>request.method==='GET'),'Model network uses static downloads only');
    const elapsed = Date.now() - started;
    await page.getByRole('button', { name: 'Close story settings', exact: true }).click();
    await page.getByRole('button', { name: 'Mute narrator', exact: true }).click();
    await page.screenshot({ path: `output/playwright/narrator-bella-${name}.png` });
    const { samples, sampleRate } = record.firstAudio;
    const wav = Buffer.alloc(44 + samples.length * 2);
    wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples.length * 2, 40);
    samples.forEach((value, index) => wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + index * 2));
    await writeFile(`output/playwright/narrator-bella-${name}.wav`, wav);
    requests.length = 0;
    await page.reload();
    await page.getByRole('button', { name: 'Enable narrator voice', exact: true }).waitFor();
    assert.equal(requests.length, 0);
    const cachedStart = Date.now();
    await page.getByRole('button', { name: 'Enable narrator voice', exact: true }).click();
    await page.waitForFunction(() => window.__narratorModel.messages.some(item => item.type === 'audio' || item.type === 'error'), {}, { timeout: 45000 });
    const cached = await page.evaluate(() => window.__narratorModel.messages.filter(item=>item.type!=='progress'));
    assert.ok(cached.some(item => item.type === 'audio'), JSON.stringify(cached));
    assert.equal(requests.length, 0, `Cached model generates without external requests: ${JSON.stringify(requests)}`);
    assert.deepEqual(errors, []);
    // A real synthesis job is running/prefetched while the player commits a move.
    await page.getByRole('button',{name:'Investigate token',exact:true}).click();
    await page.locator('[data-scene-target="tracks"][data-target-kind="scene"]').click();
    const response=page.waitForResponse(response=>response.url().endsWith('/api/dropinn')&&response.request().postDataJSON()?.command?.type==='act');
    const actionStarted=Date.now();
    await page.getByRole('button',{name:'Roll now',exact:true}).click();
    assert.equal((await response).status(),200);
    const actionMs=Date.now()-actionStarted;
    const report = { browser: name, initialMs: elapsed, cachedMs: cached.find(item=>item.type==='audio').at, actionMs, audio: record.messages.filter(item => item.type !== 'progress'), cached, errors };
    await writeFile(`output/playwright/narrator-model-${name}.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    await page.getByRole('button', { name: 'Leave & save', exact: true }).click();
  } catch (error) {
    console.error(name, error.message, await page.evaluate(() => window.__narratorModel?.messages.filter(item => item.type !== 'progress')));
    await page.screenshot({ path: `output/playwright/narrator-model-failed-${name}.png` });
    process.exitCode = 1;
  } finally { await browser.close(); }
}
await ssr.close();
