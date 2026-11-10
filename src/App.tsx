import { useEffect, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { Landing } from "./Landing";
import { Editor } from "./Editor";
import { readVideo } from "./media";
import { useEditor } from "./store";
import type { VideoSource } from "./types";

export function App() {
  const [source, setSource] = useState<VideoSource | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    importing = useRef(false);
  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source.url);
    },
    [source],
  );
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (source && useEditor.getState().project.words.length)
        e.preventDefault();
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [source]);
  async function open(file?: File) {
    if (!file || importing.current) return;
    if (document.querySelector(".processing-banner")) {
      setError("Finish or cancel processing before changing the video.");
      return;
    }
    importing.current = true;
    setLoading(true);
    setError("");
    try {
      const next = await readVideo(file);
      if (
        source &&
        useEditor.getState().project.words.length &&
        !window.confirm(
          "Change video? The current captions will be cleared. Download them first if you want to keep them.",
        )
      ) {
        URL.revokeObjectURL(next.url);
        return;
      }
      useEditor.getState().reset(next.duration);
      setSource(next);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "This video could not be opened.",
      );
    } finally {
      setLoading(false);
      importing.current = false;
    }
  }
  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files.length) {
          e.preventDefault();
          void open(e.dataTransfer.files[0]);
        }
      }}
    >
      <input
        ref={input}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
        aria-label="Choose a video file"
        className="sr-only"
        onChange={(e) => {
          void open(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <div role="alert" className="global-message">
          <span>{error}</span>
          <button
            className="icon-button"
            aria-label="Dismiss upload error"
            onClick={() => setError("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {loading && (
        <div className="global-message" role="status">
          <LoaderCircle className="spin" size={18} /> Reading your video…
        </div>
      )}
      {source ? (
        <Editor
          key={source.url}
          source={source}
          chooseVideo={() => input.current?.click()}
          exit={() => {
            if (
              useEditor.getState().project.words.length &&
              !window.confirm(
                "Leave this video? Your captions are only kept in this tab. Download them before leaving.",
              )
            )
              return;
            setSource(null);
            useEditor.getState().reset(0);
          }}
        />
      ) : (
        <Landing chooseVideo={() => input.current?.click()} />
      )}
    </div>
  );
}
