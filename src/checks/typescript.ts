import type { CheckContext, Finding } from "../types/index.js";

interface TsConfigShape {
  compilerOptions?: {
    strict?: boolean;
    noImplicitAny?: boolean;
    strictNullChecks?: boolean;
    noEmitOnError?: boolean;
    skipLibCheck?: boolean;
    target?: string;
    module?: string;
  };
  extends?: string | string[];
}

export async function checkTypeScript(context: CheckContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { projectInfo, fs } = context;

  // 1. If not a TypeScript project, skip gracefully
  if (projectInfo.language !== "typescript") {
    findings.push({
      id: "ts-usage",
      category: "typescript",
      status: "skipped",
      title: "TypeScript checks skipped (JavaScript-only project)",
      explanation:
        "This project does not show evidence of TypeScript usage. TypeScript checks are not applied.",
      evidence: "No TypeScript files, dependencies, or configuration detected.",
      affectedFiles: [],
      remediation: "",
      weight: 0,
    });
    return findings;
  }

  // 2. Check if tsconfig.json exists
  const hasTsConfig = await fs.exists("tsconfig.json");
  const hasBaseTsConfig = await fs.exists("tsconfig.base.json");

  if (!hasTsConfig && !hasBaseTsConfig) {
    findings.push({
      id: "ts-config-present",
      category: "typescript",
      status: "fail",
      title: "TypeScript configuration (tsconfig.json) is missing",
      explanation:
        "TypeScript projects require a tsconfig.json to instruct the compiler on type checking and build targets.",
      evidence:
        "TypeScript dependencies or files were detected, but no tsconfig.json was found in the project root.",
      affectedFiles: ["tsconfig.json"],
      remediation:
        "Generate a tsconfig.json by running `npx tsc --init` or creating one tailored to your framework.",
      weight: 15,
    });
    return findings;
  }

  findings.push({
    id: "ts-config-present",
    category: "typescript",
    status: "pass",
    title: "TypeScript configuration detected",
    explanation: "A tsconfig.json configuration file is present.",
    evidence: `Found ${hasTsConfig ? "tsconfig.json" : "tsconfig.base.json"} in project root.`,
    affectedFiles: [hasTsConfig ? "tsconfig.json" : "tsconfig.base.json"],
    remediation: "",
    weight: 10,
  });

  // 3. Parse tsconfig.json safely
  const configFileName = hasTsConfig ? "tsconfig.json" : "tsconfig.base.json";
  const tsConfig = await fs.readJsonc<TsConfigShape>(configFileName);

  if (!tsConfig || typeof tsConfig !== "object") {
    findings.push({
      id: "ts-config-valid",
      category: "typescript",
      status: "fail",
      title: "TypeScript configuration contains invalid JSON/JSONC",
      explanation:
        "The compiler configuration file could not be parsed. The TypeScript compiler (tsc) will fail.",
      evidence: `Failed to parse ${configFileName}.`,
      affectedFiles: [configFileName],
      remediation: `Inspect ${configFileName} for syntax errors or invalid JSON format.`,
      weight: 15,
    });
    return findings;
  }

  findings.push({
    id: "ts-config-valid",
    category: "typescript",
    status: "pass",
    title: "TypeScript configuration parsed successfully",
    explanation: "The compiler configuration is valid JSON/JSONC.",
    evidence: `${configFileName} is syntactically valid.`,
    affectedFiles: [configFileName],
    remediation: "",
    weight: 10,
  });

  const compilerOptions = tsConfig.compilerOptions ?? {};

  // 4. Strict mode checking
  const isStrict = compilerOptions.strict === true;
  const hasIndividualStrict =
    compilerOptions.noImplicitAny === true && compilerOptions.strictNullChecks === true;

  if (isStrict || hasIndividualStrict) {
    findings.push({
      id: "ts-strict-mode",
      category: "typescript",
      status: "pass",
      title: "TypeScript strict mode is enabled",
      explanation:
        "Strict type checking provides stronger safety guarantees against runtime type errors and null pointer exceptions.",
      evidence: isStrict
        ? "compilerOptions.strict: true"
        : "compilerOptions.noImplicitAny and strictNullChecks are enabled",
      affectedFiles: [configFileName],
      remediation: "",
      weight: 10,
    });
  } else {
    findings.push({
      id: "ts-strict-mode",
      category: "typescript",
      status: "warn",
      title: "TypeScript strict mode is not enabled",
      explanation:
        "Without strict mode (strict: true), TypeScript permits implicit 'any' types and looser null checking, weakening type safety.",
      evidence:
        compilerOptions.strict === false
          ? "compilerOptions.strict: false"
          : "compilerOptions.strict is omitted or undefined",
      affectedFiles: [configFileName],
      remediation: 'Enable strict mode in tsconfig.json under compilerOptions: { "strict": true }.',
      weight: 10,
    });
  }

  // 5. Target version check
  if (compilerOptions.target) {
    const target = compilerOptions.target.toLowerCase();
    const oldTargets = ["es3", "es5"];
    if (oldTargets.includes(target)) {
      findings.push({
        id: "ts-compiler-target",
        category: "typescript",
        status: "warn",
        title: `Legacy ECMAScript target configured ("${compilerOptions.target}")`,
        explanation:
          "Compiling to very old ES3/ES5 targets introduces unnecessary polyfill bloat for modern Node.js and browser environments.",
        evidence: `compilerOptions.target: "${compilerOptions.target}"`,
        affectedFiles: [configFileName],
        remediation:
          'Update compilerOptions.target to a modern standard such as "ES2022" or "ESNext".',
        weight: 5,
      });
    }
  }

  return findings;
}
