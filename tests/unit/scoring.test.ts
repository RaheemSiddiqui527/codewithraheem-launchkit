import { describe, it, expect } from "vitest";
import { calculateReadinessScore } from "../../src/core/scoring.js";
import type { Finding } from "../../src/types/index.js";

describe("Scoring Calculation Engine", () => {
  it("calculates 100 score when all checks pass", () => {
    const findings: Finding[] = [
      {
        id: "c1",
        category: "package",
        status: "pass",
        title: "Check 1",
        explanation: "",
        evidence: "",
        affectedFiles: [],
        remediation: "",
        weight: 10,
      },
      {
        id: "c2",
        category: "scripts",
        status: "pass",
        title: "Check 2",
        explanation: "",
        evidence: "",
        affectedFiles: [],
        remediation: "",
        weight: 10,
      },
    ];

    const { summary } = calculateReadinessScore(findings);
    expect(summary.score).toBe(100);
    expect(summary.passed).toBe(2);
    expect(summary.failed).toBe(0);
    expect(summary.warnings).toBe(0);
  });

  it("calculates partial score when warnings exist", () => {
    // 1 pass (10 pts) + 1 warn (5 pts) = 15 / 20 = 75%
    const findings: Finding[] = [
      {
        id: "c1",
        category: "package",
        status: "pass",
        title: "Pass check",
        explanation: "",
        evidence: "",
        affectedFiles: [],
        remediation: "",
        weight: 10,
      },
      {
        id: "c2",
        category: "scripts",
        status: "warn",
        title: "Warn check",
        explanation: "",
        evidence: "",
        affectedFiles: [],
        remediation: "",
        weight: 10,
      },
    ];

    const { summary } = calculateReadinessScore(findings);
    expect(summary.score).toBe(75);
    expect(summary.passed).toBe(1);
    expect(summary.warnings).toBe(1);
  });

  it("calculates score with failed check giving 0 points", () => {
    // 1 pass (10 pts) + 1 fail (0 pts) = 10 / 20 = 50%
    const findings: Finding[] = [
      {
        id: "c1",
        category: "package",
        status: "pass",
        title: "Pass check",
        explanation: "",
        evidence: "",
        affectedFiles: [],
        remediation: "",
        weight: 10,
      },
      {
        id: "c2",
        category: "scripts",
        status: "fail",
        title: "Fail check",
        explanation: "",
        evidence: "",
        affectedFiles: [],
        remediation: "Fix the fail",
        weight: 10,
      },
    ];

    const { summary } = calculateReadinessScore(findings);
    expect(summary.score).toBe(50);
    expect(summary.failed).toBe(1);
  });

  it("strictly excludes skipped checks from both earned and total weights", () => {
    // 1 pass (10 pts) + 5 skipped (0 pts each, omitted from total) = 10 / 10 = 100%
    const findings: Finding[] = [
      {
        id: "c1",
        category: "package",
        status: "pass",
        title: "Pass check",
        explanation: "",
        evidence: "",
        affectedFiles: [],
        remediation: "",
        weight: 10,
      },
      {
        id: "c2",
        category: "typescript",
        status: "skipped",
        title: "Skip TS check",
        explanation: "",
        evidence: "",
        affectedFiles: [],
        remediation: "",
        weight: 15,
      },
    ];

    const { summary } = calculateReadinessScore(findings);
    expect(summary.score).toBe(100);
    expect(summary.skipped).toBe(1);
    expect(summary.totalApplicableChecks).toBe(1);
  });

  it("prioritizes blocking failures before warnings in recommendations", () => {
    const findings: Finding[] = [
      {
        id: "w1",
        category: "scripts",
        status: "warn",
        title: "Warn check",
        explanation: "",
        evidence: "",
        affectedFiles: [],
        remediation: "Add lint script",
      },
      {
        id: "f1",
        category: "package",
        status: "fail",
        title: "Fail check",
        explanation: "",
        evidence: "",
        affectedFiles: [],
        remediation: "Fix package.json syntax",
      },
    ];

    const { recommendations } = calculateReadinessScore(findings);
    expect(recommendations).toHaveLength(2);
    expect(recommendations[0]).toContain("[Blocking] Fix package.json syntax");
    expect(recommendations[1]).toContain("[Recommended] Add lint script");
  });
});
