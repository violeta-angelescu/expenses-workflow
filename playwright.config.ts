import { defineConfig, devices } from "@playwright/test";
import { E2E_DB } from "./e2e/db";

const port = 3100;

export default defineConfig({
  testDir: "./e2e",
  // Every test resets the same database, so run them one at a time.
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Needs MongoDB (MONGODB_URI, default 127.0.0.1), e.g. `docker compose up -d mongo`.
  webServer: {
    command: `npx next dev -p ${port}`,
    url: `http://localhost:${port}/requests`,
    env: { MONGODB_DB: E2E_DB, NEXT_DIST_DIR: ".next-e2e" },
    timeout: 120_000,
  },
});
