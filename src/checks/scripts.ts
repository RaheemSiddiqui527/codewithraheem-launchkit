import type { CheckContext, Finding } from "../types/index.js";

const DEFAULT_NPM_TEST_PLACEHOLDER = 'echo "Error: no test specified" && exit 1';

const FRAMEWORKS_REQUIRING_BUILD = new Set([
  "nextjs",
  "vite",
  "nestjs",
  "angular",
  "svelte",
  "vue",
  "expo",
  "react-native",
]);

export async function checkScripts(context: CheckContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { projectInfo } = context;

  if (!projectInfo.packageJsonExists || !projectInfo.packageJsonValid) {
    findings.push({
      id: "scripts-manifest-missing",
      category: "scripts",
      status: "skipped",
      title: "Scripts check skipped (missing or invalid package.json)",
      explanation: "Scripts cannot be inspected without a valid package.json file.",
      evidence: "package.json missing or invalid.",
      affectedFiles: ["package.json"],
      remediation: "Create or fix package.json first.",
      weight: 0,
    });
    return findings;
  }

  const scripts = projectInfo.scripts;

  // 1. Check for malformed or empty scripts
  const emptyScripts: string[] = [];
  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command !== "string" || !command.trim()) {
      emptyScripts.push(name);
    }
  }

  if (emptyScripts.length > 0) {
    findings.push({
      id: "scripts-malformed",
      category: "scripts",
      status: "fail",
      title: "Malformed or empty script definitions detected",
      explanation:
        "Script entries with empty commands will fail when invoked by developers or CI pipelines.",
      evidence: `Empty scripts: ${emptyScripts.join(", ")}`,
      affectedFiles: ["package.json"],
      remediation: "Provide valid shell commands or remove empty script keys from package.json.",
      weight: 10,
    });
  }

  // 2. Build script audit
  const hasBuildScript = Boolean(scripts.build && scripts.build.trim());
  const frameworkRequiresBuild = FRAMEWORKS_REQUIRING_BUILD.has(projectInfo.framework);

  if (!hasBuildScript) {
    if (frameworkRequiresBuild) {
      findings.push({
        id: "scripts-build-configured",
        category: "scripts",
        status: "fail",
        title: "Build script is missing for compiled/bundled framework",
        explanation: `${projectInfo.frameworkDetails ?? projectInfo.framework} projects require a build step to generate production bundles and assets.`,
        evidence: `Framework detected as "${projectInfo.framework}", but no "build" script was found in package.json.`,
        affectedFiles: ["package.json"],
        remediation:
          'Add an appropriate "build" script to package.json (e.g. "build": "next build", "build": "vite build", or "build": "nest build").',
        weight: 15,
      });
    } else {
      findings.push({
        id: "scripts-build-configured",
        category: "scripts",
        status: "warn",
        title: "No build script configured",
        explanation:
          "Projects preparing for release or deployment typically define a 'build' script to verify compilation or bundle assets.",
        evidence: 'No "build" script found in package.json.',
        affectedFiles: ["package.json"],
        remediation:
          'Add a "build" script to package.json if the project requires compilation or bundling.',
        weight: 8,
      });
    }
  } else {
    findings.push({
      id: "scripts-build-configured",
      category: "scripts",
      status: "pass",
      title: "Build script is configured",
      explanation: "A build script is available to produce release artifacts.",
      evidence: `scripts.build: "${scripts.build}"`,
      affectedFiles: ["package.json"],
      remediation: "",
      weight: 10,
    });
  }

  // 3. Test script audit
  const testScript = scripts.test ? scripts.test.trim() : "";
  const isDefaultNpmTest =
    testScript.includes(DEFAULT_NPM_TEST_PLACEHOLDER) ||
    testScript.includes("Error: no test specified") ||
    testScript === "exit 1";

  if (!testScript) {
    findings.push({
      id: "scripts-test-configured",
      category: "scripts",
      status: "warn",
      title: "Test script is not configured",
      explanation: "Automated test execution prevents regressions before releasing new versions.",
      evidence: 'No "test" script found in package.json.',
      affectedFiles: ["package.json"],
      remediation:
        'Configure a test runner in package.json (e.g. "test": "vitest run" or "test": "jest").',
      weight: 10,
    });
  } else if (isDefaultNpmTest) {
    findings.push({
      id: "scripts-test-configured",
      category: "scripts",
      status: "fail",
      title: "Test script is unconfigured default placeholder",
      explanation:
        "The default npm placeholder script ('Error: no test specified') exits with an error code and will cause CI builds to fail.",
      evidence: `scripts.test: "${testScript}"`,
      affectedFiles: ["package.json"],
      remediation:
        'Replace the placeholder test script with a real test framework command (e.g. "vitest run", "jest", or "node --test").',
      weight: 12,
    });
  } else {
    findings.push({
      id: "scripts-test-configured",
      category: "scripts",
      status: "pass",
      title: "Test script is configured",
      explanation: "A command is defined to execute the automated test suite.",
      evidence: `scripts.test: "${testScript}"`,
      affectedFiles: ["package.json"],
      remediation: "",
      weight: 10,
    });
  }

  // 4. Lint script audit
  const hasLintScript = Boolean(scripts.lint && scripts.lint.trim());
  if (!hasLintScript) {
    findings.push({
      id: "scripts-lint-configured",
      category: "scripts",
      status: "warn",
      title: "No lint script configured",
      explanation:
        "Linting enforces code quality, catches potential bugs, and maintains consistent style standards across teams.",
      evidence: 'No "lint" script found in package.json.',
      affectedFiles: ["package.json"],
      remediation: 'Configure a linter script in package.json (e.g. "lint": "eslint .").',
      weight: 8,
    });
  } else {
    findings.push({
      id: "scripts-lint-configured",
      category: "scripts",
      status: "pass",
      title: "Lint script is configured",
      explanation: "A lint command is available to maintain code quality.",
      evidence: `scripts.lint: "${scripts.lint}"`,
      affectedFiles: ["package.json"],
      remediation: "",
      weight: 8,
    });
  }

  // 5. Typecheck script audit (TypeScript projects only)
  if (projectInfo.language === "typescript") {
    const hasTypecheckScript = Boolean(
      (scripts.typecheck && scripts.typecheck.trim()) ||
      (scripts["type-check"] && scripts["type-check"].trim()) ||
      Object.values(scripts).some((cmd) => cmd.includes("tsc --noEmit") || cmd.includes("tsc -p")),
    );

    if (!hasTypecheckScript) {
      findings.push({
        id: "scripts-typecheck-configured",
        category: "scripts",
        status: "warn",
        title: "No dedicated typecheck script configured",
        explanation:
          "A dedicated typecheck script (e.g. 'tsc --noEmit') enables fast, isolated type validation in CI without generating output files.",
        evidence: 'No "typecheck" script found in package.json.',
        affectedFiles: ["package.json"],
        remediation: 'Add a typecheck script to package.json: "typecheck": "tsc --noEmit".',
        weight: 8,
      });
    } else {
      findings.push({
        id: "scripts-typecheck-configured",
        category: "scripts",
        status: "pass",
        title: "Typecheck script is configured",
        explanation: "TypeScript validation can be executed independently.",
        evidence: `Found typecheck script in package.json.`,
        affectedFiles: ["package.json"],
        remediation: "",
        weight: 8,
      });
    }
  } else {
    findings.push({
      id: "scripts-typecheck-configured",
      category: "scripts",
      status: "skipped",
      title: "Typecheck script check skipped (non-TypeScript project)",
      explanation: "Non-TypeScript projects do not require a compiler type checking script.",
      evidence: "Project language is JavaScript/unknown.",
      affectedFiles: [],
      remediation: "",
      weight: 0,
    });
  }

  return findings;
}
