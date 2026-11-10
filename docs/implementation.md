# Subslime implementation

Source: the user-provided MVP roadmap. Target: a local-first browser editor, without accounts, payments, watermarks, or automatic source-video uploads.

## Build slices

1. Foundation and caption domain: Vite/React/TypeScript, Tailwind, Zustand, bounded history, word operations, subtitle serializers and shared caption grouping.
2. Landing and editor: illustrative monochrome page, real upload/preview, text and timing edits, move/trim/snap timeline, seek/zoom, keyboard access, templates and positioning.
3. Media processing: local FFmpeg audio extraction and ASS/MP4 burn-in; Transformers.js Whisper word timestamps in a worker; progress, retry, cancel and resource cleanup.
4. Verification: domain regressions, production build, browser workflow and short-video export. Record actual compatibility/benchmark evidence in README.

## Design

Subslime's editable word becomes a physical piece of the headline and film timeline. The oversized “Make every word count.” headline contains a selectable caption. Original monochrome speaker illustrations carry the same sample words across before/after, templates and workflow. All sample captions are explicitly demonstrations.

Landing argument: show the word → show upload/edit/export → compare the captioned result → try four treatments → reveal individual timing controls → start a real video.

Editor question: how does this word look and when does it appear? The video is largest, selected word controls are beside it, timeline underneath. Neutral framed-sheet shell, underline tabs, ink-only controls. No sample captions are inserted into uploaded videos.

## Initial constraints

- Optimize for supported 15-second–3-minute, 720p/1080p videos; initial file guard 200 MB and duration guard 180 seconds.
- English Whisper tiny model first; display this before generation. Keep original word timestamps and permit correction. Do not claim tested alignment accuracy without a representative listening test.
- All video processing stays local. Initial model downloads contact Hugging Face; application/font/FFmpeg assets are served by the host. No analytics or backend.
- MP4 H.264/AAC export uses a single-thread WASM core, off the UI thread, with a cancellable job. Do not promise unrestricted size or codec support.
- Keep timing finite, positive, non-overlapping and within video duration. Timeline drag and trim are one history entry per gesture.
- Tests and production build must pass before integration into dev. Real-browser checks use a local preview; publication is a separate launch step after the roadmap's device/accuracy benchmark gates.

## Visual review

Reviewed production screenshots at 1440, 1024/768 and 390 pixels, and the real editor and exported frames. Fixed phone overflow from the example waveform's intrinsic width, a retained panel scroll position, wrapping tablet/phone headings, and CSS/libass font-size differences. The automated page inspector reports zero failures with the brief's explicitly requested thin borders allowed. Remaining warnings are intentional: original SVG illustration/interface previews replace stock photography and footage; the dashed frame explains upload; miniature editor fragments retain timeline type sizes; the page uses display/body sizes plus functional preview labels.

The headline's selected word, original speaker, editable demonstration timeline, four caption treatments and large real-video preview carry the product's identity. No invented customers, testimonials, statistics or generated-caption results appear. The landing example is independent of uploaded videos. Reduced motion disables the arrival animation and automatic example cycling.

## Review boundaries

Local files are validated for size, browser-decodable metadata, dimensions and duration. User text renders through React, subtitle text is escaped, and the FFmpeg virtual filesystem uses fixed internal filenames rather than user-controlled paths. No media is posted to a server. Source object URLs are revoked on replacement/exit; processing workers are terminated after use/cancel. Undo history is capped. Full representative media benchmarking and public hosting remain unverified launch work, as detailed in README.

## Project organization and caption fetch repair

Source code is organized by feature under `src/features`, with app composition/styles in `src/app`, the shared brand in `src/components`, unit checks under `tests/unit`, and implementation documentation here in `docs`. Imports and the transcription worker URL follow the new locations; no compatibility re-export files or empty placeholder layers were added. Video metadata types belong to the video feature, while caption types/defaults belong to the caption model.

The reported fetch failure was reproduced as a stopped local preview server: the browser retained the page but could not fetch its on-demand processing files. Restoring the server allowed the in-app browser to generate 12 words from the synthetic speech fixture, with no browser errors. Development and preview now share a strict port, 4180. Missing engine modules/core files and unavailable speech-model downloads have separate recovery messages; failed/retried jobs preserve edits. Tests exercise both blocked download paths, and a unit regression covers failure to import the engine module itself.

The header and favicon use the same original monochrome slime SVG. The editor no longer imports its brand from the landing feature.
