import { create } from "zustand";
import { defaultStyle, type EditorProject } from "../captions/model";
import { validWords } from "../captions/captions";

type EditorState = {
  project: EditorProject;
  past: EditorProject[];
  future: EditorProject[];
  selectedId: string | null;
  reset: (duration: number) => void;
  select: (id: string | null) => void;
  commit: (change: (p: EditorProject) => EditorProject) => void;
  undo: () => void;
  redo: () => void;
};

export const useEditor = create<EditorState>((set) => ({
  project: { words: [], style: defaultStyle, duration: 0 },
  past: [],
  future: [],
  selectedId: null,
  reset: (duration) =>
    set({
      project: { words: [], style: { ...defaultStyle }, duration },
      past: [],
      future: [],
      selectedId: null,
    }),
  select: (selectedId) => set({ selectedId }),
  commit: (change) =>
    set((state) => {
      const project = change(state.project);
      if (!validWords(project.words, project.duration))
        throw new Error(
          "Words need text, at least 0.04 seconds, and cannot overlap.",
        );
      if (JSON.stringify(project) === JSON.stringify(state.project))
        return state;
      return {
        project,
        past: [...state.past.slice(-99), state.project],
        future: [],
      };
    }),
  undo: () =>
    set((s) =>
      s.past.length
        ? {
            project: s.past.at(-1)!,
            past: s.past.slice(0, -1),
            future: [s.project, ...s.future],
          }
        : s,
    ),
  redo: () =>
    set((s) =>
      s.future.length
        ? {
            project: s.future[0],
            past: [...s.past.slice(-99), s.project],
            future: s.future.slice(1),
          }
        : s,
    ),
}));
