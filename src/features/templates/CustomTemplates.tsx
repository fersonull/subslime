import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useConfirm } from "../../components/ConfirmDialog";
import { useEditor } from "../editor/store";
import { loadTemplates, saveTemplates, type CustomTemplate } from "./storage";

export function CustomTemplates({
  busy,
  onError,
  build,
  revision,
}: {
  busy: boolean;
  onError: (message: string) => void;
  build: (template: CustomTemplate | null) => void;
  revision: number;
}) {
  const { project, commit } = useEditor();
  const [items, setItems] = useState<CustomTemplate[]>([]);
  const [ready, setReady] = useState(false);
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
  }, [onError, revision]);
  return (
    <section className="custom-templates" aria-label="Custom templates">
      <div className="custom-templates-heading">
        <h3>Your templates</h3>
        <span>Free for now</span>
      </div>
      <p className="processing-note">
        Build a caption design from a blank canvas, or edit one of your own.
      </p>
      {items.map((item) => {
        const chosen =
          JSON.stringify(item.style) === JSON.stringify(project.style);
        return (
          <div className="custom-template-row" key={item.id}>
            <button
              className={chosen ? "chosen" : ""}
              disabled={busy}
              aria-label={`Apply ${item.name}`}
              aria-pressed={chosen}
              onClick={() =>
                commit((p) => ({ ...p, style: structuredClone(item.style) }))
              }
            >
              <span
                className="template-swatch"
                style={{
                  color: item.style.textColor,
                  backgroundColor: item.style.backgroundColor,
                  fontFamily: item.style.fontFamily,
                }}
              >
                Aa
              </span>
              <span>{item.name}</span>
              <Check size={14} visibility={chosen ? "visible" : "hidden"} />
            </button>
            <button
              className="icon-button"
              disabled={busy}
              aria-label={`Edit ${item.name}`}
              onClick={() => build(item)}
            >
              <Pencil size={15} />
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
                    const next = loadTemplates().filter(
                      (entry) => entry.id !== item.id,
                    );
                    saveTemplates(next);
                    setItems(next);
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
        onClick={() => build(null)}
      >
        <Plus size={14} /> Create template
      </button>
    </section>
  );
}
