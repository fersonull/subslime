import type { CSSProperties } from "react";
import { captionAt } from "./captions";
import type { CaptionStyle, SubtitleWord } from "./types";

export function Caption({
  words,
  time,
  style,
  previewHeight,
  onPointerDown,
}: {
  words: SubtitleWord[];
  time: number;
  style: CaptionStyle;
  previewHeight: number;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
}) {
  const frame = captionAt(words, time, style.template);
  if (!frame) return null;
  const scale = previewHeight / 1080;
  const css = {
    left: `${style.positionX}%`,
    top: `${style.positionY}%`,
    fontFamily: `'${style.fontFamily}', sans-serif`,
    fontSize: style.fontSize * scale,
    color: style.textColor,
    "--caption-background": style.backgroundColor,
    "--caption-text": style.textColor,
    WebkitTextStroke:
      style.template === "classic-pop"
        ? `${style.outlineWidth * scale}px ${style.outlineColor}`
        : undefined,
    paintOrder: "stroke fill",
  } as CSSProperties;
  return (
    <div
      className={`caption-overlay ${style.template} ${onPointerDown ? "draggable-caption" : ""}`}
      style={css}
      onPointerDown={onPointerDown}
    >
      {frame.words.map((w) => (
        <span
          className={w.id === frame.activeId ? "active-word" : ""}
          key={w.id}
        >
          {w.text}
        </span>
      ))}
    </div>
  );
}
