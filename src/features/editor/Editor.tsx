import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Download,
  LoaderCircle,
  Pause,
  Play,
  Redo2,
  SkipBack,
  Undo2,
  X,
} from "lucide-react";
import { Brand } from "../../components/Brand";
import { Caption } from "../captions/components/Caption";
import { Sidebar } from "./components/Sidebar";
import { Timeline } from "./components/Timeline";
import {
  clamp,
  displayTime,
  moveWord,
  serializeSubtitles,
} from "../captions/captions";
import { useEditor } from "./store";
import { download, processMedia } from "../video/processing";
import { transcribe } from "../transcription/transcribe";
import type { VideoSource } from "../video/types";

export function Editor({
  source,
  exit,
  chooseVideo,
  initialTime,
  onTimeChange,
  saveLabel,
}: {
  source: VideoSource;
  exit: () => void;
  chooseVideo: () => void;
  initialTime: number;
  onTimeChange: (time: number) => void;
  saveLabel: string;
}) {
  const { project, past, future, selectedId, commit, undo, redo } = useEditor();
  const video = useRef<HTMLVideoElement>(null),
    frame = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(initialTime),
    [playing, setPlaying] = useState(false),
    [height, setHeight] = useState(400);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [menu, setMenu] = useState(false);
  const [position, setPosition] = useState<{
    positionX: number;
    positionY: number;
  } | null>(null);
  const controller = useRef<AbortController | null>(null),
    exportMenu = useRef<HTMLDivElement>(null);
  const positionDrag = useRef<{ pointer: number } | null>(null);
  const seek = useCallback(
    (value: number) => {
      if (video.current)
        video.current.currentTime = clamp(value, 0, source.duration);
      const next = clamp(value, 0, source.duration);
      setTime(next);
      onTimeChange(next);
    },
    [source.duration, onTimeChange],
  );
  const togglePlay = useCallback(() => {
    if (!video.current) return;
    if (video.current.paused)
      void video.current
        .play()
        .catch(() =>
          setError(
            "Playback could not start. Try seeking or choose another video.",
          ),
        );
    else video.current.pause();
  }, []);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) =>
      setHeight(entries[0].contentRect.height),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!playing) return;
    let id: number;
    const tick = () => {
      if (video.current) setTime(video.current.currentTime);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]);
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          "input,textarea,select,[contenteditable]",
        )
      )
        return;
      if (e.key === "Escape") {
        setMenu(false);
        return;
      }
      if (busy) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if ((e.target as HTMLElement).closest("button,a")) return;
      else if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const delta =
          (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 0.5 : 0.05);
        const selected = project.words.find((w) => w.id === selectedId);
        if (selected)
          commit((p) => ({
            ...p,
            words: moveWord(
              p.words,
              selected.id,
              selected.start + delta,
              p.duration,
            ),
          }));
        else seek(time + delta);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        commit((p) => ({
          ...p,
          words: p.words.filter((w) => w.id !== selectedId),
        }));
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [
    busy,
    time,
    selectedId,
    project.words,
    commit,
    redo,
    undo,
    seek,
    togglePlay,
  ]);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!exportMenu.current?.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);

  async function runJob(kind: "transcribe" | "export") {
    if (controller.current) return;
    if (
      kind === "transcribe" &&
      project.words.length &&
      !window.confirm(
        "Replace all current captions with a new transcription? You can undo this after generation.",
      )
    )
      return;
    const abort = new AbortController();
    controller.current = abort;
    setMenu(false);
    setBusy(true);
    setError("");
    setNotice("");
    video.current?.pause();
    try {
      if (kind === "transcribe") {
        const audio = await processMedia(source, null, abort.signal, setStatus);
        if (!(audio instanceof Float32Array))
          throw new Error("Could not extract audio.");
        const words = await transcribe(
          audio,
          source.duration,
          abort.signal,
          setStatus,
        );
        if (abort.signal.aborted) return;
        if (!words.length) {
          setNotice(
            "No speech was recognized. Try clearer English audio or add words manually.",
          );
          return;
        }
        commit((p) => ({ ...p, words }));
        useEditor.getState().select(words[0].id);
        seek(words[0].start);
        setNotice(
          `${words.length} captions generated. Play the video to check wording and timing.`,
        );
      } else {
        const blob = await processMedia(
          source,
          project,
          abort.signal,
          setStatus,
        );
        if (!(blob instanceof Blob))
          throw new Error("Could not create a video.");
        if (!abort.signal.aborted) {
          download(
            blob,
            `${source.file.name.replace(/\.[^.]+$/, "")}-captioned.mp4`,
          );
          setNotice("Your captioned MP4 is ready.");
        }
      }
    } catch (e) {
      if (abort.signal.aborted)
        setNotice("Processing cancelled. Your captions are unchanged.");
      else
        setError(
          e instanceof Error
            ? e.message
            : "Processing failed. Retry or try a shorter video.",
        );
    } finally {
      controller.current = null;
      setBusy(false);
      setStatus("");
    }
  }

  function subtitles(format: "srt" | "vtt") {
    download(
      new Blob([serializeSubtitles(project.words, format)], {
        type:
          format === "vtt"
            ? "text/vtt;charset=utf-8"
            : "application/x-subrip;charset=utf-8",
      }),
      `${source.file.name.replace(/\.[^.]+$/, "")}.${format}`,
    );
    setMenu(false);
    setNotice(`${format.toUpperCase()} downloaded with your edited timings.`);
  }
  function dragPosition(e: React.PointerEvent<HTMLDivElement>) {
    if (!positionDrag.current || !frame.current) return;
    const rect = frame.current.getBoundingClientRect();
    setPosition({
      positionX: clamp(((e.clientX - rect.left) / rect.width) * 100, 5, 95),
      positionY: clamp(((e.clientY - rect.top) / rect.height) * 100, 5, 95),
    });
  }
  function finishPosition(cancel: boolean) {
    if (position && !cancel)
      commit((p) => ({ ...p, style: { ...p.style, ...position } }));
    setPosition(null);
    positionDrag.current = null;
  }

  return (
    <div className="editor-shell">
      <header className="editor-header">
        <button
          className="editor-home"
          aria-label="Return to home"
          disabled={busy}
          onClick={exit}
        >
          <ArrowLeft size={18} />
          <Brand />
        </button>
        <div className="file-info">
          <strong title={source.file.name}>{source.file.name}</strong>
          <span>
            {source.width} × {source.height} · {displayTime(source.duration)}
          </span>
        </div>
        <div className="editor-header-actions">
          <button
            className="icon-button"
            disabled={!past.length || busy}
            onClick={undo}
            aria-label="Undo"
            title="Undo (Ctrl/⌘ Z)"
          >
            <Undo2 size={19} />
          </button>
          <button
            className="icon-button"
            disabled={!future.length || busy}
            onClick={redo}
            aria-label="Redo"
            title="Redo (Ctrl/⌘ Shift Z)"
          >
            <Redo2 size={19} />
          </button>
          <span className="toolbar-divider" />
          <button
            className="button secondary small replace-video"
            disabled={busy}
            onClick={chooseVideo}
          >
            Change video <ArrowUpRight size={14} />
          </button>
          <div className="export-menu-anchor" ref={exportMenu}>
            <button
              className="button small"
              disabled={busy || !project.words.length}
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
              aria-controls="export-options"
            >
              <Download size={15} /> Export <ChevronDown size={14} />
            </button>
            {menu && (
              <div className="export-menu" id="export-options">
                <h3>Take your words with you.</h3>
                <button onClick={() => void runJob("export")}>
                  <span>
                    <strong>Captioned video</strong>
                    <small>MP4 · original audio · local render</small>
                  </span>
                  <Download size={17} />
                </button>
                <button onClick={() => subtitles("srt")}>
                  <span>
                    <strong>Subtitle file</strong>
                    <small>SRT · individual word timings</small>
                  </span>
                  <span>.srt</span>
                </button>
                <button onClick={() => subtitles("vtt")}>
                  <span>
                    <strong>Web captions</strong>
                    <small>VTT · individual word timings</small>
                  </span>
                  <span>.vtt</span>
                </button>
                <p>
                  MP4 export can be slow and use significant memory. Keep this
                  tab open.
                </p>
              </div>
            )}
          </div>
        </div>
      </header>
      {(error || notice) && (
        <div
          className={`editor-message ${error ? "error-message" : ""}`}
          role={error ? "alert" : "status"}
        >
          {!error && <Check size={16} />}
          <span>{error || notice}</span>
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => {
              setError("");
              setNotice("");
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {busy && (
        <div className="processing-banner" role="status">
          <LoaderCircle size={17} className="spin" />
          <span>{status || "Preparing…"}</span>
          <button
            onClick={() => {
              controller.current?.abort();
              setStatus("Cancelling…");
            }}
          >
            Cancel
          </button>
        </div>
      )}
      <div className="editor-main">
        <Sidebar
          time={time}
          seek={seek}
          busy={busy}
          generate={() => void runJob("transcribe")}
          onError={setError}
          saveLabel={saveLabel}
        />
        <section className="preview-panel" aria-label="Video preview">
          <div className="preview-topline">
            <span>Preview</span>
            <span>
              Fit · {source.height > source.width ? "Portrait" : "Landscape"}
            </span>
          </div>
          <div className="preview-well">
            <div
              className="video-frame"
              ref={frame}
              style={{ aspectRatio: `${source.width} / ${source.height}` }}
              onPointerMove={dragPosition}
              onPointerUp={() => finishPosition(false)}
              onPointerCancel={() => finishPosition(true)}
            >
              <video
                ref={video}
                src={source.url}
                playsInline
                preload="auto"
                onLoadedMetadata={() => seek(initialTime)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onTimeUpdate={() => {
                  if (video.current) {
                    setTime(video.current.currentTime);
                    onTimeChange(video.current.currentTime);
                  }
                }}
                onSeeked={() => {
                  if (video.current) onTimeChange(video.current.currentTime);
                }}
                onError={() =>
                  setError("The video could not be played. Try an H.264 MP4.")
                }
                onClick={togglePlay}
                aria-label="Uploaded video preview"
              />
              <Caption
                words={project.words}
                time={time}
                style={{ ...project.style, ...position }}
                previewHeight={height}
                onPointerDown={
                  busy
                    ? undefined
                    : (e) => {
                        e.stopPropagation();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        positionDrag.current = { pointer: e.pointerId };
                      }
                }
              />
            </div>
          </div>
          <div className="preview-controls">
            <button
              className="icon-button"
              aria-label="Seek to start"
              onClick={() => seek(0)}
            >
              <SkipBack size={18} />
            </button>
            <button
              className="play-button"
              aria-label={playing ? "Pause video" : "Play video"}
              onClick={togglePlay}
            >
              {playing ? <Pause size={19} /> : <Play size={19} />}
            </button>
            <span className="time-display">
              {displayTime(time)} <span>/ {displayTime(source.duration)}</span>
            </span>
            <input
              type="range"
              min="0"
              max={source.duration}
              step="0.01"
              value={time}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Video playhead"
            />
            <span className="preview-local">
              <span className="local-indicator" /> Local preview
            </span>
          </div>
        </section>
      </div>
      <Timeline time={time} seek={seek} busy={busy} />
    </div>
  );
}
