import { useState } from "react";
import { Check, Merge, Plus, Scissors, Trash2 } from "lucide-react";
import {
  clamp,
  displayTime,
  mergeWord,
  MIN_WORD,
  splitWord,
  trimWord,
} from "../../captions/captions";
import { useEditor } from "../store";
import {
  templates,
  templateStyle,
  type CaptionStyle,
} from "../../captions/model";

export function Sidebar({
  time,
  seek,
  busy,
  generate,
  onError,
}: {
  time: number;
  seek: (n: number) => void;
  busy: boolean;
  generate: () => void;
  onError: (s: string) => void;
}) {
  const { project, selectedId, select, commit } = useEditor();
  const [tab, setTab] = useState<"captions" | "style">("captions");
  const selected = project.words.find((w) => w.id === selectedId);
  const index = project.words.findIndex((w) => w.id === selectedId);
  const safely = (action: () => void) => {
    try {
      action();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not edit this caption.");
    }
  };
  const updateStyle = (style: Partial<CaptionStyle>) =>
    commit((p) => ({ ...p, style: { ...p.style, ...style } }));
  function addWord() {
    const startAt = clamp(time, 0, project.duration - MIN_WORD);
    let start = startAt;
    for (const word of project.words) {
      if (start >= word.start && start < word.end) start = word.end;
      if (word.start > start && word.start - start >= MIN_WORD) break;
    }
    const next = project.words.find((w) => w.start >= start);
    const end = Math.min(start + 0.5, next?.start ?? project.duration);
    if (end - start < MIN_WORD) {
      onError(
        "There is no room here. Seek to a gap or shorten a neighboring word.",
      );
      return;
    }
    const word = { id: crypto.randomUUID(), text: "word", start, end };
    commit((p) => ({
      ...p,
      words: [...p.words, word].sort((a, b) => a.start - b.start),
    }));
    select(word.id);
    seek(start);
  }
  return (
    <aside className="editor-sidebar">
      <div
        className="sidebar-tabs"
        role="tablist"
        aria-label="Editor panels"
        onKeyDown={(e) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
            return;
          e.preventDefault();
          const next =
            e.key === "Home"
              ? "captions"
              : e.key === "End"
                ? "style"
                : tab === "captions"
                  ? "style"
                  : "captions";
          setTab(next);
          document.getElementById(`${next}-tab`)?.focus();
        }}
      >
        <button
          role="tab"
          id="captions-tab"
          aria-selected={tab === "captions"}
          aria-controls="caption-panel"
          tabIndex={tab === "captions" ? 0 : -1}
          onClick={() => setTab("captions")}
        >
          Captions <span>{project.words.length}</span>
        </button>
        <button
          role="tab"
          id="style-tab"
          aria-selected={tab === "style"}
          aria-controls="style-panel"
          tabIndex={tab === "style" ? 0 : -1}
          onClick={() => setTab("style")}
        >
          Style
        </button>
      </div>
      {tab === "captions" ? (
        <div
          key="captions"
          className="sidebar-scroll"
          role="tabpanel"
          id="caption-panel"
          aria-labelledby="captions-tab"
        >
          <div className="caption-actions">
            <button className="button small" onClick={generate} disabled={busy}>
              {project.words.length ? "Regenerate" : "Generate captions"}
            </button>
            <button
              className="icon-button"
              aria-label="Add caption"
              onClick={() => safely(addWord)}
              disabled={busy}
            >
              <Plus size={19} />
            </button>
          </div>
          <p className="processing-note">
            English · Runs on your device
            <br />
            First use downloads the Whisper model.
          </p>
          {project.words.length === 0 ? (
            <div className="empty-captions">
              <span className="empty-quote">“ ”</span>
              <h2>Ready when you are.</h2>
              <p>
                Generate captions from your audio, or add a word at the
                playhead.
              </p>
              <p>You can correct every word and its timing.</p>
            </div>
          ) : (
            <ol className="caption-list">
              {project.words.map((word, i) => (
                <li
                  key={word.id}
                  className={selectedId === word.id ? "selected-row" : ""}
                >
                  <button
                    className="caption-index"
                    onClick={() => {
                      select(word.id);
                      seek(word.start);
                    }}
                    aria-label={`Seek to caption ${i + 1}`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </button>
                  <div>
                    <input
                      aria-label={`Caption ${i + 1} text`}
                      key={`${word.id}-${word.text}`}
                      defaultValue={word.text}
                      disabled={busy}
                      maxLength={160}
                      onFocus={() => select(word.id)}
                      onBlur={(e) =>
                        safely(() => {
                          const text = e.target.value.trim();
                          if (!text) {
                            e.target.value = word.text;
                            throw new Error(
                              "A caption cannot be empty. Use Delete to remove it.",
                            );
                          }
                          commit((p) => ({
                            ...p,
                            words: p.words.map((w) =>
                              w.id === word.id ? { ...w, text } : w,
                            ),
                          }));
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                    />
                    <button
                      className="caption-time"
                      onClick={() => {
                        select(word.id);
                        seek(word.start);
                      }}
                    >
                      {displayTime(word.start)} — {displayTime(word.end)}
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {selected && (
            <div
              className="selected-details"
              key={`${selected.id}-${selected.start}-${selected.end}`}
            >
              <h3>Selected word</h3>
              <div className="timing-fields">
                <label>
                  Start (s)
                  <input
                    aria-label="Caption start time"
                    type="number"
                    step="0.01"
                    min="0"
                    max={selected.end - MIN_WORD}
                    defaultValue={selected.start.toFixed(2)}
                    disabled={busy}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n))
                        safely(() =>
                          commit((p) => ({
                            ...p,
                            words: trimWord(
                              p.words,
                              selected.id,
                              "start",
                              n,
                              p.duration,
                            ),
                          })),
                        );
                    }}
                  />
                </label>
                <label>
                  End (s)
                  <input
                    aria-label="Caption end time"
                    type="number"
                    step="0.01"
                    min={selected.start + MIN_WORD}
                    max={project.duration}
                    defaultValue={selected.end.toFixed(2)}
                    disabled={busy}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n))
                        safely(() =>
                          commit((p) => ({
                            ...p,
                            words: trimWord(
                              p.words,
                              selected.id,
                              "end",
                              n,
                              p.duration,
                            ),
                          })),
                        );
                    }}
                  />
                </label>
              </div>
              <div className="word-tools">
                <button
                  disabled={
                    busy ||
                    selected.text.trim().split(/\s+/).length < 2 ||
                    selected.end - selected.start < MIN_WORD * 2
                  }
                  onClick={() =>
                    safely(() =>
                      commit((p) => ({
                        ...p,
                        words: splitWord(p.words, selected.id),
                      })),
                    )
                  }
                  title="Split a caption containing two or more words"
                >
                  <Scissors size={15} /> Split
                </button>
                <button
                  disabled={busy || index === project.words.length - 1}
                  onClick={() =>
                    safely(() =>
                      commit((p) => ({
                        ...p,
                        words: mergeWord(p.words, selected.id),
                      })),
                    )
                  }
                >
                  <Merge size={15} /> Merge
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    commit((p) => ({
                      ...p,
                      words: p.words.filter((w) => w.id !== selected.id),
                    }));
                    select(null);
                  }}
                >
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          key="style"
          className="sidebar-scroll style-panel"
          role="tabpanel"
          id="style-panel"
          aria-labelledby="style-tab"
        >
          <h3>Caption template</h3>
          <div className="editor-templates">
            {templates.map((t) => (
              <button
                aria-label={t.name}
                className={project.style.template === t.id ? "chosen" : ""}
                key={t.id}
                disabled={busy}
                onClick={() => {
                  const style = templateStyle(t.id);
                  commit((p) => ({
                    ...p,
                    style: {
                      ...style,
                      positionX: p.style.positionX,
                      positionY: p.style.positionY,
                      fontFamily: p.style.fontFamily,
                    },
                  }));
                }}
              >
                <span className={`template-type-example ${t.id}`}>Word.</span>
                <span>{t.name}</span>
                {project.style.template === t.id && <Check size={14} />}
              </button>
            ))}
          </div>
          <h3>Typography</h3>
          <label>
            Font
            <select
              value={project.style.fontFamily}
              disabled={busy}
              onChange={(e) =>
                updateStyle({
                  fontFamily: e.target.value as CaptionStyle["fontFamily"],
                })
              }
            >
              <option>Noto Sans</option>
              <option>Noto Sans Mono</option>
            </select>
          </label>
          <label>
            Size <span>{project.style.fontSize}px at 1080p</span>
            <input
              type="range"
              min="20"
              max="140"
              step="2"
              value={project.style.fontSize}
              disabled={busy}
              onChange={(e) =>
                updateStyle({ fontSize: Number(e.target.value) })
              }
            />
          </label>
          <div className="color-fields">
            <label>
              Text
              <input
                type="color"
                aria-label="Caption text color"
                value={project.style.textColor}
                disabled={busy}
                onChange={(e) => updateStyle({ textColor: e.target.value })}
              />
            </label>
            <label>
              Box / inverse
              <input
                type="color"
                aria-label="Caption background color"
                value={project.style.backgroundColor}
                disabled={busy}
                onChange={(e) =>
                  updateStyle({ backgroundColor: e.target.value })
                }
              />
            </label>
          </div>
          <h3>Placement</h3>
          <p className="processing-note">
            Drag a visible caption in the preview, or use these controls.
          </p>
          <label>
            Horizontal <span>{Math.round(project.style.positionX)}%</span>
            <input
              aria-label="Caption horizontal position"
              type="range"
              min="5"
              max="95"
              value={project.style.positionX}
              disabled={busy}
              onChange={(e) =>
                updateStyle({ positionX: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Vertical <span>{Math.round(project.style.positionY)}%</span>
            <input
              aria-label="Caption vertical position"
              type="range"
              min="5"
              max="95"
              value={project.style.positionY}
              disabled={busy}
              onChange={(e) =>
                updateStyle({ positionY: Number(e.target.value) })
              }
            />
          </label>
        </div>
      )}
      <div className="sidebar-footer">
        <span className="local-indicator" /> Local session · not saved after
        closing
      </div>
    </aside>
  );
}
