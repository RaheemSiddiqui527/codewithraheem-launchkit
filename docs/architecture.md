# LaunchKit Architecture Specification

`LaunchKit` is built with a modular, read-only, pipeline-oriented design in TypeScript.

```
                    ┌─────────────────────────┐
                    │    CLI / Options Parser │
                    │     (Commander & Kleur) │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │    Path & Permissions   │
                    │   (Safe Project Root)   │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Project Detector Engine│
                    │ (Framework & Lockfiles) │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Modular Rules Engine  │
                    │ (9 Category Inspectors) │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Deterministic Scoring │
                    │  & Findings Prioritizer │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ Multi-Format Reporters  │
                    │(Terminal, JSON, Markdown│
                    └─────────────────────────┘
```

## Core Modules

### 1. `src/cli/`
- **`options.ts`**: Defines Commander CLI argument specifications, options, defaults, and validation logic.
- **`index.ts`**: Main CLI execution entry point, process lifecycle management, formatted stdout/stderr stream writing, and exit code propagation.

### 2. `src/core/`
- **`scanner.ts`**: High-level coordinator that sequences project path resolution, detection, check rule execution, scoring, and duration tracking.
- **`detector.ts`**: Heuristic-based project detector utilizing filesystem evidence to identify project frameworks, languages (JS/TS), package managers, monorepo workspaces, and Git repositories.
- **`rules-engine.ts`**: Registry of check rules that runs active check categories, handles rule filtering (`--checks`), and catches rule exceptions to prevent unhandled process termination.
- **`scoring.ts`**: Deterministic weighted scoring algorithm that awards points for passes, partial credit for warnings, zero points for failures/errors, and excludes skipped checks.
- **`report.ts`**: Formats the `AuditReport` into requested outputs (terminal, JSON, Markdown) and securely handles file writing with overwrite protection.

### 3. `src/checks/`
- **`package.ts`**: Manifest presence, valid JSON structure, npm package naming rules, semver format, `engines.node`, lockfiles, and publishing metadata.
- **`scripts.ts`**: Verifies existence and non-empty status of `build`, `test`, `lint`, and `typecheck` scripts; flags default unconfigured placeholder test scripts.
- **`typescript.ts`**: `tsconfig.json` presence, JSONC parser (allowing comments), `strict` flag validation, and target modern standards.
- **`tests.ts`**: Identifies test runners (Vitest, Jest, Playwright, Cypress, Node.js test runner), test configuration files, and test files.
- **`environment.ts`**: Template detection (`.env.example`), `.gitignore` coverage for `.env*` files, unignored private key files (`.pem`, `.key`, `id_rsa`), and redacted scanning for hardcoded secrets.
- **`git.ts`**: Git repository initialization, `.gitignore` presence, and `node_modules` exclusion rules.
- **`ci.ts`**: CI/CD configuration detection across GitHub Actions, GitLab CI, CircleCI, Azure Pipelines, and verification of automated test/build steps.
- **`dependencies.ts`**: Checks dependency declaration integrity and version alignment for libraries like `react` and `react-dom`.
- **`build.ts`**: Static build script inspection in default mode; bounded process execution (with timeout and bounded buffer) under opt-in `--run-build`.

### 4. `src/reporters/`
- **`terminal.ts`**: Rich terminal output with clean status badges, color highlights, concise vs verbose mode, and complete `--no-color` support.
- **`json.ts`**: Strictly valid machine-readable JSON matching schema version `1.0.0`.
- **`markdown.ts`**: Markdown report with metadata table, score badge, metrics summary, categorized findings with remediation, and prioritized recommendations.

### 5. `src/utils/`
- **`filesystem.ts`**: `SafeProjectFs` providing bounded file reading (maximum 2MB limit), internal cache to eliminate redundant reads, directory traversal with ignored directory allowlists, and `.gitignore` matching.
- **`paths.ts`**: Cross-platform path normalization (forward slashes) and safe path resolution.
- **`jsonc.ts`**: Custom comment-stripping JSON parser supporting single-line comments, block comments, and trailing commas.
- **`secrets.ts`**: High-confidence regex patterns for sensitive credentials with complete text sanitization and redaction (`[REDACTED]`).
- **`errors.ts`**: Structured `LaunchKitError` with error codes and exit code mapping.
