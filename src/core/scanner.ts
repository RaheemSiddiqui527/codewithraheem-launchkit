import type { AuditReport, CliOptions } from "../types/index.js";
import { resolveProjectRoot } from "../utils/paths.js";
import { SafeProjectFs } from "../utils/filesystem.js";
import { detectProject } from "./detector.js";
import { runRulesEngine } from "./rules-engine.js";
import { calculateReadinessScore } from "./scoring.js";

export const TOOL_VERSION = "0.1.0";
export const TOOL_NAME = "LaunchKit";
export const TOOL_BRAND = "CodeWithRaheem";
export const TOOL_TAGLINE = "Inspect. Improve. Launch.";
export const AUDIT_DISCLAIMER =
  "LaunchKit performs heuristic static audits to identify common release readiness gaps. " +
  "A high readiness score is not a guarantee of security, bug-free runtime behavior, or complete production readiness.";

export async function scanProject(options: CliOptions = {}): Promise<AuditReport> {
  const startTime = Date.now();

  // Resolve target directory safely
  const { absolutePath, displayPath } = await resolveProjectRoot(options.projectPath);

  // Initialize safe filesystem reader
  const fs = new SafeProjectFs(absolutePath);

  // Detect project properties
  const projectInfo = await detectProject(absolutePath, fs);

  // Run rules engine
  const findings = await runRulesEngine({
    projectRoot: absolutePath,
    projectInfo,
    options,
    fs,
  });

  // Calculate deterministic score
  const { summary, recommendations } = calculateReadinessScore(findings);

  const durationMs = Date.now() - startTime;

  return {
    schemaVersion: "1.0.0",
    tool: {
      name: TOOL_NAME,
      version: TOOL_VERSION,
      brand: TOOL_BRAND,
      tagline: TOOL_TAGLINE,
    },
    project: {
      path: absolutePath,
      displayPath,
      name: projectInfo.name,
      version: projectInfo.version,
      framework: projectInfo.framework,
      frameworkDetails: projectInfo.frameworkDetails,
      language: projectInfo.language,
      packageManager: projectInfo.packageManager,
      lockfiles: projectInfo.lockfilesFound,
      isMonorepo: projectInfo.isMonorepo,
      hasGit: projectInfo.hasGit,
    },
    summary,
    findings,
    recommendations,
    scanDurationMs: durationMs,
    scannedAt: new Date().toISOString(),
    disclaimer: AUDIT_DISCLAIMER,
  };
}
