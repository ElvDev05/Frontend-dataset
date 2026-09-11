import { defineConfig, devices } from "@playwright/test";
const previewUrl = "http://localhost:4173";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: previewUrl,
    channel: "msedge",
    headless: true,
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "msedge" },
    },
  ],
  webServer: {
    command: "npm run preview -- --port 4173",
    url: previewUrl,
    reuseExistingServer: false,
  },
});
