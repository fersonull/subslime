import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 240000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    channel: "msedge",
    headless: true,
    baseURL: "http://127.0.0.1:4180",
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
    actionTimeout: 15000,
  },
  webServer: {
    command: "npm run preview -- --port 4180",
    url: "http://127.0.0.1:4180",
    reuseExistingServer: true,
  },
});
