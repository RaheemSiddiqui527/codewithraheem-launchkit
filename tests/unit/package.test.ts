import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestFixture, type TestFixture } from "../helpers.js";
import { SafeProjectFs } from "../../src/utils/filesystem.js";
import { detectProject } from "../../src/core/detector.js";
import { checkPackageManifest } from "../../src/checks/package.js";

describe("Package Manifest Checks", () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await createTestFixture("pkg-");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it("fails if package.json is missing", async () => {
    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkPackageManifest({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const manifestFinding = findings.find((f) => f.id === "pkg-manifest-present");
    expect(manifestFinding).toBeDefined();
    expect(manifestFinding?.status).toBe("fail");
  });

  it("fails if package.json contains malformed JSON", async () => {
    await fixture.writeFile("package.json", "{ name: 'bad-json', }");
    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkPackageManifest({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const validFinding = findings.find((f) => f.id === "pkg-manifest-valid");
    expect(validFinding).toBeDefined();
    expect(validFinding?.status).toBe("fail");
  });

  it("validates package name and flags invalid names", async () => {
    await fixture.writeJson("package.json", {
      name: "INVALID NAME WITH SPACES!",
      version: "1.0.0",
    });
    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkPackageManifest({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const nameFinding = findings.find((f) => f.id === "pkg-name-valid");
    expect(nameFinding?.status).toBe("fail");
  });

  it("passes for valid scoped package name", async () => {
    await fixture.writeJson("package.json", {
      name: "@codewithraheem/launchkit",
      version: "0.1.0",
      engines: { node: ">=18.0.0" },
    });
    await fixture.writeFile("package-lock.json", "{}");

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkPackageManifest({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const nameFinding = findings.find((f) => f.id === "pkg-name-valid");
    expect(nameFinding?.status).toBe("pass");
    const semverFinding = findings.find((f) => f.id === "pkg-version-valid");
    expect(semverFinding?.status).toBe("pass");
  });

  it("fails if multiple lockfiles are present", async () => {
    await fixture.writeJson("package.json", { name: "app", version: "1.0.0" });
    await fixture.writeFile("package-lock.json", "{}");
    await fixture.writeFile("yarn.lock", "");

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkPackageManifest({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const lockFinding = findings.find((f) => f.id === "pkg-multiple-lockfiles");
    expect(lockFinding).toBeDefined();
    expect(lockFinding?.status).toBe("fail");
  });

  it("warns if engines.node is not specified", async () => {
    await fixture.writeJson("package.json", { name: "app", version: "1.0.0" });
    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkPackageManifest({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const engineFinding = findings.find((f) => f.id === "pkg-engines-node");
    expect(engineFinding?.status).toBe("warn");
  });
});
