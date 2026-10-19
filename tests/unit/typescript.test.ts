import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestFixture, type TestFixture } from "../helpers.js";
import { SafeProjectFs } from "../../src/utils/filesystem.js";
import { detectProject } from "../../src/core/detector.js";
import { checkTypeScript } from "../../src/checks/typescript.js";

describe("TypeScript Audit", () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await createTestFixture("ts-");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it("skips TypeScript checks for JavaScript-only projects", async () => {
    await fixture.writeJson("package.json", { name: "js-app" });
    await fixture.writeFile("index.js", "module.exports = {};");

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkTypeScript({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.status).toBe("skipped");
    expect(findings[0]?.id).toBe("ts-usage");
  });

  it("fails if TypeScript project lacks tsconfig.json", async () => {
    await fixture.writeJson("package.json", {
      name: "ts-app",
      devDependencies: { typescript: "^5.0.0" },
    });
    await fixture.writeFile("src/index.ts", "export const a = 1;");

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkTypeScript({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const tsConfigFinding = findings.find((f) => f.id === "ts-config-present");
    expect(tsConfigFinding).toBeDefined();
    expect(tsConfigFinding?.status).toBe("fail");
  });

  it("fails if tsconfig.json contains unparseable syntax", async () => {
    await fixture.writeJson("package.json", {
      name: "ts-app",
      devDependencies: { typescript: "^5.0.0" },
    });
    await fixture.writeFile("tsconfig.json", "{ compilerOptions: { strict: true }"); // missing closing brace

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkTypeScript({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const validFinding = findings.find((f) => f.id === "ts-config-valid");
    expect(validFinding).toBeDefined();
    expect(validFinding?.status).toBe("fail");
  });

  it("safely handles comments and trailing commas in tsconfig.json (JSONC)", async () => {
    await fixture.writeJson("package.json", {
      name: "ts-app",
      devDependencies: { typescript: "^5.0.0" },
    });
    await fixture.writeFile(
      "tsconfig.json",
      `{
        // TypeScript configuration with comments
        "compilerOptions": {
          /* Strict checking */
          "strict": true,
          "target": "ES2022",
        },
      }`,
    );

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkTypeScript({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const validFinding = findings.find((f) => f.id === "ts-config-valid");
    expect(validFinding?.status).toBe("pass");

    const strictFinding = findings.find((f) => f.id === "ts-strict-mode");
    expect(strictFinding?.status).toBe("pass");
  });

  it("warns if strict mode is disabled in tsconfig.json", async () => {
    await fixture.writeJson("package.json", {
      name: "ts-app",
      devDependencies: { typescript: "^5.0.0" },
    });
    await fixture.writeJson("tsconfig.json", {
      compilerOptions: { strict: false },
    });

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkTypeScript({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const strictFinding = findings.find((f) => f.id === "ts-strict-mode");
    expect(strictFinding).toBeDefined();
    expect(strictFinding?.status).toBe("warn");
  });
});
