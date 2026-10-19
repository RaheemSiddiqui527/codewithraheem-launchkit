import type { CheckContext, Finding } from "../types/index.js";

const VALID_PACKAGE_NAME_REGEX = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export async function checkPackageManifest(context: CheckContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { projectInfo } = context;

  // 1. Check if package.json exists
  if (!projectInfo.packageJsonExists) {
    findings.push({
      id: "pkg-manifest-present",
      category: "package",
      status: "fail",
      title: "Package manifest (package.json) is missing",
      explanation:
        "A package.json file is required for Node.js and modern JavaScript/TypeScript projects to define metadata, scripts, and dependencies.",
      evidence: "File package.json was not found in the project root.",
      affectedFiles: ["package.json"],
      remediation:
        "Initialize a package manifest by running `npm init -y` (or `pnpm init`, `yarn init`, `bun init`).",
      weight: 15,
    });
    return findings;
  }

  findings.push({
    id: "pkg-manifest-present",
    category: "package",
    status: "pass",
    title: "Package manifest is present",
    explanation: "package.json is found in the project root.",
    evidence: "Found package.json file.",
    affectedFiles: ["package.json"],
    remediation: "",
    weight: 10,
  });

  // 2. Check if package.json is valid JSON
  if (!projectInfo.packageJsonValid || !projectInfo.packageJson) {
    findings.push({
      id: "pkg-manifest-valid",
      category: "package",
      status: "fail",
      title: "Package manifest contains malformed JSON",
      explanation:
        "The package.json file could not be parsed as valid JSON. Node.js tooling and package managers will fail to execute.",
      evidence: "JSON.parse failed while reading package.json.",
      affectedFiles: ["package.json"],
      remediation:
        "Inspect package.json for syntax errors such as trailing commas, unquoted keys, or unescaped characters.",
      weight: 15,
    });
    return findings;
  }

  findings.push({
    id: "pkg-manifest-valid",
    category: "package",
    status: "pass",
    title: "Package manifest is valid JSON",
    explanation: "package.json was successfully parsed without syntax errors.",
    evidence: "package.json conforms to valid JSON format.",
    affectedFiles: ["package.json"],
    remediation: "",
    weight: 10,
  });

  const pkg = projectInfo.packageJson;

  // 3. Package name validation
  if (typeof pkg.name !== "string" || !pkg.name.trim()) {
    findings.push({
      id: "pkg-name-valid",
      category: "package",
      status: "warn",
      title: "Package name is missing",
      explanation:
        "A package name clarifies project identity and is required for publishing or workspace linking.",
      evidence: "Field 'name' is missing or empty in package.json.",
      affectedFiles: ["package.json"],
      remediation:
        'Add a descriptive, lowercase \'name\' field to package.json (e.g., "name": "my-app").',
      weight: 5,
    });
  } else {
    const pkgName = pkg.name.trim();
    if (pkgName.length > 214 || !VALID_PACKAGE_NAME_REGEX.test(pkgName)) {
      findings.push({
        id: "pkg-name-valid",
        category: "package",
        status: "fail",
        title: "Package name violates npm naming conventions",
        explanation:
          "Package names must be lowercase, URL-safe, under 214 characters, and may not contain spaces or special symbols.",
        evidence: `Configured name "${pkgName}" is not a valid npm package identifier.`,
        affectedFiles: ["package.json"],
        remediation:
          "Update the 'name' field in package.json to contain only lowercase letters, numbers, hyphens, and optional scope (e.g. \"@scope/name\").",
        weight: 10,
      });
    } else {
      findings.push({
        id: "pkg-name-valid",
        category: "package",
        status: "pass",
        title: `Package name "${pkgName}" is valid`,
        explanation: "The package name adheres to npm naming conventions.",
        evidence: `name: "${pkgName}"`,
        affectedFiles: ["package.json"],
        remediation: "",
        weight: 5,
      });
    }
  }

  // 4. Package version validation
  if (typeof pkg.version !== "string" || !pkg.version.trim()) {
    findings.push({
      id: "pkg-version-valid",
      category: "package",
      status: "warn",
      title: "Package version is missing",
      explanation:
        "A semantic version enables release management, dependency resolution, and tracking changes.",
      evidence: "Field 'version' is missing or empty in package.json.",
      affectedFiles: ["package.json"],
      remediation: 'Add a \'version\' field using semantic versioning, such as "version": "0.1.0".',
      weight: 5,
    });
  } else {
    const versionStr = pkg.version.trim();
    if (!SEMVER_REGEX.test(versionStr)) {
      findings.push({
        id: "pkg-version-valid",
        category: "package",
        status: "warn",
        title: "Package version is not strict semver",
        explanation:
          "Standard semantic versioning (MAJOR.MINOR.PATCH) is recommended for predictable releases.",
        evidence: `Configured version "${versionStr}" does not match strict semver format.`,
        affectedFiles: ["package.json"],
        remediation: 'Use standard semver format like "1.0.0" or "0.1.0-alpha.1".',
        weight: 5,
      });
    } else {
      findings.push({
        id: "pkg-version-valid",
        category: "package",
        status: "pass",
        title: `Package version "${versionStr}" is valid semver`,
        explanation: "The package version adheres to semantic versioning specifications.",
        evidence: `version: "${versionStr}"`,
        affectedFiles: ["package.json"],
        remediation: "",
        weight: 5,
      });
    }
  }

  // 5. Node engines field
  const engines = pkg.engines as Record<string, unknown> | undefined;
  if (!engines || typeof engines.node !== "string" || !engines.node.trim()) {
    findings.push({
      id: "pkg-engines-node",
      category: "package",
      status: "warn",
      title: "Node.js engine requirement is not specified",
      explanation:
        "Declaring 'engines.node' prevents developers and deployment environments from running the project with incompatible Node.js versions.",
      evidence: "Field 'engines.node' is not defined in package.json.",
      affectedFiles: ["package.json"],
      remediation:
        'Add an "engines" field to package.json, for example: "engines": { "node": ">=18.0.0" }.',
      weight: 5,
    });
  } else {
    findings.push({
      id: "pkg-engines-node",
      category: "package",
      status: "pass",
      title: `Node.js engine target specified (${engines.node})`,
      explanation: "The project explicitly documents its supported Node.js runtime version.",
      evidence: `engines.node: "${engines.node}"`,
      affectedFiles: ["package.json"],
      remediation: "",
      weight: 5,
    });
  }

  // 6. Lockfile audit
  if (projectInfo.hasMultipleLockfiles) {
    findings.push({
      id: "pkg-multiple-lockfiles",
      category: "package",
      status: "fail",
      title: "Multiple conflicting package manager lockfiles detected",
      explanation:
        "Multiple lockfiles (e.g., package-lock.json and yarn.lock) cause non-deterministic installs across team members and CI/CD runners.",
      evidence: `Found ${projectInfo.lockfilesFound.length} lockfiles: ${projectInfo.lockfilesFound.join(", ")}`,
      affectedFiles: projectInfo.lockfilesFound,
      remediation: `Standardize on one package manager and delete redundant lockfiles (e.g. keep ${projectInfo.packageManager} and remove others).`,
      weight: 10,
    });
  } else if (projectInfo.lockfilesFound.length === 0) {
    findings.push({
      id: "pkg-missing-lockfile",
      category: "package",
      status: "warn",
      title: "No package manager lockfile detected",
      explanation:
        "A lockfile pins exact dependency versions for reproducible builds across machines and CI environments.",
      evidence: "No package-lock.json, pnpm-lock.yaml, yarn.lock, or bun.lock found.",
      affectedFiles: [],
      remediation: `Run \`${projectInfo.packageManager || "npm"} install\` to generate a lockfile and commit it to version control.`,
      weight: 8,
    });
  } else {
    findings.push({
      id: "pkg-lockfile-present",
      category: "package",
      status: "pass",
      title: `Deterministic lockfile present (${projectInfo.lockfilesFound[0]})`,
      explanation: "A single package manager lockfile ensures reproducible builds.",
      evidence: `Detected lockfile: ${projectInfo.lockfilesFound[0]}`,
      affectedFiles: projectInfo.lockfilesFound,
      remediation: "",
      weight: 8,
    });
  }

  // 7. Publishing / Open Source Metadata
  const isPrivate = pkg.private === true;
  const hasDescription = typeof pkg.description === "string" && pkg.description.trim().length > 0;
  const hasLicense = typeof pkg.license === "string" && pkg.license.trim().length > 0;

  if (!isPrivate && (!hasDescription || !hasLicense)) {
    const missing: string[] = [];
    if (!hasDescription) missing.push("description");
    if (!hasLicense) missing.push("license");

    findings.push({
      id: "pkg-metadata-publishing",
      category: "package",
      status: "warn",
      title: "Package metadata fields missing for open-source / publishing readiness",
      explanation:
        "Non-private packages benefit from standard metadata including description and license for cataloging and legal clarity.",
      evidence: `Missing fields in package.json: ${missing.join(", ")}`,
      affectedFiles: ["package.json"],
      remediation: `Add the missing metadata fields (${missing.join(", ")}) to package.json, or mark the package as private: { "private": true }.`,
      weight: 5,
    });
  } else {
    findings.push({
      id: "pkg-metadata-publishing",
      category: "package",
      status: "pass",
      title: isPrivate ? "Private package metadata configured" : "Publishing metadata configured",
      explanation: isPrivate
        ? "Package is marked private: true to prevent accidental publishing."
        : "Package includes description and license.",
      evidence: isPrivate
        ? "private: true"
        : `license: "${String(pkg.license)}", description provided`,
      affectedFiles: ["package.json"],
      remediation: "",
      weight: 5,
    });
  }

  return findings;
}
