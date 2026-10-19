# LaunchKit Readiness Checks Reference

LaunchKit inspects projects across 9 check categories with over 25 distinct rules.

## Check Categories

| Category | Description | Primary Target Files |
| :--- | :--- | :--- |
| `package` | Manifest validity, naming, semver, lockfiles, and publishing metadata | `package.json`, lockfiles |
| `scripts` | Build, test, lint, and typecheck command definitions | `package.json` |
| `typescript` | TypeScript configuration, strict mode, compiler options | `tsconfig.json` |
| `tests` | Test framework detection, test configs, and test suites | Test files, test runner configs |
| `environment`| Environment templates, secret file exposure, `.gitignore` coverage | `.env*`, `.gitignore`, keys |
| `git` | Git repository presence, `.gitignore` completeness | `.git`, `.gitignore` |
| `ci` | CI pipeline configuration and automated verification | `.github/workflows/*`, CI files |
| `dependencies`| Dependency syntax validity and library version alignment | `package.json` |
| `build` | Static build script inspection or opt-in compilation test | `package.json`, build runner |

---

## Detailed Check Rules

### 1. Package Manifest & Lockfile (`package`)
- **`pkg-manifest-present`** (Status: `pass` | `fail`): Checks if `package.json` exists in project root.
- **`pkg-manifest-valid`** (Status: `pass` | `fail`): Validates that `package.json` contains valid JSON syntax.
- **`pkg-name-valid`** (Status: `pass` | `warn` | `fail`): Validates npm naming conventions (URL safe, <= 214 chars, lowercase).
- **`pkg-version-valid`** (Status: `pass` | `warn`): Validates semantic versioning (MAJOR.MINOR.PATCH).
- **`pkg-engines-node`** (Status: `pass` | `warn`): Checks whether `engines.node` specifies required runtime version.
- **`pkg-multiple-lockfiles`** (Status: `pass` | `fail`): Detects conflicting lockfiles (e.g. `package-lock.json` and `yarn.lock`).
- **`pkg-missing-lockfile`** (Status: `pass` | `warn`): Warns if no lockfile is present.
- **`pkg-metadata-publishing`** (Status: `pass` | `warn`): For non-private packages, checks for `description` and `license`.

### 2. Scripts Configuration (`scripts`)
- **`scripts-build-configured`** (Status: `pass` | `warn` | `fail`): Verifies `build` script. If the project framework requires bundling (Next.js, Vite, NestJS, etc.), missing build is a blocking `fail`.
- **`scripts-test-configured`** (Status: `pass` | `warn` | `fail`): Verifies `test` script. Flags default unconfigured npm placeholder (`echo "Error: no test specified" && exit 1`) as `fail`.
- **`scripts-lint-configured`** (Status: `pass` | `warn`): Recommends a lint command (ESLint, Biome, etc.).
- **`scripts-typecheck-configured`** (Status: `pass` | `warn` | `skipped`): Checks for `typecheck` / `tsc --noEmit` script in TypeScript projects. Skipped for JavaScript projects.
- **`scripts-malformed`** (Status: `pass` | `fail`): Flags any script key with an empty or whitespace string.

### 3. TypeScript Configuration (`typescript`)
- **`ts-usage`** (Status: `pass` | `skipped`): Skips TypeScript checks if project does not use TypeScript.
- **`ts-config-present`** (Status: `pass` | `fail`): Fails if TypeScript project lacks `tsconfig.json`.
- **`ts-config-valid`** (Status: `pass` | `fail`): Parses `tsconfig.json` using safe comment-stripping JSONC parser.
- **`ts-strict-mode`** (Status: `pass` | `warn`): Checks `compilerOptions.strict: true` or equivalent strict flags.
- **`ts-compiler-target`** (Status: `pass` | `warn`): Warns if compiling to legacy ES3/ES5 targets.

### 4. Test Readiness (`tests`)
- **`tests-framework-detected`** (Status: `pass` | `warn`): Detects Vitest, Jest, Playwright, Cypress, or Node.js test runner.
- **`tests-files-present`** (Status: `pass` | `warn`): Scans project tree for test suites (`*.test.*`, `*.spec.*`, `__tests__`).

### 5. Environment & Secret Safety (`environment`)
- **`env-template-present`** (Status: `pass` | `warn`): Checks for `.env.example`, `.env.sample`, or `.env.template`.
- **`env-gitignore-coverage`** (Status: `pass` | `fail`): Fails if `.env` or `.env.local` exists but is not ignored by `.gitignore`.
- **`env-secret-files-risk`** (Status: `pass` | `fail`): Detects unignored cryptographic key files (`.pem`, `.key`, `id_rsa`).
- **`env-hardcoded-secrets`** (Status: `pass` | `fail`): Scans manifests for suspicious API keys, access tokens, or credentials with strict value redaction.

### 6. Git & .gitignore (`git`)
- **`git-repo-initialized`** (Status: `pass` | `warn`): Checks if `.git` directory exists.
- **`git-ignore-present`** (Status: `pass` | `fail`): Fails if `.gitignore` is missing.
- **`git-ignore-node-modules`** (Status: `pass` | `fail`): Fails if `.gitignore` does not exclude `node_modules/`.

### 7. CI/CD Readiness (`ci`)
- **`ci-workflow-configured`** (Status: `pass` | `warn`): Checks for GitHub Actions, GitLab CI, CircleCI, or Azure Pipelines.
- **`ci-validation-steps`** (Status: `pass` | `warn`): Verifies if CI workflows execute tests or build commands.

### 8. Dependencies (`dependencies`)
- **`deps-manifest-sanity`** (Status: `pass` | `fail`): Validates dependency entries for non-empty names and version strings.
- **`deps-react-alignment`** (Status: `pass` | `warn`): Ensures matching major versions between `react` and `react-dom`.

### 9. Build Readiness (`build`)
- **`build-readiness-static`** (Status: `pass` | `skipped`): Static verification in default read-only mode.
- **`build-execution-optin`** (Status: `pass` | `fail` | `error`): Only executes when `--run-build` is supplied. Runs build using detected package manager under 60-second timeout with bounded output capture.
