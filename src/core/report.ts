import fs from "node:fs/promises";
import path from "node:path";
import type { AuditReport, CliOptions } from "../types/index.js";
import { formatTerminalReport } from "../reporters/terminal.js";
import { formatJsonReport } from "../reporters/json.js";
import { formatMarkdownReport } from "../reporters/markdown.js";
import { LaunchKitError } from "../utils/errors.js";

export async function renderAndSaveReport(
  report: AuditReport,
  options: CliOptions = {},
): Promise<{ outputText: string; savedToFile?: string }> {
  const format = options.format ?? "terminal";

  let outputText: string;

  switch (format) {
    case "json":
      outputText = formatJsonReport(report);
      break;

    case "markdown":
      outputText = formatMarkdownReport(report);
      break;

    case "terminal":
    default:
      outputText = formatTerminalReport(report, {
        verbose: options.verbose,
        color: options.color,
      });
      break;
  }

  // Handle saving to file if --output is requested
  if (options.output) {
    const targetFilePath = path.resolve(process.cwd(), options.output);

    // Safety check: prevent overwriting critical project manifest files
    const baseName = path.basename(targetFilePath).toLowerCase();
    const protectedFiles = new Set(["package.json", "tsconfig.json", ".gitignore"]);
    if (protectedFiles.has(baseName)) {
      throw new LaunchKitError(
        `Safety error: Refusing to overwrite critical project file "${baseName}". Please choose a report destination such as "launchkit-report.md" or "report.json".`,
        2,
        "ERR_PROTECTED_OUTPUT",
      );
    }

    // Check if target file exists and protect against accidental overwrite
    let fileAlreadyExists: boolean;
    try {
      await fs.access(targetFilePath);
      fileAlreadyExists = true;
    } catch {
      fileAlreadyExists = false;
    }

    if (fileAlreadyExists && !options.force) {
      throw new LaunchKitError(
        `Output file already exists at "${options.output}". Pass --force to overwrite.`,
        2,
        "ERR_FILE_EXISTS",
      );
    }

    try {
      const parentDir = path.dirname(targetFilePath);
      await fs.mkdir(parentDir, { recursive: true });

      // If format was terminal, but saving to file and user specified markdown or json file extension, format accordingly
      let fileContent = outputText;
      if (format === "terminal") {
        if (options.output.endsWith(".json")) {
          fileContent = formatJsonReport(report);
        } else if (options.output.endsWith(".md") || options.output.endsWith(".markdown")) {
          fileContent = formatMarkdownReport(report);
        }
      }

      await fs.writeFile(targetFilePath, fileContent, "utf-8");
      return { outputText, savedToFile: targetFilePath };
    } catch (err: unknown) {
      throw new LaunchKitError(
        `Failed to write report to "${options.output}": ${err instanceof Error ? err.message : String(err)}`,
        2,
        "ERR_WRITE_REPORT",
      );
    }
  }

  return { outputText };
}
