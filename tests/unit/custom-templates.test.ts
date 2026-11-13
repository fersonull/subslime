import { afterEach, expect, it, vi } from "vitest";
import { defaultStyle } from "../../src/features/captions/model";
import {
  loadTemplates,
  saveTemplates,
} from "../../src/features/templates/storage";

afterEach(() => vi.unstubAllGlobals());

it("persists custom styles independently of the current video", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  expect(loadTemplates()).toEqual([]);
  const templates = [
    { id: "one", name: "My style", style: { ...defaultStyle, positionY: 50 } },
  ];
  saveTemplates(templates);
  expect(loadTemplates()).toEqual(templates);
  saveTemplates([]);
  expect(loadTemplates()).toEqual([]);
});

it("rejects invalid styles and propagates storage failures", () => {
  const setItem = vi.fn();
  vi.stubGlobal("localStorage", {
    getItem: () =>
      JSON.stringify({
        version: 1,
        templates: [
          { id: "one", name: "Bad", style: { ...defaultStyle, fontSize: -1 } },
        ],
      }),
    setItem,
  });
  expect(() => loadTemplates()).toThrow("invalid data");
  expect(() =>
    saveTemplates([{ id: "one", name: " ", style: defaultStyle }]),
  ).toThrow();
  expect(setItem).not.toHaveBeenCalled();
  setItem.mockImplementation(() => {
    throw new DOMException("Full", "QuotaExceededError");
  });
  expect(() =>
    saveTemplates([{ id: "one", name: "Good", style: defaultStyle }]),
  ).toThrow("Full");
});
