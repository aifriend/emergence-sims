import { defineConfig } from "vitest/config";

export default defineConfig({
  // Tailwind v4's postcss config trips Vitest's default CSS pipeline; tests
  // never need styles, so disable PostCSS entirely.
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
