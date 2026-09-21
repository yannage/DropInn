import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Settings2, Volume2, VolumeX, X } from 'lucide-react';
import type { AdventureRoom } from '../../lib/dropinn/types';
import { captionDuration, narratorCaptions, narratorCue, narratorVoice } from '../../lib/dropinn/narrator';
import './narrator.css';

const preferenceKey='dropinn-narrator';
function readPreference(): {collapsed:boolean;voice:string} {
  try { const saved=JSON.parse(localStorage.getItem(preferenceKey) ?? '{}'); return {collapsed:saved.collapsed===true,voice:typeof saved.voice==='string'?saved.voice:''}; }
  catch { return {collapsed:false,voice:''}; }
}

export function Narrator({room}:{room:AdventureRoom}) {
  const [preference,setPreference]=useState(readPreference);
  // Speech starts only after this visit's explicit click, including on browsers requiring activation.
  const [enabled,setEnabled]=useState(false);
  const [settings,setSettings]=useState(false);
  const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
  const [error,setError]=useState('');
  const [hidden,setHidden]=useState(document.hidden);
  const [visibilityRevision,setVisibilityRevision]=useState(0);
  const cue=useMemo(()=>narratorCue(room),[room.id,room.chapter,room.turn,room.phase,room.events,room.outcomes]);
  const captions=useMemo(()=>narratorCaptions(cue.text),[cue.text]);
  const [playhead,setPlayhead]=useState({id:cue.id,index:0});
  const index=playhead.id===cue.id?Math.min(playhead.index,Math.max(0,captions.length-1)):0;
  const caption=captions[index] ?? '';
  const supported=typeof window.speechSynthesis!=='undefined' && typeof window.SpeechSynthesisUtterance!=='undefined';
  const speech=supported?window.speechSynthesis:undefined;
  const utterance=useRef<SpeechSynthesisUtterance>();
  const activeKey=useRef('');
  const generation=useRef(0);
  const settingsButton=useRef<HTMLButtonElement>(null);
  const availableVoices=() => {try {return speech?.getVoices() ?? [];}catch{return [];}};
  const next=() => setPlayhead({id:cue.id,index:Math.min(index+1,captions.length-1)});

  const stop=() => {
    generation.current++;
    if(utterance.current) {utterance.current.onend=null;utterance.current.onerror=null;utterance.current=undefined;speech?.cancel();}
    activeKey.current='';
  };
  const speak=(text:string,key:string,preferred=preference.voice) => {
    if(!speech || !text || document.hidden) return;
    stop();
    const ticket=generation.current;
    const line=new SpeechSynthesisUtterance(text);
    const voice=narratorVoice(availableVoices(),preferred);
    if(voice) line.voice=voice;
    line.lang=voice?.lang ?? 'en-US';
    line.rate=.92; line.pitch=.95; line.volume=1;
    line.onend=() => {if(generation.current===ticket) {utterance.current=undefined;next();}};
    line.onerror=event => {
      if(generation.current!==ticket || event.error==='canceled' || event.error==='interrupted') return;
      utterance.current=undefined;setEnabled(false);setError('Voice unavailable. You can still follow the subtitles.');
    };
    utterance.current=line;activeKey.current=key;
    try {speech.speak(line);} catch {utterance.current=undefined;setEnabled(false);setError('Voice unavailable. You can still follow the subtitles.');}
  };

  useEffect(()=>{try {localStorage.setItem(preferenceKey,JSON.stringify(preference));}catch{/* Optional preference. */}},[preference]);
  useEffect(()=>{
    if(!speech) return;
    const update=()=>setVoices(availableVoices()); update();
    speech.addEventListener('voiceschanged',update);
    return ()=>speech.removeEventListener('voiceschanged',update);
  },[speech]);
  useEffect(()=>{
    const visibility=()=>{setHidden(document.hidden);setVisibilityRevision(value=>value+1);if(document.hidden) stop();};
    document.addEventListener('visibilitychange',visibility);
    return ()=>{document.removeEventListener('visibilitychange',visibility);stop();};
  },[speech]);
  useEffect(()=>{
    if(hidden) return;
    const key=`${cue.id}:${index}:${preference.voice}`;
    if(enabled) {
      if(activeKey.current!==key) speak(caption,key);
      // Some engines fail silently. Return to readable subtitles instead of hanging a queue.
      const watchdog=window.setTimeout(()=>{if(utterance.current) {stop();setEnabled(false);setError('Voice paused. Tap the speaker to try again.');}},20000);
      return ()=>window.clearTimeout(watchdog);
    }
    const timer=window.setTimeout(next,captionDuration(caption));
    return ()=>window.clearTimeout(timer);
  },[cue.id,index,caption,enabled,hidden,visibilityRevision,preference.voice]);

  const toggleVoice=()=>{
    setError('');
    if(enabled) {stop();setEnabled(false);return;}
    if(!supported) return;
    setEnabled(true);
    speak(caption,`${cue.id}:${index}:${preference.voice}`); // In the activating click, not just an effect.
  };
  const closeSettings=()=>{setSettings(false);settingsButton.current?.focus();};
  return <section className={`di-narrator ${preference.collapsed?'is-collapsed':''}`} aria-label="Story narrator" onKeyDown={event=>{if(event.key==='Escape' && settings) {event.stopPropagation();closeSettings();}}}>
    <div className="di-narrator-line">
      <button className="di-narrator-caption" aria-label={preference.collapsed?'Show narrator subtitles':'Collapse narrator subtitles'} aria-describedby={preference.collapsed?undefined:'narrator-caption-text'} aria-expanded={!preference.collapsed} onClick={()=>{setPreference({...preference,collapsed:!preference.collapsed});setSettings(false);}}>
        {preference.collapsed ? <><MessageCircle size={18}/><span>Narrator</span></> : <><span className="di-narrator-label">The storyteller</span><span id="narrator-caption-text" className="di-narrator-words" key={`${cue.id}:${index}`}>{caption}</span></>}
      </button>
      <button className="di-narrator-voice" disabled={!supported} onClick={toggleVoice} aria-label={supported?enabled?'Mute narrator':'Enable narrator voice':'Narrator voice unavailable'} aria-pressed={enabled} title={supported?enabled?'Mute storyteller':'Read with your browser’s voice':'This browser has no speech synthesis'}>{enabled?<Volume2 size={18}/>:<VolumeX size={18}/>}</button>
      {!preference.collapsed && <button ref={settingsButton} className="di-narrator-settings-button" aria-label="Narrator voice settings" aria-expanded={settings} onClick={()=>setSettings(!settings)}><Settings2 size={17}/></button>}
    </div>
    {error && !preference.collapsed && <p className="di-narrator-error" role="status">{error}</p>}
    {settings && <div className="di-narrator-settings" role="group" aria-label="Narrator settings">
      <header><strong>A voice for the story</strong><button aria-label="Close narrator settings" onClick={closeSettings}><X size={18}/></button></header>
      <label>Browser voice<select disabled={!supported} value={preference.voice} onChange={event=>{setPreference({...preference,voice:event.target.value});if(enabled) speak(caption,`${cue.id}:${index}:${event.target.value}`,event.target.value);}}>
        <option value="">Storyteller · automatic</option>{voices.map(voice=><option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}</option>)}
      </select></label>
      <p>{supported?'A measured pace, using the voices available on this device. Voice quality varies by browser.':'Subtitles work here, but this browser does not provide a voice.'}</p>
      <button className="di-narrator-replay" disabled={!supported} onClick={()=>{setError('');setEnabled(true);speak(caption,`${cue.id}:${index}:${preference.voice}`);}}>Read this line</button>
    </div>}
  </section>;
}
