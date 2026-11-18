# Little Keys Studio 🎹

A private browser app for turning family keyboard videos and audio into WAV samples.

## How to use
1. Open the GitHub Pages website in Safari or a desktop browser.
2. Choose an MP4, M4A, WAV, or MP3 file.
3. Adjust the start and end sliders, preview the selection, and export WAV.
4. Save favorite cuts and download them before leaving the page.

## Privacy
Recordings stay on your device and are never uploaded by the app. Do not upload family recordings to this public repository.

## Limitations
- MP4 decoding depends on browser support; on iPhone, convert to M4A with Shortcuts → Encode Media → Audio Only if needed.
- Automatic phrase suggestions use loudness/onset cues (not an AI model) and require listening.
- BPM snapping sets a 4/4 loop duration; it does not time-stretch or quantize the original performance.
- Optional 12 ms edge fades help avoid clicks; the gentle gate reduces low-level signal but does not isolate piano or remove overlapping speech.
- Saved WAV clips use IndexedDB local browser storage; backups are still necessary because browsers can clear it.
- Full AI voice/piano separation, MP3 export, and MIDI conversion are not yet supported.
- Saved sample cuts are temporary and disappear on refresh; download the WAVs to keep them.
- Long videos may use significant device memory.

## Publish
Go to **Settings → Pages → Build and deployment → Deploy from a branch**, choose `main` and `/(root)`, then Save. The expected website address is https://alienheadbill.github.io/little-keys-/ after Pages is enabled.