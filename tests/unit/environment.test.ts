import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestFixture, type TestFixture } from "../helpers.js";
import { SafeProjectFs } from "../../src/utils/filesystem.js";
import { detectProject } from "../../src/core/detector.js";
import { checkEnvironment } from "../../src/checks/environment.js";

describe("Environment & Secrets Audit", () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await createTestFixture("env-audit-");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it("detects .env.example template", async () => {
    await fixture.writeJson("package.json", { name: "app" });
    await fixture.writeFile(".env.example", "DATABASE_URL=postgres://localhost:5432/db");

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkEnvironment({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const tplFinding = findings.find((f) => f.id === "env-template-present");
    expect(tplFinding?.status).toBe("pass");
    expect(tplFinding?.evidence).toContain(".env.example");
  });

  it("fails if .env exists but is not ignored by .gitignore", async () => {
    await fixture.writeJson("package.json", { name: "app" });
    await fixture.writeFile(".env", "SECRET=very-secret");
    await fixture.writeFile(".gitignore", "node_modules/\ndist/\n");

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkEnvironment({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const gitignoreFinding = findings.find((f) => f.id === "env-gitignore-coverage");
    expect(gitignoreFinding).toBeDefined();
    expect(gitignoreFinding?.status).toBe("fail");
  });

  it("passes if .env is properly covered by .gitignore", async () => {
    await fixture.writeJson("package.json", { name: "app" });
    await fixture.writeFile(".env", "DATABASE_URL=xyz");
    await fixture.writeFile(".env.example", "DATABASE_URL=example");
    await fixture.writeFile(".gitignore", "node_modules/\n.env\n.env.local\n");

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkEnvironment({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const gitignoreFinding = findings.find((f) => f.id === "env-gitignore-coverage");
    expect(gitignoreFinding?.status).toBe("pass");
  });

  it("fails if private key file (.pem or id_rsa) is exposed in workspace", async () => {
    await fixture.writeJson("package.json", { name: "app" });
    await fixture.writeFile("server.key", "PRIVATE_KEY_BYTES");
    await fixture.writeFile(".gitignore", "node_modules/\n");

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkEnvironment({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const keyFinding = findings.find((f) => f.id === "env-secret-files-risk");
    expect(keyFinding).toBeDefined();
    expect(keyFinding?.status).toBe("fail");
  });

  it("detects and strictly redacts hardcoded secrets in package.json", async () => {
    await fixture.writeFile(
      "package.json",
      JSON.stringify(
        {
          name: "app",
          scripts: {
            deploy: "curl -H 'Authorization: token ghp_111122223333444455556666777788889999'",
          },
        },
        null,
        2,
      ),
    );

    const fs = new SafeProjectFs(fixture.dir);
    const projectInfo = await detectProject(fixture.dir, fs);
    const findings = await checkEnvironment({
      projectRoot: fixture.dir,
      projectInfo,
      options: {},
      fs,
    });

    const secretFinding = findings.find((f) => f.id === "env-hardcoded-secrets");
    expect(secretFinding).toBeDefined();
    expect(secretFinding?.status).toBe("fail");

    // CRITICAL: Ensure the actual secret token was NEVER exposed in evidence or title
    expect(secretFinding?.evidence).not.toContain("ghp_111122223333444455556666777788889999");
    expect(secretFinding?.explanation).not.toContain("ghp_111122223333444455556666777788889999");
  });
});
