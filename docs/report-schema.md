# LaunchKit JSON Report Schema

Version: `1.0.0`

LaunchKit outputs machine-readable JSON reports when invoked with `--format json`.

## Schema Definition

```typescript
export interface LaunchKitJsonReport {
  /** Report schema specification version */
  schemaVersion: "1.0.0";

  /** Audit tool identification metadata */
  tool: {
    name: "LaunchKit";
    version: string;
    brand: "CodeWithRaheem";
  };

  /** Scanned project metadata */
  project: {
    path: string;
    name: string;
    version: string;
    framework:
      | "react"
      | "nextjs"
      | "vite"
      | "express"
      | "nestjs"
      | "vue"
      | "angular"
      | "svelte"
      | "react-native"
      | "expo"
      | "monorepo"
      | "unknown";
    language: "typescript" | "javascript" | "unknown";
    packageManager: "npm" | "pnpm" | "yarn" | "bun" | "unknown";
    isMonorepo: boolean;
    hasGit: boolean;
  };

  /** Summary and readiness scoring metrics */
  summary: {
    score: number; // 0 to 100
    passed: number;
    warnings: number;
    failed: number;
    skipped: number;
    errors: number;
    totalApplicableChecks: number;
    calculationExplanation: string;
  };

  /** Granular check findings */
  findings: Array<{
    id: string;
    category:
      | "package"
      | "scripts"
      | "typescript"
      | "tests"
      | "environment"
      | "git"
      | "ci"
      | "dependencies"
      | "build";
    status: "pass" | "warn" | "fail" | "skipped" | "error";
    title: string;
    explanation: string;
    evidence: string;
    affectedFiles: string[];
    remediation: string;
  }>;

  /** Prioritized list of actionable next steps */
  recommendations: string[];

  /** Duration of scan in milliseconds */
  scanDurationMs: number;

  /** Timestamp in ISO 8601 format */
  scannedAt: string;

  /** Legal and operational audit disclaimer */
  disclaimer: string;
}
```

## Example JSON Report

```json
{
  "schemaVersion": "1.0.0",
  "tool": {
    "name": "LaunchKit",
    "version": "0.1.0",
    "brand": "CodeWithRaheem"
  },
  "project": {
    "path": "./example-app",
    "name": "example-app",
    "version": "1.0.0",
    "framework": "nextjs",
    "language": "typescript",
    "packageManager": "npm",
    "isMonorepo": false,
    "hasGit": true
  },
  "summary": {
    "score": 82,
    "passed": 8,
    "warnings": 2,
    "failed": 1,
    "skipped": 3,
    "errors": 0,
    "totalApplicableChecks": 11,
    "calculationExplanation": "Score: 82/100 based on 11 applicable checks (8 passed, 2 warnings, 1 failed, 3 skipped, 0 errors). Weighted points earned: 85.0 / 105.0."
  },
  "findings": [
    {
      "id": "pkg-manifest-present",
      "category": "package",
      "status": "pass",
      "title": "Package manifest is present",
      "explanation": "package.json is found in the project root.",
      "evidence": "Found package.json file.",
      "affectedFiles": ["package.json"],
      "remediation": ""
    },
    {
      "id": "scripts-build-configured",
      "category": "scripts",
      "status": "fail",
      "title": "Build script is missing for compiled/bundled framework",
      "explanation": "Next.js projects require a build step to generate production bundles.",
      "evidence": "Framework detected as \"nextjs\", but no \"build\" script was found in package.json.",
      "affectedFiles": ["package.json"],
      "remediation": "Add an appropriate \"build\" script to package.json (e.g. \"build\": \"next build\")."
    }
  ],
  "recommendations": [
    "[Blocking] Add an appropriate \"build\" script to package.json (e.g. \"build\": \"next build\")."
  ],
  "scanDurationMs": 28,
  "scannedAt": "2026-10-17T06:00:00.000Z",
  "disclaimer": "LaunchKit performs heuristic static audits to identify common release readiness gaps. A high readiness score is not a guarantee of security, bug-free runtime behavior, or complete production readiness."
}
```
