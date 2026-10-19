import type { CheckContext, Finding } from "../types/index.js";

export async function checkGit(context: CheckContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { fs, projectInfo } = context;

  // 1. Git repository initialization
  if (projectInfo.hasGit) {
    findings.push({
      id: "git-repo-initialized",
      category: "git",
      status: "pass",
      title: "Git repository initialized",
      explanation: "Version control tracks revisions and enables collaboration.",
      evidence: "Found .git directory in project root.",
      affectedFiles: [".git"],
      remediation: "",
      weight: 10,
    });
  } else {
    findings.push({
      id: "git-repo-initialized",
      category: "git",
      status: "warn",
      title: "Git repository not detected",
      explanation:
        "Initializing a Git repository enables version tracking, release tagging, and CI/CD integration.",
      evidence: "No .git directory found in project root.",
      affectedFiles: [],
      remediation: "Initialize a git repository by running `git init`.",
      weight: 8,
    });
  }

  // 2. .gitignore file presence
  const hasGitIgnore = await fs.exists(".gitignore");
  if (!hasGitIgnore) {
    findings.push({
      id: "git-ignore-present",
      category: "git",
      status: "fail",
      title: ".gitignore file is missing",
      explanation:
        "Without a .gitignore file, generated files, dependencies (node_modules), and secret credentials will be accidentally committed.",
      evidence: "File .gitignore was not found.",
      affectedFiles: [],
      remediation: "Create a .gitignore file ignoring node_modules, build outputs, and .env files.",
      weight: 15,
    });
    return findings;
  }

  findings.push({
    id: "git-ignore-present",
    category: "git",
    status: "pass",
    title: ".gitignore file is present",
    explanation: "A .gitignore file manages files excluded from source control.",
    evidence: "Found .gitignore file.",
    affectedFiles: [".gitignore"],
    remediation: "",
    weight: 10,
  });

  // 3. Inspect .gitignore for node_modules
  const gitIgnoreContent = await fs.readFile(".gitignore");
  if (gitIgnoreContent && !gitIgnoreContent.includes("node_modules")) {
    findings.push({
      id: "git-ignore-node-modules",
      category: "git",
      status: "fail",
      title: ".gitignore does not exclude node_modules",
      explanation:
        "Committing the node_modules directory inflates repository size and causes platform incompatibility.",
      evidence: "Rule 'node_modules' is not present in .gitignore.",
      affectedFiles: [".gitignore"],
      remediation: "Add `node_modules/` to your .gitignore file.",
      weight: 12,
    });
  } else if (gitIgnoreContent) {
    findings.push({
      id: "git-ignore-node-modules",
      category: "git",
      status: "pass",
      title: "node_modules is excluded by .gitignore",
      explanation: "Dependencies are properly excluded from version control.",
      evidence: "Found node_modules rule in .gitignore.",
      affectedFiles: [".gitignore"],
      remediation: "",
      weight: 10,
    });
  }

  return findings;
}
