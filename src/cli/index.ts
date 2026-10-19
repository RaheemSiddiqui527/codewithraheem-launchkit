import { createCliProgram, validateCliOptions } from "./options.js";
import { scanProject } from "../core/scanner.js";
import { renderAndSaveReport } from "../core/report.js";
import { LaunchKitError } from "../utils/errors.js";

export async function runCli(argv: string[] = process.argv): Promise<number> {
  const program = createCliProgram();

  // Custom handling so Commander errors return exit code 2
  program.exitOverride();

  try {
    program.parse(argv);
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "commander.helpDisplayed"
    ) {
      return 0;
    }
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "commander.version"
    ) {
      return 0;
    }
    // Commander parse error (e.g. unknown option)
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${message}\n`);
    return 2;
  }

  const rawOptions = program.opts();
  const projectArg = program.args[0];

  try {
    const validatedOptions = validateCliOptions(projectArg, rawOptions);

    const report = await scanProject(validatedOptions);
    const { outputText, savedToFile } = await renderAndSaveReport(report, validatedOptions);

    process.stdout.write(outputText + "\n");

    if (savedToFile) {
      process.stdout.write(`Report successfully saved to: ${savedToFile}\n`);
    }

    // Determine exit code
    // Exit 1 if blocking failures or errors are found
    if (report.summary.failed > 0 || report.summary.errors > 0) {
      return 1;
    }

    // Exit 1 if strict mode and warnings exist
    if (validatedOptions.strict && report.summary.warnings > 0) {
      return 1;
    }

    return 0;
  } catch (err: unknown) {
    if (err instanceof LaunchKitError) {
      process.stderr.write(`LaunchKit Error: ${err.message}\n`);
      return err.exitCode;
    }
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`LaunchKit Unexpected Error: ${message}\n`);
    return 2;
  }
}

// Entrypoint when executed directly via CLI
if (process.env.NODE_ENV !== "test") {
  runCli(process.argv).then((code) => {
    process.exit(code);
  });
}
