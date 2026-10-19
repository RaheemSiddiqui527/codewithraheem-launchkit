import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export interface TestFixture {
  dir: string;
  writeFile(relPath: string, content: string): Promise<string>;
  writeJson(relPath: string, data: unknown): Promise<string>;
  cleanup(): Promise<void>;
}

export async function createTestFixture(prefix = "launchkit-test-"): Promise<TestFixture> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));

  return {
    dir: tmpDir,
    async writeFile(relPath: string, content: string): Promise<string> {
      const fullPath = path.join(tmpDir, relPath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");
      return fullPath;
    },
    async writeJson(relPath: string, data: unknown): Promise<string> {
      const fullPath = path.join(tmpDir, relPath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, JSON.stringify(data, null, 2), "utf-8");
      return fullPath;
    },
    async cleanup(): Promise<void> {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors on Windows locks
      }
    },
  };
}
