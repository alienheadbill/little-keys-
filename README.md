# Little Keys Studio 🎹

A private, mobile-friendly loop editor for Eden's keyboard recordings.

## Open the app

https://alienheadbill.github.io/little-keys-/

## Using it

1. Select MP4/MOV video or an M4A/MP3/WAV audio recording.
2. MP4/MOV: tap **Extract audio from video**. The app first tries Mediabunny's faster audio-only track extraction. If audio decoding is unavailable, it falls back to real-time browser playback capture, which needs the tab kept open. On iPhone, if this fails, Shortcuts → Select Photos → Encode Media (**Audio Only**) → Save File creates an M4A.
3. View the waveform, adjust start/end sliders, audition and save a sample. Export WAV or MP3 backups. The MP3 encoder is included locally (LAME), so it needs no conversion service.
4. **Suggest phrases** finds candidate onsets using loudness. Review them by ear; a candidate is not necessarily a musical phrase.
5. Set BPM and bars to snap the selected clip's *duration* to the bar grid. This does not time-stretch the waveform.
6. **Quantize detected note attacks** shifts phrases to the nearest sixteenth/eighth/quarter-note grid. Restore original if the result sounds unnatural.
7. **Detect speech (AI)** optionally loads Silero VAD from a CDN and marks possible speech regions. It does not remove overlapping speech, and piano may create false positives.
8. **Separate voices from piano** optionally loads an MDX-Net model (~67 MB on first run) and estimates voice/instrumental stems locally. Model download requires internet; your audio is not uploaded. iPhone memory limitations may prevent completing separation.
9. Save or download separate WAVs for keyboard, voice moments, and mixed samples.

## Privacy and durability

All user audio is processed locally in the browser or on your own desktop computer. No audio is uploaded to GitHub. Sample WAVs are saved in IndexedDB, which browsers may clear; export backups regularly. The app downloads AI models and runtime code from third-party CDNs on demand, and their availability and integrity are external dependencies.

## Desktop AI separator

For desktop systems with Python and FFmpeg:

```bash
python -m pip install demucs
python desktop/separate.py "IMG_2306.mp4" --output "Eden Samples"
```

It outputs `original_audio.wav`, `family_voices.wav`, `piano_without_voices.wav`, an MP3, and `manifest.json`. Import the resulting piano WAV into the website. The Demucs model is downloaded locally on first use. Use `--piano-stem` for a more computationally expensive six-stem model that also estimates a piano-only track.

Never overwrite the original recording. Both browser and Demucs AI are estimates; voices can still bleed into instrumentals and piano notes may be lost.

## Automated checks

The GitHub Actions browser suite uses Chromium and WebKit. It tests synthetic WAV importing, selection, playback, WAV file structure, IndexedDB, tempo UI, timing restore, real H.264/AAC MP4 extraction (Chromium), and mocked AI interface wiring. A mocked AI runtime test does **not** validate the real source-separation model, real speech predictions, or native iPhone Safari behavior.

## Limitations

- Direct video extraction depends on MediaRecorder and browser codec support and happens in real time, not instantly.
- On mobile, very large videos and long AI jobs may fail due to memory or background throttling.
- Voice detection does not inherently imply successful voice removal. Selecting “mute speech” also mutes notes present during those moments.
- The browser AI model may require a desktop-class device; use the desktop separator when it cannot load.
- Quantization is approximate and may create artifacts. Keep the original.
- Browser WAV and MP3 exports are supported. The desktop script exports both too.

## Playback troubleshooting

The preview uses the browser's native audio player and displays a changing playback position. If playback is blocked, the app reports an error or a stalled timer. On iPhone, verify device volume and Bluetooth audio destination, then try the WAV download as a fallback. The original recordings are untouched.
