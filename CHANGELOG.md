# Changelog

All notable changes to `@codewithraheem/launchkit` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-17

### Added
- Initial release of LaunchKit CLI and auditing engine.
- Project detection engine supporting:
  - Frameworks: React, Next.js, Vite, Express, NestJS, Vue, Angular, Svelte, React Native, Expo, Monorepos.
  - Languages: JavaScript, TypeScript.
  - Package Managers: npm, pnpm, yarn, bun.
- Readiness checks suite:
  - Package manifest validation and metadata.
  - Useful scripts audit (`build`, `test`, `lint`, `typecheck`).
  - TypeScript configuration and strictness audit.
  - Testing frameworks and configuration audit (Vitest, Jest, Playwright, Cypress, Node.js test runner).
  - Environment variables, templates (`.env.example`), secret file leakage prevention, and `.gitignore` audit.
  - Git repository and GitHub Actions CI workflow audit.
  - Dependency sanity and conflicting lockfiles detection.
  - Opt-in safe build verification (`--run-build`).
- Transparent deterministic readiness scoring (0-100) with weighted checks.
- Multi-format reporters:
  - Terminal interactive reporter with rich colors, icons, and `--no-color` support.
  - Valid machine-readable JSON schema reporter (`--format json`).
  - Comprehensive Markdown report generator (`--format markdown`).
  - File output support (`--output <file>`).
  - Selective check execution (`--checks <list>`).
  - Detailed verbose diagnostics (`--verbose`).
- Read-only safety mechanisms, secret redaction, and bounded execution.
