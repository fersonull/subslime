import { useEffect, useRef, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { useConfirm } from "../../components/ConfirmDialog";
import { useEditor } from "../editor/store";
import { loadTemplates, saveTemplates, type CustomTemplate } from "./storage";

export function CustomTemplates({
  busy,
  onError,
}: {
  busy: boolean;
  onError: (message: string) => void;
}) {
  const { project, commit } = useEditor();
  const [items, setItems] = useState<CustomTemplate[]>([]);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const confirm = useConfirm();
  useEffect(() => {
    try {
      setItems(loadTemplates());
      setReady(true);
    } catch {
      onError(
        "Your template library could not be loaded. Check browser storage and reload; saved templates have been kept unchanged.",
      );
    }
  }, [onError]);
  function persist(next: CustomTemplate[]) {
    saveTemplates(next);
    setItems(next);
  }
  return (
    <section className="custom-templates" aria-label="Custom templates">
      <div className="custom-templates-heading">
        <h3>Your templates</h3>
        <span>Free for now</span>
      </div>
      <p className="processing-note">
        Adjust the controls below, then save your style to use on any video.
      </p>
      {items.map((item) => {
        const chosen = (
          Object.keys(item.style) as (keyof typeof item.style)[]
        ).every((key) => item.style[key] === project.style[key]);
        return (
          <div className="custom-template-row" key={item.id}>
            <button
              className={chosen ? "chosen" : ""}
              disabled={busy}
              aria-label={`Apply ${item.name}`}
              aria-pressed={chosen}
              onClick={() =>
                commit((p) => ({ ...p, style: { ...item.style } }))
              }
            >
              <span
                className={`template-type-example ${item.style.template}`}
                style={{
                  color: item.style.textColor,
                  backgroundColor: item.style.backgroundColor,
                  fontFamily: item.style.fontFamily,
                }}
              >
                Aa
              </span>
              <span>{item.name}</span>
              {chosen && <Check size={14} />}
            </button>
            <button
              className="icon-button"
              disabled={busy}
              aria-label={`Delete ${item.name}`}
              onClick={async () => {
                if (
                  await confirm({
                    title: "Delete custom template?",
                    message: `Remove “${item.name}” from your library? Captions already using this style will keep their appearance.`,
                    action: "Delete template",
                  })
                ) {
                  try {
                    persist(items.filter((entry) => entry.id !== item.id));
                  } catch {
                    onError(
                      "The template could not be deleted. Check browser storage and retry.",
                    );
                  }
                }
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}
      <button
        className="button secondary small save-template-button"
        disabled={busy || !ready}
        onClick={() => {
          setName("");
          setError("");
          dialog.current?.showModal();
        }}
      >
        <Plus size={14} /> Save as template
      </button>
      <dialog
        ref={dialog}
        className="info-dialog template-dialog"
        aria-labelledby="template-dialog-title"
      >
        <h2 id="template-dialog-title">Save your caption style</h2>
        <p>
          Keep the current caption behavior, font, colors, size and placement as
          a reusable template.
        </p>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) {
              setError("Enter a template name.");
              return;
            }
            if (
              items.some(
                (item) => item.name.toLowerCase() === trimmed.toLowerCase(),
              )
            ) {
              setError("Choose a name you haven’t used yet.");
              return;
            }
            try {
              persist([
                ...items,
                {
                  id: crypto.randomUUID(),
                  name: trimmed,
                  style: { ...project.style },
                },
              ]);
              dialog.current?.close();
            } catch {
              setError(
                "Could not save the template. Check browser storage and try again.",
              );
            }
          }}
        >
          <label>
            Template name
            <input
              autoFocus
              value={name}
              maxLength={60}
              required
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <div className="dialog-actions">
            <button
              type="button"
              className="button secondary small"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button className="button small" type="submit">
              Save template
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
