# AGENTS.md

## Project Overview

`<what this project does, who uses it, the quality bar that matters most>`

**Stack:** `<languages, runtimes, frameworks, database>`
**Entry points:** `<main services and where to find them>`

## Setup, Build, Test

```bash
# Install
<command>

# Build
<command>

# Test (single file preferred over full suite)
<single test command>
<full suite command>

# Run before any commit
<lint>
<format>
<typecheck>
```

Document non-obvious flags or env vars inline.

## Quality Gates

Deterministic enforcement — agent cannot skip.

* Pre-commit hook (fast): `<lint, format, secret-scan>`
* Pre-push hook (thorough): `<build + unit + integration>`
* Visual/E2E for UI (if applicable): `<e.g., Cypress, Playwright, Claude in Chrome — leave blank for non-UI projects>`
* Hook config lives in: `<.husky/, .pre-commit-config.yaml, .claude/settings.json — see code.claude.com/docs/en/hooks>`
* CI blocks on: `<list>`

## Code Style

Only what differs from language defaults.

* `<e.g., ES modules, not CommonJS>`
* `<e.g., destructure imports>`
* `<e.g., no `any` outside `internal/types/`>`
* `<e.g., Pydantic for all request/response shapes>`

## Architectural Principles

Decisions the agent must follow, not reinvent.

* `<e.g., Clean Architecture — core logic isolated from frameworks>`
* `<e.g., Repository pattern for all DB access>`
* `<e.g., All HTTP handlers go through middleware in `src/middleware/`>`
* `<e.g., Single responsibility, no `else` chains, low indentation>`

## Repository Layout

`<where logic, tests, docs, infra live — only if not obvious from the tree>`
`<.claude/skills/ — list of available skills, if any>`
`<.claude/agents/ — list of custom subagents, if any>`
`<doc/adr/ — list of binding ADRs, if any>`
`<doc/tasks/ — task tracking convention, if used>`

## Commit & PR Conventions

* Commits: `<conventional / project-specific>`
* Branches: `<feat/, fix/, chore/>`
* PRs require: `<green CI, one review, linked issue>`
* Never push to `<main>` directly.

## Security & Privacy

* Secrets: `<location — never committed>`
* Files the agent must not read or modify: `<list>`
* Data classification: `<e.g., no PII in logs>`
* Pre-approved commands (no prompt): `<e.g., gh, npm test, npm run lint>`
* MCP servers approved: `<list>`

## Gotchas

Real traps. Each one should map to an incident.

* `<e.g., migrations not idempotent — never edit, always create new>`
* `<e.g., DB is UTC, app displays America/Sao_Paulo>`

## External Resources

* Docs: `<URL>`
* Issues: `<URL>`
* Runbook: `<URL>`
