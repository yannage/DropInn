import assert from 'node:assert/strict';

/** Speech delivery contract with a deterministic browser bridge, not an audio-quality claim. */
export async function checkNarrator({page,select,skip,state,sync,readyNext,note}) {
  let generatedNarrationRequests=0;
  const observeNarration=request=>{
    if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/dropinn'&&request.postDataJSON()?.operation==='narrate')generatedNarrationRequests++;
  };
  page.on('request',observeNarration);
  const leaveTable=async()=>{
    await page.getByRole('button',{name:'Leave & save',exact:true}).click();
    await page.getByRole('region',{name:'Story narrator',exact:true}).waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Play with friends',exact:true}).waitFor();
  };
  await page.addInitScript(()=>{
    const synth=new EventTarget();
    Object.assign(synth,{voices:[
      {voiceURI:'test-local',name:'Test English',lang:'en-US',default:false,localService:true},
      {voiceURI:'test-online',name:'Test English Natural Online',lang:'en-US',default:true,localService:false},
      {voiceURI:'test-french',name:'Test French',lang:'fr-FR',default:false,localService:true},
    ],spoken:[],cancels:0,current:null,
      getVoices(){return this.voices;},
      speak(line){this.current=line;this.spoken.push({text:line.text,rate:line.rate,pitch:line.pitch,voice:line.voice?.voiceURI,local:line.voice?.localService,at:Date.now()});},
      cancel(){this.cancels++;this.current=null;},
    });
    window.__narratorSpeech=synth;
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
    window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
  });
  await page.evaluate(()=>localStorage.setItem('dropinn-narrator',JSON.stringify({engine:'device',collapsed:false,voice:''})));
  await page.reload();
  await page.getByRole('button',{name:'Play with friends',exact:true}).click();
  await page.getByRole('button',{name:'Start a friend table',exact:true}).click();
  await page.getByRole('region',{name:'Story narrator',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.length),0,'Speech is opt in');
  const first=await page.locator('.di-narrator-words').textContent();
  await page.getByRole('button',{name:'Enable narrator voice',exact:true}).click();
  await page.waitForFunction(()=>window.__narratorSpeech.spoken.length===1);
  let spoken=await page.evaluate(()=>window.__narratorSpeech.spoken);
  assert.equal(spoken.length,1);assert.ok(spoken[0].text.startsWith(first));assert.equal(spoken[0].rate,1);
  assert.equal(spoken[0].voice,'test-local','An online default voice must not be selected');
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
  assert.equal(await page.getByRole('combobox',{name:'Narration mode'}).inputValue(),'device');
  await page.evaluate(()=>{const s=window.__narratorSpeech;s.voices.push({voiceURI:'test-natural',name:'Test English Natural',lang:'en-GB',default:false,localService:true});s.dispatchEvent(new Event('voiceschanged'));});
  await page.getByRole('combobox',{name:'Browser voice'}).locator('option[value="test-natural"]').waitFor({state:'attached'});
  assert.deepEqual(await page.getByRole('combobox',{name:'Browser voice'}).locator('option').evaluateAll(options=>options.map(option=>option.value)),['','test-local','test-natural'],'Only installed English voices are offered');
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
  await page.getByRole('combobox',{name:'Speaking speed'}).selectOption('1.5');
  await page.waitForFunction(()=>window.__narratorSpeech.spoken.at(-1).rate===1.5);
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.at(-1).pitch),1);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('group',{name:'Story settings'}).count(),0);
  const previous=await page.locator('.di-narrator-words').textContent();
  await page.evaluate(()=>window.__narratorSpeech.current.onend());
  await page.waitForFunction(text=>document.querySelector('.di-narrator-words')?.textContent!==text,previous);
  assert.ok((await page.evaluate(()=>window.__narratorSpeech.spoken.at(-1).text)).startsWith(await page.locator('.di-narrator-words').textContent()));
  const priorSpoken=await page.evaluate(()=>window.__narratorSpeech.spoken.length);
  await select(page,'investigate','tracks');await skip(page);await sync(page);
  await page.waitForFunction(count=>window.__narratorSpeech.spoken.length>count,priorSpoken);
  const settledAt=await page.evaluate(async()=>{
    const room=window.__qaAdventureStore.getState().room;
    const beats=(await import('/src/lib/dropinn/stagePlayback.ts')).stageTimeline(room);
    return Math.max(...beats.map(beat=>beat.start+beat.duration));
  });
  const deviceStartedAt=await page.evaluate(index=>window.__narratorSpeech.spoken[index].at,priorSpoken);
  assert.ok(deviceStartedAt>=settledAt,`Narration waits until the table consequences finish (started ${deviceStartedAt}, settled ${settledAt})`);
  assert.equal(generatedNarrationRequests,0,'A resolved round must not request model-generated narration');
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
  const completedCue=await page.evaluate(async()=>{
    const synth=window.__narratorSpeech;
    let completed=0;
    for(;completed<20&&synth.current?.onend;completed++){
      synth.current.onend();
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    return {completed,count:synth.spoken.length,pending:!!synth.current?.onend};
  });
  assert.ok(completedCue.completed>0&&!completedCue.pending,'Every chunk in the current device cue has finished');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.evaluate(async()=>{
    Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.length),completedCue.count,'Returning to a visible tab must not replay a finished cue');
  await page.getByRole('button',{name:'Story settings',exact:true}).click();
  await page.getByRole('button',{name:'Read this line',exact:true}).click();
  await page.waitForFunction(count=>window.__narratorSpeech.spoken.length>count,completedCue.count);
  await page.getByRole('button',{name:'Close story settings',exact:true}).click();
  await page.getByRole('button',{name:'Collapse narrator subtitles',exact:true}).click();
  await page.screenshot({path:'output/playwright/narrator-collapsed-390.png',animations:'disabled'});
  await page.reload();
  await page.getByRole('button',{name:'Show narrator subtitles',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.length),0,'Reload preserves visual preference without autoplay');
  await page.getByRole('button',{name:'Enable narrator voice',exact:true}).click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dropinn-narrator')).speed),1.5);
  await leaveTable();
  await page.getByRole('region',{name:'Story narrator',exact:true}).waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.current),null,'Leaving cancels narration');
  assert.ok(await page.evaluate(()=>window.__narratorSpeech.spoken.every(line=>line.local===true&&line.voice!=='test-online')),'No online device voice is invoked');
  note('narrator-speech-bridge',{evidence:'Mock local SpeechSynthesis: opt-in activation, filtered delayed voice list, subtitle sync, reveal timing, mute, collapse, error, visibility, completed-cue silence on return, explicit replay, reload, unmount; no audible quality assertion'});
  await page.evaluate(()=>localStorage.setItem('dropinn-narrator',JSON.stringify({engine:'natural',collapsed:false,voice:'test-natural',speed:1.25})));
  // Static download fixtures: the worker remains mocked; no live model is fetched.
  await page.route('https://huggingface.co/KittenML/**', route => {
    const path = new URL(route.request().url()).pathname;
    const bytes = path.endsWith('.onnx') ? 24369971 : path.endsWith('.npz') ? 3278902 : 688;
    return route.fulfill({ status: 200, contentType: 'application/octet-stream', body: Buffer.alloc(bytes) });
  });
  await page.addInitScript(()=>{
    window.__natural={workers:0,terminated:0,requests:[],inits:[],hold:true,fail:false,failGenerate:false,
      finishInit(stale=false){for(const item of this.inits.splice(0)){
        const receiver=stale?item.receiver:item.worker.onmessage;
        receiver?.({data:{id:item.id,type:'ready'}});
      }},
    };
    window.Worker=class {
      constructor(){window.__natural.workers++;this.alive=true;}
      postMessage(message){
        window.__natural.requests.push({...message,at:Date.now()});
        if(message.type==='cancel')return;
        const send=data=>setTimeout(()=>{if(this.alive)this.onmessage?.({data});},0);
        if(message.type==='init'){
          send({id:message.id,type:'progress',loaded:50,total:100});
          if(window.__natural.fail)send({id:message.id,type:'error',message:'Voice download failed. Please retry.'});
          else if(window.__natural.hold)window.__natural.inits.push({worker:this,id:message.id,receiver:this.onmessage});
          else send({id:message.id,type:'ready'});
        } else if(window.__natural.failGenerate)send({id:message.id,type:'error',message:'Speech synthesis failed. Please retry.'});
        else send({id:message.id,type:'audio',samples:new Float32Array(24000),sampleRate:24000});
      }
      terminate(){this.alive=false;window.__natural.terminated++;}
    };
  });
  await page.reload();
  await page.getByRole('button',{name:'Play with friends',exact:true}).click();
  await page.getByRole('button',{name:'Start a friend table',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__natural.workers),0,'No model worker before Listen');
  await page.getByRole('button',{name:'Enable narrator voice',exact:true}).click();
  await page.waitForFunction(()=>window.__natural.requests.some(item=>item.type==='init'));
  assert.equal(await page.getByRole('button',{name:'Download natural voice',exact:true}).count(),0,'Listen loads the voice without a second download prompt');
  await page.getByRole('button',{name:'Story settings',exact:true}).click();
  const settings=page.getByRole('group',{name:'Story settings'});
  assert.equal(await page.getByRole('combobox',{name:'Narration mode'}).inputValue(),'natural');
  for(const viewport of [{width:390,height:844},{width:320,height:568}]){
    await page.setViewportSize(viewport);
    const box=await settings.boundingBox();
    assert.ok(box.x>=0 && box.x+box.width<=viewport.width && box.y+box.height<=viewport.height);
    await page.screenshot({path:`output/playwright/narrator-loading-${viewport.width}.png`,animations:'disabled'});
  }
  await settings.getByText('Loading storyteller · 50%',{exact:true}).waitFor();
  await settings.getByRole('button',{name:'Cancel voice loading',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__natural.terminated),1);
  await page.evaluate(()=>window.__natural.finishInit(true));
  await page.getByRole('button',{name:'Enable narrator voice',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__natural.requests.filter(item=>item.type==='generate').length),0,'Canceled initialization cannot start speech when its late ready callback arrives');
  await page.evaluate(()=>{window.__natural.hold=false;window.__natural.fail=true;});
  await page.getByRole('button',{name:'Read this line',exact:true}).click();
  await page.getByText('Voice download failed. Please retry.',{exact:true}).waitFor();
  await page.evaluate(()=>window.__natural.fail=false);
  await page.getByRole('button',{name:'Retry voice',exact:true}).click();
  await page.getByRole('button',{name:'Mute narrator',exact:true}).waitFor();
  await page.waitForFunction(()=>window.__natural.requests.some(item=>item.type==='generate'));
  const storyteller=page.getByRole('combobox',{name:'Storyteller',exact:true});
  const choices=await storyteller.locator('option').evaluateAll(options=>options.map(option=>option.value));
  assert.deepEqual(choices,['Bella','Jasper','Luna','Bruno','Rosie','Hugo','Kiki','Leo']);
  for(const voice of choices){
    await storyteller.selectOption(voice);
    await page.waitForFunction(selected=>window.__natural.requests.some(item=>item.type==='generate'&&item.voice===selected),voice);
  }
  await page.getByRole('combobox',{name:'Speaking speed'}).selectOption('1.5');
  await page.waitForFunction(()=>window.__natural.requests.some(item=>item.type==='generate'&&item.speed===1.5));
  await page.getByRole('button',{name:'Mute narrator',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.length),0,'Natural voice does not invoke device speech');
  await page.getByRole('button',{name:'Close story settings',exact:true}).click();
  await leaveTable();
  note('narrator-natural-bridge',{evidence:'Mock worker, real AudioContext: one-click loading, mobile controls, progress, cancel/late-ready, failure, retry, all eight voice requests, speed, playback and mute; no audible quality assertion'});
  await page.evaluate(()=>localStorage.setItem('dropinn-narrator',JSON.stringify({engine:'auto',collapsed:false,voice:'test-local',naturalVoice:'Jasper',speed:1.25})));
  await page.reload();
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Play with friends',exact:true}).click();
  await page.getByRole('button',{name:'Start a friend table',exact:true}).click();
  await page.getByRole('button',{name:'Enable narrator voice',exact:true}).click();
  await page.waitForFunction(()=>window.__narratorSpeech.spoken.length===1&&window.__natural.inits.length===1);
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken[0].voice),'test-local','Automatic mode starts with a local English voice while the model prepares');
  await page.getByRole('button',{name:'Story settings',exact:true}).click();
  assert.equal(await page.getByRole('combobox',{name:'Narration mode'}).inputValue(),'auto');
  await page.evaluate(()=>{
    const s=window.__narratorSpeech;
    window.__bridgeSnapshot={current:s.current,count:s.spoken.length,cancels:s.cancels};
    window.__natural.finishInit();
  });
  await settings.getByRole('button',{name:'Cancel voice loading',exact:true}).waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.current===window.__bridgeSnapshot.current),true,'Natural readiness does not cut off the current device sentence');
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.length===window.__bridgeSnapshot.count&&window.__narratorSpeech.cancels===window.__bridgeSnapshot.cancels),true,'Natural readiness does not restart the current cue');
  assert.equal(await page.evaluate(()=>window.__natural.requests.filter(item=>item.type==='generate').length),0,'Automatic mode waits for a new cue before changing engine');
  await page.getByRole('button',{name:'Close story settings',exact:true}).click();
  const bridgeSpoken=await page.evaluate(()=>window.__narratorSpeech.spoken.length);
  await select(page,'investigate','tracks');await skip(page);await sync(page);
  try { await page.waitForFunction(()=>window.__natural.requests.some(item=>item.type==='generate'&&item.voice==='Jasper'),null,{timeout:12000}); }
  catch(error){
    note('narrator-automatic-handoff-diagnostic',await page.evaluate(()=>({requests:window.__natural.requests.map(({assets,...request})=>request),workers:window.__natural.workers,terminated:window.__natural.terminated,spoken:window.__narratorSpeech.spoken,cancels:window.__narratorSpeech.cancels,error:document.querySelector('.di-narrator-error')?.textContent,caption:document.querySelector('.di-narrator-words')?.textContent})));
    throw error;
  }
  const naturalStart=await page.evaluate(async()=>{
    const room=window.__qaAdventureStore.getState().room;
    const beats=(await import('/src/lib/dropinn/stagePlayback.ts')).stageTimeline(room);
    return {settledAt:Math.max(...beats.map(beat=>beat.start+beat.duration)),startedAt:window.__natural.requests.find(item=>item.type==='generate').at};
  });
  assert.ok(naturalStart.startedAt>=naturalStart.settledAt,'The next natural cue also waits for the table consequences');
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.length),bridgeSpoken,'The next cue uses the ready natural voice, without a duplicate device reading');
  await readyNext(page);
  await page.evaluate(()=>window.__natural.failGenerate=true);
  const commitInvestigation=async()=>{
    const target=await page.evaluate(async()=>{
      const room=window.__qaAdventureStore.getState().room;
      return (await import('/src/lib/dropinn/scene.ts')).getScene(room).targets.find(item=>item.tokens.includes('investigate')).id;
    });
    await select(page,'investigate',target);await skip(page);await sync(page);
  };
  await commitInvestigation();
  try { await page.waitForFunction(count=>window.__narratorSpeech.spoken.length>count,bridgeSpoken,{timeout:12000}); }
  catch (error) {
    note('narrator-fallback-diagnostic', await page.evaluate(() => ({ requests: window.__natural.requests.map(({assets,...request})=>request), spoken: window.__narratorSpeech.spoken, error: document.querySelector('.di-narrator-error')?.textContent, caption: document.querySelector('.di-narrator-words')?.textContent, control: [...document.querySelectorAll('button')].map(button=>button.getAttribute('aria-label')).filter(label=>label?.includes('narrator')) })));
    throw error;
  }
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.at(-1).voice),'test-local','A failed natural sentence falls back to a verified local voice');
  assert.match(await page.locator('.di-narrator-error').textContent(),/Using your device voice because the natural voice could not continue/);
  await page.getByRole('button',{name:'Mute narrator',exact:true}).waitFor();
  const afterFallback=await page.evaluate(()=>({spoken:window.__narratorSpeech.spoken.length,generated:window.__natural.requests.filter(item=>item.type==='generate').length}));
  // Even if synthesis would now succeed, automatic mode stays with the working
  // local voice until the listener explicitly requests another natural attempt.
  await page.evaluate(()=>window.__natural.failGenerate=false);
  await readyNext(page);
  await commitInvestigation();
  await page.waitForFunction(count=>window.__narratorSpeech.spoken.length>count,afterFallback.spoken,{timeout:12000});
  assert.equal(await page.evaluate(()=>window.__natural.requests.filter(item=>item.type==='generate').length),afterFallback.generated,'Subsequent cues keep using the local fallback without retrying synthesis');
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.at(-1).voice),'test-local');
  const beforeLocalFailure=await page.evaluate(()=>window.__narratorSpeech.spoken.length);
  await page.evaluate(()=>window.__narratorSpeech.current.onerror({error:'synthesis-failed'}));
  await page.getByRole('button',{name:'Enable narrator voice',exact:true}).waitFor();
  await page.getByRole('group',{name:'Story settings'}).waitFor();
  assert.match(await page.locator('.di-narrator-error').textContent(),/Voice unavailable/);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.length),beforeLocalFailure,'A failed fallback voice stops instead of looping into another device reading');
  assert.equal(await page.evaluate(()=>window.__natural.requests.filter(item=>item.type==='generate').length),afterFallback.generated,'A failed fallback voice does not silently retry natural speech');
  await page.getByRole('button',{name:'Retry voice',exact:true}).click();
  await page.waitForFunction(count=>window.__natural.requests.filter(item=>item.type==='generate').length>count,afterFallback.generated);
  assert.equal(await page.locator('.di-narrator-error').count(),0,'Explicit retry clears the fallback explanation and resumes natural speech');
  await page.getByRole('button',{name:'Close story settings',exact:true}).click();
  await page.getByRole('button',{name:'Mute narrator',exact:true}).click();
  await readyNext(page);
  await leaveTable();
  // Deliver a held initialization callback after cancellation to exercise the
  // activation ticket even if a browser has already queued the worker message.
  await page.reload();
  await page.getByRole('button',{name:'Play with friends',exact:true}).click();
  await page.getByRole('button',{name:'Start a friend table',exact:true}).click();
  await page.evaluate(()=>{const s=window.__narratorSpeech;s.voices=s.voices.filter(voice=>!voice.localService);s.dispatchEvent(new Event('voiceschanged'));});
  await page.getByRole('button',{name:'Enable narrator voice',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken.length),0,'Automatic mode waits for a local voice rather than invoking an available online voice');
  await page.evaluate(()=>{const s=window.__narratorSpeech;s.voices.push({voiceURI:'late-local',name:'Late English voice',lang:'en-GB',default:false,localService:true});s.dispatchEvent(new Event('voiceschanged'));});
  await page.waitForFunction(()=>window.__narratorSpeech.spoken.length===1&&window.__natural.inits.length===1);
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.spoken[0].voice),'late-local','A delayed local English voice starts the automatic bridge');
  await page.getByRole('button',{name:'Story settings',exact:true}).click();
  await settings.getByRole('button',{name:'Cancel voice loading',exact:true}).click();
  await page.evaluate(()=>window.__natural.finishInit(true));
  await page.getByRole('button',{name:'Enable narrator voice',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__narratorSpeech.current),null,'Canceling automatic preparation also stops the temporary voice');
  assert.equal(await page.evaluate(()=>window.__natural.terminated),1);
  assert.equal(await page.evaluate(()=>window.__natural.requests.filter(item=>item.type==='generate').length),0,'Late automatic readiness cannot re-enable narration');
  await page.getByRole('button',{name:'Close story settings',exact:true}).click();
  await leaveTable();
  note('narrator-automatic-bridge',{evidence:'Mock local voice plus held worker: immediate listening, uninterrupted current cue on readiness, natural voice on the next settled cue, synthesis failure with visible local fallback, later cues stay local, local fallback failure stops without a loop, explicit natural retry, delayed local voice availability, cancellation rejecting late readiness; no audible quality assertion'});
  await page.evaluate(()=>localStorage.setItem('dropinn-narrator',JSON.stringify({engine:'device',collapsed:true,voice:'test-natural'})));
  await page.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{configurable:true,value:undefined});Object.defineProperty(window,'AudioContext',{configurable:true,value:undefined});});
  await page.reload();
  await page.getByRole('button',{name:'Play with friends',exact:true}).click();
  await page.getByRole('button',{name:'Start a friend table',exact:true}).click();
  await page.getByRole('button',{name:'Show narrator subtitles',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Narrator voice unavailable',exact:true}).isDisabled(),true);
  assert.ok(await page.locator('.di-narrator-words').textContent());
  assert.equal(generatedNarrationRequests,0,'Every narrator mode uses confirmed local cues without token-billed narration requests');
  page.off('request',observeNarration);
  note('narrator-subtitles-without-browser-speech');
}
