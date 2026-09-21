# The storyteller

The narrator adds a short, optional reading layer to the shared scene. It helps a newcomer follow the setting and a recent consequence without opening Story. It does not add a wait, change the turn timer, or replace the complete party recap.

## What it says

Chapter introductions come from the authored scene projection. A completed round supplies a recorded development with its actor name, or a short selection of the shared summary's recorded actions. Chapter endings use the saved outcome. Failed attempts cannot supply a successful development. New cues replace old ones; a choosing/reveal boundary alone does not replay a passage. Reconnecting selects the current passage instead of narrating the entire history.

Each passage splits into brief captions. Muted captions advance at a reading pace; spoken captions advance when the corresponding utterance ends. The last caption stays until the next story cue. The existing objective, inspection context, complete recap, and Story history remain available.

## Controls and browser behavior

Subtitles start visible. Clicking them collapses the strip into a narrator bubble; clicking the bubble opens it again. The adjacent speaker independently enables or mutes narration. Speech starts only through an explicit click in the current visit, including after a reload. The collapsed state and chosen voice are optional local preferences.

Settings expose the device's available voices and a replay button. Automatic selection favors a natural English voice, then an English default. A slightly slower rate (0.92) and pitch (0.95) suggest measured storytelling; they cannot turn an ordinary device voice into a cinematic performance. The [browser SpeechSynthesis API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) determines voice availability. Some system voices can use their provider's online speech service; DropInn does not send narration to an application AI endpoint.

Voice lists can arrive after page load. Missing or failed speech falls back to subtitles. Changing a passage, muting, hiding the tab, or leaving cancels the current utterance. Returning to the tab resumes the current caption. A silent engine stall returns to muted captions after 20 seconds. Collapsing the subtitles deliberately leaves enabled speech running.

Controls have 44-pixel minimum touch targets. Reduced motion removes the caption fade. Caption text remains available to screen readers without adding a second live announcement stream alongside the consolidated party recap. Voice settings support Escape and focus restoration.

## Verification and remaining observation

Unit tests cover cue selection, failed events, chapter boundaries, caption preservation, and voice selection. The maintained scene browser runner checks opt-in speech, caption/utterance synchronization, late voice loading, collapse, mute, failure fallback, visibility changes, reload preferences, unmount cancellation, and absent speech support. It captures settings at 390×844 and 320×568 and uses the existing desktop/mobile game layout checks.

The speech bridge in those tests is deterministic and mocked. Passing it proves control behavior, not audible voice quality, native browser activation policy, hosted synchronization, or physical-phone behavior. Listen in the intended browsers and ask a newcomer whether the captions clarify what happened; neither cinematic quality nor improved comprehension is established by automated checks.
