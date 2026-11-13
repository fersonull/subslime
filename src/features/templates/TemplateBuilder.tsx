import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Pause, Play, Save } from "lucide-react";
import { Brand } from "../../components/Brand";
import { useConfirm } from "../../components/ConfirmDialog";
import { Caption } from "../captions/components/Caption";
import {
  blankTemplateStyle,
  type CaptionDesign,
  type CaptionStyle,
} from "../captions/model";
import { loadTemplates, saveTemplates, type CustomTemplate } from "./storage";

function editableStyle(
  style?: CaptionStyle,
): CaptionStyle & { design: CaptionDesign } {
  if (!style) return structuredClone(blankTemplateStyle);
  return {
    ...style,
    template: "custom",
    design:
      style.template === "custom" && style.design
        ? { ...style.design }
        : {
            ...blankTemplateStyle.design,
            display: style.template === "karaoke" ? "phrase" : "word",
            wordsPerLine: 5,
            highlight: style.template === "karaoke" ? "box" : "none",
            box:
              style.template === "bold-highlight" ||
              style.template === "minimal-box",
          },
  };
}

function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  change,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  change: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="builder-field">
      <span>
        {label}
        <span className="builder-value" aria-hidden="true">
          {value}
          {unit}
        </span>
      </span>
      <input
        aria-label={label}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => change(Number(event.target.value))}
      />
    </label>
  );
}
function Color({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
}) {
  return (
    <label className="builder-color">
      <span>{label}</span>
      <input
        type="color"
        aria-label={label}
        value={value}
        onChange={(event) => change(event.target.value)}
      />
    </label>
  );
}

export function TemplateBuilder({
  template,
  save,
  close,
}: {
  template: CustomTemplate | null;
  save: (template: CustomTemplate) => void;
  close: () => void;
}) {
  const [style, setStyle] = useState(() => editableStyle(template?.style));
  const [name, setName] = useState(template?.name ?? "");
  const [sample, setSample] = useState("Make every word your own");
  const [time, setTime] = useState(0.1);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [height, setHeight] = useState(500);
  const preview = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const initial = useRef(JSON.stringify({ style, name }));
  const dirty = JSON.stringify({ style, name }) !== initial.current;
  const confirm = useConfirm();
  const words = (sample.trim() || "Your caption here")
    .split(/\s+/)
    .map((text, i) => ({
      id: String(i),
      text,
      start: i * 0.7,
      end: (i + 1) * 0.7,
    }));
  const duration = words.length * 0.7;
  const update = (patch: Partial<CaptionStyle>) =>
    setStyle((current) => ({ ...current, ...patch }));
  const design = (patch: Partial<CaptionDesign>) =>
    setStyle((current) => ({
      ...current,
      design: { ...current.design, ...patch },
    }));
  useEffect(() => {
    heading.current?.focus();
    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry.contentRect.height),
    );
    if (preview.current) observer.observe(preview.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  useEffect(() => {
    if (!playing) return;
    let frame: number;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - previous) / 1000;
      previous = now;
      setTime((current) => (current + elapsed) % duration);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, duration]);
  async function back() {
    if (
      !dirty ||
      (await confirm({
        title: "Discard template changes?",
        message: "Your saved template and video project will stay unchanged.",
        action: "Discard changes",
      }))
    )
      close();
  }
  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give your template a name before saving.");
      return;
    }
    try {
      const items = loadTemplates();
      if (
        items.some(
          (item) =>
            item.id !== template?.id &&
            item.name.toLowerCase() === trimmed.toLowerCase(),
        )
      ) {
        setError("A template already uses that name. Choose another.");
        return;
      }
      const next = {
        id: template?.id ?? crypto.randomUUID(),
        name: trimmed,
        style,
      };
      saveTemplates([...items.filter((item) => item.id !== next.id), next]);
      save(next);
    } catch {
      setError(
        "Save failed. Check browser storage and retry. Your design is still here.",
      );
    }
  }
  return (
    <main className="template-builder" aria-label="Template builder">
      <header className="builder-header">
        <button className="text-link" onClick={() => void back()}>
          <ArrowLeft size={18} /> Back to video
        </button>
        <Brand />
        <button className="button small" onClick={submit}>
          <Save size={15} /> Save template
        </button>
      </header>
      <div className="builder-intro">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            {template ? "Edit your template" : "Build your own template"}
          </h1>
          <p>Start with your idea. Shape the words, then see them in motion.</p>
        </div>
        <span>Free for now</span>
      </div>
      <div className="builder-workspace">
        <section className="builder-preview" aria-label="Template preview">
          <div className="builder-stage">
            <div className="builder-canvas" ref={preview}>
              <Caption
                words={words}
                time={time}
                style={style}
                previewHeight={height}
              />
            </div>
          </div>
          <div className="builder-playback">
            <button
              className="button secondary small"
              aria-label={
                playing ? "Pause template preview" : "Play template preview"
              }
              onClick={() => setPlaying(!playing)}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <input
              aria-label="Template preview time"
              type="range"
              min="0"
              max={duration - 0.01}
              step="0.01"
              value={Math.min(time, duration - 0.01)}
              onChange={(event) => {
                setPlaying(false);
                setTime(Number(event.target.value));
              }}
            />
            <span>
              {time.toFixed(1)} / {duration.toFixed(1)}s
            </span>
          </div>
          <label className="builder-sample">
            Preview text
            <input
              value={sample}
              maxLength={160}
              onChange={(event) => {
                setSample(event.target.value);
                setTime(0.1);
              }}
            />
          </label>
          <p className="builder-help">
            Illustrative 9:16 canvas · Sizes scale with your video. Preview text
            is not added to your project.
          </p>
        </section>
        <form
          className="builder-controls"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="builder-name">
            Template name
            <input
              value={name}
              maxLength={60}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              placeholder="Give your idea a name"
            />
          </label>
          <p className="builder-feedback" role={error ? "alert" : undefined}>
            {error ||
              (dirty
                ? "Unsaved template changes"
                : "Your video stays unchanged until you save.")}
          </p>
          <fieldset>
            <legend>Words & timing</legend>
            <label>
              Show
              <select
                aria-label="Word display"
                value={style.design.display}
                onChange={(event) =>
                  design({
                    display: event.target.value as CaptionDesign["display"],
                  })
                }
              >
                <option value="word">One word at a time</option>
                <option value="phrase">A phrase at a time</option>
              </select>
            </label>
            <Range
              label="Words per phrase"
              value={style.design.wordsPerLine}
              min={1}
              max={8}
              disabled={style.design.display !== "phrase"}
              change={(wordsPerLine) => design({ wordsPerLine })}
            />
            <label>
              Active word
              <select
                aria-label="Active word treatment"
                value={style.design.highlight}
                onChange={(event) =>
                  design({
                    highlight: event.target.value as CaptionDesign["highlight"],
                  })
                }
              >
                <option value="none">No highlight</option>
                <option value="text">Change text color</option>
                <option value="box">Add a highlight box</option>
              </select>
            </label>
            <Color
              label="Highlight color"
              value={style.design.highlightColor}
              change={(highlightColor) => design({ highlightColor })}
            />
          </fieldset>
          <fieldset>
            <legend>Typography</legend>
            <label>
              Font
              <select
                aria-label="Template font"
                value={style.fontFamily}
                onChange={(event) =>
                  update({
                    fontFamily: event.target
                      .value as CaptionStyle["fontFamily"],
                  })
                }
              >
                <option>Noto Sans</option>
                <option>Noto Sans Mono</option>
              </select>
            </label>
            <Range
              label="Text size"
              value={style.fontSize}
              min={20}
              max={140}
              unit="px"
              change={(fontSize) => update({ fontSize })}
            />
            <Range
              label="Letter spacing"
              value={style.design.letterSpacing}
              min={0}
              max={12}
              unit="px"
              change={(letterSpacing) => design({ letterSpacing })}
            />
            <div className="builder-checkboxes">
              <label>
                <input
                  type="checkbox"
                  checked={style.design.italic}
                  onChange={(event) => design({ italic: event.target.checked })}
                />{" "}
                Italic
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={style.design.uppercase}
                  onChange={(event) =>
                    design({ uppercase: event.target.checked })
                  }
                />{" "}
                Uppercase
              </label>
            </div>
            <Color
              label="Text color"
              value={style.textColor}
              change={(textColor) => update({ textColor })}
            />
          </fieldset>
          <fieldset>
            <legend>Box, outline & shadow</legend>
            <label className="builder-checkbox">
              <input
                type="checkbox"
                checked={style.design.box}
                onChange={(event) => design({ box: event.target.checked })}
              />{" "}
              Background box
            </label>
            <Color
              label="Box color"
              value={style.backgroundColor}
              change={(backgroundColor) => update({ backgroundColor })}
            />
            <Range
              label="Box padding"
              value={style.design.padding}
              min={0}
              max={32}
              unit="px"
              change={(padding) => design({ padding })}
            />
            <Range
              label="Outline width"
              value={style.outlineWidth}
              min={0}
              max={20}
              unit="px"
              disabled={style.design.box}
              change={(outlineWidth) => update({ outlineWidth })}
            />
            <Color
              label="Outline color"
              value={style.outlineColor}
              change={(outlineColor) => update({ outlineColor })}
            />
            <Range
              label="Shadow"
              value={style.design.shadow}
              min={0}
              max={12}
              unit="px"
              change={(shadow) => design({ shadow })}
            />
          </fieldset>
          <fieldset>
            <legend>Placement</legend>
            <Range
              label="Horizontal position"
              value={style.positionX}
              min={5}
              max={95}
              unit="%"
              change={(positionX) => update({ positionX })}
            />
            <Range
              label="Vertical position"
              value={style.positionY}
              min={5}
              max={95}
              unit="%"
              change={(positionY) => update({ positionY })}
            />
            <Range
              label="Rotation"
              value={style.design.rotation}
              min={-30}
              max={30}
              unit="°"
              change={(rotation) => design({ rotation })}
            />
          </fieldset>
        </form>
      </div>
    </main>
  );
}
