# Subslime

A free, no-account, local-first video caption editor. Upload a short video, generate English word captions with Whisper, correct individual words and timing, pick a template, and download a captioned MP4, SRT or VTT.

## Run

Requires Node.js 22+ and npm. Start with a recent desktop Chrome or Edge.

```sh
npm ci
npm run dev
```

Open [the local app](http://127.0.0.1:4180/). Keep that terminal/server running while editing: audio extraction and caption generation load processing files on demand. Both development and production preview use port 4180; run one at a time. After rebuilding a production preview, download any current edits and reload the page to load the updated assets.

`npm ci` prepares the local FFmpeg core and downloads the two bundled Noto caption fonts. The UI font ships through Fontsource. For a production build:

```sh
npm run build
npm run preview
```

Deploy `dist/` to static hosting over HTTPS at the domain root. Serve `.wasm` as `application/wasm`, avoid SPA-rewriting missing asset URLs, and allow worker scripts from the same origin. This uses single-thread FFmpeg/ONNX and does not require cross-origin isolation or SharedArrayBuffer. No backend, API key or environment variables are needed. Public deployment has not been performed.

## Project structure

The React/Vite app uses a conventional feature-based layout. Feature code stays together; shared brand UI is independent of the landing page and editor.

```text
src/
  main.tsx                  # React entry point
  app/                      # App composition and global styles
  components/               # Shared UI: brand mark
  features/
    captions/               # Caption model, timing, serialization and overlay
    editor/                 # Editor screen, store and timeline/sidebar components
    landing/                # Landing page and demonstrations
    transcription/          # Speech worker and worker client
    video/                  # Import, FFmpeg processing, download and video types
tests/
  unit/                     # Caption logic and editor history
  browser/                  # End-to-end browser workflows
  fixtures/                 # Generated test media (ignored)
public/                     # Static artwork, shared slime icon and runtime assets
scripts/                    # Asset preparation and test-fixture generation
docs/                       # Implementation notes
```

## What works

- Original monochrome illustrated landing page with working word and template previews.
- Local MP4, WebM and MOV import where the browser can decode the video; metadata, aspect-aware preview, playback and synchronized seeking.
- Local mono 16 kHz audio extraction, Whisper tiny English transcription with `return_timestamps: 'word'`, model-download status, cancellation and retry.
- One caption per recognized word, editable text and exact timing. Add, delete, split a multiword caption, merge with the next caption, move and trim. Captions cannot overlap or leave the video's time range.
- Timeline scrubbing, zoom, snapping to neighboring edges/playhead/tenths, and 100-entry undo/redo. A timeline or position drag is one history entry.
- Classic Pop, Bold Highlight, Karaoke and Minimal Box; size, text/background color, two bundled fonts and draggable/keyboard-adjustable position. Karaoke groups up to five words without changing stored source timestamps.
- MP4 burn-in with H.264 picture and AAC original audio, plus individual-word SRT and VTT downloads. Export/transcription workers are terminated and their temporary in-memory files released after jobs.

Space plays or pauses. Left/right nudges the selected caption by 0.05 seconds (Shift: 0.5 seconds); without a selection, it seeks. Delete removes a selected caption. Ctrl/Command Z undoes, Ctrl/Command Shift Z redoes. Text fields retain native text editing shortcuts. Every drag has a numeric/range-control alternative.

## Privacy and compatibility

Video files, extracted audio, recognized text and rendered output stay on your device. There are no analytics, accounts, uploads or server-side processing. The first transcription downloads the English Whisper model from Hugging Face, which receives ordinary asset requests and your network address. Model files may remain in the browser's cache. App, font, FFmpeg and ONNX assets are served by the app's host. Internet access is required for initial model download; this is not an installable offline PWA.

Projects live in tab memory. Closing, reloading, leaving the editor or replacing the video loses the current session; download subtitles/video first. A warning is shown before leaving an edited project. No cloud or project-file saving is included in this MVP.

Initial guards: 200 MB, 180 seconds and up to 2,073,600 pixels (1080p in either orientation). These are guardrails, not a guarantee that every device can process the maximum. H.264 MP4 is the safest import choice. MOV is accepted only when its codecs play in the current browser. Videos with no supported audio can still be captioned manually. Export encodes AAC; it does not preserve an identical original audio bitstream.

Whisper tiny supports English here. Accents, background music, silence and low-quality microphones can affect text and word alignment; review generated timings. It uses the library's cross-attention alignment, without a separate forced-aligner model. Browser memory limits can still interrupt larger jobs. A failed or cancelled job preserves the current edits.

Preview uses CSS with the same bundled font, font size, color, center position and grouping as the ASS/libass export. Libass and browsers rasterize text differently: box padding, outlines and the Karaoke active-word treatment can differ slightly. Long captions or positions near the edges can clip; check the preview before export. There is no claim of pixel-perfect equivalence.

## Checks

```sh
npm test
npm run build
npm run test:browser
```

The browser suite uses the installed Microsoft Edge. On Windows it creates a short English WAV with System.Speech, records it into a 720×1280 WebM in a canvas, and drives the production build. On another OS, supply the WAV described by `scripts/test-fixture.mjs` and select an installed browser channel in `playwright.config.ts`. The transcription test needs access to Hugging Face. Generated media and screenshots are ignored by Git.

The suite covers responsive landing layouts, local import, editing, history, pointer dragging, style controls, SRT/VTT downloads, real FFmpeg MP4 burn-in, decode/playback, visible caption timing, retained audio, Whisper transcription, cancellation and invalid file errors. Domain tests cover timing boundaries, model timestamp normalization, grouping, subtitle escaping and bounded history.

The short synthetic-speech fixture is a feasibility test, not an accuracy benchmark. The roadmap's representative accent/noise recordings, full 15-second–3-minute 720p/1080p memory benchmarks, Firefox/Safari testing and physical mobile testing remain launch gates. No alignment-accuracy or maximum-memory target is claimed as met.

Recorded locally on November 10, 2026: a roughly 5.8-second 720×1280 WebM exported to a playable captioned H.264/AAC MP4. The test verified audible audio, a caption-free gap, and caption width within 16 source pixels of the preview. A separate 1080×1920 export exercises Karaoke and the bundled mono font. These simple synthetic pictures compress much more easily than camera footage; runtimes varied between runs, so no real-world performance target is claimed.

Production dependencies pass `npm audit --omit=dev`. The `sharp` override selects the patched Node-only transitive image library while retaining the browser-tested Transformers.js 3 API; revisit it when upgrading Transformers.js.

## Implementation references

See [implementation notes](docs/implementation.md) for the scope and design decisions. The key media APIs follow [Transformers.js ASR](https://huggingface.co/docs/transformers.js/v3.8.1/en/api/pipelines#module_pipelines.AutomaticSpeechRecognitionPipeline) and [FFmpeg.wasm usage](https://ffmpegwasm.netlify.app/docs/getting-started/usage/). Export font sizing compensates for [libass line-metric sizing](https://github.com/libass/libass/blob/0.15.2/libass/ass_font.c#L285) using the bundled fonts' measured 1362/1000 ratio. Caption fonts use the [SIL Open Font License](public/fonts/OFL.txt); the speaker artwork is an original SVG in this project.
