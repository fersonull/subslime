export type SubtitleWord = {
  id: string;
  text: string;
  start: number;
  end: number;
  confidence?: number;
};
export type CaptionTemplate =
  "classic-pop" | "bold-highlight" | "karaoke" | "minimal-box";
export type CaptionStyle = {
  template: CaptionTemplate;
  fontFamily: "Noto Sans" | "Noto Sans Mono";
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  outlineColor: string;
  outlineWidth: number;
  positionX: number;
  positionY: number;
};
export type EditorProject = {
  words: SubtitleWord[];
  style: CaptionStyle;
  duration: number;
};

export function isCaptionStyle(value: unknown): value is CaptionStyle {
  if (!value || typeof value !== "object") return false;
  const style = value as CaptionStyle;
  return (
    templates.some((template) => template.id === style.template) &&
    ["Noto Sans", "Noto Sans Mono"].includes(style.fontFamily) &&
    [style.textColor, style.backgroundColor, style.outlineColor].every(
      (color) => typeof color === "string" && /^#[\da-f]{6}$/i.test(color),
    ) &&
    [
      style.fontSize,
      style.outlineWidth,
      style.positionX,
      style.positionY,
    ].every(Number.isFinite) &&
    style.fontSize >= 20 &&
    style.fontSize <= 140 &&
    style.outlineWidth >= 0 &&
    style.outlineWidth <= 20 &&
    style.positionX >= 5 &&
    style.positionX <= 95 &&
    style.positionY >= 5 &&
    style.positionY <= 95
  );
}

export const templates: {
  id: CaptionTemplate;
  name: string;
  description: string;
}[] = [
  {
    id: "classic-pop",
    name: "Classic Pop",
    description: "One word. All the emphasis.",
  },
  {
    id: "bold-highlight",
    name: "Bold Highlight",
    description: "A little louder, in a box.",
  },
  {
    id: "karaoke",
    name: "Karaoke",
    description: "Keep the phrase. Follow the word.",
  },
  {
    id: "minimal-box",
    name: "Minimal Box",
    description: "Small type. Quiet confidence.",
  },
];
export const defaultStyle: CaptionStyle = {
  template: "classic-pop",
  fontFamily: "Noto Sans",
  fontSize: 64,
  textColor: "#ffffff",
  backgroundColor: "#111111",
  outlineColor: "#111111",
  outlineWidth: 3,
  positionX: 50,
  positionY: 76,
};
export function templateStyle(template: CaptionTemplate): CaptionStyle {
  return {
    ...defaultStyle,
    template,
    ...(template === "bold-highlight"
      ? { textColor: "#111111", backgroundColor: "#ffffff", outlineWidth: 0 }
      : {}),
    ...(template === "minimal-box" ? { fontSize: 40, outlineWidth: 0 } : {}),
  };
}
