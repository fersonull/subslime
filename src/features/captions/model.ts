export type SubtitleWord = {
  id: string;
  text: string;
  start: number;
  end: number;
  confidence?: number;
};
export type CaptionTemplate =
  "classic-pop" | "bold-highlight" | "karaoke" | "minimal-box" | "custom";
export type CaptionDesign = {
  display: "word" | "phrase";
  wordsPerLine: number;
  highlight: "none" | "text" | "box";
  highlightColor: string;
  box: boolean;
  padding: number;
  letterSpacing: number;
  italic: boolean;
  uppercase: boolean;
  rotation: number;
  shadow: number;
};
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
  design?: CaptionDesign;
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
    (style.template === "custom"
      ? isCaptionDesign(style.design)
      : templates.some((template) => template.id === style.template)) &&
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

function isCaptionDesign(value: unknown): value is CaptionDesign {
  if (!value || typeof value !== "object") return false;
  const d = value as CaptionDesign;
  return (
    ["word", "phrase"].includes(d.display) &&
    ["none", "text", "box"].includes(d.highlight) &&
    typeof d.highlightColor === "string" &&
    /^#[\da-f]{6}$/i.test(d.highlightColor) &&
    typeof d.box === "boolean" &&
    typeof d.italic === "boolean" &&
    typeof d.uppercase === "boolean" &&
    [d.wordsPerLine, d.padding, d.letterSpacing, d.rotation, d.shadow].every(
      Number.isFinite,
    ) &&
    Number.isInteger(d.wordsPerLine) &&
    d.wordsPerLine >= 1 &&
    d.wordsPerLine <= 8 &&
    d.padding >= 0 &&
    d.padding <= 32 &&
    d.letterSpacing >= 0 &&
    d.letterSpacing <= 12 &&
    d.rotation >= -30 &&
    d.rotation <= 30 &&
    d.shadow >= 0 &&
    d.shadow <= 12
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
export const blankTemplateStyle: CaptionStyle & { design: CaptionDesign } = {
  template: "custom",
  fontFamily: "Noto Sans",
  fontSize: 64,
  textColor: "#ffffff",
  backgroundColor: "#171717",
  outlineColor: "#171717",
  outlineWidth: 0,
  positionX: 50,
  positionY: 76,
  design: {
    display: "word",
    wordsPerLine: 3,
    highlight: "none",
    highlightColor: "#ffda66",
    box: false,
    padding: 8,
    letterSpacing: 0,
    italic: false,
    uppercase: false,
    rotation: 0,
    shadow: 0,
  },
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
