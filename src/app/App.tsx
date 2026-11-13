import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useConfirm } from "../components/ConfirmDialog";
import { Toast } from "../components/Toast";
import { Landing } from "../features/landing/Landing";
import { Editor } from "../features/editor/Editor";
import { readVideo } from "../features/video/processing";
import { useEditor } from "../features/editor/store";
import type { VideoSource } from "../features/video/types";
import {
  createSavedProject,
  forgetSavedProject,
  loadSavedProject,
  saveProjectState,
  storageErrorMessage,
  type ProjectSnapshot,
} from "../features/projects/storage";

type SaveStatus = "saving" | "saved" | "error";

export function App() {
  const confirm = useConfirm();
  const [source, setSource] = useState<VideoSource | null>(null);
  const [view, setView] = useState<"landing" | "editor">("landing");
  const [error, setError] = useState(""),
    [storageError, setStorageError] = useState("");
  const [loading, setLoading] = useState(false),
    [restoring, setRestoring] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    importing = useRef(false);
  const sourceRef = useRef<VideoSource | null>(null),
    sessionId = useRef<string | null>(null);
  const playhead = useRef(0),
    suspended = useRef(true),
    pending = useRef(0),
    revision = useRef(0);
  const saveStatusRef = useRef<SaveStatus>("saved"),
    dragDepth = useRef(0);

  const status = useCallback((value: SaveStatus) => {
    saveStatusRef.current = value;
    setSaveStatus(value);
  }, []);
  const snapshot = useCallback((): ProjectSnapshot => {
    const state = useEditor.getState();
    return {
      project: state.project,
      selectedId: state.selectedId,
      playhead: playhead.current,
    };
  }, []);
  const autosave = useCallback(async () => {
    const id = sessionId.current;
    if (!id || suspended.current) return;
    const version = ++revision.current;
    pending.current++;
    status("saving");
    try {
      await saveProjectState(id, snapshot());
      if (revision.current === version && sessionId.current === id) {
        status("saved");
        setStorageError("");
      }
    } catch (failure) {
      if (revision.current === version && sessionId.current === id) {
        status("error");
        setStorageError(storageErrorMessage(failure));
      }
    } finally {
      pending.current--;
    }
  }, [snapshot, status]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const saved = await loadSavedProject();
        if (!saved || !active) return;
        const video = await readVideo(saved.file);
        if (!active) {
          URL.revokeObjectURL(video.url);
          return;
        }
        if (Math.abs(video.duration - saved.project.duration) > 0.01) {
          URL.revokeObjectURL(video.url);
          throw new Error(
            "The saved video and captions do not match. Choose a video to start again.",
          );
        }
        sessionId.current = saved.id;
        sourceRef.current = video;
        playhead.current = saved.playhead;
        useEditor.setState({
          project: saved.project,
          selectedId: saved.selectedId,
          past: [],
          future: [],
        });
        setSource(video);
        setView("editor");
        status("saved");
      } catch (failure) {
        if (active) {
          setStorageError(
            `Could not restore local project. ${storageErrorMessage(failure)}`,
          );
          status("error");
        }
      } finally {
        if (active) {
          suspended.current = false;
          setRestoring(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [status]);
  useEffect(
    () =>
      useEditor.subscribe((state, previous) => {
        if (
          state.project !== previous.project ||
          state.selectedId !== previous.selectedId
        )
          void autosave();
      }),
    [autosave],
  );
  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source.url);
    },
    [source],
  );
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (
        sourceRef.current &&
        (saveStatusRef.current !== "saved" || pending.current > 0)
      )
        event.preventDefault();
    };
    const cancelDrag = () => {
      dragDepth.current = 0;
      setDragging(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelDrag();
    };
    window.addEventListener("beforeunload", leave);
    window.addEventListener("dragend", cancelDrag);
    window.addEventListener("blur", cancelDrag);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("beforeunload", leave);
      window.removeEventListener("dragend", cancelDrag);
      window.removeEventListener("blur", cancelDrag);
      window.removeEventListener("keydown", key);
    };
  }, []);

  async function saveCurrentFile() {
    const current = sourceRef.current;
    if (!current) return;
    suspended.current = true;
    revision.current++;
    status("saving");
    try {
      sessionId.current = await createSavedProject(current.file, snapshot());
      setStorageError("");
      status("saved");
    } catch (failure) {
      sessionId.current = null;
      setStorageError(storageErrorMessage(failure));
      status("error");
    } finally {
      suspended.current = false;
      // Capture any edits made while the initial video transaction was completing.
      if (sessionId.current) void autosave();
    }
  }

  async function open(file?: File) {
    if (!file || importing.current || restoring) return;
    if (document.querySelector(".processing-banner")) {
      setError("Finish or cancel processing before changing the video.");
      return;
    }
    importing.current = true;
    setLoading(true);
    setError("");
    try {
      const next = await readVideo(file);
      if (
        sourceRef.current &&
        !(await confirm({
          title: "Replace current project?",
          message:
            "This replaces the current video and its local autosave. Download any work you want to keep first.",
          action: "Replace project",
        }))
      ) {
        URL.revokeObjectURL(next.url);
        return;
      }
      suspended.current = true;
      sessionId.current = null;
      sourceRef.current = next;
      playhead.current = 0;
      useEditor.getState().reset(next.duration);
      setSource(next);
      setView("editor");
      await saveCurrentFile();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "This video could not be opened.",
      );
    } finally {
      importing.current = false;
      setLoading(false);
    }
  }

  async function forget() {
    if (
      !(await confirm({
        title: "Forget saved project?",
        message:
          "Remove this project and its video from this browser? Download any work you want to keep first. Your custom templates will be kept.",
        action: "Forget project",
      }))
    )
      return;
    suspended.current = true;
    revision.current++;
    status("saving");
    try {
      if (sessionId.current) await forgetSavedProject(sessionId.current);
      sessionId.current = null;
      sourceRef.current = null;
      playhead.current = 0;
      setSource(null);
      setView("landing");
      useEditor.getState().reset(0);
      setStorageError("");
      status("saved");
    } catch (failure) {
      setStorageError(storageErrorMessage(failure));
      status("error");
    } finally {
      suspended.current = false;
    }
  }

  const updatePlayhead = useCallback(
    (value: number) => {
      const current = sourceRef.current;
      if (!current || !Number.isFinite(value)) return;
      const next = Math.min(current.duration, Math.max(0, value));
      if (next === playhead.current) return;
      playhead.current = next;
      void autosave();
    },
    [autosave],
  );
  const saveLabel =
    saveStatus === "saving"
      ? "Saving on this device…"
      : saveStatus === "saved"
        ? "Saved on this device"
        : "Autosave unavailable";

  return (
    <div
      className="app-root"
      onDragEnter={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          dragDepth.current++;
          setDragging(true);
        }
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (!dragDepth.current) setDragging(false);
      }}
      onDrop={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          void open(event.dataTransfer.files[0]);
        }
      }}
    >
      <input
        ref={input}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
        aria-label="Choose a video file"
        className="sr-only"
        onChange={(event) => {
          void open(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {error && <Toast message={error} error dismiss={() => setError("")} />}
      {storageError && (
        <div className="storage-warning" role="alert">
          <span>
            Autosave unavailable. {storageError} Your current work stays in this
            tab.
          </span>
          {source && (
            <button
              className="text-link"
              disabled={loading}
              onClick={() => {
                if (sessionId.current) void autosave();
                else void saveCurrentFile();
              }}
            >
              Retry autosave
            </button>
          )}
        </div>
      )}
      {loading && (
        <div className="global-message" role="status">
          <LoaderCircle className="spin" size={18} /> Reading your video…
        </div>
      )}
      {restoring ? (
        <div className="restore-project" role="status">
          <LoaderCircle className="spin" size={22} /> Checking for your saved
          project…
        </div>
      ) : source && view === "editor" ? (
        <Editor
          key={source.url}
          source={source}
          initialTime={playhead.current}
          onTimeChange={updatePlayhead}
          saveLabel={saveLabel}
          chooseVideo={() => input.current?.click()}
          exit={() => setView("landing")}
        />
      ) : (
        <Landing
          chooseVideo={() => input.current?.click()}
          savedName={source?.file.name}
          resume={() => setView("editor")}
          forget={() => void forget()}
        />
      )}
      {dragging && (
        <div className="file-drop-overlay" role="status" aria-live="polite">
          <div className="file-drop-panel">
            <img src="/favicon.svg" width="96" height="96" alt="" />
            <h2>Drop your video here.</h2>
            <p>
              {source
                ? "Replace the current project and start a new one."
                : "Your next story starts with a file."}
            </p>
            <span>MP4, WebM, MOV · Up to 200 MB / 3 min</span>
          </div>
        </div>
      )}
    </div>
  );
}
