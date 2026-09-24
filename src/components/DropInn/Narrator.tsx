import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { MessageCircle, Settings2, Volume2, VolumeX, X } from 'lucide-react';
import type { AdventureRoom } from '../../lib/dropinn/types';
import { captionDuration, narratorCaptions, narratorCue } from '../../lib/dropinn/narrator';
import { narratorPreference, narratorSentences, type NarratorEngine } from '../../lib/dropinn/narratorAudio';
import { narratorDownloaded, narratorDownloadSnapshot, narratorSize, refreshNarratorDownload, subscribeNarratorDownload } from '../../lib/dropinn/narratorDownload';
import { NarratorDownload } from './NarratorDownload';
import { NarratorPlayer } from '../../lib/dropinn/narratorPlayer';
import './narrator.css';

const preferenceKey = 'dropinn-narrator';
function readPreference() {
  try { return narratorPreference(localStorage.getItem(preferenceKey)); }
  catch { return narratorPreference(null); }
}

export function Narrator({ room, pacedTurns, onPacedTurns, suppressCue }: { room: AdventureRoom; pacedTurns: boolean; onPacedTurns: (value: boolean) => void; suppressCue: boolean }) {
  const [preference, setPreference] = useState(readPreference);
  const pack = useSyncExternalStore(subscribeNarratorDownload, narratorDownloadSnapshot);
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState(false);
  const [downloadChoice, setDownloadChoice] = useState(false);
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
  const run = useRef(0);
  const activeKey = useRef('');
  const settingsButton = useRef<HTMLButtonElement>(null);
  const cue = useMemo(() => narratorCue(room), [room.id, room.chapter, room.turn, room.phase, room.events, room.outcomes]);
  const sentences = useMemo(() => narratorSentences(cue.text), [cue.text]);
  const captions = useMemo(() => narratorCaptions(cue.text), [cue.text]);
  const caption = display.id === cue.id ? display.text : captions[0] ?? '';
  const speech = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : undefined;
  const naturalSupported = typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof AudioContext !== 'undefined';
  const supported = naturalSupported || !!speech;

  function stop() { ++run.current; activeKey.current = ''; player.current!.stop(); }
  function fail(reason: unknown) {
    if (reason instanceof DOMException && reason.name === 'AbortError') return;
    stop(); setEnabled(false); setLoading(false);
    setError(reason instanceof Error ? reason.message : 'Voice unavailable. You can still follow the subtitles.');
    setSettings(true);
  }
  function start(engine = preference.engine, voice = preference.voice) {
    if (document.hidden || suppressed.current === cue.id || suppressCue) return;
    const key = `${cue.id}:${cue.text}:${engine}:${voice}:${preference.speed}:${replay}`;
    if (activeKey.current === key) return;
    stop(); activeKey.current = key;
    const ticket = run.current;
    if (current.current.id !== cue.id) current.current = { id: cue.id, segment: 0 };
    void player.current!.play(sentences, current.current.segment, engine, voice, (text, segment) => {
      if (run.current !== ticket) return;
      current.current = { id: cue.id, segment }; setDisplay({ id: cue.id, text });
    }, preference.speed).catch(reason => { if (run.current === ticket) fail(reason); });
  }

  async function activate(engine = preference.engine, download = false) {
    const ticket = ++activation.current;
    stop(); setEnabled(false); setError('');
    setPreference(value => ({ ...value, engine }));
    if (engine === 'device') {
      if (!speech) return;
      setDownloadChoice(false); setEnabled(true); start(engine); return;
    }
    if (!naturalSupported) { setSettings(true); setError('Natural narration is unavailable on this device.'); return; }
    // Resume audio during this click; never defer it until the download finishes.
    const unlocked = player.current!.unlock().catch(reason => { if (ticket === activation.current) fail(reason); return false; });
    if (!download && !player.current!.ready && !(await narratorDownloaded())) {
      if (ticket === activation.current) { setDownloadChoice(true); setSettings(true); }
      return;
    }
    if (ticket !== activation.current || (await unlocked) === false) return;
    setDownloadChoice(false); setLoading(true); setProgress('Preparing Bella…');
    player.current!.onProgress = (loaded, total) => {
      if (ticket === activation.current) setProgress(total && loaded >= total ? 'Preparing Bella…' : total ? `Downloading voice · ${Math.floor(loaded / total * 100)}%` : 'Downloading voice…');
    };
    try {
      await player.current!.initialize(download);
      if (ticket !== activation.current) return;
      setLoading(false); setEnabled(true); setReplay(value => value + 1);
      // The effect starts the latest cue, rather than the one at download start.
    } catch (reason) {
      if (ticket !== activation.current) return;
      if (reason instanceof DOMException && reason.name === 'AbortError') { setLoading(false); setEnabled(false); setDownloadChoice(true); }
      else fail(reason);
    }
  }
  function cancelLoading() {
    ++activation.current; stop(); player.current!.cancelDownload(); setLoading(false); setProgress(''); setEnabled(false);
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
    const removed = () => { ++activation.current; stop(); player.current!.cancelDownload(); setEnabled(false); setLoading(false); setDownloadChoice(true); };
    window.addEventListener('dropinn-narrator-removed', removed);
    return () => window.removeEventListener('dropinn-narrator-removed', removed);
  }, []);
  useEffect(() => {
    if (!speech) return;
    const update = () => { try { setVoices(speech.getVoices()); } catch { setVoices([]); } };
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
    if (document.hidden || suppressed.current === cue.id) { stop(); return; }
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
  }, [cue.id, cue.text, enabled, preference.engine, preference.voice, preference.speed, visibility, replay, suppressCue]);

  return <section className={`di-narrator ${preference.collapsed ? 'is-collapsed' : ''}`} aria-label="Story narrator" onKeyDown={event => { if (event.key === 'Escape' && settings) { event.stopPropagation(); closeSettings(); } }}>
    <div className="di-narrator-line">
      <button className="di-narrator-caption" aria-label={preference.collapsed ? 'Show narrator subtitles' : 'Collapse narrator subtitles'} aria-describedby={preference.collapsed ? undefined : 'narrator-caption-text'} aria-expanded={!preference.collapsed} onClick={() => { setPreference({ ...preference, collapsed: !preference.collapsed }); setSettings(false); }}>
        {preference.collapsed ? <><MessageCircle size={18} /><span>Narrator</span></> : <><span className="di-narrator-label">The storyteller</span><span id="narrator-caption-text" className="di-narrator-words" key={`${cue.id}:${caption}`}>{caption}</span></>}
      </button>
      <button className="di-narrator-voice" disabled={!supported} onClick={toggleVoice} aria-label={loading ? 'Cancel voice download' : supported ? enabled ? 'Mute narrator' : 'Enable narrator voice' : 'Narrator voice unavailable'} aria-pressed={enabled}>{enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
      <button ref={settingsButton} className="di-narrator-settings-button" aria-label="Story settings" aria-expanded={settings} onClick={() => setSettings(!settings)}><Settings2 size={17} /></button>
    </div>
    {(error || loading) && !settings && <p className="di-narrator-error" role="status">{error || progress}</p>}
    {settings && <div className="di-narrator-settings" role="group" aria-label="Story settings">
      <header><strong>Story settings</strong><button aria-label="Close story settings" onClick={closeSettings}><X size={18} /></button></header>
      <label className="di-narrator-check"><input type="checkbox" checked={pacedTurns} onChange={event => onPacedTurns(event.target.checked)} /><span>Pace turn results<small>Show each move before the full recap. Turning this off automatically skips your wait between turns.</small></span></label>
      <strong className="di-narrator-settings-subhead">A voice for the story</strong>
      <label>Narrator voice<select value={preference.engine} disabled={loading} onChange={event => { ++activation.current; stop(); setEnabled(false); setDownloadChoice(false); setPreference({ ...preference, engine: event.target.value as NarratorEngine }); }}>
        <option value="natural" disabled={!naturalSupported}>Natural voice · Bella · English</option><option value="device" disabled={!speech}>Device voice</option>
      </select></label>
      <label>Speaking speed<select value={preference.speed} onChange={event => setPreference({ ...preference, speed: Number(event.target.value) })}>
        <option value={0.75}>0.75× · Slower</option><option value={1}>1× · Original</option><option value={1.25}>1.25× · Brisk</option><option value={1.5}>1.5× · Fast</option><option value={1.75}>1.75× · Faster</option><option value={2}>2× · Fastest</option>
      </select></label>
      {preference.engine === 'device' && <label>Browser voice<select disabled={!speech} value={preference.voice} onChange={event => { setPreference({ ...preference, voice: event.target.value }); if (enabled) start('device', event.target.value); }}>
        <option value="">Storyteller · automatic</option>{voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}</option>)}
      </select></label>}
      {preference.engine === 'natural' ? <><p>Bella speaks on your device. An optional {pack.total ? narratorSize(pack.total) + ' ' : ''}download works across every story. Your story stays on your device.</p><NarratorDownload compact /></> : <p>Uses voices supplied by your device or browser. Availability and quality vary.</p>}
      {error && <p className="di-narrator-error" role="status">{error}</p>}
      {loading ? <><p role="status">{progress}</p><button className="di-narrator-replay" onClick={cancelLoading}>Cancel download</button></> : <>
        <button className="di-narrator-replay" disabled={preference.engine === 'natural' ? !naturalSupported : !speech} onClick={() => { if (downloadChoice) void activate('natural', true); else void activate(); }}>{downloadChoice ? 'Download natural voice' : error ? 'Retry voice' : 'Read this line'}</button>
        {(downloadChoice || error) && speech && <button className="di-narrator-replay" onClick={() => void activate('device')}>Use device voice</button>}
      </>}
    </div>}
  </section>;
}
