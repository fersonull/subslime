import { toAss } from "./captions";
import type { EditorProject, VideoSource } from "./types";

export const MAX_BYTES = 200 * 1024 * 1024;
export const MAX_DURATION = 180;

export async function readVideo(file: File): Promise<VideoSource> {
  if (!file.size)
    throw new Error("This file is empty. Choose a video with content.");
  if (file.size > MAX_BYTES)
    throw new Error(
      "Choose a video smaller than 200 MB for this browser version.",
    );
  if (!/\.(mp4|webm|mov|m4v)$/i.test(file.name))
    throw new Error(
      "Choose an MP4, WebM, or MOV video. Codec support depends on your browser.",
    );
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(
        () =>
          reject(new Error("Reading this video timed out. Try an H.264 MP4.")),
        15000,
      );
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timer);
        reject(
          new Error(
            "Your browser cannot decode this video. Try an H.264 MP4 or VP9 WebM.",
          ),
        );
      };
      video.src = url;
    });
    if (
      !Number.isFinite(video.duration) ||
      video.duration <= 0 ||
      !video.videoWidth
    )
      throw new Error("The video has no usable duration or picture.");
    if (video.duration > MAX_DURATION)
      throw new Error(
        "Choose a video up to 3 minutes long for this initial version.",
      );
    if (video.videoWidth * video.videoHeight > 1920 * 1080)
      throw new Error(
        "Choose a video up to 1080p to keep browser memory use manageable.",
      );
    return {
      file,
      url,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

export async function processMedia(
  source: VideoSource,
  project: EditorProject | null,
  signal: AbortSignal,
  update: (message: string) => void,
): Promise<Float32Array | Blob> {
  update("Loading the local video engine…");
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
  const ffmpeg = new FFmpeg();
  const cancel = () => ffmpeg.terminate();
  signal.addEventListener("abort", cancel, { once: true });
  let lastLog = "";
  ffmpeg.on("log", ({ message }) => {
    lastLog = message;
  });
  ffmpeg.on("progress", ({ time }) => {
    const percent = Math.min(
      99,
      Math.max(0, Math.round((time / 1000000 / source.duration) * 100)),
    );
    update(
      `${project ? "Rendering captions" : "Extracting audio"} · ${percent}%`,
    );
  });
  try {
    await ffmpeg.load({
      coreURL: `${location.origin}/ffmpeg/ffmpeg-core.js`,
      wasmURL: `${location.origin}/ffmpeg/ffmpeg-core.wasm`,
    });
    await ffmpeg.writeFile(
      "input",
      new Uint8Array(await source.file.arrayBuffer()),
    );
    if (!project) {
      update("Extracting mono audio at 16 kHz…");
      const code = await ffmpeg.exec([
        "-i",
        "input",
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_f32le",
        "-f",
        "f32le",
        "audio.raw",
      ]);
      if (code !== 0)
        throw new Error(
          "Audio extraction failed. This video may have no audio or use an unsupported codec.",
        );
      const data = await ffmpeg.readFile("audio.raw");
      if (!(data instanceof Uint8Array) || !data.byteLength)
        throw new Error(
          "No audio was found. You can still add captions manually.",
        );
      return new Float32Array(new Uint8Array(data).buffer);
    }
    update("Preparing the caption font…");
    await ffmpeg.createDir("/fonts");
    const name =
      project.style.fontFamily === "Noto Sans Mono"
        ? "NotoSansMono"
        : "NotoSans";
    const font = await fetch(`/fonts/${name}-Bold.ttf`, { signal });
    if (!font.ok)
      throw new Error(
        "The export font could not be loaded. Retry after reloading the page.",
      );
    await ffmpeg.writeFile(
      `/fonts/${name}.ttf`,
      new Uint8Array(await font.arrayBuffer()),
    );
    await ffmpeg.writeFile(
      "captions.ass",
      new TextEncoder().encode(
        toAss(project.words, project.style, source.width, source.height),
      ),
    );
    update("Rendering your MP4 locally…");
    const code = await ffmpeg.exec([
      "-i",
      "input",
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-vf",
      "subtitles=captions.ass:fontsdir=/fonts,pad=ceil(iw/2)*2:ceil(ih/2)*2",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      "output.mp4",
    ]);
    if (code !== 0)
      throw new Error(
        `Video export failed. Try a shorter H.264 MP4. ${lastLog}`,
      );
    const data = await ffmpeg.readFile("output.mp4");
    if (!(data instanceof Uint8Array))
      throw new Error("No video was produced.");
    return new Blob([new Uint8Array(data).buffer], { type: "video/mp4" });
  } finally {
    signal.removeEventListener("abort", cancel);
    ffmpeg.terminate();
  }
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
