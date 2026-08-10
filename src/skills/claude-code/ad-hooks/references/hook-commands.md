# Hook commands and config shapes

Reference for `/ad-hooks`: the per-stack command catalog (Step 2) and the per-runner config shapes (Step 3). The stage and runner decision logic stays inline in `SKILL.md`.

## Per-stack commands

* **Node (`package.json` present):** lint = `npm run lint` (fall back to `npx eslint .` if no `lint` script); format check = `npm run format:check` (fall back to `npx prettier --check .`); secret-scan = `gitleaks detect --no-banner` (cite the install instruction); build = `npm run build` (skip if no script); test = `npm test`.
* **Python (`pyproject.toml` present):** lint = `ruff check .`; format check = `ruff format --check .` or `black --check .`; secret-scan = `gitleaks detect --no-banner`; test = `pytest -q`.
* **Go (`go.mod` present):** lint = `golangci-lint run`; format check = `gofmt -d .`; secret-scan = `gitleaks detect --no-banner`; build = `go build ./...`; test = `go test ./...`.
* **Rust (`Cargo.toml` present):** lint = `cargo clippy -- -D warnings`; format check = `cargo fmt --check`; secret-scan = `gitleaks detect --no-banner`; build = `cargo build`; test = `cargo test`.

## Per-runner config shapes

Below are the canonical shapes; adapt to the user's tier choices.

**Husky** — `.husky/pre-commit` and `.husky/pre-push` (shell scripts). Plus a `prepare` script in `package.json` (`"prepare": "husky"`). User runs `npm install` once to bootstrap.

**lefthook** — `lefthook.yml` at the repo root with `pre-commit` and `pre-push` commands keyed by stage. User runs `lefthook install` once.

**pre-commit (pre-commit.com)** — `.pre-commit-config.yaml` referencing the canonical hooks for the stack (e.g., `pre-commit/mirrors-eslint`, `psf/black`, `astral-sh/ruff-pre-commit`). User runs `pre-commit install` and `pre-commit install --hook-type pre-push`.

**Native `.git/hooks/`** — `.git/hooks/pre-commit` and `.git/hooks/pre-push` plus a `setup-hooks.sh` script the user runs after every clone (since `.git/` is not committed). Document the setup-script invocation in `AGENTS.md`.
