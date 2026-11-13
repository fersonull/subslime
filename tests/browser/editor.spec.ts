import { test, expect, type Page } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";

const fixtureFolder = "tests/fixtures/generated";

test("notifications disappear and project confirmations use a custom dialog", async ({
  page,
}) => {
  const bytes = await fixture(page);
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "bad.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("bad"),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0, { timeout: 9000 });
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "original.webm",
    mimeType: "video/webm",
    buffer: bytes,
  });
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "next.webm",
    mimeType: "video/webm",
    buffer: bytes,
  });
  await expect(
    page.getByRole("dialog", { name: "Replace current project?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.screenshot({ path: "test-results/confirm-project.png" });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("original.webm", { exact: true })).toBeVisible();
});

test("custom templates save, restore, apply across projects and delete", async ({
  page,
}) => {
  const bytes = await fixture(page);
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "styles.webm",
    mimeType: "video/webm",
    buffer: bytes,
  });
  await page.getByRole("tab", { name: "Style", exact: true }).click();
  await page.getByRole("combobox").selectOption("Noto Sans Mono");
  await page.getByLabel("Caption vertical position").fill("60");
  await page.getByLabel("Caption text color").fill("#33aa66");
  await page
    .getByRole("button", { name: "Save as template", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save template", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
    "Enter a template name.",
  );
  await page.getByLabel("Template name").fill("My green captions");
  await page
    .getByRole("button", { name: "Save template", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Apply My green captions", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Style", exact: true }).click();
  await page.getByRole("button", { name: "Minimal Box", exact: true }).click();
  await page
    .getByRole("button", { name: "Apply My green captions", exact: true })
    .click();
  await expect(page.getByLabel("Caption text color")).toHaveValue("#33aa66");
  await expect(page.getByLabel("Caption vertical position")).toHaveValue("60");
  await page
    .getByRole("button", { name: "Return to home", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Forget saved project", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Forget project", exact: true })
    .click();
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "another.webm",
    mimeType: "video/webm",
    buffer: bytes,
  });
  await page.getByRole("tab", { name: "Style", exact: true }).click();
  await page
    .getByRole("button", { name: "Apply My green captions", exact: true })
    .click();
  await expect(page.getByRole("combobox")).toHaveValue("Noto Sans Mono");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("region", { name: "Custom templates" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/custom-templates-phone.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Delete My green captions", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Delete My green captions", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete template", exact: true })
    .click();
  await page.reload();
  await page.getByRole("tab", { name: "Style", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Apply My green captions", exact: true }),
  ).toHaveCount(0);
});

test("timeline scrubbing does not select text, including outside the timeline", async ({
  page,
}) => {
  const bytes = await fixture(page);
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "speech.webm",
    mimeType: "video/webm",
    buffer: bytes,
  });
  await expect(page.getByLabel("Subtitle timeline")).toBeVisible();
  const ruler = (await page.locator(".time-ruler").boundingBox())!;
  await page.mouse.move(ruler.x + 5, ruler.y + 15);
  await page.mouse.down();
  await page.mouse.move(ruler.x + 240, ruler.y + 15, { steps: 12 });
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
  await expect(page.getByLabel("Video playhead")).not.toHaveValue("0");
  await page.mouse.move(ruler.x + 300, ruler.y - 80, { steps: 8 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
  await page.screenshot({ path: "test-results/editor-button-depth.png" });
});

async function fixture(page: Page, width = 720, height = 1280) {
  await page.goto("/");
  await page.getByRole("heading", { level: 1 }).click();
  const wav = await readFile(`${fixtureFolder}/speech.wav`);
  await page.route("**/test-speech.wav", (route) =>
    route.fulfill({ body: wav, contentType: "audio/wav" }),
  );
  const bytes = await page.evaluate(
    async ({ width, height }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d")!;
      context.scale(width / 720, height / 1280);
      const audio = new AudioContext();
      await audio.resume();
      const buffer = await audio.decodeAudioData(
        await (await fetch("/test-speech.wav")).arrayBuffer(),
      );
      const source = audio.createBufferSource();
      source.buffer = buffer;
      const destination = audio.createMediaStreamDestination();
      source.connect(destination);
      const stream = new MediaStream([
        ...canvas.captureStream(24).getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8,opus",
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () =>
          resolve(new Blob(chunks, { type: "video/webm" }));
      });
      let frame = 0;
      const draw = () => {
        context.fillStyle = "#d5d5d5";
        context.fillRect(0, 0, 720, 1280);
        context.fillStyle = "#333";
        context.fillRect(30, 30, 660, 1220);
        context.fillStyle = "white";
        context.font = "bold 50px sans-serif";
        context.fillText("Subslime test", 160, 420);
        context.font = "28px sans-serif";
        context.fillText(`Original frame ${frame++}`, 200, 520);
      };
      draw();
      const timer = setInterval(draw, 1000 / 24);
      recorder.start();
      source.start();
      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
      });
      recorder.stop();
      clearInterval(timer);
      const blob = await done;
      stream.getTracks().forEach((t) => t.stop());
      await audio.close();
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    },
    { width, height },
  );
  return Buffer.from(bytes);
}

test("landing is usable at desktop, tablet and phone widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Make everyword count.",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/landing-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: /Bold Highlight/ }).click();
  await expect(
    page.getByRole("button", { name: /Bold Highlight/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Privacy & compatibility" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "no accounts, analytics or video uploads",
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("upload, edit, undo, drag, style, subtitle downloads and playable captioned MP4", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const bytes = await fixture(page);
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "speech.webm",
    mimeType: "video/webm",
    buffer: bytes,
  });
  await expect(page.getByLabel("Subtitle timeline")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ready when you are." }),
  ).toBeVisible();
  await page.getByLabel("Add caption", { exact: true }).click();
  const text = page.getByLabel("Caption 1 text");
  await text.fill("Make");
  await text.press("Enter");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(text).toHaveValue("word");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(text).toHaveValue("Make");
  await page.keyboard.press("Control+z");
  await expect(text).toHaveValue("word");
  await page.keyboard.press("Control+Shift+z");
  await expect(text).toHaveValue("Make");
  await page.getByLabel("Caption end time").fill("1.5");
  await page.getByLabel("Caption end time").press("Tab");
  await page.getByLabel("Video playhead").fill("2");
  await page.getByLabel("Add caption", { exact: true }).click();
  await page.getByLabel("Caption 2 text").fill("count.");
  await page.getByLabel("Caption 2 text").press("Enter");
  const clip = page.getByRole("button", { name: /Select count\.,/ });
  const box = (await clip.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 28, box.y + 10, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByLabel("Caption start time")).not.toHaveValue("2.00");
  await page.getByRole("tab", { name: "Style" }).click();
  await page.getByRole("tab", { name: "Style" }).press("ArrowLeft");
  await expect(page.getByRole("tab", { name: /Captions/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("tab", { name: /Captions/ }).press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Style" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("button", { name: "Bold Highlight" }).click();
  await page.getByLabel("Caption vertical position").fill("65");
  await page.getByRole("button", { name: "Seek to start" }).click();
  await expect(page.locator(".video-frame .caption-overlay")).toHaveText(
    "Make",
  );
  const expectedCaptionWidth = await page
    .locator(".video-frame .caption-overlay")
    .evaluate(
      (element) =>
        (element.getBoundingClientRect().width /
          element.parentElement!.getBoundingClientRect().width) *
        720,
    );
  await page.screenshot({
    path: "test-results/editor-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const srtWait = page.waitForEvent("download");
  await page.getByRole("button", { name: /Subtitle file/ }).click();
  const srt = await srtWait;
  const srtText = await readFile((await srt.path())!, "utf8");
  expect(srtText).toContain("Make");
  expect(srtText).toContain("00:00:01,500");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const vttWait = page.waitForEvent("download");
  await page.getByRole("button", { name: /Web captions/ }).click();
  const vtt = await vttWait;
  expect(await readFile((await vtt.path())!, "utf8")).toMatch(/^WEBVTT/);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const exportStarted = Date.now();
  const mp4Wait = page.waitForEvent("download", { timeout: 180000 });
  await page.getByRole("button", { name: /Captioned video/ }).click();
  const mp4 = await mp4Wait;
  const exportMilliseconds = Date.now() - exportStarted;
  await mkdir(fixtureFolder, { recursive: true });
  await mp4.saveAs(`${fixtureFolder}/captioned.mp4`);
  const output = await readFile((await mp4.path())!);
  expect(output.byteLength).toBeGreaterThan(10000);
  await page.route("**/test-output.mp4", (route) =>
    route.fulfill({ body: output, contentType: "video/mp4" }),
  );
  const info = await page.evaluate(async () => {
    const file = await (await fetch("/test-output.mp4")).blob();
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.style.cssText =
      "position:fixed;top:0;left:0;width:360px;height:640px;z-index:1000";
    document.body.append(video);
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Export is not playable"));
    });
    await video.play();
    await new Promise<void>((resolve) => {
      const tick = () => {
        if (video.currentTime > 0.05) resolve();
        else requestAnimationFrame(tick);
      };
      tick();
    });
    video.pause();
    const playedTime = video.currentTime;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const bounds = () => {
      const region = canvas
        .getContext("2d")!
        .getImageData(160, 750, 400, 180).data;
      let minX = 400,
        maxX = -1,
        count = 0;
      for (let i = 0; i < region.length; i += 4)
        if (region[i] > 220 && region[i + 1] > 220 && region[i + 2] > 220) {
          const x = (i / 4) % 400;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          count++;
        }
      return { width: maxX - minX + 1, count };
    };
    const captionBounds = bounds();
    const frame = canvas.toDataURL();
    const gapFrame = new Promise<void>((resolve) => {
      const presented = (
        _now: number,
        metadata: VideoFrameCallbackMetadata,
      ) => {
        if (Math.abs(metadata.mediaTime - 1.8) < 0.1) resolve();
        else video.requestVideoFrameCallback(presented);
      };
      video.requestVideoFrameCallback(presented);
    });
    video.currentTime = 1.8;
    await gapFrame;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const gapBounds = bounds();
    const audio = new AudioContext();
    const buffer = await audio.decodeAudioData(
      await (await fetch("/test-output.mp4")).arrayBuffer(),
    );
    const energy =
      buffer.getChannelData(0).reduce((sum, value) => sum + value * value, 0) /
      buffer.length;
    await audio.close();
    const result = {
      width: video.videoWidth,
      height: video.videoHeight,
      duration: video.duration,
      time: playedTime,
      captionBounds,
      gapBounds,
      energy,
      frame,
    };
    video.remove();
    URL.revokeObjectURL(url);
    return result;
  });
  expect(info.width).toBe(720);
  expect(info.height).toBe(1280);
  expect(info.time).toBeGreaterThan(0);
  // The white caption box appears only within its interval and retains its preview width.
  expect(info.captionBounds.count).toBeGreaterThan(500);
  expect(info.gapBounds.count).toBe(0);
  expect(
    Math.abs(info.captionBounds.width - expectedCaptionWidth),
  ).toBeLessThan(16);
  expect(info.energy).toBeGreaterThan(0.00001);
  await writeFile(
    "test-results/export-frame.png",
    Buffer.from(info.frame.split(",")[1], "base64"),
  );
  await writeFile(
    "test-results/export-metrics.json",
    JSON.stringify(
      {
        width: info.width,
        height: info.height,
        duration: info.duration,
        exportMilliseconds,
        outputBytes: output.byteLength,
        audioEnergy: info.energy,
      },
      null,
      2,
    ),
  );
  await page.screenshot({ path: "test-results/editor-after-export.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/editor-phone.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("Whisper generates word timestamps from synthesized English speech and cancellation preserves edits", async ({
  page,
}) => {
  const bytes = await fixture(page);
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "speech.webm",
    mimeType: "video/webm",
    buffer: bytes,
  });
  await page
    .getByRole("button", { name: "Generate captions", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "captions generated" }),
  ).toBeVisible({ timeout: 210000 });
  const inputs = page.locator(".caption-list input");
  expect(await inputs.count()).toBeGreaterThan(5);
  const transcript = (
    await inputs.evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLInputElement).value),
    )
  )
    .join(" ")
    .toLowerCase();
  expect(transcript).toContain("make every word count");
  await page.screenshot({ path: "test-results/editor-transcribed.png" });
  const before = await inputs.count();
  await page.getByRole("button", { name: "Regenerate", exact: true }).click();
  await page
    .getByRole("button", { name: "Regenerate captions", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByText("Processing cancelled. Your captions are unchanged."),
  ).toBeVisible();
  expect(await inputs.count()).toBe(before);
});

test("invalid files show an actionable upload error", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "fake.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a video"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Choose an MP4, WebM, or MOV video",
  );
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("autosave restores the video, captions, styling and playhead after refresh", async ({
  page,
}) => {
  const bytes = await fixture(page);
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "resume.webm",
    mimeType: "video/webm",
    buffer: bytes,
  });
  await page.getByLabel("Add caption", { exact: true }).click();
  await page.getByLabel("Caption 1 text").fill("Remember me");
  await page.getByLabel("Caption 1 text").press("Enter");
  await page.getByRole("tab", { name: "Style", exact: true }).click();
  await page
    .getByRole("button", { name: "Bold Highlight", exact: true })
    .click();
  await page.getByRole("combobox").selectOption("Noto Sans Mono");
  await page.getByLabel("Caption vertical position").fill("65");
  await page.getByLabel("Video playhead").fill("1.25");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("resume.webm", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Caption 1 text")).toHaveValue("Remember me");
  await expect
    .poll(async () =>
      Number(await page.getByLabel("Video playhead").inputValue()),
    )
    .toBeCloseTo(1.25, 2);
  await page.getByRole("tab", { name: "Style", exact: true }).click();
  await expect(page.getByRole("combobox")).toHaveValue("Noto Sans Mono");
  await expect(page.getByLabel("Caption vertical position")).toHaveValue("65");
  await expect(page.locator(".editor-templates .chosen")).toHaveAccessibleName(
    "Bold Highlight",
  );
  await page
    .getByRole("button", { name: "Return to home", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Resume editing", exact: true })
    .click();
  await expect(page.getByRole("tab", { name: /Captions/ })).toBeVisible();
  await page
    .getByRole("button", { name: "Return to home", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Forget saved project", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Forget project", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open editor", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resume editing", exact: true }),
  ).toHaveCount(0);
});

test("a file drag shows the CC drop overlay without flickering between child elements", async ({
  page,
}) => {
  await page.goto("/");
  const files = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(
      new File(["bad video"], "drop.webm", { type: "video/webm" }),
    );
    return data;
  });
  await page
    .locator(".app-root")
    .dispatchEvent("dragenter", { dataTransfer: files });
  await expect(
    page.getByRole("heading", { name: "Drop your video here.", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".file-drop-panel img")).toHaveAttribute(
    "src",
    "/favicon.svg",
  );
  await page
    .locator(".hero-intro")
    .dispatchEvent("dragenter", { dataTransfer: files });
  await page
    .locator(".hero-intro")
    .dispatchEvent("dragleave", { dataTransfer: files });
  await expect(page.locator(".file-drop-overlay")).toBeVisible();
  await page.screenshot({ path: "test-results/file-drop-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/file-drop-phone.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".app-root")
    .dispatchEvent("drop", { dataTransfer: files });
  await expect(page.locator(".file-drop-overlay")).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText(
    "cannot decode this video",
  );
  await files.dispose();
});

test("storage failure is visible and does not prevent editing", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new DOMException("Storage is disabled.", "SecurityError");
      },
    });
  });
  const bytes = await fixture(page);
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "private.webm",
    mimeType: "video/webm",
    buffer: bytes,
  });
  await expect(page.getByRole("alert")).toContainText("Autosave unavailable");
  await page.getByLabel("Add caption", { exact: true }).click();
  await expect(page.getByLabel("Caption 1 text")).toHaveValue("word");
  await expect(
    page.getByRole("button", { name: "Export", exact: true }),
  ).toBeEnabled();
});

test("a failed video save keeps the previous project intact", async ({
  page,
}) => {
  const bytes = await fixture(page);
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "original.webm",
    mimeType: "video/webm",
    buffer: bytes,
  });
  await page.getByLabel("Add caption", { exact: true }).click();
  await page.getByLabel("Caption 1 text").fill("Keep this");
  await page.getByLabel("Caption 1 text").press("Enter");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (key === "state")
        throw new DOMException("No space", "QuotaExceededError");
      return put.call(this, value, key);
    };
  });
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "replacement.webm",
    mimeType: "video/webm",
    buffer: bytes,
  });
  await page
    .getByRole("button", { name: "Replace project", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Browser storage is full",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(page.getByText("original.webm", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Caption 1 text")).toHaveValue("Keep this");
});

test("a stale tab cannot overwrite a project opened in another tab", async ({
  page,
  context,
}) => {
  const bytes = await fixture(page);
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "first.webm",
    mimeType: "video/webm",
    buffer: bytes,
  });
  await page.getByLabel("Add caption", { exact: true }).click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  const newer = await context.newPage();
  await newer.goto("/");
  await expect(newer.getByText("first.webm", { exact: true })).toBeVisible();
  await newer.getByLabel("Choose a video file").setInputFiles({
    name: "second.webm",
    mimeType: "video/webm",
    buffer: bytes,
  });
  await newer
    .getByRole("button", { name: "Replace project", exact: true })
    .click();
  await expect(
    newer.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Caption 1 text").fill("Old tab edit");
  await page.getByLabel("Caption 1 text").press("Enter");
  await expect(page.getByRole("alert")).toContainText(
    "Another tab changed the saved project",
  );
  await page
    .getByRole("button", { name: "Retry autosave", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Another tab changed the saved project",
  );
  await newer.reload();
  await expect(newer.getByText("second.webm", { exact: true })).toBeVisible();
  await expect(newer.getByLabel("Caption 1 text")).toHaveCount(0);
});

test("playback controls stay in place when timer digits change", async ({
  page,
}) => {
  const bytes = await fixture(page);
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "speech.webm",
    mimeType: "video/webm",
    buffer: bytes,
  });
  await expect(page.getByLabel("Subtitle timeline")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const positions: {
      timerWidth: number;
      seekX: number;
      seekWidth: number;
      playX: number;
    }[] = [];
    for (const [value, text] of [
      ["0.11", "00:00.11"],
      ["0.88", "00:00.88"],
      ["1.11", "00:01.11"],
      ["3.88", "00:03.88"],
    ]) {
      await page.getByLabel("Video playhead").fill(value);
      await expect(page.locator(".time-display")).toContainText(text);
      const timer = (await page.locator(".time-display").boundingBox())!;
      const seek = (await page.getByLabel("Video playhead").boundingBox())!;
      const play = (await page
        .getByRole("button", { name: "Play video", exact: true })
        .boundingBox())!;
      positions.push({
        timerWidth: timer.width,
        seekX: seek.x,
        seekWidth: seek.width,
        playX: play.x,
      });
    }
    for (const position of positions)
      for (const key of [
        "timerWidth",
        "seekX",
        "seekWidth",
        "playX",
      ] as const) {
        expect(Math.abs(position[key] - positions[0][key])).toBeLessThan(0.1);
      }
  }
});

test("caption fetch failures explain how to recover and preserve existing edits", async ({
  page,
}) => {
  const bytes = await fixture(page);
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "speech.webm",
    mimeType: "video/webm",
    buffer: bytes,
  });
  await page.getByLabel("Add caption", { exact: true }).click();
  await page.route("**/ffmpeg/ffmpeg-core.js", (route) =>
    route.abort("connectionrefused"),
  );
  await page.getByRole("button", { name: "Regenerate", exact: true }).click();
  await page
    .getByRole("button", { name: "Regenerate captions", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("local video engine");
  await expect(page.getByRole("alert")).toContainText("server");
  await expect(page.getByLabel("Caption 1 text")).toHaveValue("word");

  await page.unroute("**/ffmpeg/ffmpeg-core.js");
  await page.route("https://huggingface.co/**", (route) =>
    route.abort("internetdisconnected"),
  );
  await page.getByRole("button", { name: "Regenerate", exact: true }).click();
  await page
    .getByRole("button", { name: "Regenerate captions", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("speech model", {
    timeout: 60000,
  });
  await expect(page.getByLabel("Caption 1 text")).toHaveValue("word");
});

test("1080p karaoke video exports with the bundled mono font", async ({
  page,
}) => {
  const bytes = await fixture(page, 1080, 1920);
  await page.getByLabel("Choose a video file").setInputFiles({
    name: "portrait1080.webm",
    mimeType: "video/webm",
    buffer: bytes,
  });
  await page.getByLabel("Add caption", { exact: true }).click();
  await page.getByLabel("Caption 1 text").fill("Make");
  await page.getByLabel("Caption 1 text").press("Enter");
  await page.getByLabel("Caption end time").fill("1.2");
  await page.getByLabel("Caption end time").press("Tab");
  await page.getByLabel("Video playhead").fill("1.5");
  await page.getByLabel("Add caption", { exact: true }).click();
  await page.getByLabel("Caption 2 text").fill("every");
  await page.getByLabel("Caption 2 text").press("Enter");
  await page.getByRole("tab", { name: "Style" }).click();
  await page.getByRole("button", { name: "Karaoke", exact: true }).click();
  await page.getByRole("combobox").selectOption("Noto Sans Mono");
  await page.getByRole("button", { name: "Seek to start" }).click();
  await expect(page.locator(".video-frame .caption-overlay")).toHaveText(
    "Makeevery",
  );
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const pending = page.waitForEvent("download", { timeout: 180000 });
  await page.getByRole("button", { name: /Captioned video/ }).click();
  const output = await pending;
  const bytesOut = await readFile((await output.path())!);
  await output.saveAs(`${fixtureFolder}/karaoke1080.mp4`);
  await page.route("**/karaoke-output.mp4", (route) =>
    route.fulfill({ body: bytesOut, contentType: "video/mp4" }),
  );
  const result = await page.evaluate(async () => {
    const url = URL.createObjectURL(
      await (await fetch("/karaoke-output.mp4")).blob(),
    );
    const video = document.createElement("video");
    document.body.append(video);
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("1080p export cannot be decoded"));
    });
    video.currentTime = 0.2;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const output = {
      width: video.videoWidth,
      height: video.videoHeight,
      frame: canvas.toDataURL(),
    };
    video.remove();
    URL.revokeObjectURL(url);
    return output;
  });
  expect(result.width).toBe(1080);
  expect(result.height).toBe(1920);
  await writeFile(
    "test-results/karaoke1080-frame.png",
    Buffer.from(result.frame.split(",")[1], "base64"),
  );
});
