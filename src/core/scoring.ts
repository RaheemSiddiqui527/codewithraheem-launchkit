import type { Finding, ScoreSummary } from "../types/index.js";

export function calculateReadinessScore(findings: Finding[]): {
  summary: ScoreSummary;
  recommendations: string[];
} {
  let passed = 0;
  let warnings = 0;
  let failed = 0;
  let skipped = 0;
  let errors = 0;

  let totalPossibleWeight = 0;
  let totalEarnedWeight = 0;

  for (const f of findings) {
    const weight = typeof f.weight === "number" && f.weight > 0 ? f.weight : 10;

    switch (f.status) {
      case "pass":
        passed++;
        totalPossibleWeight += weight;
        totalEarnedWeight += weight;
        break;

      case "warn":
        warnings++;
        totalPossibleWeight += weight;
        // Warnings grant 50% partial credit towards readiness
        totalEarnedWeight += weight * 0.5;
        break;

      case "fail":
        failed++;
        totalPossibleWeight += weight;
        // Fails grant 0 credit
        break;

      case "error":
        errors++;
        totalPossibleWeight += weight;
        break;

      case "skipped":
        skipped++;
        // Skipped checks are EXCLUDED from scoring calculations
        break;
    }
  }

  const totalApplicable = passed + warnings + failed + errors;
  let score = 100;

  if (totalPossibleWeight > 0) {
    const rawRatio = totalEarnedWeight / totalPossibleWeight;
    score = Math.max(0, Math.min(100, Math.round(rawRatio * 100)));
  }

  const explanation =
    `Score: ${score}/100 based on ${totalApplicable} applicable checks ` +
    `(${passed} passed, ${warnings} warning${warnings === 1 ? "" : "s"}, ` +
    `${failed} failed, ${skipped} skipped, ${errors} error${errors === 1 ? "" : "s"}). ` +
    `Weighted points earned: ${totalEarnedWeight.toFixed(1)} / ${totalPossibleWeight.toFixed(1)}. ` +
    `Passed checks award 100% weight, warnings award 50% partial credit, failed checks award 0%. ` +
    `Skipped checks are excluded from total points.`;

  // Build prioritized recommendations: Fails first (blocking), then Warnings
  const recommendations: string[] = [];

  const fails = findings.filter((f) => f.status === "fail");
  const warns = findings.filter((f) => f.status === "warn");

  for (const item of fails) {
    if (item.remediation) {
      recommendations.push(`[Blocking] ${item.remediation}`);
    } else {
      recommendations.push(`[Blocking] Resolve issue: ${item.title}`);
    }
  }

  for (const item of warns) {
    if (item.remediation) {
      recommendations.push(`[Recommended] ${item.remediation}`);
    } else {
      recommendations.push(`[Recommended] Improve: ${item.title}`);
    }
  }

  return {
    summary: {
      score,
      passed,
      warnings,
      failed,
      skipped,
      errors,
      totalApplicableChecks: totalApplicable,
      totalEvaluated: findings.length,
      calculationExplanation: explanation,
    },
    recommendations,
  };
}
