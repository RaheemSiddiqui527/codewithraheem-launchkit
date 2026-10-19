import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/fixtures/**/*", "node_modules/**/*", "dist/**/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/cli/index.ts", "src/types/**"],
    },
    testTimeout: 15000,
  },
});
