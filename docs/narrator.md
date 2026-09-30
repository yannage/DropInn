# The storyteller

The narrator is an optional reading layer over the shared scene. Press **Listen**
at the table to start it. There is no separate installation or download confirmation.
Joining, actions, captions and the server timer never wait for narration. Browser
audio still needs a user gesture; saved settings do not enable autoplay.

## Listening modes

- **Automatic** is the default for new preferences. An available installed English
  voice starts immediately while the natural storyteller loads and warms up. The
  current passage keeps its voice; the next cue uses the natural voice. Without a
  local voice, captions remain visible while the natural voice prepares.
- **Natural storyteller** loads and starts the chosen voice with one click.
- **Device voice** uses installed English speech without loading model assets.

Only voices marked `localService === true` are eligible for device speech. Remote,
unknown and non-English voices are never silently selected, including stale saved
preferences. Device-only mode waits briefly for late voice enumeration, then reports
unavailability rather than using an unspecified browser service.

Natural synthesis runs in a browser worker with no speech API, AI tokens, analytics,
account or per-use fees. The client no longer requests server-generated narration
after round resolution; the optional legacy `narrate` endpoint remains available
to explicit integrations. Static model assets still travel over the network the first
time: removing the install step does not remove those bytes. Before Listen, only the
tiny local size manifest is fetched. Voice assets load after the click and are shared
across adventures. Story settings → Voice storage offers optional advance caching,
progress, retry, cancellation and removal.

## Voices and engine choice

KittenML Nano 0.8 int8 stays pinned to
`84781d74e29ee25217551556398b42f80593a813`. Its eight bundled voices are Bella,
Jasper, Luna, Bruno, Rosie, Hugo, Kiki and Leo. The picker includes the publisher's
voice character descriptions; these are not listening-test scores. Changing voice
does not fetch another model. Each voice uses its verified embedding and speed prior
(0.8, except Hugo at 0.9).

Production assets total approximately **43.3 MB uncompressed**, including 27.65 MB
model/voices/config, ONNX WASM, its module and the worker/phonemizer. Hosting
compression may reduce transfer. `narrator-assets.json` measures runtime output sizes.
Development reports an estimate because Vite transforms the worker on demand.

Keeping Nano avoids increasing cold-start transfer: Kokoro's listed q8f16 ONNX weights
alone are 86 MB. The newer Kitten web SDK is a developer preview, enables analytics
by default, and changes inference conventions; this implementation retains the
verified official Python pipeline. It does not claim a new model or that every phone
will synthesize in real time.

Sources: [Kitten inference](https://github.com/KittenML/KittenTTS/blob/main/kittentts/onnx_model.py),
[pinned voice config](https://huggingface.co/KittenML/kitten-tts-nano-0.8-int8/blob/84781d74e29ee25217551556398b42f80593a813/config.json),
[voice descriptions](https://github.com/KittenML/KittenTTS-web/blob/main/docs/reference/models.md),
[Kokoro files](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/tree/main/onnx),
[local speech flag](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService).

## Playback and cue selection

Speech prioritizes recorded chapter endings, party route choices, discoveries and
meaningful human consequences over routine companion actions. No chat, temporary AI
copy, roll modifiers or reward arithmetic enters the cue. Names and outcomes come
from confirmed events; cue IDs remain stable across the next choosing boundary.
During animated reveals, both the new caption and its voice wait for the table's
consequences to settle. Skip suppression and manual history remain unchanged.

Long sentences split at breath boundaries when possible, preserving every word.
One chunk synthesizes ahead. A 24 MiB / 32-entry least-recently-used PCM cache reuses
speech by text, natural voice and speed; replay avoids redundant inference. The
cache lives only for the mounted narrator and clears on disposal. Captions use
approximate word-weighted timing for generated audio and browser boundary events
for device speech. Speed from 0.75× to 2× persists; changing voice/speed restarts the
current chunk with the new settings.

Mute, backgrounding, scene changes, skip and leaving invalidate old playback and
callbacks. Canceling preparation prevents late initialization from enabling audio.
Failed preparation can leave an already-playing local voice running. Unsupported
audio leaves readable captions. Settings retain 44px touch targets, Escape/focus
restoration and scrolling on small screens. The game has one narrator and ducks
table effects underneath enabled speech.

## Storage and runtime

Complete assets live in the versioned `dropinn-kitten-*` Cache Storage bucket.
Interrupted files are not marked complete; retry reuses finished files. Lengths,
configuration and selected voice data are validated. Storage failure falls back to
this visit's memory, with a visible explanation. Removal cancels playback/transfer
and removes DropInn narrator caches, including obsolete Emma caches; it does not
clear browser-managed HTTP caches. Removed assets load again only on another click.

The self-contained worker uses ONNX Runtime Web 1.30.0 with single-threaded SIMD,
without requiring WebGPU or cross-origin isolation. The phonemizer is bundled.
Kitten tokenization, text-length style selection, 24 kHz output and 5,000-sample
trailing trim follow the official Python inference implementation. Download,
initialization and synthesis have bounded timeouts. Third-party notices, including
eSpeak NG's GPL terms and source links, are at `/licenses/narrator.txt`.

## Verification

- `npm test` covers cue fidelity, local voice selection, preferences, all eight
  embeddings, chunk preservation, cache separation/eviction, cancellation, delayed
  voice discovery, worker failures and download reuse/removal.
- `npm run test:scene` uses mock speech/worker bridges with the real local command
  handler for gameplay, reveal ordering, one-click loading and mobile controls.
  Add `-- --narrator-only --base-url http://127.0.0.1:5200` for the focused narrator
  checks against a development server on port 5200.
- `npm run test:narrator:model` exercises real synthesis on development port 5198.
  `NARRATOR_TEST_BROWSER=chromium` limits it to Chromium. Windows WebKit's lack of
  AudioContext is not Safari playback evidence.
- `npm run test:narrator:production` tests shipped-worker synthesis, cached offline
  operation and removal. Its production UI fixture expects an isolated build with
  dummy `VITE_SUPABASE_URL=https://narrator-qa.invalid` and
  `VITE_SUPABASE_ANON_KEY=narrator-qa-public-key`; it seeds a fake browser session,
  intercepts game requests with the local handler and blocks hosted services.
  Build using `vite build --outDir output/narrator-production`, preview that output
  on port 5201 and set `NARRATOR_PREVIEW_URL=http://127.0.0.1:5201` for the check.
  These values belong only in the test process environment, never deployed settings.

These checks establish behavior and signal output, not perceived acting quality.
Physical iPhone/Android performance and subjective listening remain separate release
checks. No hosted deployment is implied by local results.

## Local evidence · 2026-09-30

The production build and 428 unit/service checks pass. Focused Chromium narrator
checks cover local voice filtering and late enumeration, natural loading/retry,
all eight choices, speed, uninterrupted automatic handoff, reveal ordering,
cancellation, backgrounding, reload and mobile settings at 390×844 / 320×568.
Store regressions also cover resolving, synchronizing and joining a reveal without
requesting server narration, so the normal storyteller never invokes a paid provider.

Real development playback reached audio in 5.36 seconds on a fresh browser and
3.57 seconds after cache reuse; an action committed during synthesis in 48 ms.
The isolated production check measured 43,321,053 asset bytes, first playback in
4.89 seconds and a cached revisit in 4.13 seconds. All eight voices produced
finite, non-silent, distinct audio; offline synthesis, faster speech and removal
passed with no browser exceptions. These desktop timings include synthesis and
are not mobile performance promises. Reports, screenshots and voice samples are
under ignored `output/playwright/`.

The final broader browser run passed 92 gameplay/layout checks, including shared
turns, three chapters, exact retries and four-player readiness. A narrator fixture
needed an explicit wait for React to render newly discovered voices; after that fix,
the focused narrator runner passed all five groups separately, with zero server
`narrate` requests, external service calls or browser exceptions. The broader run
was not repeated wholesale after this test-only wait correction. Browser helpers
now import their store before polling synchronously; start a fresh dev server after
store edits so HMR timestamp imports do not create a second fixture store.
