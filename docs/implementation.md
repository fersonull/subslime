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

## Local project autosave and drop feedback

The current project now uses native IndexedDB, scoped to the browser profile and origin. A versioned state record stores captions, styling, selected word and playhead; a separate record holds the original File and a project ID. Creating/replacing a project writes both records in one transaction. Subsequent edits write only state, and report success after transaction completion. New object URLs are created from the restored File rather than storing expiring URLs.

Restoration validates timing, style and playback values before hydrating the editor, then checks the video metadata against the saved duration. Undo history and processing jobs restart fresh. Saving is triggered by project/selection edits and playback/seek events. Pending or failed writes retain the leave warning; storage errors remain visible with a retry action. A failed initial save leaves the current editor usable in memory and leaves the previous disk project intact. Metadata updates and deletion check the project ID so an older tab cannot overwrite/remove a newly opened project; simultaneous editing of the same project in multiple tabs remains unsupported.

Returning home keeps the project and offers Resume editing and Forget saved project. Forget requires confirmation and removes only the app's current project records, leaving model caches alone. Browser storage is best-effort; private browsing, clearing site data or browser eviction can remove it. Exports remain the backup path.

The original slime is reworked as a square C and mirrored C, with square eyes and a rectangular mouth. The favicon, shared brand, README banner and full-page drop overlay use the same mark. Nested file-drag entries use a depth counter to avoid flicker; drop, leaving the page, drag-end, Escape and window blur clear the feedback. Text drags keep normal browser behavior. The overlay has live status text, does not steal focus and does not intercept the underlying drop target.

Verification includes native browser IndexedDB restoration of the video, words, style and playhead; quota failure after a replacement video write; blocked storage; stale-tab retries; forgetting saved data; and desktop/phone overlay screenshots. Storage-data validation is also unit-tested.

## Custom templates, notifications and upload resolution

Uploads no longer reject videos above 1080p. File-size, duration and codec checks remain. Full-resolution rendering still runs in FFmpeg.wasm and can exceed a device's memory; removal of the upload cap does not guarantee high-resolution export on every device.

Named custom templates store a complete caption style, including its built-in rendering behavior, in a versioned localStorage library. The library is small and independent of the IndexedDB video project, so replacing or forgetting a project preserves templates. The same caption-style validator protects both persistence boundaries. Invalid data or failed writes leave the previous library unchanged. Users create, apply and delete templates in Style; applying uses the existing undoable editor commit. Custom templates are free at present. Paid entitlement and billing are deferred, with no placeholder gating or billing dependencies.

App confirmations use a shared styled HTML dialog with a promise result, focus containment, a focused Cancel action, and Escape cancellation. Project replacement, forgetting, caption regeneration and custom-template deletion share it. The browser's unsaved-work leave warning remains browser-controlled. Temporary upload/editor notifications use a shared toast that starts fading after five seconds and unmounts after 250 ms; reduced-motion settings remove the fade. Processing/cancellation controls and storage failures remain persistent.

Regression checks cover accepting 4K metadata, custom-template validation and storage errors, toast dismissal, modal cancellation/focus, and saving/reusing/deleting templates across refresh and project removal. Real high-resolution exports beyond 1080p and physical-device limits have not been benchmarked.
