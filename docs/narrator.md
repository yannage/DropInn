# The storyteller

The narrator adds a short, optional reading layer to the shared scene. It helps a newcomer follow the setting and a recent consequence without opening Story. It does not add a wait, change the turn timer, or replace the complete party recap.

## What it says

Chapter introductions come from the authored scene projection. A completed round supplies a recorded development with its actor name, or a short selection of the shared summary's recorded actions. Chapter endings use the saved outcome. Failed attempts cannot supply a successful development. New cues replace old ones; a choosing/reveal boundary alone does not replay a passage. Reconnecting selects the current passage instead of narrating the entire history.

Each passage splits into brief captions, independently of speech sentences. Muted captions advance at a reading pace. Emma speaks whole sentences; captions follow approximate word-weighted timing within each audio segment and synchronize at its end. Device speech uses word-boundary events when available. The last caption stays until the next story cue. The existing objective, inspection context, complete recap, and Story history remain available.

## Controls and browser behavior

Subtitles start visible. Clicking them collapses the strip into a narrator bubble; clicking the bubble opens it again. The adjacent speaker independently enables or mutes narration. Speech starts only through an explicit click in the current visit, including after a reload. The collapsed state and chosen voice are optional local preferences.

The default is Natural voice · Emma, Kokoro's British female voice (`bf_emma`, speed 1). The first speaker click offers an optional 100–150 MB download or device speech. Nothing downloads before that choice. Model files are public static downloads from Hugging Face, pinned to revision `1939ad2a8e416c0acfeecc08a694d14ef25f2231`; there is no inference API, account, token, or paid service. ONNX runtime assets are served with the app. Natural speech never uploads story text. Browser Cache Storage is optional; missing/evicted assets bring back the download choice. The game itself still needs its normal server connection.

Kokoro.js 1.2.1 runs the q8 model in a dedicated Web Worker using single-threaded WebAssembly, without requiring WebGPU or cross-origin isolation. It generates one sentence ahead. Actual tokenization is checked before inference; oversized sentences split recursively at clauses or whitespace instead of silently truncating. Emma's pinned voice data bypasses the library's unversioned voice fetch. No pitch shifting is applied.

Settings retain device voices as an explicit alternative and provide replay. Device voice selection favors natural English voices, then an English default, at neutral rate/pitch. Some browser voices use their provider's online speech service; the fully local guarantee applies to Emma. Engine, device voice and collapsed state are local preferences. Reload never enables speech automatically.

Voice lists can arrive after page load. Missing or failed speech returns to subtitles with retry/device-voice controls, without silently changing voices. Changing a passage, muting, hiding the tab, or leaving cancels playback and invalidates pending results. Returning resumes the current sentence. Natural synthesis times out after 20 seconds; initialization/download has a three-minute timeout and explicit cancellation. Device speech has a length-aware stall timeout of at least 20 seconds. Collapsing subtitles leaves enabled speech running. Leaving terminates the worker and closes the audio context while retaining downloaded assets.

Controls have 44-pixel minimum touch targets. Reduced motion removes the caption fade. Caption text remains available to screen readers without adding a second live announcement stream alongside the consolidated party recap. Voice settings support Escape and focus restoration.

## Verification and remaining observation

Unit tests cover cue selection, failed events, chapter boundaries, caption preservation, and voice selection. The maintained scene browser runner checks opt-in speech, caption/utterance synchronization, late voice loading, collapse, mute, failure fallback, visibility changes, reload preferences, unmount cancellation, and absent speech support. It captures settings at 390×844 and 320×568 and uses the existing desktop/mobile game layout checks.

The scene speech bridge is mocked. Unit tests also cover preference migration, whole sentences, clause splitting, cache availability, cancellation races and synthesis timeout. `node scripts/playtest-narrator-model.mjs` is a separate, explicit real-model check against the local Vite server on port 5198 (override with `NARRATOR_TEST_URL`). It downloads weights in Chromium and WebKit, checks nonempty finite audio, cached reload without external model requests, and writes WAV samples and timing reports to ignored `output/playwright/`. It requires both Playwright browsers. It does not establish subjective audio quality or physical-phone performance: listen to the samples and check a real phone separately.

Third-party licenses and source links are distributed at `/licenses/narrator.txt`.

### Local verification, 2026-09-23

The scene suite passes with mock device speech and a mock neural worker, including download consent/cancel/failure/retry and both mobile layouts. Fifteen targeted unit tests and the production build pass. A separate production-worker smoke check loads the built JavaScript/WASM assets and produces nonempty Emma audio. Real Chromium generates Emma audio, reuses cached model files without external requests, and accepts an action during synthesis (51 ms click-to-response in the local fixture). On this machine, first audio took about 13 seconds uncached and 11 seconds after a cached reload; this is functional but not instant narration. Generated WAV samples are in `output/playwright/narrator-emma-chromium.wav` for listening review.

The installed Windows Playwright WebKit build exposes neither AudioContext nor browser speech, so it correctly offers subtitles only. Its real worker still generated four seconds of speech; Cache Storage was unavailable, and a cache-only retry correctly requested another download without fetching. This does not verify Safari/iPhone audio playback. Subjective voice-quality review and physical-phone latency remain unverified. No hosted rollout was performed.
