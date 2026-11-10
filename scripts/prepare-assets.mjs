import { mkdir, copyFile } from "node:fs/promises";

await mkdir("public/ffmpeg", { recursive: true });
for (const name of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  await copyFile(
    `node_modules/@ffmpeg/core/dist/esm/${name}`,
    `public/ffmpeg/${name}`,
  );
}
// Use the same bundled font in the preview and libass; never fetch a user's font during export.
await mkdir("public/fonts", { recursive: true });
const { writeFile } = await import("node:fs/promises");
for (const family of ["NotoSans", "NotoSansMono"]) {
  const response = await fetch(
    `https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/${family}/${family}-Bold.ttf`,
  );
  if (!response.ok) throw new Error(`Font download failed: ${response.status}`);
  await writeFile(
    `public/fonts/${family}-Bold.ttf`,
    new Uint8Array(await response.arrayBuffer()),
  );
}
