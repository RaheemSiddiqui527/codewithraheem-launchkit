import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestFixture, type TestFixture } from "../helpers.js";
import { SafeProjectFs } from "../../src/utils/filesystem.js";
import { detectProject } from "../../src/core/detector.js";
import { checkTests } from "../../src/checks/tests.js";

describe("Test Readiness Audit", () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await createTestFixture("tests-audit-");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it("warns if no test framework, configs, or test files are detected", async () => {
    await fixture.writeJson("package.json", { name: "no-tests-app" });

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkTests({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const frameworkFinding = findings.find((f) => f.id === "tests-framework-detected");
    expect(frameworkFinding?.status).toBe("warn");

    const filesFinding = findings.find((f) => f.id === "tests-files-present");
    expect(filesFinding?.status).toBe("warn");
  });

  it("detects Vitest dependency, config, and test files", async () => {
    await fixture.writeJson("package.json", {
      name: "vitest-app",
      devDependencies: { vitest: "^1.0.0" },
    });
    await fixture.writeFile("vitest.config.ts", "export default {};");
    await fixture.writeFile("tests/app.test.ts", "test('passes', () => {});");

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkTests({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const frameworkFinding = findings.find((f) => f.id === "tests-framework-detected");
    expect(frameworkFinding?.status).toBe("pass");
    expect(frameworkFinding?.evidence).toContain("Vitest");

    const filesFinding = findings.find((f) => f.id === "tests-files-present");
    expect(filesFinding?.status).toBe("pass");
  });

  it("detects Node.js built-in test runner from test script", async () => {
    await fixture.writeJson("package.json", {
      name: "node-test-app",
      scripts: { test: "node --test" },
    });
    await fixture.writeFile("test/math.spec.js", "");

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkTests({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const frameworkFinding = findings.find((f) => f.id === "tests-framework-detected");
    expect(frameworkFinding?.status).toBe("pass");
    expect(frameworkFinding?.evidence).toContain("Node.js Test Runner");
  });
});
