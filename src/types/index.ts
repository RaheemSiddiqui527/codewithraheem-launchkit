export type CheckStatus = "pass" | "warn" | "fail" | "skipped" | "error";

export type CheckCategory =
  | "package"
  | "scripts"
  | "typescript"
  | "tests"
  | "environment"
  | "git"
  | "ci"
  | "dependencies"
  | "build";

export type FrameworkType =
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

export type LanguageType = "typescript" | "javascript" | "unknown";

export type PackageManagerType = "npm" | "pnpm" | "yarn" | "bun" | "unknown";

export interface Finding {
  id: string;
  category: CheckCategory;
  status: CheckStatus;
  title: string;
  explanation: string;
  evidence: string;
  affectedFiles: string[];
  remediation: string;
  weight?: number;
}

export interface ProjectInfo {
  path: string;
  displayPath: string;
  name: string;
  version: string;
  isNodeProject: boolean;
  language: LanguageType;
  framework: FrameworkType;
  frameworkDetails?: string;
  packageManager: PackageManagerType;
  lockfilesFound: string[];
  hasMultipleLockfiles: boolean;
  isMonorepo: boolean;
  monorepoTool?: string;
  hasGit: boolean;
  packageJsonExists: boolean;
  packageJsonValid: boolean;
  packageJson?: Record<string, unknown>;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface ScoreSummary {
  score: number;
  passed: number;
  warnings: number;
  failed: number;
  skipped: number;
  errors: number;
  totalApplicableChecks: number;
  totalEvaluated: number;
  calculationExplanation: string;
}

export interface AuditReport {
  schemaVersion: "1.0.0";
  tool: {
    name: string;
    version: string;
    brand: string;
    tagline: string;
  };
  project: {
    path: string;
    displayPath: string;
    name: string;
    version: string;
    framework: FrameworkType;
    frameworkDetails?: string;
    language: LanguageType;
    packageManager: PackageManagerType;
    lockfiles: string[];
    isMonorepo: boolean;
    hasGit: boolean;
  };
  summary: ScoreSummary;
  findings: Finding[];
  recommendations: string[];
  scanDurationMs: number;
  scannedAt: string;
  disclaimer: string;
}

export interface CliOptions {
  projectPath?: string;
  verbose?: boolean;
  format?: "terminal" | "json" | "markdown";
  output?: string;
  checks?: string;
  color?: boolean;
  runBuild?: boolean;
  strict?: boolean;
  force?: boolean;
}

export interface SafeFs {
  exists(relPath: string): Promise<boolean>;
  readFile(relPath: string, maxSize?: number): Promise<string | null>;
  readJson<T = unknown>(relPath: string): Promise<T | null>;
  readJsonc<T = unknown>(relPath: string): Promise<T | null>;
  listFiles(dirRelPath?: string, maxDepth?: number): Promise<string[]>;
  resolvePath(relPath: string): string;
  isGitIgnored(relPath: string): Promise<boolean>;
}

export interface CheckContext {
  projectRoot: string;
  projectInfo: ProjectInfo;
  options: CliOptions;
  fs: SafeFs;
}

export interface CheckRule {
  id: string;
  category: CheckCategory;
  name: string;
  description: string;
  defaultWeight: number;
  run: (context: CheckContext) => Promise<Finding | Finding[] | null>;
}
