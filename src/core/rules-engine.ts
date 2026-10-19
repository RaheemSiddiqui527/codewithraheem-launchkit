import type { CheckCategory, CheckContext, CheckRule, Finding } from "../types/index.js";
import { checkPackageManifest } from "../checks/package.js";
import { checkScripts } from "../checks/scripts.js";
import { checkTypeScript } from "../checks/typescript.js";
import { checkTests } from "../checks/tests.js";
import { checkEnvironment } from "../checks/environment.js";
import { checkGit } from "../checks/git.js";
import { checkCi } from "../checks/ci.js";
import { checkDependencies } from "../checks/dependencies.js";
import { checkBuild } from "../checks/build.js";
import { LaunchKitError } from "../utils/errors.js";

export const ALL_CHECK_CATEGORIES: CheckCategory[] = [
  "package",
  "scripts",
  "typescript",
  "tests",
  "environment",
  "git",
  "ci",
  "dependencies",
  "build",
];

export const REGISTERED_RULES: CheckRule[] = [
  {
    id: "rule-package",
    category: "package",
    name: "Package Manifest & Lockfile",
    description: "Audits package.json structure, naming, semver, lockfiles, and metadata.",
    defaultWeight: 10,
    run: checkPackageManifest,
  },
  {
    id: "rule-scripts",
    category: "scripts",
    name: "Scripts Configuration",
    description: "Audits build, test, lint, and typecheck scripts.",
    defaultWeight: 10,
    run: checkScripts,
  },
  {
    id: "rule-typescript",
    category: "typescript",
    name: "TypeScript Configuration",
    description: "Audits tsconfig.json presence, validity, strictness, and options.",
    defaultWeight: 10,
    run: checkTypeScript,
  },
  {
    id: "rule-tests",
    category: "tests",
    name: "Test Readiness",
    description: "Detects testing frameworks, test suites, and test configuration.",
    defaultWeight: 10,
    run: checkTests,
  },
  {
    id: "rule-environment",
    category: "environment",
    name: "Environment & Secret Safety",
    description: "Audits .env templates, gitignore coverage, and secret leak exposure.",
    defaultWeight: 10,
    run: checkEnvironment,
  },
  {
    id: "rule-git",
    category: "git",
    name: "Git & .gitignore",
    description: "Audits Git repository state and .gitignore exclusions.",
    defaultWeight: 10,
    run: checkGit,
  },
  {
    id: "rule-ci",
    category: "ci",
    name: "CI/CD Readiness",
    description: "Audits continuous integration workflows and automated verification.",
    defaultWeight: 10,
    run: checkCi,
  },
  {
    id: "rule-dependencies",
    category: "dependencies",
    name: "Dependencies",
    description: "Audits dependency declarations and framework version alignment.",
    defaultWeight: 10,
    run: checkDependencies,
  },
  {
    id: "rule-build",
    category: "build",
    name: "Build Readiness",
    description: "Audits build scripts statically or executes them under opt-in flag.",
    defaultWeight: 10,
    run: checkBuild,
  },
];

export function parseRequestedCategories(checksFilter?: string): CheckCategory[] {
  if (!checksFilter || !checksFilter.trim()) {
    return [...ALL_CHECK_CATEGORIES];
  }

  const requested = checksFilter
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter((c) => c.length > 0);

  const matchedCategories: CheckCategory[] = [];
  const invalidNames: string[] = [];

  for (const name of requested) {
    if (ALL_CHECK_CATEGORIES.includes(name as CheckCategory)) {
      matchedCategories.push(name as CheckCategory);
    } else {
      invalidNames.push(name);
    }
  }

  if (invalidNames.length > 0) {
    throw new LaunchKitError(
      `Unknown check category: "${invalidNames.join('", "')}". Available checks: ${ALL_CHECK_CATEGORIES.join(", ")}`,
      2,
      "ERR_INVALID_CHECKS",
    );
  }

  return matchedCategories;
}

export async function runRulesEngine(context: CheckContext): Promise<Finding[]> {
  const activeCategories = parseRequestedCategories(context.options.checks);
  const selectedRules = REGISTERED_RULES.filter((rule) => activeCategories.includes(rule.category));

  const allFindings: Finding[] = [];

  for (const rule of selectedRules) {
    try {
      const result = await rule.run(context);
      if (result) {
        if (Array.isArray(result)) {
          allFindings.push(...result);
        } else {
          allFindings.push(result);
        }
      }
    } catch (err: unknown) {
      // Isolate check failure so entire audit doesn't crash unexpectedly
      allFindings.push({
        id: `${rule.id}-execution-error`,
        category: rule.category,
        status: "error",
        title: `Error running ${rule.name}`,
        explanation: "An unexpected error occurred while executing this check rule.",
        evidence: err instanceof Error ? err.message : String(err),
        affectedFiles: [],
        remediation: "Check permissions and verify project files are accessible.",
        weight: rule.defaultWeight,
      });
    }
  }

  return allFindings;
}
