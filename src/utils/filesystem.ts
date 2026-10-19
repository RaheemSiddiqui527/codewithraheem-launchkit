import fs from "node:fs/promises";
import path from "node:path";
import type { SafeFs } from "../types/index.js";
import { normalizeSlashes } from "./paths.js";
import { parseJsonc } from "./jsonc.js";

const DEFAULT_IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "out",
  ".output",
  "coverage",
  ".turbo",
  ".cache",
  "vendor",
  ".svelte-kit",
  ".nuxt",
  ".angular",
  ".vscode",
  ".idea",
]);

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export class SafeProjectFs implements SafeFs {
  private readonly projectRoot: string;
  private readonly fileCache = new Map<string, string | null>();
  private readonly existsCache = new Map<string, boolean>();
  private gitIgnoreRules: string[] | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  resolvePath(relPath: string): string {
    return path.resolve(this.projectRoot, relPath);
  }

  async exists(relPath: string): Promise<boolean> {
    const cached = this.existsCache.get(relPath);
    if (cached !== undefined) {
      return cached;
    }

    const absPath = this.resolvePath(relPath);
    try {
      await fs.access(absPath);
      this.existsCache.set(relPath, true);
      return true;
    } catch {
      this.existsCache.set(relPath, false);
      return false;
    }
  }

  async readFile(relPath: string, maxSize = MAX_FILE_SIZE_BYTES): Promise<string | null> {
    const cached = this.fileCache.get(relPath);
    if (cached !== undefined) {
      return cached;
    }

    const absPath = this.resolvePath(relPath);
    try {
      const stat = await fs.stat(absPath);
      if (!stat.isFile()) {
        this.fileCache.set(relPath, null);
        return null;
      }

      if (stat.size > maxSize) {
        // File exceeds maximum safe scanning limit
        this.fileCache.set(relPath, null);
        return null;
      }

      const content = await fs.readFile(absPath, "utf-8");
      this.fileCache.set(relPath, content);
      this.existsCache.set(relPath, true);
      return content;
    } catch {
      this.fileCache.set(relPath, null);
      this.existsCache.set(relPath, false);
      return null;
    }
  }

  async readJson<T = unknown>(relPath: string): Promise<T | null> {
    const raw = await this.readFile(relPath);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async readJsonc<T = unknown>(relPath: string): Promise<T | null> {
    const raw = await this.readFile(relPath);
    if (!raw) return null;
    return parseJsonc<T>(raw);
  }

  async listFiles(dirRelPath = ".", maxDepth = 4): Promise<string[]> {
    const results: string[] = [];
    const rootDir = this.resolvePath(dirRelPath);

    const traverse = async (currentDir: string, currentDepth: number): Promise<void> => {
      if (currentDepth > maxDepth) return;

      let entries: import("node:fs").Dirent[];
      try {
        entries = await fs.readdir(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = normalizeSlashes(path.relative(this.projectRoot, fullPath));

        if (entry.isDirectory()) {
          if (!DEFAULT_IGNORED_DIRS.has(entry.name)) {
            await traverse(fullPath, currentDepth + 1);
          }
        } else if (entry.isFile()) {
          results.push(relPath);
        }
      }
    };

    await traverse(rootDir, 1);
    return results;
  }

  async isGitIgnored(targetRelPath: string): Promise<boolean> {
    if (this.gitIgnoreRules === null) {
      const gitIgnoreContent = await this.readFile(".gitignore");
      if (!gitIgnoreContent) {
        this.gitIgnoreRules = [];
      } else {
        this.gitIgnoreRules = gitIgnoreContent
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.startsWith("#"));
      }
    }

    const normalizedTarget = normalizeSlashes(targetRelPath);
    const targetBaseName = path.basename(normalizedTarget);

    for (const rule of this.gitIgnoreRules) {
      const cleanRule = normalizeSlashes(rule.replace(/^\//, ""));

      // Exact match or basename match
      if (cleanRule === normalizedTarget || cleanRule === targetBaseName) {
        return true;
      }

      // Glob match for directory pattern: /foo/ or foo/
      if (cleanRule.endsWith("/")) {
        const dirName = cleanRule.slice(0, -1);
        if (normalizedTarget === dirName || normalizedTarget.startsWith(`${dirName}/`)) {
          return true;
        }
      }

      // Wildcard match: e.g. *.env, .env*
      if (cleanRule.includes("*")) {
        const regexStr = "^" + cleanRule.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$";
        try {
          const re = new RegExp(regexStr);
          if (re.test(normalizedTarget) || re.test(targetBaseName)) {
            return true;
          }
        } catch {
          // Ignore invalid regex in user's gitignore
        }
      }
    }

    return false;
  }
}
