import path from "node:path";
import fs from "node:fs/promises";

/**
 * Normalizes a path to use forward slashes for cross-platform consistency.
 */
export function normalizeSlashes(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

/**
 * Validates and resolves the target project directory.
 * Throws a descriptive error if the path does not exist or is not a directory.
 */
export async function resolveProjectRoot(inputPath?: string): Promise<{
  absolutePath: string;
  displayPath: string;
}> {
  const target = inputPath ? path.resolve(process.cwd(), inputPath) : process.cwd();

  try {
    const stat = await fs.stat(target);
    if (!stat.isDirectory()) {
      throw new Error(`The specified path is not a directory: "${target}"`);
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Project directory does not exist: "${target}"`, { cause: err });
    }
    if ((err as NodeJS.ErrnoException).code === "EACCES") {
      throw new Error(`Permission denied accessing directory: "${target}"`, { cause: err });
    }
    throw err;
  }

  const normalized = path.resolve(target);
  const display = inputPath ? normalizeSlashes(inputPath) : ".";

  return {
    absolutePath: normalized,
    displayPath: display,
  };
}

/**
 * Formats a file path relative to the project root with normalized slashes.
 */
export function formatRelativePath(projectRoot: string, targetPath: string): string {
  const rel = path.relative(projectRoot, targetPath);
  return normalizeSlashes(rel || ".");
}
