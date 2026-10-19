import type { AuditReport, Finding } from "../types/index.js";

export function formatMarkdownReport(report: AuditReport): string {
  const lines: string[] = [];

  // Header
  lines.push(`# LaunchKit Project Readiness Audit`);
  lines.push(`> **${report.tool.tagline}** — *Powered by ${report.tool.brand}*`);
  lines.push("");

  // Metadata Table
  lines.push(`## Project Overview`);
  lines.push("");
  lines.push(`| Property | Value |`);
  lines.push(`| :--- | :--- |`);
  lines.push(`| **Project Name** | \`${report.project.name || "unnamed"}\` |`);
  lines.push(`| **Project Path** | \`${report.project.displayPath}\` |`);
  lines.push(`| **Version** | \`${report.project.version}\` |`);
  lines.push(`| **Framework** | ${report.project.frameworkDetails ?? report.project.framework} |`);
  lines.push(`| **Language** | ${report.project.language} |`);
  lines.push(`| **Package Manager** | ${report.project.packageManager} |`);
  lines.push(`| **Monorepo** | ${report.project.isMonorepo ? "Yes" : "No"} |`);
  lines.push(`| **Git Repository** | ${report.project.hasGit ? "Yes" : "No"} |`);
  lines.push(`| **Scanned At** | ${report.scannedAt} |`);
  lines.push(`| **Duration** | ${report.scanDurationMs}ms |`);
  lines.push("");

  // Score
  lines.push(`## Readiness Score: **${report.summary.score}/100**`);
  lines.push("");
  lines.push(`*${report.summary.calculationExplanation}*`);
  lines.push("");

  // Summary Metrics Table
  lines.push(`### Summary Metrics`);
  lines.push("");
  lines.push(`| Metric | Count | Description |`);
  lines.push(`| :--- | :--- | :--- |`);
  lines.push(
    `| **Passed** | ${report.summary.passed} | Checks that satisfied all readiness criteria |`,
  );
  lines.push(
    `| **Warnings** | ${report.summary.warnings} | Non-blocking recommendations and improvement opportunities |`,
  );
  lines.push(
    `| **Failed** | ${report.summary.failed} | Blocking release issues supported by filesystem evidence |`,
  );
  lines.push(
    `| **Skipped** | ${report.summary.skipped} | Checks that do not apply to this project stack |`,
  );
  if (report.summary.errors > 0) {
    lines.push(
      `| **Errors** | ${report.summary.errors} | Checks that encountered an execution error |`,
    );
  }
  lines.push("");

  // Recommended Next Steps
  if (report.recommendations.length > 0) {
    lines.push(`## Recommended Next Steps`);
    lines.push("");
    report.recommendations.forEach((rec, idx) => {
      lines.push(`${idx + 1}. ${rec}`);
    });
    lines.push("");
  }

  // Findings Breakdown
  lines.push(`## Audit Findings`);
  lines.push("");

  const statusIcons: Record<Finding["status"], string> = {
    fail: "[FAIL]",
    warn: "[WARN]",
    pass: "[PASS]",
    skipped: "[SKIP]",
    error: "[ERROR]",
  };

  for (const finding of report.findings) {
    const icon = statusIcons[finding.status] ?? "[INFO]";
    lines.push(`### ${icon} ${finding.title}`);
    lines.push(`- **Status:** \`${finding.status.toUpperCase()}\``);
    lines.push(`- **Category:** \`${finding.category}\``);
    if (finding.explanation) {
      lines.push(`- **Explanation:** ${finding.explanation}`);
    }
    if (finding.evidence) {
      lines.push(`- **Evidence:** \`${finding.evidence.replace(/`/g, "'")}\``);
    }
    if (finding.affectedFiles.length > 0) {
      lines.push(
        `- **Affected Files:** ${finding.affectedFiles.map((f) => `\`${f}\``).join(", ")}`,
      );
    }
    if (finding.remediation) {
      lines.push(`- **Suggested Remediation:** ${finding.remediation}`);
    }
    lines.push("");
  }

  // Disclaimer
  lines.push(`---`);
  lines.push(`*Disclaimer: ${report.disclaimer}*`);
  lines.push("");

  return lines.join("\n");
}
