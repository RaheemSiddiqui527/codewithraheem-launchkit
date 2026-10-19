/**
 * High-confidence patterns for sensitive credentials.
 */
const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  {
    name: "Private Key Header",
    pattern: /-----BEGIN\s+(?:RSA|DSA|EC|OPENSSH|PGP)?\s*PRIVATE KEY/i,
  },
  { name: "AWS Access Key ID", pattern: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/ },
  {
    name: "GitHub Personal Access Token",
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}\b/,
  },
  { name: "Slack Token", pattern: /\bxox[baprs]-[0-9a-zA-Z-]{10,}\b/ },
  { name: "Stripe Secret Key", pattern: /\bsk_live_[0-9a-zA-Z]{24,}\b/ },
  {
    name: "Generic Secret Assignment",
    pattern: /(?:api_?key|auth_?token|secret_?key|password)\s*[:=]\s*["']([^"'\s]{10,})["']/i,
  },
];

export interface SecretFindingInfo {
  type: string;
  line: number;
  snippet: string;
}

/**
 * Scans text content for high-confidence secrets and returns finding information
 * with all sensitive characters strictly redacted.
 */
export function detectSecretsSafely(content: string): SecretFindingInfo[] {
  const findings: SecretFindingInfo[] = [];
  const lines = content.split(/\r?\n/);

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]!;
    // Skip empty or comment lines
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
      continue;
    }

    for (const rule of SECRET_PATTERNS) {
      if (rule.pattern.test(line)) {
        // Redact any actual values in the line
        const safeSnippet = sanitizeSecretLine(line);
        findings.push({
          type: rule.name,
          line: lineIdx + 1,
          snippet: safeSnippet,
        });
        break;
      }
    }
  }

  return findings;
}

/**
 * Sanitizes any string by replacing matches or values with [REDACTED].
 */
export function sanitizeSecretLine(line: string): string {
  let cleaned = line;
  for (const rule of SECRET_PATTERNS) {
    cleaned = cleaned.replace(rule.pattern, (_match, group) => {
      if (group) {
        return _match.replace(group, "[REDACTED]");
      }
      return "[REDACTED_SECRET]";
    });
  }
  // Also redact any potential quoted assignments: key: "..."
  cleaned = cleaned.replace(
    /(['"]?(?:secret|token|password|apiKey|api_key)['"]?\s*[:=]\s*['"])([^'"]+)(['"])/gi,
    "$1[REDACTED]$3",
  );
  return cleaned.trim();
}
