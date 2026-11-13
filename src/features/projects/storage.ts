import { validWords } from "../captions/captions";
import { templates, type EditorProject } from "../captions/model";

export type ProjectSnapshot = {
  project: EditorProject;
  playhead: number;
  selectedId: string | null;
};
export type SavedProject = ProjectSnapshot & { id: string; file: File };

let connection: Promise<IDBDatabase> | null = null;

function database(): Promise<IDBDatabase> {
  if (!connection) {
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("subslime-projects", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("current");
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error("Close other Subslime tabs and retry local storage."));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          connection = null;
        };
        resolve(db);
      };
    }).catch((error) => {
      connection = null;
      throw error;
    });
  }
  return connection;
}

export function validateSnapshot(snapshot: ProjectSnapshot): void {
  const { project, playhead, selectedId } = snapshot;
  const style = project?.style;
  if (
    !project ||
    !Array.isArray(project.words) ||
    !Number.isFinite(project.duration) ||
    project.duration <= 0 ||
    project.duration > 180 ||
    !validWords(project.words, project.duration) ||
    !style ||
    !templates.some((template) => template.id === style.template) ||
    !["Noto Sans", "Noto Sans Mono"].includes(style.fontFamily) ||
    ![style.textColor, style.backgroundColor, style.outlineColor].every(
      (color) => /^#[\da-f]{6}$/i.test(color),
    ) ||
    ![
      style.fontSize,
      style.outlineWidth,
      style.positionX,
      style.positionY,
    ].every(Number.isFinite) ||
    style.fontSize < 20 ||
    style.fontSize > 140 ||
    style.outlineWidth < 0 ||
    style.outlineWidth > 20 ||
    style.positionX < 5 ||
    style.positionX > 95 ||
    style.positionY < 5 ||
    style.positionY > 95 ||
    !Number.isFinite(playhead) ||
    playhead < 0 ||
    playhead > project.duration ||
    (selectedId !== null && typeof selectedId !== "string")
  ) {
    throw new Error(
      "The local project contains invalid data. Choose a video to start a new project.",
    );
  }
}

export async function loadSavedProject(): Promise<SavedProject | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("current", "readonly");
    const store = tx.objectStore("current");
    const video = store.get("video"),
      state = store.get("state");
    tx.onabort = () => reject(tx.error);
    tx.oncomplete = () => {
      if (video.result === undefined && state.result === undefined) {
        resolve(null);
        return;
      }
      try {
        if (
          state.result?.version !== 1 ||
          !video.result ||
          !(video.result.file instanceof File) ||
          typeof video.result.id !== "string" ||
          video.result.id !== state.result.id
        ) {
          throw new Error(
            "The local project could not be restored. Choose a video to start again.",
          );
        }
        validateSnapshot(state.result.snapshot);
        resolve({
          ...state.result.snapshot,
          id: video.result.id,
          file: video.result.file,
        });
      } catch (error) {
        reject(error);
      }
    };
  });
}

export async function createSavedProject(
  file: File,
  snapshot: ProjectSnapshot,
): Promise<string> {
  validateSnapshot(snapshot);
  const id = crypto.randomUUID(),
    db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("current", "readwrite");
    tx.oncomplete = () => resolve(id);
    tx.onabort = () => reject(tx.error);
    try {
      // Commit the video and its initial state together; edits only rewrite the small state record.
      const store = tx.objectStore("current");
      store.put({ id, file }, "video");
      store.put({ id, version: 1, snapshot }, "state");
    } catch (error) {
      tx.abort();
      reject(error);
    }
  });
}

export async function saveProjectState(
  id: string,
  snapshot: ProjectSnapshot,
): Promise<void> {
  validateSnapshot(snapshot);
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("current", "readwrite");
    const store = tx.objectStore("current");
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    const video = store.get("video");
    video.onsuccess = () => {
      if (video.result?.id !== id) {
        tx.abort();
        reject(
          new Error(
            "Another tab changed the saved project. Download this tab’s work before reloading.",
          ),
        );
        return;
      }
      store.put({ id, version: 1, snapshot }, "state");
    };
  });
}

export async function forgetSavedProject(id: string): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("current", "readwrite");
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    const store = tx.objectStore("current");
    const video = store.get("video");
    video.onsuccess = () => {
      if (video.result?.id !== id) {
        tx.abort();
        reject(
          new Error(
            "Another tab changed the saved project. Reload before removing it.",
          ),
        );
        return;
      }
      store.clear();
    };
  });
}

export function storageErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return "Browser storage is full. Download your video or captions, free some browser storage, then retry autosave.";
  }
  return error instanceof Error
    ? error.message
    : "Local storage is unavailable in this browser. Download your work before leaving.";
}
