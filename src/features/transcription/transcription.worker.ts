import {
  env,
  pipeline,
  type AutomaticSpeechRecognitionPipeline,
} from "@huggingface/transformers";

env.allowLocalModels = false;
env.backends.onnx.wasm!.numThreads = 1;
let transcriber: AutomaticSpeechRecognitionPipeline | null = null;

self.onmessage = async (event: MessageEvent<{ audio: Float32Array }>) => {
  try {
    if (!transcriber) {
      transcriber = await pipeline<"automatic-speech-recognition">(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny.en",
        {
          device: "wasm",
          dtype: "q8",
          progress_callback: (progress) => {
            if (progress.status === "progress")
              self.postMessage({
                type: "progress",
                message: `Downloading English model · ${Math.round(progress.progress)}%`,
              });
            else if (progress.status === "initiate")
              self.postMessage({
                type: "progress",
                message: "Downloading English Whisper model (first use)…",
              });
          },
        },
      );
    }
    self.postMessage({
      type: "progress",
      message: "Listening and aligning words on your device…",
    });
    const output = await transcriber(event.data.audio, {
      return_timestamps: "word",
      chunk_length_s: 30,
      stride_length_s: 5,
    });
    const result = Array.isArray(output) ? output[0] : output;
    self.postMessage({ type: "complete", chunks: result.chunks ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({
      type: "error",
      message: /fetch|network|download/i.test(message)
        ? "Could not download the English speech model. Check your internet connection and access to Hugging Face, then retry. Your existing captions have not been changed."
        : message || "Transcription failed. Please retry.",
    });
  }
};
