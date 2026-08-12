import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/functional",
  fullyParallel: true,
  // Each Coding Gym run loads an isolated Pyodide runtime. Keep suite-level concurrency bounded
  // so several cold runtime downloads cannot starve one another and masquerade as code timeouts.
  workers: 2,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
