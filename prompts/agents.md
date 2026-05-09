# Bootstrap AGENTS.md

Open standard: [agents.md](https://agents.md) (Linux Foundation / Agentic AI Foundation). Claude Code reads `CLAUDE.md`; mirror or import via `@AGENTS.md`.

## Paste to your agent

> Read [`templates/agents-project.md`](../templates/agents-project.md). Your job: produce a single `AGENTS.md` at the repo root, ≤150 lines, every line operational. Generic agent behavior (think-before-coding, verify-before-done, etc.) does **not** belong here — that lives in the `agentic-philosophy` skill.
>
> **Step 1 — Scan.** Read `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` / equivalent, `README.md`, top-level directories, `doc/` and `doc/adr/` if present, `.claude/` if present, lockfiles, hook configs (`.husky/`, `.pre-commit-config.yaml`, `.github/workflows/`), `git remote -v`. Build a model of stack, entry points, build/test commands, conventions, quality gates, security boundaries, gotchas confirmed by code.
>
> **Step 2 — Pre-fill.** For every `<placeholder>` in [`templates/agents-project.md`](../templates/agents-project.md), fill it from observed signals. No fabrication. If a section has no signal, mark `<TODO: not yet wired>` in one line and move on — do not write meta-prose explaining the gap.
>
> **Step 3 — Show me only the gaps.** Print:
> - (a) placeholders you could not fill from repo signals;
> - (b) signals that conflict (e.g. two test commands, two style configs).
>
> One question per gap. Skip everything you filled confidently. Do **not** ask philosophical questions ("is this doc primarily for agents or humans?", "what's the most important quality bar?") — those are decisions, not interview material.
>
> **Step 4 — On my confirmation, write `AGENTS.md`.** Cut every line that does not change agent behavior. No "External Resources" section (the agent derives URLs from `git remote` / `package.json`). No marketing prose. No appended Universal Agent Behavior block.
>
> If something I say contradicts what the code shows, surface the conflict. Don't silently trust me; don't silently trust the code. Flag and wait.
