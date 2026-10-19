import type { CheckContext, Finding } from "../types/index.js";

export async function checkCi(context: CheckContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { fs } = context;

  // 1. Detect CI configuration files
  const ciFilesFound: string[] = [];

  // GitHub Actions
  const allFiles = await fs.listFiles(".github", 3);
  const ghWorkflows = allFiles.filter(
    (f) => f.startsWith(".github/workflows/") && (f.endsWith(".yml") || f.endsWith(".yaml")),
  );
  ciFilesFound.push(...ghWorkflows);

  // GitLab CI
  if (await fs.exists(".gitlab-ci.yml")) ciFilesFound.push(".gitlab-ci.yml");

  // CircleCI
  if (await fs.exists(".circleci/config.yml")) ciFilesFound.push(".circleci/config.yml");

  // Azure Pipelines
  if (await fs.exists("azure-pipelines.yml")) ciFilesFound.push("azure-pipelines.yml");

  // Bitbucket Pipelines
  if (await fs.exists("bitbucket-pipelines.yml")) ciFilesFound.push("bitbucket-pipelines.yml");

  if (ciFilesFound.length === 0) {
    findings.push({
      id: "ci-workflow-configured",
      category: "ci",
      status: "warn",
      title: "No continuous integration (CI) workflow detected",
      explanation:
        "A CI pipeline automatically runs tests, linting, and builds on pull requests to ensure code stability before release.",
      evidence: "No workflows found in .github/workflows or other common CI configuration files.",
      affectedFiles: [],
      remediation:
        "Configure a CI pipeline (e.g. GitHub Actions in `.github/workflows/ci.yml`) to automate testing and verification.",
      weight: 10,
    });
  } else {
    findings.push({
      id: "ci-workflow-configured",
      category: "ci",
      status: "pass",
      title: "Continuous integration (CI) pipeline configured",
      explanation: "Automated workflows are set up to validate changes.",
      evidence: `Detected CI configurations: ${ciFilesFound.join(", ")}`,
      affectedFiles: ciFilesFound,
      remediation: "",
      weight: 10,
    });

    // Check if workflows contain test/build steps
    let hasTestOrBuildStep = false;
    for (const workflowFile of ciFilesFound) {
      const content = await fs.readFile(workflowFile);
      if (
        content &&
        (content.includes("test") || content.includes("build") || content.includes("check"))
      ) {
        hasTestOrBuildStep = true;
        break;
      }
    }

    if (hasTestOrBuildStep) {
      findings.push({
        id: "ci-validation-steps",
        category: "ci",
        status: "pass",
        title: "CI workflow includes testing or build verification steps",
        explanation: "Automated pipeline validates builds or tests on trigger events.",
        evidence: "Found test or build references in workflow files.",
        affectedFiles: ciFilesFound,
        remediation: "",
        weight: 8,
      });
    } else {
      findings.push({
        id: "ci-validation-steps",
        category: "ci",
        status: "warn",
        title: "CI workflows do not appear to run test or build commands",
        explanation:
          "Workflows should include steps executing project test suites and build scripts.",
        evidence:
          "No direct reference to test, build, or check scripts found in workflow definitions.",
        affectedFiles: ciFilesFound,
        remediation: "Add steps to run `npm test` and `npm run build` in your CI workflow.",
        weight: 5,
      });
    }
  }

  return findings;
}
