import { normalizeWords } from "../captions/captions";
import type { SubtitleWord } from "../captions/model";

export function transcribe(
  audio: Float32Array,
  duration: number,
  signal: AbortSignal,
  update: (message: string) => void,
): Promise<SubtitleWord[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./transcription.worker.ts", import.meta.url),
      { type: "module" },
    );
    const cleanup = () => {
      worker.terminate();
      signal.removeEventListener("abort", cancel);
    };
    const cancel = () => {
      cleanup();
      reject(new DOMException("Cancelled", "AbortError"));
    };
    if (signal.aborted) {
      cancel();
      return;
    }
    signal.addEventListener("abort", cancel, { once: true });
    worker.onerror = () => {
      cleanup();
      reject(
        new Error(
          "The transcription worker stopped. Your device may be low on memory. Try a shorter video.",
        ),
      );
    };
    worker.onmessage = (event) => {
      const data = event.data;
      if (data.type === "progress") update(data.message);
      if (data.type === "error") {
        cleanup();
        reject(new Error(data.message));
      }
      if (data.type === "complete") {
        cleanup();
        try {
          resolve(normalizeWords(data.chunks, duration));
        } catch (error) {
          reject(error);
        }
      }
    };
    worker.postMessage({ audio }, [audio.buffer]);
  });
}
