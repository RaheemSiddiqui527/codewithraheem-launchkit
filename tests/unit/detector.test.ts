import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestFixture, type TestFixture } from "../helpers.js";
import { SafeProjectFs } from "../../src/utils/filesystem.js";
import { detectProject } from "../../src/core/detector.js";

describe("Project Detector Engine", () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await createTestFixture("detector-");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it("detects basic Node.js and JavaScript project", async () => {
    await fixture.writeJson("package.json", {
      name: "vanilla-js-app",
      version: "1.0.0",
    });
    await fixture.writeFile("package-lock.json", "{}");
    await fixture.writeFile("index.js", "console.log('hello');");

    const fs = new SafeProjectFs(fixture.dir);
    const info = await detectProject(fixture.dir, fs);

    expect(info.isNodeProject).toBe(true);
    expect(info.name).toBe("vanilla-js-app");
    expect(info.version).toBe("1.0.0");
    expect(info.language).toBe("javascript");
    expect(info.framework).toBe("unknown");
    expect(info.packageManager).toBe("npm");
  });

  it("detects TypeScript project from tsconfig.json and dependencies", async () => {
    await fixture.writeJson("package.json", {
      name: "ts-project",
      devDependencies: { typescript: "^5.0.0" },
    });
    await fixture.writeFile("tsconfig.json", "{}");
    await fixture.writeFile("src/main.ts", "const x: number = 42;");

    const fs = new SafeProjectFs(fixture.dir);
    const info = await detectProject(fixture.dir, fs);

    expect(info.language).toBe("typescript");
  });

  it("detects Next.js framework", async () => {
    await fixture.writeJson("package.json", {
      name: "next-app",
      dependencies: { next: "14.0.0", react: "18.2.0", "react-dom": "18.2.0" },
    });
    await fixture.writeFile("next.config.js", "module.exports = {};");

    const fs = new SafeProjectFs(fixture.dir);
    const info = await detectProject(fixture.dir, fs);

    expect(info.framework).toBe("nextjs");
  });

  it("detects Vite framework", async () => {
    await fixture.writeJson("package.json", {
      name: "vite-app",
      devDependencies: { vite: "^5.0.0" },
    });
    await fixture.writeFile("vite.config.ts", "export default {};");

    const fs = new SafeProjectFs(fixture.dir);
    const info = await detectProject(fixture.dir, fs);

    expect(info.framework).toBe("vite");
  });

  it("detects Express framework", async () => {
    await fixture.writeJson("package.json", {
      name: "api-server",
      dependencies: { express: "^4.19.0" },
    });

    const fs = new SafeProjectFs(fixture.dir);
    const info = await detectProject(fixture.dir, fs);

    expect(info.framework).toBe("express");
  });

  it("detects NestJS framework", async () => {
    await fixture.writeJson("package.json", {
      name: "nest-app",
      dependencies: { "@nestjs/core": "^10.0.0" },
    });
    await fixture.writeFile("nest-cli.json", "{}");

    const fs = new SafeProjectFs(fixture.dir);
    const info = await detectProject(fixture.dir, fs);

    expect(info.framework).toBe("nestjs");
  });

  it("detects Vue framework", async () => {
    await fixture.writeJson("package.json", {
      name: "vue-app",
      dependencies: { vue: "^3.4.0" },
    });

    const fs = new SafeProjectFs(fixture.dir);
    const info = await detectProject(fixture.dir, fs);

    expect(info.framework).toBe("vue");
  });

  it("detects Angular framework", async () => {
    await fixture.writeJson("package.json", {
      name: "angular-app",
      dependencies: { "@angular/core": "^17.0.0" },
    });
    await fixture.writeFile("angular.json", "{}");

    const fs = new SafeProjectFs(fixture.dir);
    const info = await detectProject(fixture.dir, fs);

    expect(info.framework).toBe("angular");
  });

  it("detects Svelte and SvelteKit framework", async () => {
    await fixture.writeJson("package.json", {
      name: "svelte-app",
      devDependencies: { "@sveltejs/kit": "^2.0.0", svelte: "^4.0.0" },
    });
    await fixture.writeFile("svelte.config.js", "export default {};");

    const fs = new SafeProjectFs(fixture.dir);
    const info = await detectProject(fixture.dir, fs);

    expect(info.framework).toBe("svelte");
    expect(info.frameworkDetails).toBe("SvelteKit");
  });

  it("detects Expo and React Native framework", async () => {
    await fixture.writeJson("package.json", {
      name: "mobile-app",
      dependencies: { expo: "^50.0.0", "react-native": "0.73.0" },
    });

    const fs = new SafeProjectFs(fixture.dir);
    const info = await detectProject(fixture.dir, fs);

    expect(info.framework).toBe("expo");
  });

  it("detects monorepos from workspace manifests", async () => {
    await fixture.writeJson("package.json", {
      name: "root-monorepo",
      workspaces: ["packages/*"],
    });
    await fixture.writeFile("pnpm-workspace.yaml", "packages:\n  - 'packages/*'");

    const fs = new SafeProjectFs(fixture.dir);
    const info = await detectProject(fixture.dir, fs);

    expect(info.isMonorepo).toBe(true);
    expect(info.monorepoTool).toBe("pnpm-workspace");
  });

  it("detects package managers: pnpm, yarn, bun, npm", async () => {
    await fixture.writeJson("package.json", { name: "test-pkg" });
    await fixture.writeFile("pnpm-lock.yaml", "");

    const fs = new SafeProjectFs(fixture.dir);
    const info = await detectProject(fixture.dir, fs);

    expect(info.packageManager).toBe("pnpm");
    expect(info.lockfilesFound).toEqual(["pnpm-lock.yaml"]);
    expect(info.hasMultipleLockfiles).toBe(false);
  });

  it("detects multiple conflicting lockfiles", async () => {
    await fixture.writeJson("package.json", { name: "conflict-pkg" });
    await fixture.writeFile("package-lock.json", "{}");
    await fixture.writeFile("yarn.lock", "");

    const fs = new SafeProjectFs(fixture.dir);
    const info = await detectProject(fixture.dir, fs);

    expect(info.hasMultipleLockfiles).toBe(true);
    expect(info.lockfilesFound).toContain("package-lock.json");
    expect(info.lockfilesFound).toContain("yarn.lock");
  });
});
