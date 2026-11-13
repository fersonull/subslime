import { describe, expect, it } from "vitest";
import { validateSnapshot } from "../../src/features/projects/storage";
import { defaultStyle } from "../../src/features/captions/model";

const snapshot = {
  project: {
    words: [{ id: "one", text: "Hello", start: 0, end: 1 }],
    duration: 2,
    style: defaultStyle,
  },
  playhead: 0.5,
  selectedId: "one",
};
describe("saved project validation", () => {
  it("accepts a valid editing snapshot", () =>
    expect(() => validateSnapshot(snapshot)).not.toThrow());
  it("rejects corrupt timing, styling and playback data before restoration", () => {
    expect(() => validateSnapshot({ ...snapshot, playhead: 3 })).toThrow();
    expect(() =>
      validateSnapshot({
        ...snapshot,
        project: {
          ...snapshot.project,
          words: [{ id: "bad", text: "bad", start: 1, end: 0 }],
        },
      }),
    ).toThrow();
    expect(() =>
      validateSnapshot({
        ...snapshot,
        project: {
          ...snapshot.project,
          style: { ...defaultStyle, fontSize: NaN },
        },
      }),
    ).toThrow();
    expect(() =>
      validateSnapshot({
        ...snapshot,
        project: {
          ...snapshot.project,
          style: { ...defaultStyle, textColor: "url(evil)" },
        },
      }),
    ).toThrow();
  });
});
