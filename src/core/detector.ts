import path from "node:path";
import type {
  FrameworkType,
  LanguageType,
  PackageManagerType,
  ProjectInfo,
  SafeFs,
} from "../types/index.js";
import { formatRelativePath } from "../utils/paths.js";

export async function detectProject(projectRoot: string, fs: SafeFs): Promise<ProjectInfo> {
  const displayPath = formatRelativePath(process.cwd(), projectRoot);

  // 1. Check package.json
  const packageJsonExists = await fs.exists("package.json");
  let packageJsonValid = false;
  let packageJsonData: Record<string, unknown> | undefined = undefined;

  let name = path.basename(projectRoot);
  let version = "0.0.0";
  let scripts: Record<string, string> = {};
  let dependencies: Record<string, string> = {};
  let devDependencies: Record<string, string> = {};

  if (packageJsonExists) {
    const rawContent = await fs.readFile("package.json");
    if (rawContent !== null) {
      try {
        const parsed = JSON.parse(rawContent);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          packageJsonValid = true;
          packageJsonData = parsed as Record<string, unknown>;

          if (typeof parsed.name === "string" && parsed.name.trim()) {
            name = parsed.name.trim();
          }
          if (typeof parsed.version === "string" && parsed.version.trim()) {
            version = parsed.version.trim();
          }
          if (typeof parsed.scripts === "object" && parsed.scripts !== null) {
            scripts = parsed.scripts as Record<string, string>;
          }
          if (typeof parsed.dependencies === "object" && parsed.dependencies !== null) {
            dependencies = parsed.dependencies as Record<string, string>;
          }
          if (typeof parsed.devDependencies === "object" && parsed.devDependencies !== null) {
            devDependencies = parsed.devDependencies as Record<string, string>;
          }
        }
      } catch {
        packageJsonValid = false;
      }
    }
  }

  const allDeps = { ...dependencies, ...devDependencies };

  // 2. Detect Package Manager and Lockfiles
  const lockfilesFound: string[] = [];
  if (await fs.exists("package-lock.json")) lockfilesFound.push("package-lock.json");
  if (await fs.exists("pnpm-lock.yaml")) lockfilesFound.push("pnpm-lock.yaml");
  if (await fs.exists("yarn.lock")) lockfilesFound.push("yarn.lock");
  if (await fs.exists("bun.lockb")) lockfilesFound.push("bun.lockb");
  if (await fs.exists("bun.lock")) lockfilesFound.push("bun.lock");

  const hasMultipleLockfiles = lockfilesFound.length > 1;

  let packageManager: PackageManagerType = "unknown";

  // Check packageManager field in package.json (Corepack format: "pnpm@8.x")
  if (packageJsonData && typeof packageJsonData.packageManager === "string") {
    const pmField = (packageJsonData.packageManager as string).toLowerCase();
    if (pmField.startsWith("pnpm")) packageManager = "pnpm";
    else if (pmField.startsWith("yarn")) packageManager = "yarn";
    else if (pmField.startsWith("bun")) packageManager = "bun";
    else if (pmField.startsWith("npm")) packageManager = "npm";
  }

  // If not determined by packageManager field, use lockfiles
  if (packageManager === "unknown" && lockfilesFound.length > 0) {
    const primary = lockfilesFound[0]!;
    if (primary === "pnpm-lock.yaml") packageManager = "pnpm";
    else if (primary === "yarn.lock") packageManager = "yarn";
    else if (primary.startsWith("bun.lock")) packageManager = "bun";
    else if (primary === "package-lock.json") packageManager = "npm";
  } else if (packageManager === "unknown" && packageJsonExists) {
    // Default to npm for standard Node.js projects if no lockfile
    packageManager = "npm";
  }

  // 3. Monorepo detection
  let isMonorepo = false;
  let monorepoTool: string | undefined = undefined;

  if (await fs.exists("pnpm-workspace.yaml")) {
    isMonorepo = true;
    monorepoTool = "pnpm-workspace";
  } else if (await fs.exists("turbo.json")) {
    isMonorepo = true;
    monorepoTool = "turborepo";
  } else if (await fs.exists("nx.json")) {
    isMonorepo = true;
    monorepoTool = "nx";
  } else if (await fs.exists("lerna.json")) {
    isMonorepo = true;
    monorepoTool = "lerna";
  } else if (packageJsonData && Array.isArray(packageJsonData.workspaces)) {
    isMonorepo = true;
    monorepoTool = "npm/yarn-workspaces";
  }

  // 4. Language Detection
  let language: LanguageType = "unknown";
  const hasTsConfig = (await fs.exists("tsconfig.json")) || (await fs.exists("tsconfig.base.json"));
  const hasTsDep = Boolean(
    allDeps.typescript || Object.keys(allDeps).some((d) => d.startsWith("@types/")),
  );

  // Check for TS files
  const sampleFiles = await fs.listFiles(".", 3);
  const hasTsFiles = sampleFiles.some(
    (f) => f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".mts"),
  );

  if (hasTsConfig || hasTsDep || hasTsFiles) {
    language = "typescript";
  } else if (
    packageJsonExists ||
    sampleFiles.some(
      (f) => f.endsWith(".js") || f.endsWith(".jsx") || f.endsWith(".mjs") || f.endsWith(".cjs"),
    )
  ) {
    language = "javascript";
  }

  // 5. Framework Detection
  let framework: FrameworkType = "unknown";
  let frameworkDetails: string | undefined = undefined;

  // Next.js
  if (
    allDeps.next ||
    (await fs.exists("next.config.js")) ||
    (await fs.exists("next.config.mjs")) ||
    (await fs.exists("next.config.ts"))
  ) {
    framework = "nextjs";
    frameworkDetails = "Next.js";
  }
  // Expo & React Native
  else if (allDeps.expo || (await fs.exists("app.json"))) {
    const appJson = await fs.readJson<Record<string, unknown>>("app.json");
    if (allDeps.expo || (appJson && appJson.expo)) {
      framework = "expo";
      frameworkDetails = "Expo (React Native)";
    } else if (allDeps["react-native"]) {
      framework = "react-native";
      frameworkDetails = "React Native";
    }
  } else if (allDeps["react-native"]) {
    framework = "react-native";
    frameworkDetails = "React Native";
  }
  // NestJS
  else if (allDeps["@nestjs/core"] || (await fs.exists("nest-cli.json"))) {
    framework = "nestjs";
    frameworkDetails = "NestJS";
  }
  // Angular
  else if (allDeps["@angular/core"] || (await fs.exists("angular.json"))) {
    framework = "angular";
    frameworkDetails = "Angular";
  }
  // Svelte
  else if (allDeps.svelte || allDeps["@sveltejs/kit"] || (await fs.exists("svelte.config.js"))) {
    framework = "svelte";
    frameworkDetails = allDeps["@sveltejs/kit"] ? "SvelteKit" : "Svelte";
  }
  // Vue
  else if (
    allDeps.vue ||
    allDeps.nuxt ||
    (await fs.exists("vue.config.js")) ||
    (await fs.exists("nuxt.config.ts"))
  ) {
    framework = "vue";
    frameworkDetails = allDeps.nuxt ? "Nuxt" : "Vue";
  }
  // Vite
  else if (
    allDeps.vite ||
    (await fs.exists("vite.config.js")) ||
    (await fs.exists("vite.config.ts")) ||
    (await fs.exists("vite.config.mjs"))
  ) {
    framework = "vite";
    frameworkDetails = "Vite";
  }
  // Express
  else if (allDeps.express) {
    framework = "express";
    frameworkDetails = "Express";
  }
  // React (standalone without Next/Expo)
  else if (allDeps.react || allDeps["react-dom"]) {
    framework = "react";
    frameworkDetails = "React";
  }
  // Monorepo if no specific framework
  else if (isMonorepo) {
    framework = "monorepo";
    frameworkDetails = `Monorepo (${monorepoTool ?? "unknown"})`;
  }

  // 6. Git detection
  const hasGit = await fs.exists(".git");

  return {
    path: projectRoot,
    displayPath,
    name,
    version,
    isNodeProject: packageJsonExists,
    language,
    framework,
    frameworkDetails,
    packageManager,
    lockfilesFound,
    hasMultipleLockfiles,
    isMonorepo,
    monorepoTool,
    hasGit,
    packageJsonExists,
    packageJsonValid,
    packageJson: packageJsonData,
    scripts,
    dependencies,
    devDependencies,
  };
}
