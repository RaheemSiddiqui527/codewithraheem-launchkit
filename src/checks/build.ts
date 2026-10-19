import { spawn } from "node:child_process";
import type { CheckContext, Finding } from "../types/index.js";

const DEFAULT_BUILD_TIMEOUT_MS = 60_000; // 60 seconds
const MAX_OUTPUT_CAPTURE_BYTES = 50_000; // 50 KB

export async function checkBuild(context: CheckContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { projectInfo, options } = context;

  const hasBuildScript = Boolean(projectInfo.scripts.build && projectInfo.scripts.build.trim());

  // 1. Static check when --run-build is NOT opted into
  if (!options.runBuild) {
    if (hasBuildScript) {
      findings.push({
        id: "build-readiness-static",
        category: "build",
        status: "pass",
        title: "Build command configured (static inspection)",
        explanation:
          "A build script is declared. To actually execute the build command and verify successful artifact output, run LaunchKit with `--run-build`.",
        evidence: `scripts.build: "${projectInfo.scripts.build}" (not executed in default read-only mode)`,
        affectedFiles: ["package.json"],
        remediation: "Run `launchkit --run-build` to execute and verify the build.",
        weight: 10,
      });
    } else {
      findings.push({
        id: "build-readiness-static",
        category: "build",
        status: "skipped",
        title: "Build execution skipped (no build script declared)",
        explanation: "No build script was declared in package.json to inspect.",
        evidence: "Missing scripts.build in package.json.",
        affectedFiles: ["package.json"],
        remediation: "",
        weight: 0,
      });
    }
    return findings;
  }

  // 2. Opt-in execution when --run-build is passed
  if (!hasBuildScript) {
    findings.push({
      id: "build-execution-optin",
      category: "build",
      status: "fail",
      title: "Cannot run build: no build script configured",
      explanation:
        "The `--run-build` flag was requested, but no 'build' script is defined in package.json.",
      evidence: "package.json lacks a 'build' script entry.",
      affectedFiles: ["package.json"],
      remediation: 'Define a "build" script in package.json before running `--run-build`.',
      weight: 15,
    });
    return findings;
  }

  // Determine command based on package manager
  let cmd: string;
  let args: string[];

  switch (projectInfo.packageManager) {
    case "pnpm":
      cmd = "pnpm";
      args = ["run", "build"];
      break;
    case "yarn":
      cmd = "yarn";
      args = ["build"];
      break;
    case "bun":
      cmd = "bun";
      args = ["run", "build"];
      break;
    default:
      cmd = "npm";
      args = ["run", "build"];
      break;
  }

  const fullCmdString = `${cmd} ${args.join(" ")}`;

  try {
    const result = await executeBoundedProcess(
      cmd,
      args,
      context.projectRoot,
      DEFAULT_BUILD_TIMEOUT_MS,
    );

    if (result.timedOut) {
      findings.push({
        id: "build-execution-optin",
        category: "build",
        status: "fail",
        title: "Opt-in build execution timed out",
        explanation: `The build command exceeded the safety timeout of ${DEFAULT_BUILD_TIMEOUT_MS / 1000} seconds.`,
        evidence: `Command: "${fullCmdString}" timed out after ${DEFAULT_BUILD_TIMEOUT_MS}ms.\nCaptured output:\n${result.output.slice(0, 500)}`,
        affectedFiles: ["package.json"],
        remediation:
          "Inspect your build script for infinite loops, blocking prompts, or optimize build performance.",
        weight: 15,
      });
    } else if (result.exitCode === 0) {
      findings.push({
        id: "build-execution-optin",
        category: "build",
        status: "pass",
        title: "Opt-in build executed successfully",
        explanation: "The project build script was executed and terminated with exit code 0.",
        evidence: `Command: "${fullCmdString}" exited successfully (code 0). Output preview: ${result.output.slice(0, 200).replace(/\r?\n/g, " ")}`,
        affectedFiles: ["package.json"],
        remediation: "",
        weight: 15,
      });
    } else {
      findings.push({
        id: "build-execution-optin",
        category: "build",
        status: "fail",
        title: `Opt-in build failed with exit code ${result.exitCode}`,
        explanation: "The project build script returned a non-zero exit code during execution.",
        evidence: `Command: "${fullCmdString}" exited with code ${result.exitCode}.\nCaptured error snippet:\n${result.output.slice(0, 500)}`,
        affectedFiles: ["package.json"],
        remediation:
          "Review build logs above and fix syntax, type, or bundler errors in your source code.",
        weight: 15,
      });
    }
  } catch (err: unknown) {
    findings.push({
      id: "build-execution-optin",
      category: "build",
      status: "error",
      title: "Error executing build process",
      explanation:
        "An operating system or process error prevented LaunchKit from executing the build command.",
      evidence: err instanceof Error ? err.message : String(err),
      affectedFiles: [],
      remediation:
        "Ensure the package manager binary is installed and accessible in your system PATH.",
      weight: 10,
    });
  }

  return findings;
}

interface ProcessResult {
  exitCode: number | null;
  output: string;
  timedOut: boolean;
}

function executeBoundedProcess(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<ProcessResult> {
  return new Promise((resolve) => {
    let captured = "";
    let timedOut = false;

    // Use shell: true on Windows for npm/pnpm/yarn .cmd wrappers
    const isWindows = process.platform === "win32";
    const fullCommand = [cmd, ...args].join(" ");
    const child = isWindows
      ? spawn(fullCommand, {
          cwd,
          shell: true,
          env: { ...process.env, CI: "true" },
        })
      : spawn(cmd, args, {
          cwd,
          shell: false,
          env: { ...process.env, CI: "true" },
        });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill();
      } catch {
        // ignore
      }
    }, timeoutMs);

    const append = (data: Buffer | string) => {
      if (captured.length < MAX_OUTPUT_CAPTURE_BYTES) {
        captured += data.toString();
        if (captured.length > MAX_OUTPUT_CAPTURE_BYTES) {
          captured = captured.slice(0, MAX_OUTPUT_CAPTURE_BYTES) + "\n...[output truncated]";
        }
      }
    };

    if (child.stdout) {
      child.stdout.on("data", append);
    }
    if (child.stderr) {
      child.stderr.on("data", append);
    }

    child.on("error", (err: Error) => {
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        output: `Failed to spawn process: ${err.message}`,
        timedOut: false,
      });
    });

    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      resolve({
        exitCode: code,
        output: captured.trim(),
        timedOut,
      });
    });
  });
}
