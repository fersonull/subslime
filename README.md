![Subslime — Make every word count.](docs/assets/banner.svg)

# Subslime

**A free, local-first video caption editor. No account. No watermark.**

Turn speech into editable word-level captions, adjust their timing and appearance, and export a captioned video or subtitle file. Video and audio processing run in your browser.

**Status:** early MVP. English transcription is available; browser compatibility, word alignment and performance on larger videos still need broader testing.

[Quick start](#quick-start) · [Usage](#usage) · [Privacy](#privacy) · [Development](#development) · [Contributing](#contributing) · [License](#license-and-acknowledgments)

## Features

- **Local video import and playback:** MP4, WebM and MOV where the browser supports their codecs.
- **Automatic English captions:** Whisper tiny transcription in a worker, with editable word timestamps, download status and cancellation.
- **Word-level editing:** correct text, add/delete captions, split multiword captions, merge neighbors, and move or trim individual clips.
- **A synchronized timeline:** scrub, zoom and snap; undo/redo retains up to 100 project edits.
- **Four caption templates:** Classic Pop, Bold Highlight, Karaoke and Minimal Box.
- **Style controls:** font, size, text/background color and caption position, including dragging in the preview.
- **Exports:** H.264/AAC MP4 with burned-in captions, or individual-word SRT and VTT files.
- **Monochrome interface:** responsive layouts, keyboard controls and reduced-motion support.

## Quick start

### Requirements

- Node.js **22 or newer**, with npm.
- A recent desktop **Chrome or Microsoft Edge** browser is the recommended starting point.
- Internet access during dependency installation and the first speech-model download.

```sh
git clone https://github.com/fersonull/subslime.git
cd subslime
npm ci
npm run dev
```

Open [http://127.0.0.1:4180](http://127.0.0.1:4180/).

Keep the server running while editing: the app loads its processing files on demand. `npm ci` prepares the FFmpeg runtime and downloads two Noto caption fonts from GitHub. The interface font is bundled through Fontsource. The first transcription downloads Whisper model files from Hugging Face.

No API key, account, backend service or environment variables are required.

## Usage

1. **Upload** a short video or drop it onto the page.
2. Select **Generate captions** to transcribe English speech, or use **Add caption** to start manually.
3. **Review every word and its timing.** Edit text in the caption list, use numeric start/end controls, or drag and trim timeline clips.
4. Choose a template in **Style**, then adjust typography, colors and placement.
5. Select **Export** to download a captioned MP4, SRT or VTT file.

**Download your work before closing, reloading or replacing the video.** Projects live in tab memory; there is no project save/load or cloud storage yet. Browser leave warnings are a convenience, not a backup.

### Keyboard controls

| Shortcut                             | Action                                                               |
| ------------------------------------ | -------------------------------------------------------------------- |
| Space                                | Play or pause                                                        |
| Left / Right                         | Nudge a selected caption by 0.05 seconds; seek when none is selected |
| Shift + Left / Right                 | Nudge or seek by 0.5 seconds                                         |
| Delete / Backspace                   | Remove the selected caption                                          |
| Ctrl / Command + Z                   | Undo                                                                 |
| Ctrl / Command + Shift + Z           | Redo                                                                 |
| Ctrl / Command + Y                   | Redo                                                                 |
| Shift while dragging a timeline clip | Temporarily disable snapping                                         |

Text inputs retain their normal editing shortcuts. Playback/nudge shortcuts apply when focus is outside text fields and interactive buttons. Drag interactions also have numeric or range-control alternatives.

## Supported inputs and limitations

| Area            | Current behavior                                                         |
| --------------- | ------------------------------------------------------------------------ |
| File size       | Up to 200 MiB (displayed as 200 MB in the interface)                     |
| Duration        | Up to 3 minutes; initially aimed at 15-second–3-minute clips             |
| Resolution      | Up to 2,073,600 pixels, equivalent to 1080p in either orientation        |
| Import          | MP4, WebM, MOV and M4V; actual support depends on the codecs and browser |
| Transcription   | English, using Whisper tiny; generated text and timing need review       |
| Video export    | H.264 MP4 with AAC audio when the source has a supported audio track     |
| Subtitle export | SRT / VTT with individual-word timings                                   |
| Project storage | Current browser tab only                                                 |

These limits are guardrails, not a guarantee that every device can process the maximum. Start with a short H.264 MP4. Firefox, Safari and physical mobile devices need further verification.

Whisper can misrecognize accents, background music, silence or poor-quality recordings. It uses Transformers.js word alignment without a separate forced-aligner model. Long captions or positions near an edge can clip. Browser text and libass rendering can differ in padding, outlines and rasterization; check the exported video.

Export can be slow or memory-intensive. Audio is re-encoded to AAC, rather than copied bit-for-bit. Accounts, translation, collaboration, cloud projects, advanced video cutting and multi-track editing are outside the current MVP.

## Privacy

- Source videos, extracted audio, recognized captions and rendered output are processed on your device. The app has no media-upload backend or analytics.
- The app host serves application, font and FFmpeg files. Hugging Face serves the speech model, and the inference runtime can fetch assets from jsDelivr. These providers receive ordinary asset requests, including your network address.
- Model files may remain in your browser's cache. Internet access is required for their initial download; Subslime is not an installable offline PWA.
- Closing or reloading a tab discards its project state. Downloading an export is the way to keep your work.

## Development

The app uses React, TypeScript and Vite, with Tailwind CSS for styling and Zustand for editor state. Transformers.js runs transcription in a worker. FFmpeg.wasm extracts audio and renders MP4 exports; HTML video provides playback.

### Commands

| Command                | Purpose                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `npm ci`               | Install locked dependencies and prepare runtime/font assets |
| `npm run dev`          | Start the development server on port 4180                   |
| `npm test`             | Run unit tests                                              |
| `npm run build`        | Type-check and build into `dist/`                           |
| `npm run preview`      | Serve the production build on port 4180                     |
| `npm run test:browser` | Run browser integration tests with installed Edge           |
| `npm audit --omit=dev` | Check production dependencies for known advisories          |

Development and preview share a strict port: run one at a time. After rebuilding a production preview, download current edits and reload the page to load the new assets.

### Project structure

```text
src/
  main.tsx                  # React entry point
  app/                      # App composition and global styles
  components/               # Shared UI, including the brand
  features/
    captions/               # Caption model, timing, serialization and overlay
    editor/                 # Editor screen, history store, timeline and sidebar
    landing/                # Landing page and demonstrations
    transcription/          # Speech worker and its client
    video/                  # Import, FFmpeg processing, downloads and video types
tests/
  unit/                     # Timing, validation and history regressions
  browser/                  # Browser workflows
  fixtures/                 # Generated test media (ignored)
public/                     # Static artwork, fonts and runtime assets
scripts/                    # Asset preparation and test-fixture generation
docs/                       # Implementation notes and README artwork
```

See the [implementation notes](docs/implementation.md) for architecture decisions, rendering details and verification history.

### Browser tests

```sh
npm test
npm run build
npm run test:browser
```

The browser suite uses an installed Microsoft Edge. On Windows, it generates a short English WAV with System.Speech, then records a video fixture in the browser. On another OS, provide `tests/fixtures/generated/speech.wav` saying:

> Make every word count. This is a test of local video captions.

Select an available browser channel in [playwright.config.ts](playwright.config.ts) if Edge is unavailable. Tests exercise canvas recording, local FFmpeg processing and a real model download; transcription tests need access to Hugging Face. Generated media, screenshots and test reports are ignored by Git.

The configuration reuses a server already running on port 4180. For production-build verification, stop a running development server before the browser suite starts its preview server. Avoid editing watched files during a browser test run.

Coverage includes import, caption editing, history, dragging, timer layout stability, download failure recovery, transcription/cancellation, subtitle downloads, and playable 720p/1080p exports with retained audio. Synthetic fixtures establish feasibility; they are not a representative accuracy or memory benchmark.

## Deployment

```sh
npm ci
npm run build
```

Publish the contents of `dist/` to a static host over HTTPS at the domain root. The build includes the prepared FFmpeg runtime and caption fonts.

- Serve `.wasm` files with `application/wasm`.
- Allow same-origin workers and HTTPS requests for Hugging Face models and inference runtime assets, including jsDelivr.
- Do not rewrite missing asset URLs to `index.html`.
- Single-thread FFmpeg/ONNX does not require cross-origin isolation or `SharedArrayBuffer`.

A local preview is not a public deployment. Test a hosted build's model downloads and exports before sharing it with users.

## Troubleshooting

| Problem                         | What to try                                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Video engine fails to load      | Keep the local server running. If its generated assets are missing, rerun `npm ci`. Save edits before reloading after an update.        |
| Speech model fails to download  | Check internet access and whether Hugging Face is reachable, then retry generation.                                                     |
| Video cannot be opened          | Try a short H.264 MP4 within the size, duration and resolution limits. A supported file extension does not guarantee a supported codec. |
| No audio or speech is detected  | Check the source audio, try clearer English speech, or add captions manually.                                                           |
| Export fails or exhausts memory | Try a shorter or lower-resolution source, close other heavy tabs, and retry.                                                            |
| Port 4180 is occupied           | Use the existing Subslime server, or stop the process using the port before starting another server.                                    |

## Contributing

Bug reports, documentation improvements, accessibility fixes and small, tested changes are welcome.

1. Check [existing issues](https://github.com/fersonull/subslime/issues) before starting a substantial change.
2. Fork the repository and branch from **`dev`**, using a descriptive name such as `fix/caption-timing` or `feature/template-preview`.
3. Keep related code in its feature folder and avoid unrelated refactors or new dependencies when existing tools suffice.
4. Add a regression test for behavior changes. Run `npm test` and `npm run build`; run the relevant browser checks for UI or processing changes. For documentation-only work, preview the Markdown and verify links/assets.
5. Open a [pull request](https://github.com/fersonull/subslime/pulls) targeting **`dev`**, explaining the problem, change and validation. Include screenshots for visible UI changes.

For a bug report, include reproduction steps, expected/actual behavior, browser and OS versions, the commit or version, and the video's format, duration and resolution. Prefer a small synthetic or non-sensitive sample. Do not post private videos, transcripts, credentials or identifying details.

### Security reports

Do not disclose sensitive vulnerability details in a public issue. Check the repository's [Security tab](https://github.com/fersonull/subslime/security) for a private reporting option. If none is available, open an issue requesting a private contact channel without including exploit details or private data.

There is no published response-time commitment or supported-version policy yet.

## Roadmap

The next verification priorities are:

- Representative speech recordings with different accents, pauses, music and recording quality.
- Longer 720p/1080p exports with measured memory and runtime behavior.
- Firefox, Safari and physical mobile-device testing.
- Closer preview/export rendering consistency and accessibility review.

Feature proposals can be discussed in issues; there is no fixed release schedule.

## License and acknowledgments

Subslime's project code is licensed under [Apache License 2.0](LICENSE).

Third-party dependencies, fonts and model files retain their own licenses. Key components include [Transformers.js](https://github.com/huggingface/transformers.js), [Whisper tiny English model files](https://huggingface.co/Xenova/whisper-tiny.en), [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm), and Noto caption fonts under the [SIL Open Font License](public/fonts/OFL.txt). FFmpeg builds include separately licensed codecs and libraries; review their upstream notices when redistributing a build.

The slime logo and speaker illustration are original artwork included in this repository. See the [implementation notes](docs/implementation.md) for technical references.
