import { describe, it, expect } from "vitest";
import { detectSecretsSafely, sanitizeSecretLine } from "../../src/utils/secrets.js";

describe("Secret Detection & Sanitization", () => {
  it("detects and redacts AWS access key ID", () => {
    const raw = 'AWS_KEY="AKIAIOSFODNN7EXAMPLE"';
    const findings = detectSecretsSafely(raw);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.type).toBe("AWS Access Key ID");
    expect(findings[0]?.snippet).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(findings[0]?.snippet).toContain("[REDACTED]");
  });

  it("detects and redacts GitHub personal access tokens", () => {
    const raw = "const token = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';";
    const findings = detectSecretsSafely(raw);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.type).toBe("GitHub Personal Access Token");
    expect(findings[0]?.snippet).not.toContain("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
  });

  it("detects private key headers", () => {
    const raw = "-----BEGIN RSA PRIVATE KEY-----";
    const findings = detectSecretsSafely(raw);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.type).toBe("Private Key Header");
  });

  it("sanitizes generic secret assignments", () => {
    const line = 'apiKey = "supersecretvalue123456"';
    const clean = sanitizeSecretLine(line);

    expect(clean).not.toContain("supersecretvalue123456");
    expect(clean).toContain("[REDACTED]");
  });

  it("ignores comment lines", () => {
    const comment = "# AKIAIOSFODNN7EXAMPLE in comment";
    const findings = detectSecretsSafely(comment);
    expect(findings).toHaveLength(0);
  });
});
