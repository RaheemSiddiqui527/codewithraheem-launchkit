import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestFixture, type TestFixture } from "../helpers.js";
import { SafeProjectFs } from "../../src/utils/filesystem.js";
import { detectProject } from "../../src/core/detector.js";
import { checkScripts } from "../../src/checks/scripts.js";

describe("Scripts Audit", () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await createTestFixture("scripts-");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it("fails if build script is missing on Next.js or Vite project", async () => {
    await fixture.writeJson("package.json", {
      name: "next-app",
      dependencies: { next: "14.0.0" },
      scripts: {},
    });

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkScripts({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const buildFinding = findings.find((f) => f.id === "scripts-build-configured");
    expect(buildFinding).toBeDefined();
    expect(buildFinding?.status).toBe("fail");
  });

  it("warns if build script is missing on generic project", async () => {
    await fixture.writeJson("package.json", {
      name: "node-cli",
      scripts: {},
    });

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkScripts({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const buildFinding = findings.find((f) => f.id === "scripts-build-configured");
    expect(buildFinding?.status).toBe("warn");
  });

  it("fails if test script is the default unconfigured npm placeholder", async () => {
    await fixture.writeJson("package.json", {
      name: "app",
      scripts: {
        test: 'echo "Error: no test specified" && exit 1',
      },
    });

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkScripts({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const testFinding = findings.find((f) => f.id === "scripts-test-configured");
    expect(testFinding).toBeDefined();
    expect(testFinding?.status).toBe("fail");
  });

  it("passes for valid test and build scripts", async () => {
    await fixture.writeJson("package.json", {
      name: "app",
      scripts: {
        build: "tsup",
        test: "vitest run",
        lint: "eslint .",
      },
    });

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkScripts({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    expect(findings.find((f) => f.id === "scripts-build-configured")?.status).toBe("pass");
    expect(findings.find((f) => f.id === "scripts-test-configured")?.status).toBe("pass");
    expect(findings.find((f) => f.id === "scripts-lint-configured")?.status).toBe("pass");
  });

  it("skips typecheck check for non-TypeScript projects", async () => {
    await fixture.writeJson("package.json", {
      name: "pure-js-app",
      scripts: { test: "node --test" },
    });

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkScripts({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const typecheckFinding = findings.find((f) => f.id === "scripts-typecheck-configured");
    expect(typecheckFinding?.status).toBe("skipped");
  });

  it("fails if empty script commands are defined", async () => {
    await fixture.writeJson("package.json", {
      name: "app",
      scripts: {
        build: "",
      },
    });

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkScripts({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const malformedFinding = findings.find((f) => f.id === "scripts-malformed");
    expect(malformedFinding).toBeDefined();
    expect(malformedFinding?.status).toBe("fail");
  });
});
