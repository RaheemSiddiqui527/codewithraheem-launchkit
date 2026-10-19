import kleur from "kleur";
import type { AuditReport, Finding } from "../types/index.js";

export interface TerminalReporterOptions {
  verbose?: boolean;
  color?: boolean;
}

export function formatTerminalReport(
  report: AuditReport,
  options: TerminalReporterOptions = {},
): string {
  const useColor = options.color !== false && !process.env.NO_COLOR;
  const isVerbose = Boolean(options.verbose);

  // Set kleur color state
  kleur.enabled = useColor;

  const lines: string[] = [];

  // 1. Header Banner
  lines.push("");
  lines.push(kleur.bold().cyan(report.tool.name));
  lines.push(kleur.dim(report.tool.tagline));
  lines.push("");

  // 2. Project Metadata
  const frameworkDisplay = report.project.frameworkDetails ?? report.project.framework;
  const langDisplay =
    report.project.language === "typescript"
      ? "TypeScript"
      : report.project.language === "javascript"
        ? "JavaScript"
        : "Unknown";

  lines.push(
    `${kleur.dim("Project:")}         ${kleur.bold(report.project.name || report.project.displayPath)}`,
  );
  lines.push(`${kleur.dim("Framework:")}       ${frameworkDisplay}`);
  lines.push(`${kleur.dim("Language:")}        ${langDisplay}`);
  lines.push(`${kleur.dim("Package Manager:")} ${report.project.packageManager}`);
  if (report.project.isMonorepo) {
    lines.push(`${kleur.dim("Monorepo:")}        Yes`);
  }
  lines.push("");

  // 3. Readiness Score
  const score = report.summary.score;
  let scoreColor = kleur.green;
  if (score < 60) {
    scoreColor = kleur.red;
  } else if (score < 80) {
    scoreColor = kleur.yellow;
  }

  lines.push(`${kleur.bold("Readiness Score:")} ${scoreColor(kleur.bold(`${score}/100`))}`);
  lines.push("");

  // 4. Findings List
  for (const finding of report.findings) {
    const badge = formatStatusBadge(finding.status);
    lines.push(`${badge}  ${finding.title}`);

    if (isVerbose) {
      lines.push(`      ${kleur.dim("Category:")}    ${finding.category}`);
      if (finding.explanation) {
        lines.push(`      ${kleur.dim("Details:")}     ${finding.explanation}`);
      }
      if (finding.evidence) {
        lines.push(`      ${kleur.dim("Evidence:")}    ${finding.evidence}`);
      }
      if (finding.affectedFiles.length > 0) {
        lines.push(`      ${kleur.dim("Affected:")}    ${finding.affectedFiles.join(", ")}`);
      }
      if (finding.remediation) {
        lines.push(`      ${kleur.cyan("Remediation:")} ${finding.remediation}`);
      }
      lines.push("");
    }
  }

  lines.push("");

  // 5. Summary Section
  lines.push(kleur.bold("Summary"));
  lines.push(`  ${kleur.green("Passed:")}   ${report.summary.passed}`);
  lines.push(`  ${kleur.yellow("Warnings:")} ${report.summary.warnings}`);
  lines.push(`  ${kleur.red("Failed:")}   ${report.summary.failed}`);
  lines.push(`  ${kleur.dim("Skipped:")}  ${report.summary.skipped}`);
  if (report.summary.errors > 0) {
    lines.push(`  ${kleur.magenta("Errors:")}   ${report.summary.errors}`);
  }
  lines.push("");

  // 6. Recommended Next Steps
  if (report.recommendations.length > 0) {
    lines.push(kleur.bold("Recommended Next Steps"));
    report.recommendations.slice(0, 5).forEach((rec, idx) => {
      lines.push(`  ${idx + 1}. ${rec}`);
    });
    if (report.recommendations.length > 5) {
      lines.push(kleur.dim(`  ...and ${report.recommendations.length - 5} more recommendation(s)`));
    }
    lines.push("");
  }

  if (!isVerbose) {
    lines.push(
      kleur.dim("Tip: Pass --verbose for detailed explanations, evidence, and remediation steps."),
    );
    lines.push("");
  }

  return lines.join("\n");
}

function formatStatusBadge(status: Finding["status"]): string {
  switch (status) {
    case "pass":
      return kleur.bold().green("PASS");
    case "warn":
      return kleur.bold().yellow("WARN");
    case "fail":
      return kleur.bold().red("FAIL");
    case "skipped":
      return kleur.dim("SKIP");
    case "error":
      return kleur.bold().magenta("ERR ");
    default:
      return "INFO";
  }
}
