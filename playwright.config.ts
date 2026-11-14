import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:4173/TCC/",
    channel: process.env.CI ? undefined : "chrome",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173/TCC/",
    reuseExistingServer: true,
  },
});
