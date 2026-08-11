# Hook commands and config shapes

Reference for `/ad-hooks`: the per-stack command catalog (Step 2) and the per-runner config shapes (Step 3). The stage and runner decision logic stays inline in `SKILL.md`.

## Per-stack commands

- Node: lint = `npm run lint` or `npx eslint .`; format check = `npm run format:check` or `npx prettier --check .`; secret-scan = `gitleaks detect --no-banner`; build = `npm run build` (skip if no script); test = `npm test`.
- Python: lint = `ruff check .`; format check = `ruff format --check .` or `black --check .`; secret-scan = `gitleaks detect --no-banner`; test = `pytest -q`.
- Go: lint = `golangci-lint run`; format check = `gofmt -d .`; secret-scan = `gitleaks detect --no-banner`; build = `go build ./...`; test = `go test ./...`.
- Rust: lint = `cargo clippy -- -D warnings`; format check = `cargo fmt --check`; secret-scan = `gitleaks detect --no-banner`; build = `cargo build`; test = `cargo test`.

## Per-runner config shapes

- Husky: `.husky/pre-commit` and `.husky/pre-push` (shell scripts) + `"prepare": "husky"` in `package.json`. Bootstrap: `npm install`.
- lefthook: `lefthook.yml` at the repo root with `pre-commit` and `pre-push` commands keyed by stage. Bootstrap: `lefthook install`.
- pre-commit: `.pre-commit-config.yaml` with stack-specific hook references. Bootstrap: `pre-commit install` and `pre-commit install --hook-type pre-push`.
- Native: `.git/hooks/pre-commit` and `.git/hooks/pre-push` + a `setup-hooks.sh` script the user runs after every clone (since `.git/` is not committed).
