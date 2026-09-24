# The storyteller

The narrator is an optional reading layer over the shared scene. It never delays
joining, actions, or the server turn timer. Captions remain available without audio.
The cue projection is unchanged: authored introductions, recorded consequences and
saved endings. Names and dynamic outcomes can be spoken; no prerecorded story pack
or speech API is required.

## Bella and downloads

Natural narration uses KittenML Nano 0.8 int8 with Bella (`expr-voice-2-f`). The
model/voice/config revision is `84781d74e29ee25217551556398b42f80593a813`.
The initial production build measures **43.3 MB uncompressed**, including the
27.65 MB model/voice/config, ONNX WASM, its module, and the standalone worker with
embedded phonemizer. Hosting compression may reduce network transfer. The build
emits `narrator-assets.json` from actual output sizes, so displayed totals track
subsequent code changes. Development reports an estimate because Vite transforms
the worker on demand.

Every story card offers a narrator download control at its bottom-right. Expanding
it explains the size and that one optional download serves all stories. Downloads
share progress and state, support cancellation and retry, and never enable audio.
The same management control is available in Story settings. Before consent only
the tiny local manifest is fetched: no model, worker code, phonemizer, or WASM.

Complete files are stored in the versioned `dropinn-kitten-*` Cache Storage bucket.
Interrupted files are never marked complete; retries reuse completed files. The
download validates file lengths, and the worker validates configuration/voice data.
When storage fails, completed files remain available for this visit with an explicit
message. Cache-only activation checks every asset, including the runtime, before
creating a worker; eviction offers downloading again without fetching weights.
Removing the download cancels any active transfer/playback and removes only DropInn
narrator caches, including obsolete Emma caches. Browser-managed HTTP caching is
separate and is not cleared by the application.

Existing preferences preserve the selected engine, device voice and caption state.
No stored preference authorizes a Kitten download or autoplay. Old Emma caches never
qualify as a downloaded Bella narrator.

## Speaking speed

Story settings → Speaking speed offers 0.75× through 2×; 1× preserves the original
pace. Try 1.25× or 1.5× for brisker narration. The setting is saved on this browser
and works with both Bella and device voices. Changing it while speaking restarts
the current sentence and discards audio prepared at the old speed. It never enables
audio or downloads a model by itself.

Bella multiplies her model speed prior by the selected rate during synthesis,
leaving playback pitch unchanged. Device voices use the browser speech rate.

## Playback

The production worker is bundled into one self-contained module and constructed
from its cached bytes. ONNX Runtime Web 1.30.0 uses the cached module and WASM binary
with single-threaded SIMD, without requiring WebGPU or cross-origin isolation.
The phonemizer is bundled into that worker. No story text leaves the device for
natural narration. ONNX 1.22.0's runtime stalled during verification and was replaced
before evaluating model performance; the selected Nano model was not changed.

Kitten's vocabulary, Unicode word splitting, Bella embedding selection, 0.8 speed
prior, 24 kHz output and 5,000-sample trailing trim follow the official Nano pipeline.
Text normalization preserves names and punctuation; eSpeak handles numbers and
abbreviations. Long input splits at clauses/words rather than dropping text.

Speech starts only from a click in the current visit. AudioContext unlock happens
inside that click. The player generates a sentence ahead and shows shorter captions
with approximate word-weighted timings. Mute, skip/suppression, scene changes,
backgrounding, removal and leaving invalidate stale audio. Replay reads the current
cue. Hiding the tab stops speech; returning can resume the current sentence.
Initialization and downloads have bounded timeouts; synthesis retains its 20-second
watchdog. Failure leaves subtitles and explicit retry/device-voice controls, without
silently changing voices. Device speech remains independent and may use an OS/browser
online service; the local-only guarantee applies to Bella.

Controls retain 44-pixel touch targets, Escape/focus restoration, reduced-motion
support, and scrollable settings on small screens. Captions avoid duplicate live
announcements alongside the party recap.

## Verification

- Targeted Vitest checks cover cue fidelity, tokenizer input, preferences, consent,
  shared downloads, truncation/retry, cancellation, eviction, removal, and worker races.
- `npm run test:scene` checks gameplay, mobile layouts and the narrator's mock speech
  and worker bridge against an isolated local handler. Its mock weights are not live
  inference evidence.
- `npm run test:narrator:model` checks real synthesis, cache reuse, and a game action
  during narration against the development server on port 5198. Set
  `NARRATOR_TEST_BROWSER=chromium` for one browser. Installed Windows WebKit lacks
  AudioContext, so its worker-only result is not Safari playback verification.
- After `npm run build`, start preview on port 5199 and run
  `npm run test:narrator:production`. This checks the shipped consent controls,
  measured files, shared story-card state, real Nano synthesis, cached offline
  synthesis, and removal without requiring hosted credentials.

Production Chromium generated the user's Yanni/boat sentence in about 3.3 seconds
for 4.9 seconds of audio on this computer. Cached runtime/model initialization was
about one second. Longer paragraphs cost more; these are desktop measurements,
not mobile promises. WAV samples and timing reports are saved under ignored
`output/playwright/`. Subjective listening and physical Android Chrome/iPhone
playback remain release checks. No hosted deployment was performed.

Third-party notices, including eSpeak NG's GPL terms and source links, are provided
at `/licenses/narrator.txt`.
