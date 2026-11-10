import { useRef, useState } from "react";
import { Magnet, Minus, Plus } from "lucide-react";
import { clamp, displayTime, moveWord, trimWord } from "./captions";
import { useEditor } from "./store";
import type { SubtitleWord } from "./types";

export function Timeline({
  time,
  seek,
  busy,
}: {
  time: number;
  seek: (n: number) => void;
  busy: boolean;
}) {
  const { project, selectedId, select, commit } = useEditor();
  const [zoom, setZoom] = useState(75),
    [snap, setSnap] = useState(true),
    [draft, setDraft] = useState<SubtitleWord[] | null>(null);
  const drag = useRef<{
    x: number;
    id: string;
    mode: "move" | "start" | "end";
    words: SubtitleWord[];
    draft: SubtitleWord[];
  } | null>(null);
  const width = Math.max(700, project.duration * zoom),
    pixels = width / project.duration;
  const step = pixels < 30 ? 5 : pixels < 60 ? 2 : 1;
  const shown = draft ?? project.words;
  const seekPointer = (e: React.PointerEvent<HTMLElement>) => {
    seek(
      clamp(
        (e.clientX - e.currentTarget.getBoundingClientRect().left) / pixels,
        0,
        project.duration,
      ),
    );
  };
  function begin(
    e: React.PointerEvent<HTMLButtonElement>,
    word: SubtitleWord,
    mode: "move" | "start" | "end",
  ) {
    if (busy || e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    select(word.id);
    drag.current = {
      x: e.clientX,
      id: word.id,
      mode,
      words: project.words,
      draft: project.words,
    };
  }
  function move(e: React.PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current) return;
    const original = current.words.find((w) => w.id === current.id)!;
    let value =
      (current.mode === "end" ? original.end : original.start) +
      (e.clientX - current.x) / pixels;
    if (snap && !e.shiftKey) {
      const points = [
        time,
        0,
        project.duration,
        Math.round(value * 10) / 10,
        ...current.words
          .filter((w) => w.id !== current.id)
          .flatMap((w) => [w.start, w.end]),
      ];
      const nearest = points.reduce(
        (best, point) =>
          Math.abs(point - value) < Math.abs(best - value) ? point : best,
        Infinity,
      );
      if (Math.abs(nearest - value) <= 6 / pixels) value = nearest;
    }
    current.draft =
      current.mode === "move"
        ? moveWord(current.words, current.id, value, project.duration)
        : trimWord(
            current.words,
            current.id,
            current.mode,
            value,
            project.duration,
          );
    setDraft(current.draft);
  }
  function finish(cancel = false) {
    if (drag.current && !cancel) {
      const words = drag.current.draft;
      commit((p) => ({ ...p, words }));
    }
    drag.current = null;
    setDraft(null);
  }
  return (
    <section className="timeline-panel" aria-label="Subtitle timeline">
      <div className="timeline-toolbar">
        <div>
          <strong>Timeline</strong>
          <span className="muted">
            {project.words.length} caption
            {project.words.length === 1 ? "" : "s"}
          </span>
        </div>
        <div>
          <button
            className={`icon-button ${snap ? "active-control" : ""}`}
            onClick={() => setSnap(!snap)}
            aria-label="Snap to nearby timings"
            aria-pressed={snap}
          >
            <Magnet size={17} />
          </button>
          <span className="toolbar-divider" />
          <Minus size={14} />
          <input
            type="range"
            min="15"
            max="240"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Timeline zoom"
          />
          <Plus size={14} />
        </div>
      </div>
      <div className="timeline-scroll">
        <div className="timeline-track-labels">
          <span>Time</span>
          <span>Captions</span>
          <span>Video</span>
        </div>
        <div className="timeline-content" style={{ width }}>
          <div
            className="time-ruler"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              seekPointer(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1) seekPointer(e);
            }}
          >
            {Array.from(
              { length: Math.floor(project.duration / step) + 1 },
              (_, i) => (
                <span key={i} style={{ left: i * step * pixels }}>
                  {displayTime(i * step).slice(0, 5)}
                </span>
              ),
            )}
          </div>
          <div className="caption-track" onPointerDown={seekPointer}>
            {shown.map((word) => (
              <div
                className={`timeline-clip ${word.id === selectedId ? "selected-clip" : ""}`}
                key={word.id}
                style={{
                  left: word.start * pixels,
                  width: (word.end - word.start) * pixels,
                }}
              >
                <button
                  className="clip-trim start-trim"
                  aria-label={`Trim start of ${word.text}`}
                  disabled={busy}
                  onPointerDown={(e) => begin(e, word, "start")}
                  onPointerMove={move}
                  onPointerUp={() => finish()}
                  onPointerCancel={() => finish(true)}
                />
                <button
                  className="clip-body"
                  aria-label={`Select ${word.text}, ${word.start.toFixed(2)} to ${word.end.toFixed(2)} seconds`}
                  disabled={busy}
                  onClick={() => {
                    select(word.id);
                    seek(word.start);
                  }}
                  onPointerDown={(e) => begin(e, word, "move")}
                  onPointerMove={move}
                  onPointerUp={() => finish()}
                  onPointerCancel={() => finish(true)}
                >
                  {word.text}
                </button>
                <button
                  className="clip-trim end-trim"
                  aria-label={`Trim end of ${word.text}`}
                  disabled={busy}
                  onPointerDown={(e) => begin(e, word, "end")}
                  onPointerMove={move}
                  onPointerUp={() => finish()}
                  onPointerCancel={() => finish(true)}
                />
              </div>
            ))}
            {shown.length === 0 && (
              <span className="empty-track-note">
                Your words will appear here. Generate captions or add one
                manually.
              </span>
            )}
          </div>
          <div className="video-track" onPointerDown={seekPointer}>
            <div>
              <span>Original video + audio</span>
            </div>
          </div>
          <div
            className="timeline-playhead"
            style={{ left: time * pixels }}
            aria-hidden="true"
          >
            <span />
          </div>
        </div>
      </div>
      <div className="timeline-hints">
        <span>
          Drag to move · Drag edges to trim · Shift temporarily disables
          snapping
        </span>
        <span>Space to play · ← → to nudge · Ctrl/⌘ Z to undo</span>
      </div>
    </section>
  );
}
