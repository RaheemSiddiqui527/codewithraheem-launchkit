import { defineConfig } from "tsup";

export default defineConfig([
  // Library entrypoint: ESM and CJS
  {
    entry: {
      index: "src/index.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
    target: "node18",
    splitting: false,
    outDir: "dist",
  },
  // CLI entrypoint: executable node script
  {
    entry: {
      cli: "src/cli/index.ts",
    },
    format: ["esm"],
    dts: false,
    clean: false,
    sourcemap: true,
    target: "node18",
    banner: {
      js: "#!/usr/bin/env node",
    },
    outDir: "dist",
  },
]);
