import type { AuditReport } from "../types/index.js";

export function formatJsonReport(report: AuditReport): string {
  const output = {
    schemaVersion: report.schemaVersion,
    tool: {
      name: report.tool.name,
      version: report.tool.version,
      brand: report.tool.brand,
    },
    project: {
      path: report.project.displayPath,
      name: report.project.name,
      version: report.project.version,
      framework: report.project.framework,
      language: report.project.language,
      packageManager: report.project.packageManager,
      isMonorepo: report.project.isMonorepo,
      hasGit: report.project.hasGit,
    },
    summary: {
      score: report.summary.score,
      passed: report.summary.passed,
      warnings: report.summary.warnings,
      failed: report.summary.failed,
      skipped: report.summary.skipped,
      errors: report.summary.errors,
      totalApplicableChecks: report.summary.totalApplicableChecks,
      calculationExplanation: report.summary.calculationExplanation,
    },
    findings: report.findings.map((f) => ({
      id: f.id,
      category: f.category,
      status: f.status,
      title: f.title,
      explanation: f.explanation,
      evidence: f.evidence,
      affectedFiles: f.affectedFiles,
      remediation: f.remediation,
    })),
    recommendations: report.recommendations,
    scanDurationMs: report.scanDurationMs,
    scannedAt: report.scannedAt,
    disclaimer: report.disclaimer,
  };

  return JSON.stringify(output, null, 2);
}
