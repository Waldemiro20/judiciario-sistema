import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/setup/global.ts"],
    setupFiles: ["tests/setup/ambiente.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
