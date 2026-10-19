// Core Scanner & Public API
export {
  scanProject,
  TOOL_NAME,
  TOOL_VERSION,
  TOOL_BRAND,
  TOOL_TAGLINE,
  AUDIT_DISCLAIMER,
} from "./core/scanner.js";

export { detectProject } from "./core/detector.js";
export { runRulesEngine, REGISTERED_RULES, ALL_CHECK_CATEGORIES } from "./core/rules-engine.js";
export { calculateReadinessScore } from "./core/scoring.js";
export { renderAndSaveReport } from "./core/report.js";

// Reporters
export { formatTerminalReport } from "./reporters/terminal.js";
export { formatJsonReport } from "./reporters/json.js";
export { formatMarkdownReport } from "./reporters/markdown.js";

// Utilities & Filesystem
export { SafeProjectFs } from "./utils/filesystem.js";
export { resolveProjectRoot, normalizeSlashes, formatRelativePath } from "./utils/paths.js";
export { stripJsonComments, parseJsonc } from "./utils/jsonc.js";
export { detectSecretsSafely, sanitizeSecretLine } from "./utils/secrets.js";
export { LaunchKitError, EXIT_CODES } from "./utils/errors.js";

// CLI Programmatic Invocation
export { runCli } from "./cli/index.js";
export { createCliProgram, validateCliOptions } from "./cli/options.js";

// Types
export type * from "./types/index.js";
