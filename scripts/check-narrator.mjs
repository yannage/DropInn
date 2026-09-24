import assert from 'node:assert/strict';

/** Speech delivery contract with a deterministic browser bridge, not an audio-quality claim. */
export async function checkNarrator({page,select,skip,state,sync,readyNext,note}) {
  await page.addInitScript(()=>{
    const synth=new EventTarget();
    Object.assign(synth,{voices:[],spoken:[],cancels:0,current:null,
      getVoices(){return this.voices;},
      speak(line){this.current=line;this.spoken.push({text:line.text,rate:line.rate,pitch:line.pitch,voice:line.voice?.voiceURI});},
      cancel(){this.cancels++;this.current=null;},
    });
    window.__narratorSpeech=synth;
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
    window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
  });
  await page.reload();
  await page.getByRole('button',{name:'Start a friend table',exact:true}).click();
  await page.getByRole('region',{name:'Story narrator',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.length),0,'Speech is opt in');
  const first=await page.locator('.di-narrator-words').textContent();
  await page.getByRole('button',{name:'Enable narrator voice',exact:true}).click();
  await page.getByRole('button',{name:'Download natural voice',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.length),0,'Download choice does not speak or silently fall back');
  await page.getByRole('button',{name:'Use device voice',exact:true}).click();
  await page.getByRole('button',{name:'Close story settings',exact:true}).click();
  let spoken=await page.evaluate(()=>window.__narratorSpeech.spoken);
  assert.equal(spoken.length,1);assert.ok(spoken[0].text.startsWith(first));assert.equal(spoken[0].rate,1);
  await page.getByRole('button',{name:'Collapse narrator subtitles',exact:true}).click();
  assert.equal(await page.locator('.di-narrator-words').count(),0);
  await page.getByRole('button',{name:'Mute narrator',exact:true}).click();
  assert.ok(await page.evaluate(()=>window.__narratorSpeech.cancels)>0);
  await page.getByRole('button',{name:'Show narrator subtitles',exact:true}).click();
  await page.getByRole('button',{name:'Story settings',exact:true}).click();
  const pace=page.getByRole('checkbox',{name:/Pace turn results/});
  assert.equal(await pace.isChecked(),true);
  await pace.uncheck();
  assert.equal(await page.evaluate(()=>localStorage.getItem('dropinn-paced-turn-results')),'off');
  await pace.check();
  await page.evaluate(()=>{const s=window.__narratorSpeech;s.voices=[{voiceURI:'test-natural',name:'Test English Natural',lang:'en-GB',default:true}];s.dispatchEvent(new Event('voiceschanged'));});
  await page.getByRole('combobox',{name:'Browser voice'}).selectOption('test-natural');
  for(const viewport of [{width:390,height:844},{width:320,height:568}]) {
    await page.setViewportSize(viewport);
    const box=await page.getByRole('group',{name:'Story settings'}).boundingBox();
    assert.ok(box.x>=0 && box.x+box.width<=viewport.width && box.y+box.height<=viewport.height,`Story settings fit ${viewport.width}×${viewport.height}: ${JSON.stringify(box)}`);
    await page.screenshot({path:`output/playwright/narrator-settings-${viewport.width}.png`,animations:'disabled'});
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Read this line',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.at(-1).voice),'test-natural');
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('group',{name:'Story settings'}).count(),0);
  const previous=await page.locator('.di-narrator-words').textContent();
  await page.evaluate(()=>window.__narratorSpeech.current.onend());
  await page.waitForFunction(text=>document.querySelector('.di-narrator-words')?.textContent!==text,previous);
  assert.ok((await page.evaluate(()=>window.__narratorSpeech.spoken.at(-1).text)).startsWith(await page.locator('.di-narrator-words').textContent()));
  const priorSpoken=await page.evaluate(()=>window.__narratorSpeech.spoken.length);
  await select(page,'investigate','tracks');await skip(page);await sync(page);
  await page.waitForFunction(count=>window.__narratorSpeech.spoken.length>count,priorSpoken);
  const afterRound=await page.evaluate(()=>window.__narratorSpeech.spoken.length);
  await readyNext(page);
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.length),afterRound,'Choosing boundary does not replay the resolved story');
  assert.equal((await state(page)).room.phase,'choosing');
  await page.evaluate(()=>window.__narratorSpeech.current.onerror({error:'synthesis-failed'}));
  await page.getByRole('button',{name:'Enable narrator voice',exact:true}).waitFor();
  assert.match(await page.locator('.di-narrator-error').textContent(),/Voice unavailable/);
  await page.getByRole('button',{name:'Close story settings',exact:true}).click();
  await page.getByRole('button',{name:'Enable narrator voice',exact:true}).click();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.current),null);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>!!window.__narratorSpeech.current);
  await page.getByRole('button',{name:'Collapse narrator subtitles',exact:true}).click();
  await page.screenshot({path:'output/playwright/narrator-collapsed-390.png',animations:'disabled'});
  await page.reload();
  await page.getByRole('button',{name:'Show narrator subtitles',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.length),0,'Reload preserves visual preference without autoplay');
  await page.getByRole('button',{name:'Enable narrator voice',exact:true}).click();
  await page.getByRole('button',{name:'Leave & save',exact:true}).click();
  await page.getByRole('region',{name:'Story narrator',exact:true}).waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.current),null,'Leaving cancels narration');
  note('narrator-speech-bridge',{evidence:'Mock SpeechSynthesis: activation, subtitle sync, voice loading, mute, collapse, error, visibility, reload, unmount; no audible quality assertion'});
  await page.evaluate(()=>localStorage.setItem('dropinn-narrator',JSON.stringify({engine:'natural',collapsed:false,voice:'test-natural'})));
  // Static download fixtures: the worker remains mocked; no live model is fetched.
  await page.route('https://huggingface.co/KittenML/**', route => {
    const path = new URL(route.request().url()).pathname;
    const bytes = path.endsWith('.onnx') ? 24369971 : path.endsWith('.npz') ? 3278902 : 688;
    return route.fulfill({ status: 200, contentType: 'application/octet-stream', body: Buffer.alloc(bytes) });
  });
  await page.addInitScript(()=>{
    window.__natural={workers:0,terminated:0,requests:[],hold:true,fail:false};
    window.Worker=class {
      constructor(){window.__natural.workers++;this.alive=true;}
      postMessage(message){
        window.__natural.requests.push(message);
        if(message.type==='cancel')return;
        const send=data=>setTimeout(()=>{if(this.alive)this.onmessage?.({data});},0);
        if(message.type==='init'){
          send({id:message.id,type:'progress',loaded:50,total:100});
          if(window.__natural.fail)send({id:message.id,type:'error',message:'Voice download failed. Please retry.'});
          else if(!window.__natural.hold)send({id:message.id,type:'ready'});
        } else send({id:message.id,type:'audio',samples:new Float32Array(24000),sampleRate:24000});
      }
      terminate(){this.alive=false;window.__natural.terminated++;}
    };
  });
  await page.reload();
  await page.getByRole('button',{name:'Start a friend table',exact:true}).click();
  await page.getByRole('button',{name:'Enable narrator voice',exact:true}).click();
  await page.getByRole('button',{name:'Download natural voice',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__natural.workers),0,'No model worker before consent');
  for(const viewport of [{width:390,height:844},{width:320,height:568}]){
    await page.setViewportSize(viewport);
    const box=await page.getByRole('group',{name:'Story settings'}).boundingBox();
    assert.ok(box.x>=0 && box.x+box.width<=viewport.width && box.y+box.height<=viewport.height);
    await page.screenshot({path:`output/playwright/narrator-download-${viewport.width}.png`,animations:'disabled'});
  }
  await page.getByRole('button',{name:'Download natural voice',exact:true}).click();
  await page.getByText('Downloading voice · 50%',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Cancel download',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__natural.terminated),1);
  await page.evaluate(()=>{window.__natural.hold=false;window.__natural.fail=true;});
  await page.getByRole('button',{name:'Read this line',exact:true}).click();
  await page.getByText('Voice download failed. Please retry.',{exact:true}).waitFor();
  await page.evaluate(()=>window.__natural.fail=false);
  await page.getByRole('button',{name:'Retry voice',exact:true}).click();
  await page.getByRole('button',{name:'Mute narrator',exact:true}).waitFor();
  await page.waitForFunction(()=>window.__natural.requests.some(item=>item.type==='generate'));
  await page.getByRole('button',{name:'Mute narrator',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.length),0,'Natural voice does not invoke device speech');
  await page.getByRole('button',{name:'Close story settings',exact:true}).click();
  await page.getByRole('button',{name:'Leave & save',exact:true}).click();
  note('narrator-natural-bridge',{evidence:'Mock worker, real AudioContext: consent, mobile download controls, progress, cancel, failure, retry, playback and mute'});
  await page.evaluate(()=>localStorage.setItem('dropinn-narrator',JSON.stringify({engine:'device',collapsed:true,voice:'test-natural'})));
  await page.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{configurable:true,value:undefined});Object.defineProperty(window,'AudioContext',{configurable:true,value:undefined});});
  await page.reload();
  await page.getByRole('button',{name:'Start a friend table',exact:true}).click();
  await page.getByRole('button',{name:'Show narrator subtitles',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Narrator voice unavailable',exact:true}).isDisabled(),true);
  assert.ok(await page.locator('.di-narrator-words').textContent());
  note('narrator-subtitles-without-browser-speech');
}
