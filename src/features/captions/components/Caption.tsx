import { Fragment, type CSSProperties } from "react";
import { captionAt } from "../captions";
import type { CaptionStyle, SubtitleWord } from "../model";

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
  const design = style.template === "custom" ? style.design : undefined;
  const frame = captionAt(words, time, style.template, design);
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
      style.template === "classic-pop" || (design && !design.box)
        ? `${style.outlineWidth * scale}px ${style.outlineColor}`
        : undefined,
    paintOrder: "stroke fill",
    ...(design
      ? {
          display: "block",
          background: design.box ? style.backgroundColor : undefined,
          padding: design.box ? design.padding * scale : 0,
          letterSpacing: design.letterSpacing * scale,
          fontStyle: design.italic ? "italic" : "normal",
          transform: `translate(-50%, -50%) rotate(${-design.rotation}deg)`,
          textShadow: design.shadow
            ? `${design.shadow * scale}px ${design.shadow * scale}px 0 #000`
            : undefined,
        }
      : {}),
  } as CSSProperties;
  return (
    <div
      className={`caption-overlay ${style.template} ${onPointerDown ? "draggable-caption" : ""}`}
      style={css}
      onPointerDown={onPointerDown}
    >
      {frame.words.map((w, index) => (
        <Fragment key={w.id}>
          <span
            className={w.id === frame.activeId ? "active-word" : ""}
            style={
              design
                ? {
                    color:
                      w.id === frame.activeId && design.highlight === "text"
                        ? design.highlightColor
                        : undefined,
                    background:
                      w.id === frame.activeId && design.highlight === "box"
                        ? design.highlightColor
                        : undefined,
                    WebkitTextStroke:
                      w.id === frame.activeId && design.highlight === "box"
                        ? "0px"
                        : undefined,
                    boxShadow:
                      w.id === frame.activeId && design.highlight === "box"
                        ? `0 0 0 ${design.padding * scale}px ${design.highlightColor}`
                        : undefined,
                  }
                : undefined
            }
          >
            {design?.uppercase ? w.text.toUpperCase() : w.text}
          </span>
          {design && index < frame.words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </div>
  );
}
