import type { CheckContext, Finding } from "../types/index.js";
import { detectSecretsSafely } from "../utils/secrets.js";

const ENV_TEMPLATES = [".env.example", ".env.sample", ".env.template", "env.example", ".env.dist"];

const DANGEROUS_SECRET_EXTENSIONS = [".pem", ".key", ".p12", ".pfx", "id_rsa", "id_ed25519"];

export async function checkEnvironment(context: CheckContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { fs } = context;

  // 1. Check for .env.example template
  let foundTemplate: string | null = null;
  for (const templateName of ENV_TEMPLATES) {
    if (await fs.exists(templateName)) {
      foundTemplate = templateName;
      break;
    }
  }

  // Also check if any .env file is present or mentioned in README
  const hasEnvFile = (await fs.exists(".env")) || (await fs.exists(".env.local"));

  if (foundTemplate) {
    findings.push({
      id: "env-template-present",
      category: "environment",
      status: "pass",
      title: `Environment variable template found (${foundTemplate})`,
      explanation:
        "Documenting required environment variables with an example template guides developers and CI setup.",
      evidence: `Found ${foundTemplate} in project root.`,
      affectedFiles: [foundTemplate],
      remediation: "",
      weight: 8,
    });
  } else if (hasEnvFile) {
    findings.push({
      id: "env-template-present",
      category: "environment",
      status: "warn",
      title: "No environment template (.env.example) found while .env exists",
      explanation:
        "A local .env file exists, but no .env.example template is provided for team members or CI environments.",
      evidence: "Found .env file without corresponding .env.example template.",
      affectedFiles: [".env"],
      remediation:
        "Create a .env.example file listing the required environment variable keys with dummy/placeholder values.",
      weight: 8,
    });
  } else {
    // If no .env exists, just an advisory recommendation
    findings.push({
      id: "env-template-present",
      category: "environment",
      status: "pass",
      title: "No untracked environment requirements detected",
      explanation:
        "No local .env files found. If your project uses environment variables, provide a .env.example template.",
      evidence: "No active .env file requiring documentation.",
      affectedFiles: [],
      remediation: "",
      weight: 5,
    });
  }

  // 2. Check if .env files are covered by .gitignore
  const envIgnored = await fs.isGitIgnored(".env");
  const envLocalIgnored = await fs.isGitIgnored(".env.local");

  if (hasEnvFile && (!envIgnored || !envLocalIgnored)) {
    const unignored: string[] = [];
    if ((await fs.exists(".env")) && !envIgnored) unignored.push(".env");
    if ((await fs.exists(".env.local")) && !envLocalIgnored) unignored.push(".env.local");

    if (unignored.length > 0) {
      findings.push({
        id: "env-gitignore-coverage",
        category: "environment",
        status: "fail",
        title: "Environment files (.env) are not ignored by .gitignore",
        explanation:
          "Unignored .env files pose an immediate risk of accidental credential exposure when pushed to remote git repositories.",
        evidence: `Unignored environment file(s): ${unignored.join(", ")}`,
        affectedFiles: unignored,
        remediation:
          "Add `.env` and `.env*.local` to `.gitignore` immediately to prevent committing secret keys.",
        weight: 15,
      });
    }
  } else {
    const hasGitIgnore = await fs.exists(".gitignore");
    if (hasGitIgnore && envIgnored) {
      findings.push({
        id: "env-gitignore-coverage",
        category: "environment",
        status: "pass",
        title: "Environment files (.env) are safely ignored in .gitignore",
        explanation: ".gitignore rules prevent committing local environment files.",
        evidence: ".gitignore includes rules covering .env files.",
        affectedFiles: [".gitignore"],
        remediation: "",
        weight: 10,
      });
    }
  }

  // 3. Scan for accidental secret keys / certificate files in project tree
  const allFiles = await fs.listFiles(".", 3);
  const secretFilesFound: string[] = [];

  for (const filePath of allFiles) {
    const lower = filePath.toLowerCase();
    for (const secretExt of DANGEROUS_SECRET_EXTENSIONS) {
      if (lower.endsWith(secretExt) || lower.includes(`/${secretExt}`)) {
        const isIgnored = await fs.isGitIgnored(filePath);
        if (!isIgnored) {
          secretFilesFound.push(filePath);
        }
      }
    }
  }

  if (secretFilesFound.length > 0) {
    findings.push({
      id: "env-secret-files-risk",
      category: "environment",
      status: "fail",
      title: "Potential private key or credential files detected in workspace",
      explanation:
        "Sensitive cryptographic keys, private certificates, or SSH keys were found and are not ignored by git.",
      evidence: `Exposed sensitive file(s): ${secretFilesFound.join(", ")}`,
      affectedFiles: secretFilesFound,
      remediation:
        "Remove sensitive private keys from the project repository or add them to .gitignore.",
      weight: 15,
    });
  } else {
    findings.push({
      id: "env-secret-files-risk",
      category: "environment",
      status: "pass",
      title: "No exposed secret key or certificate files detected",
      explanation: "Workspace does not contain unignored private keys or certificates.",
      evidence: "Checked for common private key patterns (.pem, .key, id_rsa).",
      affectedFiles: [],
      remediation: "",
      weight: 10,
    });
  }

  // 4. Scan package.json and env template for hardcoded secrets
  // We NEVER print secrets! We strictly report redacted info.
  const filesToScan = [
    (await fs.exists("package.json")) ? "package.json" : null,
    foundTemplate,
  ].filter((f): f is string => Boolean(f));

  let hardcodedSecretFindingsCount = 0;
  const hardcodedAffectedFiles: string[] = [];

  for (const file of filesToScan) {
    const content = await fs.readFile(file);
    if (!content) continue;
    const secretMatches = detectSecretsSafely(content);
    if (secretMatches.length > 0) {
      hardcodedSecretFindingsCount += secretMatches.length;
      hardcodedAffectedFiles.push(file);
    }
  }

  if (hardcodedSecretFindingsCount > 0) {
    findings.push({
      id: "env-hardcoded-secrets",
      category: "environment",
      status: "fail",
      title: "Suspicious hardcoded credential pattern detected",
      explanation:
        "Potential API keys, tokens, or private credentials were found embedded in checked configuration files.",
      evidence: `Found ${hardcodedSecretFindingsCount} suspicious pattern(s) in: ${hardcodedAffectedFiles.join(", ")} (values redacted)`,
      affectedFiles: hardcodedAffectedFiles,
      remediation:
        "Replace hardcoded credentials with environment variables loaded dynamically at runtime.",
      weight: 15,
    });
  } else {
    findings.push({
      id: "env-hardcoded-secrets",
      category: "environment",
      status: "pass",
      title: "No hardcoded credentials detected in scanned manifests",
      explanation:
        "No suspicious API tokens or private keys were found in configuration manifests.",
      evidence: "Verified package.json and environment templates.",
      affectedFiles: filesToScan,
      remediation: "",
      weight: 10,
    });
  }

  return findings;
}
