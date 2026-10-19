import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { createTestFixture, type TestFixture } from "../helpers.js";
import { runCli } from "../../src/cli/index.js";

describe("CLI Integration Tests", () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await createTestFixture("cli-integration-");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it("returns exit code 0 on a clean project without blocking failures", async () => {
    await fixture.writeJson("package.json", {
      name: "clean-project",
      version: "1.0.0",
      description: "Clean test project",
      license: "MIT",
      engines: { node: ">=18.0.0" },
      scripts: {
        build: "echo build",
        test: "vitest run",
        lint: "eslint .",
      },
    });
    await fixture.writeFile("package-lock.json", "{}");
    await fixture.writeFile(".gitignore", "node_modules/\n.env\n");
    await fixture.writeFile(".env.example", "PORT=3000\n");

    const code = await runCli(["node", "launchkit", fixture.dir, "--no-color"]);

    expect(code).toBe(0);
  });

  it("returns exit code 1 when blocking failures are detected", async () => {
    // Missing build script on Next.js project is a blocking failure
    await fixture.writeJson("package.json", {
      name: "failing-next-app",
      version: "1.0.0",
      dependencies: { next: "14.0.0" },
      scripts: {},
    });

    const code = await runCli(["node", "launchkit", fixture.dir, "--no-color"]);

    expect(code).toBe(1);
  });

  it("returns exit code 2 when target path does not exist", async () => {
    const nonExistentPath = path.join(fixture.dir, "does_not_exist_xyz");

    const code = await runCli(["node", "launchkit", nonExistentPath, "--no-color"]);

    expect(code).toBe(2);
  });

  it("returns exit code 2 when invalid format is provided", async () => {
    const code = await runCli(["node", "launchkit", fixture.dir, "--format", "xml"]);

    expect(code).toBe(2);
  });

  it("handles paths containing spaces correctly", async () => {
    const spaceDir = path.join(fixture.dir, "folder with spaces");
    await fs.mkdir(spaceDir, { recursive: true });
    await fs.writeFile(
      path.join(spaceDir, "package.json"),
      JSON.stringify({ name: "space-app", version: "1.0.0", scripts: { test: "vitest" } }),
    );

    const code = await runCli([
      "node",
      "launchkit",
      spaceDir,
      "--no-color",
      "--checks",
      "package,scripts",
    ]);

    expect(code).toBe(0);
  });

  it("exports report to a file using --output and protects against accidental overwrite", async () => {
    await fixture.writeJson("package.json", {
      name: "output-test",
      version: "1.0.0",
      scripts: { test: "vitest" },
    });
    await fixture.writeFile(".gitignore", "node_modules/\n");
    await fixture.writeFile("package-lock.json", "{}");

    const reportFile = path.join(fixture.dir, "test-report.md");

    // First save should succeed
    const code1 = await runCli([
      "node",
      "launchkit",
      fixture.dir,
      "--format",
      "markdown",
      "--output",
      reportFile,
      "--no-color",
    ]);

    expect(code1).toBe(0);
    const content = await fs.readFile(reportFile, "utf-8");
    expect(content).toContain("# LaunchKit Project Readiness Audit");

    // Second save without --force should error with exit code 2
    const code2 = await runCli([
      "node",
      "launchkit",
      fixture.dir,
      "--format",
      "markdown",
      "--output",
      reportFile,
      "--no-color",
    ]);

    expect(code2).toBe(2);

    // Save with --force should succeed
    const code3 = await runCli([
      "node",
      "launchkit",
      fixture.dir,
      "--format",
      "markdown",
      "--output",
      reportFile,
      "--force",
      "--no-color",
    ]);

    expect(code3).toBe(0);
  });

  it("ensures default audit is strictly read-only and modifies no files", async () => {
    await fixture.writeJson("package.json", {
      name: "readonly-test",
      version: "1.0.0",
      scripts: { test: "vitest" },
    });
    await fixture.writeFile("index.js", "console.log('original');");

    const filesBefore = await fs.readdir(fixture.dir);
    const indexBefore = await fs.readFile(path.join(fixture.dir, "index.js"), "utf-8");

    await runCli(["node", "launchkit", fixture.dir, "--no-color"]);

    const filesAfter = await fs.readdir(fixture.dir);
    const indexAfter = await fs.readFile(path.join(fixture.dir, "index.js"), "utf-8");

    expect(filesAfter).toEqual(filesBefore);
    expect(indexAfter).toBe(indexBefore);
  });

  it("executes opt-in build with --run-build on a controlled fixture", async () => {
    await fixture.writeJson("package.json", {
      name: "build-test",
      version: "1.0.0",
      scripts: {
        build: "node -e \"console.log('build-ok')\"",
        test: "vitest",
      },
    });

    const code = await runCli([
      "node",
      "launchkit",
      fixture.dir,
      "--checks",
      "build",
      "--run-build",
      "--no-color",
    ]);

    expect(code).toBe(0);
  });
});
