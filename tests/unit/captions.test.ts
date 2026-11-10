import { describe, it, expect } from "vitest";
import {
  normalizeWords,
  serializeSubtitles,
  moveWord,
  trimWord,
  splitWord,
  mergeWord,
  captionAt,
  toAss,
} from "../../src/features/captions/captions";
import { defaultStyle } from "../../src/features/captions/model";

const words = [
  { id: "a", text: "Make", start: 0.1, end: 0.5 },
  { id: "b", text: "every", start: 0.6, end: 1 },
  { id: "c", text: "word", start: 1.1, end: 1.8 },
];

describe("caption timing and editing", () => {
  it("rejects invalid data and bounds overlapping model timings", () => {
    expect(
      normalizeWords(
        [
          { text: "hello", timestamp: [0, 0.6] },
          { text: "there", timestamp: [0.4, 2] },
        ],
        1,
      ).map((w) => [w.text, w.start, w.end]),
    ).toEqual([
      ["hello", 0, 0.6],
      ["there", 0.6, 1],
    ]);
    expect(() =>
      normalizeWords([{ text: "bad", timestamp: [NaN, null] }], 1),
    ).toThrow();
  });
  it("clamps moves and trims between adjacent captions", () => {
    expect(moveWord(words, "b", 4, 3)[1]).toMatchObject({
      start: 0.7,
      end: 1.1,
    });
    expect(trimWord(words, "b", "start", -4, 3)[1].start).toBe(0.5);
    expect(trimWord(words, "b", "end", 8, 3)[1].end).toBe(1.1);
  });
  it("splits and merges while retaining the original interval", () => {
    const split = splitWord([{ ...words[0], text: "hello there" }], "a");
    expect(split.map((w) => w.text)).toEqual(["hello", "there"]);
    expect(split[0].start).toBe(0.1);
    expect(split[1].end).toBe(0.5);
    expect(mergeWord(split, split[0].id)[0]).toMatchObject({
      text: "hello there",
      start: 0.1,
      end: 0.5,
    });
  });
  it("uses exclusive end times and preserves source timing for karaoke groups", () => {
    expect(captionAt(words, 0.5, "classic-pop")).toBeNull();
    expect(captionAt(words, 0.7, "karaoke")).toEqual({ words, activeId: "b" });
    expect(words[1].start).toBe(0.6);
  });
});

describe("subtitle export", () => {
  it("serializes edited words as SRT with rounded millisecond carry", () => {
    expect(
      serializeSubtitles(
        [{ ...words[0], start: 59.9996, end: 61.002, text: "<hello> & bye" }],
        "srt",
      ),
    ).toBe("1\n00:01:00,000 --> 00:01:01,002\n&lt;hello&gt; &amp; bye\n");
  });
  it("produces valid WebVTT with no cue injection", () => {
    const output = serializeSubtitles(
      [{ ...words[0], text: "one\n\n--> two" }],
      "vtt",
    );
    expect(output).toContain("WEBVTT\n\n1\n00:00:00.100 --> 00:00:00.500");
    expect(output).toContain("one --&gt; two");
  });
  it("escapes ASS commands supplied as caption text and uses video geometry", () => {
    const ass = toAss(
      [{ ...words[0], text: "{\\pos(0,0)} hi" }],
      defaultStyle,
      1080,
      1920,
    );
    expect(ass).toContain("PlayResX: 1080");
    expect(ass).toContain("PlayResY: 1920");
    expect(ass).not.toContain("{\\pos(0,0)}");
    expect(ass).toContain("\\pos(540,1459)");
  });
  it("converts CSS em sizing to the bundled fonts’ libass line metrics", () => {
    const ass = toAss(words, defaultStyle, 1920, 1080);
    expect(ass).toContain("Style: Default,Noto Sans,87.168,");
  });
});
