import { expect, it, vi } from "vitest";
import { processMedia, readVideo } from "../../src/features/video/processing";

vi.mock("@ffmpeg/ffmpeg", () => {
  throw new TypeError("Failed to fetch dynamically imported module");
});

it("accepts a decodable 4K video without a resolution cap", async () => {
  const video = {
    duration: 1,
    videoWidth: 3840,
    videoHeight: 2160,
    onloadedmetadata: () => {},
    removeAttribute: vi.fn(),
    load: vi.fn(),
    set src(_value: string) {
      queueMicrotask(() => this.onloadedmetadata());
    },
  };
  vi.stubGlobal("window", { setTimeout, clearTimeout });
  vi.stubGlobal("document", { createElement: () => video });
  try {
    const source = await readVideo(new File(["video"], "4k.mp4"));
    expect(source.width).toBe(3840);
    URL.revokeObjectURL(source.url);
  } finally {
    vi.unstubAllGlobals();
  }
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
