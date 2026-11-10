import { expect, it, vi } from "vitest";
import { processMedia } from "../../src/features/video/processing";

vi.mock("@ffmpeg/ffmpeg", () => {
  throw new TypeError("Failed to fetch dynamically imported module");
});

it("explains how to recover when the stopped app server prevents loading the engine module", async () => {
  const source = {
    file: new File([], "speech.mp4"),
    url: "blob:test",
    width: 720,
    height: 1280,
    duration: 1,
  };
  await expect(
    processMedia(source, null, new AbortController().signal, () => {}),
  ).rejects.toThrow("local video engine");
});
