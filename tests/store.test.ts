import { beforeEach, it, expect } from "vitest";
import { useEditor } from "../src/store";

beforeEach(() => useEditor.getState().reset(10));
it("undoes and redoes project edits, clears redo after a new edit", () => {
  const edit = (text: string) =>
    useEditor
      .getState()
      .commit((p) => ({
        ...p,
        words: [{ id: "one", text, start: 0, end: 1 }],
      }));
  edit("hello");
  edit("there");
  useEditor.getState().undo();
  expect(useEditor.getState().project.words[0].text).toBe("hello");
  useEditor.getState().redo();
  expect(useEditor.getState().project.words[0].text).toBe("there");
  useEditor.getState().undo();
  edit("new");
  expect(useEditor.getState().future).toEqual([]);
});
it("bounds history and rejects overlapping, invalid or blank captions", () => {
  for (let i = 0; i < 120; i++)
    useEditor
      .getState()
      .commit((p) => ({ ...p, style: { ...p.style, fontSize: 20 + i } }));
  expect(useEditor.getState().past).toHaveLength(100);
  expect(() =>
    useEditor
      .getState()
      .commit((p) => ({
        ...p,
        words: [{ id: "bad", text: "", start: 1, end: 0 }],
      })),
  ).toThrow();
  expect(useEditor.getState().project.words).toEqual([]);
});
