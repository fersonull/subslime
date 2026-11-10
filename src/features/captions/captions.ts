import type { CaptionStyle, CaptionTemplate, SubtitleWord } from "./model";

export const MIN_WORD = 0.04;
export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);
const rounded = (n: number) => Math.round(n * 10000) / 10000;

export function normalizeWords(
  chunks: { text: string; timestamp: [number | null, number | null] }[],
  duration: number,
): SubtitleWord[] {
  let end = 0;
  return chunks
    .map((chunk, index): SubtitleWord | null => {
      const [rawStart, rawEnd] = chunk.timestamp;
      if (
        rawStart === null ||
        !Number.isFinite(rawStart) ||
        (rawEnd !== null && !Number.isFinite(rawEnd))
      ) {
        throw new Error(
          "The model returned incomplete word timings. Retry or add words manually.",
        );
      }
      const start = Math.max(end, clamp(rawStart, 0, duration));
      const next = chunks[index + 1]?.timestamp[0];
      end = clamp(rawEnd ?? next ?? duration, start, duration);
      const text = chunk.text.trim();
      if (!text || end - start < MIN_WORD) return null;
      return {
        id: crypto.randomUUID(),
        text,
        start: rounded(start),
        end: rounded(end),
      };
    })
    .filter((word): word is SubtitleWord => word !== null);
}

export function validWords(words: SubtitleWord[], duration: number): boolean {
  return words.every(
    (w, i) =>
      w.text.trim().length > 0 &&
      w.text.length <= 160 &&
      Number.isFinite(w.start) &&
      Number.isFinite(w.end) &&
      w.start >= 0 &&
      w.end <= duration + 0.00001 &&
      w.end - w.start >= MIN_WORD - 0.00001 &&
      (i === 0 || words[i - 1].end <= w.start + 0.00001),
  );
}

export function moveWord(
  words: SubtitleWord[],
  id: string,
  start: number,
  duration: number,
): SubtitleWord[] {
  const i = words.findIndex((w) => w.id === id);
  if (i < 0) return words;
  const word = words[i],
    length = word.end - word.start;
  const value = rounded(
    clamp(
      start,
      words[i - 1]?.end ?? 0,
      (words[i + 1]?.start ?? duration) - length,
    ),
  );
  return words.map((w) =>
    w.id === id ? { ...w, start: value, end: rounded(value + length) } : w,
  );
}

export function trimWord(
  words: SubtitleWord[],
  id: string,
  edge: "start" | "end",
  value: number,
  duration: number,
): SubtitleWord[] {
  const i = words.findIndex((w) => w.id === id);
  if (i < 0) return words;
  const word = words[i];
  const time =
    edge === "start"
      ? clamp(value, words[i - 1]?.end ?? 0, word.end - MIN_WORD)
      : clamp(value, word.start + MIN_WORD, words[i + 1]?.start ?? duration);
  return words.map((w) => (w.id === id ? { ...w, [edge]: rounded(time) } : w));
}

export function splitWord(words: SubtitleWord[], id: string): SubtitleWord[] {
  return words.flatMap((w) => {
    if (w.id !== id || w.end - w.start < MIN_WORD * 2) return [w];
    const pieces = w.text.trim().split(/\s+/);
    if (pieces.length < 2) return [w];
    const middle = Math.ceil(pieces.length / 2),
      time = rounded((w.start + w.end) / 2);
    return [
      { ...w, text: pieces.slice(0, middle).join(" "), end: time },
      {
        id: crypto.randomUUID(),
        text: pieces.slice(middle).join(" "),
        start: time,
        end: w.end,
      },
    ];
  });
}

export function mergeWord(words: SubtitleWord[], id: string): SubtitleWord[] {
  const i = words.findIndex((w) => w.id === id);
  if (i < 0 || !words[i + 1]) return words;
  return [
    ...words.slice(0, i),
    {
      ...words[i],
      text: `${words[i].text} ${words[i + 1].text}`,
      end: words[i + 1].end,
    },
    ...words.slice(i + 2),
  ];
}

export function captionAt(
  words: SubtitleWord[],
  time: number,
  template: CaptionTemplate,
) {
  const index = words.findIndex((w) => time >= w.start && time < w.end);
  if (index < 0) return null;
  if (template !== "karaoke")
    return { words: [words[index]], activeId: words[index].id };
  const groups: SubtitleWord[][] = [];
  for (const word of words) {
    const group = groups.at(-1);
    if (!group || group.length === 5 || word.start - group.at(-1)!.end > 0.5)
      groups.push([word]);
    else group.push(word);
  }
  return {
    words: groups.find((g) => g.some((w) => w.id === words[index].id))!,
    activeId: words[index].id,
  };
}

function stamp(seconds: number, separator: string) {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}${separator}${String(ms % 1000).padStart(3, "0")}`;
}

export function serializeSubtitles(
  words: SubtitleWord[],
  format: "srt" | "vtt",
) {
  const escape = (s: string) =>
    s
      .replace(/\s+/g, " ")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  return (
    (format === "vtt" ? "WEBVTT\n\n" : "") +
    words
      .map(
        (w, i) =>
          `${i + 1}\n${stamp(w.start, format === "srt" ? "," : ".")} --> ${stamp(w.end, format === "srt" ? "," : ".")}\n${escape(w.text)}\n`,
      )
      .join("\n")
  );
}

export const displayTime = (time: number) =>
  `${Math.floor(time / 60)
    .toString()
    .padStart(2, "0")}:${(time % 60).toFixed(2).padStart(5, "0")}`;
const assTime = (n: number) => {
  const cs = Math.round(n * 100);
  return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, "0")}:${String(Math.floor(cs / 100) % 60).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
};
const assColor = (hex: string) =>
  `&H00${hex.slice(5, 7)}${hex.slice(3, 5)}${hex.slice(1, 3)}`.toUpperCase();
const assEscape = (text: string) =>
  text.replace(/[{}\\]/g, "").replace(/\s+/g, " ");

export function toAss(
  words: SubtitleWord[],
  style: CaptionStyle,
  width: number,
  height: number,
) {
  const scale = height / 1080,
    size = style.fontSize * scale;
  // Both bundled Noto fonts have Win ascent + descent = 1362, unitsPerEm = 1000; libass sizes by that height.
  const assSize = rounded(size * 1.362);
  const boxed =
    style.template === "bold-highlight" || style.template === "minimal-box";
  const styleLine = (name: string, active = false) => {
    const color = assColor(active ? style.backgroundColor : style.textColor);
    const outline = assColor(
      active
        ? style.textColor
        : boxed
          ? style.backgroundColor
          : style.outlineColor,
    );
    return `Style: ${name},${style.fontFamily},${assSize},${color},${color},${outline},${outline},-1,0,0,0,100,100,0,0,${boxed || active ? 3 : 1},${boxed || active ? size * 0.15 : style.outlineWidth * scale},0,5,0,0,0,1`;
  };
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n${styleLine("Default")}\n${style.template === "karaoke" ? styleLine("Active", true) : ""}\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const position = `{\\an5\\pos(${Math.round((width * style.positionX) / 100)},${Math.round((height * style.positionY) / 100)})${boxed ? `\\xbord${size * 0.25}\\ybord${size * 0.064}` : ""}}`;
  return (
    header +
    words
      .map((w) => {
        const frame = captionAt(
          words,
          w.start + Math.min(0.001, (w.end - w.start) / 2),
          style.template,
        )!;
        const text =
          style.template === "karaoke"
            ? frame.words
                .map((item) =>
                  item.id === w.id
                    ? `{\\rActive\\xbord${size * 0.12}\\ybord${size * 0.064}}${assEscape(item.text)}{\\rDefault}`
                    : assEscape(item.text),
                )
                .join(" ")
            : assEscape(w.text);
        return `Dialogue: 0,${assTime(w.start)},${assTime(w.end)},Default,,0,0,0,,${position}${text}\n`;
      })
      .join("")
  );
}
