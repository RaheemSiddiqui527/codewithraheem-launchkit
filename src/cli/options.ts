import { Command } from "commander";
import type { CliOptions } from "../types/index.js";
import { TOOL_NAME, TOOL_TAGLINE, TOOL_VERSION } from "../core/scanner.js";
import { LaunchKitError } from "../utils/errors.js";

const VALID_FORMATS = new Set(["terminal", "json", "markdown"]);

export function createCliProgram(): Command {
  const program = new Command();

  program
    .name("launchkit")
    .description(
      `${TOOL_NAME} — ${TOOL_TAGLINE}\nLightweight, developer-friendly command-line project readiness auditor.`,
    )
    .version(TOOL_VERSION, "-v, --version", "Output the current LaunchKit version")
    .argument(
      "[project-path]",
      "Path to the project directory to audit (defaults to current directory)",
    )
    .option("--verbose", "Print detailed report with explanations, evidence, and remediation steps")
    .option("-f, --format <format>", "Output format: terminal, json, markdown", "terminal")
    .option("-o, --output <file>", "Write report output to specified file destination")
    .option(
      "-c, --checks <categories>",
      "Comma-separated list of check categories to run (e.g. scripts,typescript,tests)",
    )
    .option("--no-color", "Disable colored terminal output")
    .option("--run-build", "Opt-in: execute the project's build command to verify compilation")
    .option(
      "--strict",
      "Fail with exit code 1 if warnings are detected (by default only blocking failures trigger exit code 1)",
    )
    .option("--force", "Overwrite existing output file if destination already exists")
    .helpOption("-h, --help", "Display help and command usage");

  return program;
}

export function validateCliOptions(
  projectPathArg: string | undefined,
  rawOptions: Record<string, unknown>,
): CliOptions {
  const format =
    typeof rawOptions.format === "string" ? rawOptions.format.toLowerCase() : "terminal";
  if (!VALID_FORMATS.has(format)) {
    throw new LaunchKitError(
      `Invalid format "${rawOptions.format}". Supported formats: ${Array.from(VALID_FORMATS).join(", ")}`,
      2,
      "ERR_INVALID_FORMAT",
    );
  }

  return {
    projectPath: projectPathArg,
    verbose: Boolean(rawOptions.verbose),
    format: format as CliOptions["format"],
    output: typeof rawOptions.output === "string" ? rawOptions.output : undefined,
    checks: typeof rawOptions.checks === "string" ? rawOptions.checks : undefined,
    color: rawOptions.color !== false,
    runBuild: Boolean(rawOptions.runBuild),
    strict: Boolean(rawOptions.strict),
    force: Boolean(rawOptions.force),
  };
}
