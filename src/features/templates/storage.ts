import { isCaptionStyle, type CaptionStyle } from "../captions/model";

export type CustomTemplate = { id: string; name: string; style: CaptionStyle };
const KEY = "subslime-custom-templates";

function validate(value: unknown): asserts value is CustomTemplate[] {
  if (
    !Array.isArray(value) ||
    !value.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        item.name.trim().length > 0 &&
        item.name.length <= 60 &&
        isCaptionStyle(item.style),
    ) ||
    new Set(value.map((item) => item.id)).size !== value.length
  ) {
    throw new Error(
      "Your saved templates contain invalid data. They have been kept unchanged.",
    );
  }
}

export function loadTemplates(): CustomTemplate[] {
  const text = localStorage.getItem(KEY);
  if (!text) return [];
  const saved = JSON.parse(text);
  if (saved?.version !== 1)
    throw new Error("This template library version is not supported.");
  validate(saved.templates);
  return saved.templates;
}

export function saveTemplates(templates: CustomTemplate[]): void {
  validate(templates);
  localStorage.setItem(KEY, JSON.stringify({ version: 1, templates }));
}
