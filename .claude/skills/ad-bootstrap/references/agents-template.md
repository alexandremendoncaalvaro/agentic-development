## Contents

- Project Overview
- Setup, Build, Test
- Quality Gates
- Code Style
- Architectural Principles
- Repository Layout
- Commit & PR Conventions
- Security & Privacy
- Gotchas

````markdown
# AGENTS.md

## Project Overview

`<one sentence: what it does, who runs it, the constraint a wrong change would violate>`

**Stack:** `<languages + versions, runtimes, frameworks, database>`
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

<when-no-guidelines>
Deterministic enforcement — agent cannot skip.

* Pre-commit hook (fast): `<lint, format, secret-scan>`
* Pre-push hook (thorough): `<build + unit + integration>`
* Visual/E2E for UI (if applicable): `<e.g., Cypress, Playwright, Claude in Chrome — leave blank for non-UI projects>`
* Hook config lives in: `<.husky/, .pre-commit-config.yaml, .claude/settings.json — see code.claude.com/docs/en/hooks>`
* CI blocks on: `<list>`
</when-no-guidelines>

<when-guidelines-md-exists>
See [`GUIDELINES.md`](GUIDELINES.md) §8 for the full reference. Non-negotiable subset:

* `<distilled pre-push hook line>`
* `<distilled pre-commit hook line — or "intentionally absent" if not wired>`
* Never bypass: no `--no-verify`, no skipped hooks, no deleted failing tests.
</when-guidelines-md-exists>

## Code Style

<when-no-guidelines>
Only what differs from language defaults.

* `<e.g., ES modules, not CommonJS>`
* `<e.g., destructure imports>`
* `<e.g., no `any` outside `internal/types/`>`
* `<e.g., Pydantic for all request/response shapes>`
</when-no-guidelines>

<when-guidelines-md-exists>
See [`GUIDELINES.md`](GUIDELINES.md) §2 for the full reference. Non-negotiable subset:

* `<language-specific naming convention line>`
* `<error-handling pattern line>`
* `<module-surface line — ESM vs CommonJS, named-vs-default exports, etc.>`
</when-guidelines-md-exists>

## Architectural Principles

Binding decisions live in [`doc/adr/`](doc/adr/). Do not reinvent.

## Repository Layout

`<where logic, tests, docs, infra live — only if not obvious from the tree>`
`<.claude/skills/ — list of available skills, if any>`
`<.claude/agents/ — list of custom subagents, if any>`
`<doc/adr/ — list of binding ADRs, if any>`
`<doc/tasks/ — task tracking convention, if used>`

## Commit & PR Conventions

<when-no-guidelines>
* Commits: `<conventional / project-specific>`
* Branches: `<feat/, fix/, chore/>`
* PRs require: `<green CI, one review, linked issue>`
* Never push to `<main>` directly.
</when-no-guidelines>

<when-guidelines-md-exists>
See [`GUIDELINES.md`](GUIDELINES.md) §10 for the full reference. Non-negotiable subset:

* `<commit-format line — Conventional Commits + DCO sign-off>`
* `<branch-strategy line — main / feature-branch policy>`
* Never push to `<main>` directly.
</when-guidelines-md-exists>

## Security & Privacy

<when-no-guidelines>
* Secrets: `<location — never committed>`
* Files the agent must not read or modify: `<list>`
* Data classification: `<e.g., no PII in logs>`
* Pre-approved commands (no prompt): `<e.g., gh, npm test, npm run lint>`
* MCP servers approved: `<list>`
</when-no-guidelines>

<when-guidelines-md-exists>
See [`GUIDELINES.md`](GUIDELINES.md) §12 for the full reference. Non-negotiable subset:

* `<secret-handling line — env files gitignored>`
* `<files-not-to-read line — .env, .npmrc, etc>`
* `<pre-approved commands line — agent-allowed no-prompt list>`
</when-guidelines-md-exists>

## Gotchas

Real traps. Each one should map to an incident or to specific code.

* `<e.g., migrations not idempotent — never edit, always create new>`
* `<e.g., DB is UTC, app displays America/Sao_Paulo>`
````
