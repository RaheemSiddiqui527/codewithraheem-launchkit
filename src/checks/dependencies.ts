import type { CheckContext, Finding } from "../types/index.js";

export async function checkDependencies(context: CheckContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { projectInfo } = context;

  if (!projectInfo.packageJsonExists || !projectInfo.packageJsonValid) {
    findings.push({
      id: "deps-sanity",
      category: "dependencies",
      status: "skipped",
      title: "Dependency audit skipped (missing or invalid package.json)",
      explanation: "Cannot audit dependencies without a valid package.json.",
      evidence: "package.json missing or invalid.",
      affectedFiles: [],
      remediation: "",
      weight: 0,
    });
    return findings;
  }

  const { dependencies, devDependencies } = projectInfo;
  const malformedDeps: string[] = [];

  for (const [depName, versionSpec] of Object.entries({ ...dependencies, ...devDependencies })) {
    if (!depName.trim() || typeof versionSpec !== "string" || !versionSpec.trim()) {
      malformedDeps.push(depName || "(unnamed)");
    }
  }

  if (malformedDeps.length > 0) {
    findings.push({
      id: "deps-manifest-sanity",
      category: "dependencies",
      status: "fail",
      title: "Malformed dependency declarations detected",
      explanation:
        "Dependencies with empty names or missing version constraints cause package managers to fail during installation.",
      evidence: `Malformed entries: ${malformedDeps.join(", ")}`,
      affectedFiles: ["package.json"],
      remediation: "Correct or remove invalid dependency declarations in package.json.",
      weight: 12,
    });
  } else {
    const totalCount = Object.keys(dependencies).length + Object.keys(devDependencies).length;
    findings.push({
      id: "deps-manifest-sanity",
      category: "dependencies",
      status: "pass",
      title: "Dependency declarations are well-formed",
      explanation: "All declared dependencies specify valid names and version ranges.",
      evidence: `${totalCount} dependencies declared across dependencies and devDependencies.`,
      affectedFiles: ["package.json"],
      remediation: "",
      weight: 8,
    });
  }

  // React and React DOM version alignment check
  if (dependencies.react || devDependencies.react) {
    const reactVer = dependencies.react ?? devDependencies.react ?? "";
    const reactDomVer = dependencies["react-dom"] ?? devDependencies["react-dom"] ?? "";

    if (!reactDomVer && (projectInfo.framework === "react" || projectInfo.framework === "nextjs")) {
      findings.push({
        id: "deps-react-alignment",
        category: "dependencies",
        status: "warn",
        title: "react-dom is missing in React web project",
        explanation: "React web applications require react-dom for rendering to the DOM.",
        evidence: `react (${reactVer}) is declared, but react-dom is not listed in dependencies.`,
        affectedFiles: ["package.json"],
        remediation: "Install matching react-dom: `npm install react-dom`.",
        weight: 6,
      });
    } else if (reactVer && reactDomVer) {
      // Check major version parity
      const getMajor = (v: string) => v.replace(/^[^0-9]*/, "").split(".")[0];
      const reactMajor = getMajor(reactVer);
      const reactDomMajor = getMajor(reactDomVer);

      if (reactMajor && reactDomMajor && reactMajor !== reactDomMajor) {
        findings.push({
          id: "deps-react-alignment",
          category: "dependencies",
          status: "warn",
          title: "Mismatched major versions between react and react-dom",
          explanation:
            "Using different major versions of react and react-dom causes unexpected runtime errors.",
          evidence: `react is ${reactVer}, while react-dom is ${reactDomVer}.`,
          affectedFiles: ["package.json"],
          remediation: `Align react and react-dom to the same version (e.g. ^${reactMajor}).`,
          weight: 8,
        });
      } else {
        findings.push({
          id: "deps-react-alignment",
          category: "dependencies",
          status: "pass",
          title: "React and React DOM versions are aligned",
          explanation: "react and react-dom share compatible major versions.",
          evidence: `react: ${reactVer}, react-dom: ${reactDomVer}`,
          affectedFiles: ["package.json"],
          remediation: "",
          weight: 6,
        });
      }
    }
  }

  return findings;
}
