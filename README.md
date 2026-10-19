# LaunchKit

<p align="center">
  <strong>Inspect. Improve. Launch.</strong><br />
  <em>A lightweight, developer-friendly command-line project readiness auditor.</em><br />
  <strong>By CodeWithRaheem</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@codewithraheem/launchkit"><img src="https://img.shields.io/npm/v/@codewithraheem/launchkit.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://github.com/codewithraheem/launchkit/actions"><img src="https://img.shields.io/badge/CI-Passing-brightgreen?style=flat-square" alt="CI status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license" /></a>
  <a href="#readiness-scoring"><img src="https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg?style=flat-square" alt="node version" /></a>
</p>

---

## 1. Product Introduction

**LaunchKit** is a command-line project readiness auditor designed for developers, students, freelancers, and engineering teams preparing JavaScript and TypeScript projects for release.

Before launching an app, publishing an npm package, or merging a milestone pull request, LaunchKit scans your workspace using real filesystem evidence to surface:
- Missing build, test, lint, or typecheck scripts.
- Disabled or loose TypeScript strict mode.
- Testing gaps and unconfigured default test placeholders.
- Accidental secret leaks, exposed `.pem`/`.key` files, or unignored `.env` files.
- Conflicting lockfiles (`package-lock.json` alongside `yarn.lock`).
- Missing CI/CD automation pipelines.

LaunchKit is **read-only by default**, performs **zero network requests**, and does not require migrating or refactoring your existing tech stack.

---

## 2. Feature Overview

- **Real Filesystem Evidence:** Detects project characteristics dynamically from manifests, lockfiles, and configuration files—never guesswork.
- **Framework & Language Aware:** Intelligently tailors checks for Next.js, Vite, React, Express, NestJS, Vue, Angular, Svelte, React Native, Expo, and monorepos.
- **Zero False Failures for JS:** JavaScript-only projects skip TypeScript checks gracefully without artificial penalties.
- **Transparent 0–100 Scoring:** Deterministic, documented math based on weighted findings.
- **Strict Secret Redaction:** Credentials and tokens matching high-confidence patterns are completely redacted (`[REDACTED]`) and never logged or included in reports.
- **Multi-Format Reporting:** Instant interactive terminal output, schema-validated JSON (`--format json`), and GitHub-flavored Markdown (`--format markdown`).
- **Safe Opt-In Build Execution:** Safely executes `npm run build` only when explicitly requested with `--run-build`, under configurable timeouts and bounded output buffers.
- **Standardized Exit Codes:** Predictable CI integration with `0` (clean), `1` (blocking issues), and `2` (invalid arguments or errors).

---

## 3. Installation and Usage

Run directly with `npx` (no installation required):

```bash
# Audit current directory
npx @codewithraheem/launchkit

# Audit a specific project folder
npx @codewithraheem/launchkit ./my-project
```

Or install globally:

```bash
npm install -g @codewithraheem/launchkit

launchkit ./my-project
```

Or install as a development dependency in your project:

```bash
npm install -D @codewithraheem/launchkit

# Add to package.json scripts:
# "audit:readiness": "launchkit"
```

---

## 4. CLI Commands and Options

```bash
# Scan current directory
launchkit

# Scan a specific directory
launchkit ./apps/web

# Verbose report with detailed explanations, evidence, and remediation steps
launchkit ./my-project --verbose

# Export a machine-readable JSON report
launchkit ./my-project --format json

# Export a GitHub-flavored Markdown report
launchkit ./my-project --format markdown

# Save report directly to a file
launchkit ./my-project --output launchkit-report.md --format markdown

# Overwrite existing report file safely
launchkit ./my-project --output launchkit-report.md --force

# Run only selected check categories (comma-separated)
launchkit ./my-project --checks scripts,typescript,tests

# Disable colored terminal output (accessible / CI logs)
launchkit ./my-project --no-color

# Opt-in: execute the project's build script to verify compilation
launchkit ./my-project --run-build

# Strict mode: fail with exit code 1 if warnings are detected
launchkit ./my-project --strict

# Display CLI version
launchkit --version

# Display CLI help
launchkit --help
```

### Options Summary

| Option | Shorthand | Description | Default |
| :--- | :--- | :--- | :--- |
| `[project-path]` | — | Target project directory | `.` |
| `--verbose` | — | Display evidence and remediation steps | `false` |
| `--format` | `-f` | Output format: `terminal`, `json`, `markdown` | `terminal` |
| `--output` | `-o` | Destination file path for report | — |
| `--checks` | `-c` | Comma-separated categories to run | all |
| `--no-color` | — | Disable terminal ANSI colors | `false` |
| `--run-build` | — | Opt-in: execute build script safely | `false` |
| `--strict` | — | Treat warnings as exit code 1 | `false` |
| `--force` | — | Allow overwriting existing output file | `false` |
| `--version` | `-v` | Show package version | — |
| `--help` | `-h` | Display usage instructions | — |

---

## 5. Supported Frameworks & Environments

LaunchKit detects project stacks via filesystem evidence:

- **Frameworks:** Next.js, Vite, React, Express, NestJS, Vue, Angular, Svelte / SvelteKit, React Native, Expo, and Monorepos (pnpm workspaces, Turborepo, Nx, Lerna, npm/yarn workspaces).
- **Languages:** TypeScript and JavaScript.
- **Package Managers:** npm, pnpm, Yarn, and Bun (detected via `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, or `packageManager` field).
- **Testing Tools:** Vitest, Jest, Playwright, Cypress, and the Node.js built-in test runner.
- **CI Platforms:** GitHub Actions, GitLab CI, CircleCI, Azure Pipelines, and Bitbucket Pipelines.

If a project framework cannot be identified with high confidence, LaunchKit reports `Unknown` rather than guessing.

---

## 6. Example Terminal Output

### Standard Concise View

```text
LaunchKit
Inspect. Improve. Launch.

Project:         example-next-app
Framework:       Next.js
Language:        TypeScript
Package Manager: npm

Readiness Score: 85/100

PASS  Package manifest is present
PASS  Package manifest is valid JSON
PASS  Package name "example-next-app" is valid
PASS  Package version "1.0.0" is valid semver
WARN  Node.js engine requirement is not specified
PASS  Deterministic lockfile present (package-lock.json)
PASS  Build script is configured
PASS  Test script is configured
WARN  No lint script configured
PASS  Typecheck script is configured
PASS  TypeScript configuration detected
PASS  TypeScript configuration parsed successfully
PASS  TypeScript strict mode is enabled
PASS  Testing framework and configuration detected
PASS  14 test file(s) found
PASS  Environment variable template found (.env.example)
PASS  Environment files (.env) are safely ignored in .gitignore
PASS  No exposed secret key or certificate files detected
PASS  No hardcoded credentials detected in scanned manifests
PASS  Git repository initialized
PASS  .gitignore file is present
PASS  node_modules is excluded by .gitignore
PASS  Continuous integration (CI) pipeline configured
PASS  CI workflow includes testing or build verification steps
PASS  Dependency declarations are well-formed
PASS  Build command configured (static inspection)

Summary
  Passed:   23
  Warnings: 2
  Failed:   0
  Skipped:  0

Recommended Next Steps
  1. [Recommended] Add an "engines" field to package.json, for example: "engines": { "node": ">=18.0.0" }.
  2. [Recommended] Configure a linter script in package.json (e.g. "lint": "eslint .").

Tip: Pass --verbose for detailed explanations, evidence, and remediation steps.
```

### Verbose View (`--verbose`)

When run with `--verbose`, each finding includes:
- Category tag
- Explanatory context
- Concrete evidence (e.g. file paths, config values)
- Actionable suggested remediation

---

## 7. JSON and Markdown Report Examples

### Exporting JSON

```bash
launchkit ./my-project --format json
```

Outputs schema-compliant JSON:

```json
{
  "schemaVersion": "1.0.0",
  "tool": {
    "name": "LaunchKit",
    "version": "0.1.0",
    "brand": "CodeWithRaheem"
  },
  "project": {
    "path": "./my-project",
    "name": "my-project",
    "version": "1.0.0",
    "framework": "nextjs",
    "language": "typescript",
    "packageManager": "npm",
    "isMonorepo": false,
    "hasGit": true
  },
  "summary": {
    "score": 85,
    "passed": 23,
    "warnings": 2,
    "failed": 0,
    "skipped": 0,
    "errors": 0,
    "totalApplicableChecks": 25,
    "calculationExplanation": "Score: 85/100 based on 25 applicable checks..."
  },
  "findings": [],
  "recommendations": []
}
```

See [docs/report-schema.md](docs/report-schema.md) for full schema details.

### Exporting Markdown

```bash
launchkit ./my-project --format markdown --output launchkit-audit.md
```

Generates a structured report with:
- Project Overview table
- Score banner and calculation explanation
- Summary Metrics breakdown
- Prioritized Next Steps
- Findings categorized with status badges (`[PASS]`, `[WARN]`, `[FAIL]`, `[SKIP]`)
- Legal disclaimer

---

## 8. Readiness Scoring Methodology

The LaunchKit Readiness Score is a deterministic 0 to 100 metric calculated from applicable checks:

- **Pass:** Awards **100%** of the check's assigned weight.
- **Warning:** Awards **50%** partial credit (represents recommendations and best practices).
- **Fail:** Awards **0%** credit (blocking issues supported by evidence).
- **Error:** Awards **0%** credit.
- **Skipped:** **Excluded** from both earned points and total points. Skipped checks never artificially raise or lower the score.

$$\text{Readiness Score} = \left\lfloor \frac{\sum \text{Earned Weights}}{\sum \text{Applicable Weights}} \times 100 \right\rceil$$

### Disclaimer
> **Important:** A readiness score of 100/100 indicates that all standard checklist criteria were satisfied. It is not an official guarantee of security, bug-free runtime behavior, or complete production readiness.

---

## 9. Exit Codes

LaunchKit uses standard, predictable exit codes suitable for CI/CD pipelines:

| Exit Code | Meaning | When Triggered |
| :---: | :--- | :--- |
| `0` | **Success** | No blocking issues detected. |
| `1` | **Blocking Issues** | Audit finished, but 1 or more `fail` (or `error`) findings were detected. Also returned when `--strict` is enabled and warnings exist. |
| `2` | **Execution Error** | Invalid CLI arguments, non-existent project directory, unsupported format, or filesystem write failure. |

---

## 10. Safety and Privacy Guarantees

LaunchKit is engineered for secure execution on sensitive codebases:

1. **Read-Only by Default:** Does not install dependencies, write files, or modify project manifests.
2. **Offline & Private:** Makes **zero outbound network requests**. No project files, telemetry, or metadata are ever transmitted.
3. **Strict Secret Redaction:** Files scanned for credential risks have sensitive values replaced with `[REDACTED]`. Secret values are never printed to terminal streams, logs, or reports.
4. **Directory Scoping:** Ignores massive generated folders (`node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`) to keep memory usage minimal and scans lightning fast.
5. **Bounded Execution:** When `--run-build` is opted into, child processes execute under strict timeouts (60 seconds) and bounded output buffers (50 KB).

---

## 11. Known Limitations

- **Static Analysis Heuristics:** LaunchKit audits configuration files, manifests, and file structures. It does not perform deep AST data-flow security analysis.
- **Opt-In Test Execution:** LaunchKit verifies test script declarations and test file presence, but does not execute test suites automatically.
- **Registry Checks:** LaunchKit does not query live npm registries for CVEs or outdated packages without local lockfile evidence.

---

## 12. Development Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/codewithraheem/launchkit.git
cd launchkit
npm install
```

---

## 13. Testing and Building

```bash
# Type check TypeScript code
npm run typecheck

# Run linter
npm run lint

# Format code with Prettier
npm run format

# Run unit and integration tests
npm test

# Run test coverage report
npm run test:coverage

# Build production bundles (ESM, CJS, and CLI executable)
npm run build

# Validate npm package archive contents
npm pack --dry-run
```

---

## 14. Contribution Guidelines

Contributions are welcome! Please follow these standards:

1. Open an issue describing your proposed check or bug fix.
2. Fork the repository and create a feature branch (`git checkout -b feature/new-check`).
3. Add unit and integration tests in `tests/` covering positive and negative cases.
4. Ensure all checks pass: `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
5. Submit a descriptive Pull Request.

---

## 15. License

Distributed under the [MIT License](LICENSE).

Copyright (c) 2025 CodeWithRaheem.

---

## 16. npm Publishing Instructions

To publish a new release of `@codewithraheem/launchkit` to npm:

1. **Verify All Tests and Quality Checks:**
   ```bash
   npm run typecheck
   npm run lint
   npm test
   npm run build
   ```

2. **Verify Package Contents:**
   ```bash
   npm pack --dry-run
   ```

3. **Authenticate with npm:**
   ```bash
   npm login
   ```

4. **Publish Under the Public Scope:**
   ```bash
   npm publish --access public
   ```
#   c o d e w i t h r a h e e m - l a u n c h k i t  
 