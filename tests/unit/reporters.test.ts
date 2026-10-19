import { describe, it, expect } from "vitest";
import { formatTerminalReport } from "../../src/reporters/terminal.js";
import { formatJsonReport } from "../../src/reporters/json.js";
import { formatMarkdownReport } from "../../src/reporters/markdown.js";
import type { AuditReport } from "../../src/types/index.js";

const SAMPLE_REPORT: AuditReport = {
  schemaVersion: "1.0.0",
  tool: {
    name: "LaunchKit",
    version: "0.1.0",
    brand: "CodeWithRaheem",
    tagline: "Inspect. Improve. Launch.",
  },
  project: {
    path: "/projects/sample-app",
    displayPath: "./sample-app",
    name: "sample-app",
    version: "1.0.0",
    framework: "nextjs",
    language: "typescript",
    packageManager: "npm",
    lockfiles: ["package-lock.json"],
    isMonorepo: false,
    hasGit: true,
  },
  summary: {
    score: 82,
    passed: 8,
    warnings: 2,
    failed: 1,
    skipped: 3,
    errors: 0,
    totalApplicableChecks: 11,
    totalEvaluated: 14,
    calculationExplanation: "Score explanation text",
  },
  findings: [
    {
      id: "pkg-valid",
      category: "package",
      status: "pass",
      title: "Package manifest is valid",
      explanation: "Valid JSON",
      evidence: "Found package.json",
      affectedFiles: ["package.json"],
      remediation: "",
    },
    {
      id: "scripts-build",
      category: "scripts",
      status: "fail",
      title: "Build script is missing",
      explanation: "Framework requires build",
      evidence: "No build script",
      affectedFiles: ["package.json"],
      remediation: "Add build script",
    },
  ],
  recommendations: ["[Blocking] Add build script"],
  scanDurationMs: 42,
  scannedAt: "2026-10-17T00:00:00.000Z",
  disclaimer: "Audit disclaimer notice",
};

describe("Reporters Engine", () => {
  it("formats terminal report without ANSI codes when color is disabled", () => {
    const text = formatTerminalReport(SAMPLE_REPORT, { color: false, verbose: false });
    expect(text).toContain("LaunchKit");
    expect(text).toContain("Inspect. Improve. Launch.");
    expect(text).toContain("Readiness Score: 82/100");
    expect(text).toContain("PASS  Package manifest is valid");
    expect(text).toContain("FAIL  Build script is missing");
    expect(text).toContain("Passed:   8");
    expect(text).toContain("Failed:   1");
  });

  it("includes evidence and remediation in verbose terminal mode", () => {
    const text = formatTerminalReport(SAMPLE_REPORT, { color: false, verbose: true });
    expect(text).toContain("Evidence:");
    expect(text).toContain("Remediation: Add build script");
  });

  it("generates valid machine-readable JSON matching the specification schema", () => {
    const jsonStr = formatJsonReport(SAMPLE_REPORT);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.schemaVersion).toBe("1.0.0");
    expect(parsed.tool.name).toBe("LaunchKit");
    expect(parsed.tool.version).toBe("0.1.0");
    expect(parsed.project.framework).toBe("nextjs");
    expect(parsed.summary.score).toBe(82);
    expect(parsed.findings).toHaveLength(2);
    expect(parsed.recommendations).toEqual(["[Blocking] Add build script"]);
  });

  it("generates structured Markdown report with tables and badges", () => {
    const md = formatMarkdownReport(SAMPLE_REPORT);

    expect(md).toContain("# LaunchKit Project Readiness Audit");
    expect(md).toContain("## Readiness Score: **82/100**");
    expect(md).toContain("| **Framework** | nextjs |");
    expect(md).toContain("### [FAIL] Build script is missing");
    expect(md).toContain("## Recommended Next Steps");
    expect(md).toContain("1. [Blocking] Add build script");
    expect(md).toContain("*Disclaimer: Audit disclaimer notice*");
  });
});
