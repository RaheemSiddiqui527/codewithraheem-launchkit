import type { CheckContext, Finding } from "../types/index.js";

const TEST_FRAMEWORK_DEPS: Array<{ name: string; key: string }> = [
  { name: "Vitest", key: "vitest" },
  { name: "Jest", key: "jest" },
  { name: "Playwright", key: "@playwright/test" },
  { name: "Cypress", key: "cypress" },
  { name: "Mocha", key: "mocha" },
  { name: "Ava", key: "ava" },
];

const TEST_CONFIG_FILES = [
  "vitest.config.ts",
  "vitest.config.js",
  "vitest.config.mjs",
  "jest.config.js",
  "jest.config.ts",
  "jest.config.json",
  "jest.config.mjs",
  "playwright.config.ts",
  "playwright.config.js",
  "cypress.config.ts",
  "cypress.config.js",
];

export async function checkTests(context: CheckContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { projectInfo, fs } = context;

  const allDeps = { ...projectInfo.dependencies, ...projectInfo.devDependencies };

  // 1. Detect test framework in dependencies
  const detectedFrameworks: string[] = [];
  for (const item of TEST_FRAMEWORK_DEPS) {
    if (allDeps[item.key]) {
      detectedFrameworks.push(item.name);
    }
  }

  // Check for node --test in test script
  const testScript = projectInfo.scripts.test ?? "";
  if (testScript.includes("node --test") || testScript.includes("node:test")) {
    detectedFrameworks.push("Node.js Test Runner");
  }

  // 2. Detect test config files
  const configsFound: string[] = [];
  for (const configFile of TEST_CONFIG_FILES) {
    if (await fs.exists(configFile)) {
      configsFound.push(configFile);
    }
  }

  // 3. Scan for test files
  const allFiles = await fs.listFiles(".", 4);
  const testFiles = allFiles.filter((filePath) => {
    const lower = filePath.toLowerCase();
    return lower.includes(".test.") || lower.includes(".spec.") || lower.includes("__tests__");
  });

  if (detectedFrameworks.length === 0 && configsFound.length === 0 && testFiles.length === 0) {
    findings.push({
      id: "tests-framework-detected",
      category: "tests",
      status: "warn",
      title: "No testing framework or test files detected",
      explanation:
        "Automated tests are essential for ensuring code reliability before releasing updates.",
      evidence: "No testing dependencies (Vitest, Jest, Playwright, Cypress) or test files found.",
      affectedFiles: [],
      remediation:
        "Install a test framework such as Vitest (`npm i -D vitest`) or Jest and add test suites.",
      weight: 12,
    });
  } else {
    const details = [
      detectedFrameworks.length > 0 ? `Framework: ${detectedFrameworks.join(", ")}` : null,
      configsFound.length > 0 ? `Configs: ${configsFound.join(", ")}` : null,
      testFiles.length > 0 ? `Test files: ${testFiles.length} file(s)` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    findings.push({
      id: "tests-framework-detected",
      category: "tests",
      status: "pass",
      title: "Testing framework and configuration detected",
      explanation: "The project has an automated testing setup configured.",
      evidence: details || "Test configuration detected.",
      affectedFiles: configsFound.concat(testFiles.slice(0, 3)),
      remediation: "",
      weight: 12,
    });
  }

  // 4. Test files existence check
  if (testFiles.length === 0) {
    findings.push({
      id: "tests-files-present",
      category: "tests",
      status: "warn",
      title: "No test files found in project repository",
      explanation:
        "A test framework may be configured, but no test suites (*.test.*, *.spec.*, or __tests__) were located.",
      evidence: "Zero test files matched in project directories.",
      affectedFiles: [],
      remediation:
        "Create test files (e.g. `tests/index.test.ts` or `src/__tests__/app.test.js`) to cover core logic.",
      weight: 10,
    });
  } else {
    findings.push({
      id: "tests-files-present",
      category: "tests",
      status: "pass",
      title: `${testFiles.length} test file(s) found`,
      explanation: "Test suites are present in the project tree.",
      evidence: `Sample test files: ${testFiles.slice(0, 3).join(", ")}${testFiles.length > 3 ? ` (+${testFiles.length - 3} more)` : ""}`,
      affectedFiles: testFiles.slice(0, 5),
      remediation: "",
      weight: 10,
    });
  }

  return findings;
}
