import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, Settings2, Volume2, VolumeX, X } from 'lucide-react';
import type { AdventureRoom } from '../../lib/dropinn/types';
import { captionDuration, narratorCaptions, narratorCue } from '../../lib/dropinn/narrator';
import { narratorPreference, narratorSentences, type NarratorEngine } from '../../lib/dropinn/narratorAudio';
import { narratorDownloadSnapshot, narratorSize, refreshNarratorDownload, subscribeNarratorDownload } from '../../lib/dropinn/narratorDownload';
import { narratorNaturalVoices } from '../../lib/dropinn/narratorVoices';
import { NarratorDownload } from './NarratorDownload';
import { NarratorPlayer } from '../../lib/dropinn/narratorPlayer';
import './narrator.css';
import { duckTableSound } from './tableSound';

const preferenceKey = 'dropinn-narrator';
function readPreference() {
  try { return narratorPreference(localStorage.getItem(preferenceKey)); }
  catch { return narratorPreference(null); }
}

export function Narrator({ room, pacedTurns, onPacedTurns, suppressCue, deferCue = false, portalTarget }: { room: AdventureRoom; pacedTurns: boolean; onPacedTurns: (value: boolean) => void; suppressCue: boolean; deferCue?: boolean; portalTarget?: HTMLElement | null }) {
  const inline = useRef<HTMLDivElement>(null);
  const height = useRef(44);
  useLayoutEffect(() => {
    if (portalTarget || !inline.current) return;
    const node = inline.current;
    const observer = new ResizeObserver(() => { height.current = node.getBoundingClientRect().height; });
    height.current = node.getBoundingClientRect().height;
    observer.observe(node); return () => observer.disconnect();
  }, [portalTarget]);
  const [preference, setPreference] = useState(readPreference);
  const pack = useSyncExternalStore(subscribeNarratorDownload, narratorDownloadSnapshot);
  const [enabled, setEnabled] = useState(false);
  useEffect(() => { duckTableSound(enabled); return () => duckTableSound(false); }, [enabled]);
  const [settings, setSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [visibility, setVisibility] = useState(0);
  const [replay, setReplay] = useState(0);
  const [display, setDisplay] = useState({ id: '', text: '' });
  const player = useRef<NarratorPlayer>();
  if (!player.current) player.current = new NarratorPlayer();
  const current = useRef({ id: '', segment: 0 });
  const suppressed = useRef('');
  const activation = useRef(0);
  const preparing = useRef(false);
  const run = useRef(0);
  const activeKey = useRef('');
  const hasSpoken = useRef(false);
  // Automatic mode changes voice only between cues, never halfway through a sentence.
  const cueEngine = useRef<{ id: string; engine: 'natural' | 'device' }>();
  const settingsButton = useRef<HTMLButtonElement>(null);
  const cue = useMemo(() => narratorCue(room), [room.id, room.chapter, room.turn, room.phase, room.events, room.outcomes]);
  const sentences = useMemo(() => narratorSentences(cue.text), [cue.text]);
  const captions = useMemo(() => narratorCaptions(cue.text), [cue.text]);
  const caption = deferCue ? 'The party’s moves are unfolding…' : display.id === cue.id ? display.text : captions[0] ?? '';
  const speech = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : undefined;
  const naturalSupported = typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof AudioContext !== 'undefined';
  const supported = naturalSupported || !!speech;

  function stop() { ++run.current; activeKey.current = ''; hasSpoken.current = false; player.current!.stop(); }
  function devicePassageActive() { return cueEngine.current?.engine === 'device' && !!activeKey.current; }
  function fail(reason: unknown) {
    if (reason instanceof DOMException && reason.name === 'AbortError') return;
    stop(); setEnabled(false); setLoading(false);
    setError(reason instanceof Error ? reason.message : 'Voice unavailable. You can still follow the subtitles.');
    setSettings(true);
  }
  function start(engine = preference.engine, voice = preference.voice) {
    if (document.hidden || suppressed.current === cue.id || suppressCue || deferCue) return;
    if (engine === 'auto' && cueEngine.current?.id !== cue.id) cueEngine.current = { id: cue.id, engine: player.current!.ready ? 'natural' : 'device' };
    const actual = engine === 'auto' ? cueEngine.current!.engine : engine;
    const key = `${cue.id}:${cue.text}:${actual}:${voice}:${preference.naturalVoice}:${preference.speed}:${replay}`;
    if (activeKey.current === key) return;
    stop(); activeKey.current = key;
    const ticket = run.current;
    if (current.current.id !== cue.id) current.current = { id: cue.id, segment: 0 };
    void player.current!.play(sentences, current.current.segment, actual, voice, (text, segment) => {
      if (run.current !== ticket) return;
      hasSpoken.current = true;
      current.current = { id: cue.id, segment }; setDisplay({ id: cue.id, text });
    }, preference.speed, preference.naturalVoice).catch(reason => {
      if (run.current !== ticket || (reason instanceof DOMException && reason.name === 'AbortError')) return;
      // A local device voice may disappear while the natural voice is preparing.
      if (engine === 'auto' && actual === 'device' && (preparing.current || player.current!.ready)) {
        stop(); cueEngine.current = undefined; setEnabled(false);
        if (player.current!.ready) { setEnabled(true); setReplay(value => value + 1); }
      } else fail(reason);
    });
  }

  async function activate(engine = preference.engine) {
    const ticket = ++activation.current;
    stop(); if (preparing.current) player.current!.cancelDownload(); preparing.current = false;
    setEnabled(false); setLoading(false); setError('');
    cueEngine.current = undefined; current.current = { id: cue.id, segment: 0 };
    setPreference(value => ({ ...value, engine }));
    if (engine === 'device') {
      if (!speech) return;
      setEnabled(true); start(engine); return;
    }
    // Voice enumeration often completes after the click. The player waits briefly
    // for a verified local voice while the model prepares independently.
    const bridge = engine === 'auto' && !!speech && !player.current!.ready;
    if (!naturalSupported) {
      if (engine === 'auto' && speech) { setEnabled(true); start('device'); }
      else { setSettings(true); setError('Natural narration is unavailable on this device.'); }
      return;
    }
    // Resume audio during this click; never defer it until the download finishes.
    const unlocked = player.current!.unlock().catch(reason => {
      if (ticket === activation.current) {
        if (!bridge) fail(reason);
        else { setLoading(false); setError('The natural voice is unavailable. Trying your local device voice.'); }
      }
      return false;
    });
    preparing.current = true;
    setLoading(true); setProgress('Getting the storyteller ready…');
    if (bridge) { setEnabled(true); start('auto'); }
    const audioReady = await unlocked;
    if (ticket !== activation.current) return;
    if (audioReady === false) { preparing.current = false; return; }
    player.current!.onProgress = (loaded, total) => {
      if (ticket === activation.current) setProgress(total && loaded >= total ? 'Warming up the storyteller…' : total ? `Loading storyteller · ${Math.floor(loaded / total * 100)}%${bridge && hasSpoken.current ? ' · Device voice is playing' : ''}` : 'Getting the storyteller ready…');
    };
    try {
      await player.current!.initialize(true);
      if (ticket !== activation.current) return;
      preparing.current = false; setLoading(false); setProgress(''); setEnabled(true);
      if (!(devicePassageActive() && hasSpoken.current)) {
        cueEngine.current = undefined; current.current = { id: '', segment: 0 }; setReplay(value => value + 1);
      }
      // A bridge finishes in its original voice; the next cue uses the ready model.
    } catch (reason) {
      if (ticket !== activation.current) return;
      preparing.current = false; setLoading(false);
      if (reason instanceof DOMException && reason.name === 'AbortError') { if (!bridge) setEnabled(false); }
      else if (bridge && devicePassageActive()) setError(hasSpoken.current
        ? 'The natural voice could not load. Your device voice can keep reading. Retry in Story settings.'
        : 'The natural voice could not load. Trying your local device voice.');
      else fail(reason);
    }
  }
  function cancelLoading() {
    ++activation.current; preparing.current = false; stop(); player.current!.cancelDownload(); setLoading(false); setProgress(''); setEnabled(false);
  }
  function toggleVoice() {
    if (loading) { cancelLoading(); return; }
    if (enabled) { ++activation.current; stop(); setEnabled(false); return; }
    void activate();
  }
  const closeSettings = () => { setSettings(false); settingsButton.current?.focus(); };

  useEffect(() => { try { localStorage.setItem(preferenceKey, JSON.stringify(preference)); } catch { /* Optional preference. */ } }, [preference]);
  useEffect(() => {
    void refreshNarratorDownload();
    const removed = () => { ++activation.current; preparing.current = false; stop(); player.current!.cancelDownload(); player.current!.clearAudioCache(); setEnabled(false); setLoading(false); };
    window.addEventListener('dropinn-narrator-removed', removed);
    return () => window.removeEventListener('dropinn-narrator-removed', removed);
  }, []);
  useEffect(() => {
    if (!speech) return;
    const update = () => { try { setVoices(speech.getVoices().filter(voice => voice.localService === true && /^en(?:[-_]|$)/i.test(voice.lang))); } catch { setVoices([]); } };
    update(); speech.addEventListener('voiceschanged', update);
    return () => speech.removeEventListener('voiceschanged', update);
  }, [speech]);
  useEffect(() => {
    const changed = () => { if (document.hidden) stop(); setVisibility(value => value + 1); };
    document.addEventListener('visibilitychange', changed);
    return () => { ++activation.current; ++run.current; document.removeEventListener('visibilitychange', changed); player.current!.dispose(); activeKey.current = ''; };
  }, []);
  useEffect(() => {
    if (suppressCue) suppressed.current = cue.id;
    if (document.hidden || suppressed.current === cue.id || deferCue) { stop(); return; }
    if (enabled) { start(); return; }
    stop();
    let index = Math.max(0, captions.indexOf(caption));
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      if (index >= captions.length - 1) return;
      index++;
      const text = captions[index];
      const offset = captions.slice(0, index).join(' ').length;
      let end = 0, segment = 0;
      for (; segment < sentences.length - 1; segment++) { end += sentences[segment].length + 1; if (offset < end) break; }
      current.current = { id: cue.id, segment };
      setDisplay({ id: cue.id, text });
      timer = setTimeout(next, captionDuration(text));
    };
    timer = setTimeout(next, captionDuration(captions[index] ?? ''));
    return () => clearTimeout(timer);
  }, [cue.id, cue.text, enabled, preference.engine, preference.voice, preference.naturalVoice, preference.speed, visibility, replay, suppressCue, deferCue]);

  const content = <section className={`di-narrator ${preference.collapsed ? 'is-collapsed' : ''}`} aria-label="Story narrator" onKeyDown={event => { if (event.key === 'Escape' && settings) { event.preventDefault(); event.stopPropagation(); closeSettings(); } }}>
    <div className="di-narrator-line">
      <button className="di-narrator-caption" aria-label={preference.collapsed ? 'Show narrator subtitles' : 'Collapse narrator subtitles'} aria-describedby={preference.collapsed ? undefined : 'narrator-caption-text'} aria-expanded={!preference.collapsed} onClick={() => { setPreference({ ...preference, collapsed: !preference.collapsed }); setSettings(false); }}>
        {preference.collapsed ? <><MessageCircle size={18} /><span>Narrator</span></> : <><span className="di-narrator-label">The storyteller</span><span id="narrator-caption-text" className="di-narrator-words" key={`${cue.id}:${caption}`}>{caption}</span></>}
      </button>
      <button className="di-narrator-voice" disabled={!supported} onClick={toggleVoice} aria-label={supported ? enabled ? 'Mute narrator' : loading ? 'Cancel voice loading' : 'Enable narrator voice' : 'Narrator voice unavailable'} aria-pressed={enabled}>{enabled ? <Volume2 size={18} /> : <><VolumeX size={18} /><span>{loading ? 'Loading' : 'Listen'}</span></>}</button>
      <button ref={settingsButton} className="di-narrator-settings-button" aria-label="Story settings" aria-expanded={settings} onClick={() => setSettings(!settings)}><Settings2 size={17} /></button>
    </div>
    {(error || loading) && !settings && <p className="di-narrator-error" role="status">{error || progress}</p>}
    {settings && <div className="di-narrator-settings" role="group" aria-label="Story settings">
      <header><strong>Story settings</strong><button aria-label="Close story settings" onClick={closeSettings}><X size={18} /></button></header>
      <label className="di-narrator-check"><input type="checkbox" checked={pacedTurns} onChange={event => onPacedTurns(event.target.checked)} /><span>Pace turn results<small>Show each move before the full recap. Turning this off automatically skips your wait between turns.</small></span></label>
      <strong className="di-narrator-settings-subhead">A voice for the story</strong>
      <label>Narration mode<select value={preference.engine} onChange={event => { cancelLoading(); cueEngine.current = undefined; setError(''); setPreference({ ...preference, engine: event.target.value as NarratorEngine }); }}>
        <option value="auto">Automatic · start listening sooner</option><option value="natural" disabled={!naturalSupported}>Natural storyteller</option><option value="device" disabled={!speech}>Device voice · no voice download</option>
      </select></label>
      {preference.engine !== 'device' && <label>Storyteller<select value={preference.naturalVoice} onChange={event => setPreference({ ...preference, naturalVoice: event.target.value })}>{narratorNaturalVoices.map(voice => <option key={voice.id} value={voice.id}>{voice.name} · {voice.description}</option>)}</select></label>}
      <label>Speaking speed<select value={preference.speed} onChange={event => setPreference({ ...preference, speed: Number(event.target.value) })}>
        <option value={0.75}>0.75× · Slower</option><option value={1}>1× · Original</option><option value={1.25}>1.25× · Brisk</option><option value={1.5}>1.5× · Fast</option><option value={1.75}>1.75× · Faster</option><option value={2}>2× · Fastest</option>
      </select></label>
      {preference.engine === 'device' && <label>Browser voice<select disabled={!speech} value={preference.voice} onChange={event => { setPreference({ ...preference, voice: event.target.value }); if (enabled) start('device', event.target.value); }}>
        <option value="">Storyteller · automatic</option>{voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}</option>)}
      </select></label>}
      {preference.engine !== 'device' ? <><p>Press Listen and the storyteller loads automatically{pack.total ? ` (${narratorSize(pack.total)} the first time)` : ''}. Saved for every adventure. Speech stays on your device, with no usage fees.</p>{preference.engine === 'auto' && <p>An available local device voice can start while the storyteller prepares. Voices change between passages.</p>}<NarratorDownload compact /></> : <p>Uses an installed English voice. No voice pack or online speech service. Voice quality depends on your device.</p>}
      {error && <p className="di-narrator-error" role="status">{error}</p>}
      {loading ? <><p role="status">{progress}</p><button className="di-narrator-replay" onClick={cancelLoading}>Cancel voice loading</button></> : <>
        <button className="di-narrator-replay" disabled={!supported} onClick={() => void activate()}>{error ? 'Retry voice' : 'Read this line'}</button>
        {error && voices.length > 0 && <button className="di-narrator-replay" onClick={() => void activate('device')}>Use device voice</button>}
      </>}
    </div>}
  </section>;
  return <div className="di-narrator-slot" ref={inline} style={portalTarget ? { height: height.current } : undefined}>{portalTarget ? createPortal(content, portalTarget) : content}</div>;
}
