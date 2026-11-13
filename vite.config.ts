import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwind()],
  // Windows-hosted edits can miss filesystem events and leave Vite serving stale CSS.
  server: { watch: { usePolling: process.platform === "win32" } },
  optimizeDeps: { exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"] },
  worker: { format: "es" },
  test: { include: ["tests/**/*.test.ts"] },
});
