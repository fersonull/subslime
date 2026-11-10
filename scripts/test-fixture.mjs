import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (!existsSync("tests/fixtures/generated/speech.wav")) {
  if (process.platform !== "win32")
    throw new Error(
      "Browser tests need tests/fixtures/generated/speech.wav: a short recording saying “Make every word count. This is a test of local video captions.”",
    );
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-Command", readFileSync("scripts/test-speech.ps1", "utf8")],
    { stdio: "inherit", windowsHide: true },
  );
  if (result.status !== 0)
    throw new Error("Could not synthesize the local speech fixture.");
}
