import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    // lib/*.test.ts use node:test (see `npm test`); e2e/ is Playwright.
    include: ["app/**/*.test.tsx", "components/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    mockReset: true,
  },
});
