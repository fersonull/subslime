import { expect, it } from "vitest";
import {
  blankTemplateStyle,
  isCaptionStyle,
} from "../../src/features/captions/model";
import { captionAt, toAss } from "../../src/features/captions/captions";

const words = ["Make", "every", "word", "yours"].map((text, i) => ({
  id: String(i),
  text,
  start: i,
  end: i + 0.8,
}));

it("starts from an independent design and validates custom controls", () => {
  expect(blankTemplateStyle.template).toBe("custom");
  expect(isCaptionStyle(blankTemplateStyle)).toBe(true);
  expect(
    isCaptionStyle({
      ...blankTemplateStyle,
      design: { ...blankTemplateStyle.design, wordsPerLine: 0 },
    }),
  ).toBe(false);
  expect(
    isCaptionStyle({
      ...blankTemplateStyle,
      design: { ...blankTemplateStyle.design, highlightColor: "bad" },
    }),
  ).toBe(false);
});

it("composes custom phrases and carries design settings into the export", () => {
  const style = {
    ...blankTemplateStyle,
    design: {
      ...blankTemplateStyle.design!,
      display: "phrase" as const,
      wordsPerLine: 3,
      highlight: "text" as const,
      highlightColor: "#33aa66",
      letterSpacing: 2,
      italic: true,
      uppercase: true,
      rotation: 5,
      shadow: 2,
    },
  };
  expect(captionAt(words, 1.1, "custom", style.design)?.words).toHaveLength(3);
  const ass = toAss(words, style, 1920, 1080);
  expect(ass).toContain("MAKE");
  expect(ass).toContain("{\\rActive");
  expect(ass).toContain("&H0066AA33");
  expect(ass).toContain(",-1,-1,0,0,100,100,2,5,");
});
