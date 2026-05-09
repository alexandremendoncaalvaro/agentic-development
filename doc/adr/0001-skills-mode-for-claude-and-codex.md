# ADR-0001: Skills mode for both Claude Code and Codex

**Status:** accepted
**Date:** 2026-05-08
**Deciders:** Alexandre Alvaro

## Context

The v0.2 of `@alexandrealvaro/agentic` needs to expose its capabilities (generate AGENTS.md, ARCHITECTURE.md, ADRs, etc.) from inside the agentic coding tools the author uses: Claude Code and Codex CLI.

Both agents support multiple extension mechanisms:

- Claude Code:
  - `.claude/commands/<name>.md` — legacy slash commands.
  - `.claude/skills/<name>/SKILL.md` — modern Skills format. Anthropic's own documentation states custom commands have been merged into skills; both create `/<name>` invocations and skills add auto-discovery, supporting files, richer frontmatter.
- Codex CLI:
  - `~/.codex/prompts/*.md` — Custom Prompts, user-level only, not committed to a repository.
  - `.agents/skills/<name>/SKILL.md` — the convention used by [`gotalab/cc-sdd`](https://github.com/gotalab/cc-sdd) for project-level skills, surfaced to Codex through entries in the project's `AGENTS.md`. Codex reads `AGENTS.md` at session start and follows its instructions.

We need a project-level, committable, repo-shareable mechanism that works in both agents and follows the same well-evaluated patterns the spec-driven dev community already uses.

## Decision

The CLI will install skills as **project-level Skills** for both agents:

- **Claude Code:** `.claude/skills/agentic-<name>/SKILL.md`. Frontmatter uses the modern fields (`name`, `description`, `allowed-tools`, `argument-hint`).
- **Codex:** `.agents/skills/agentic-<name>/SKILL.md` plus a sibling `agents/openai.yaml` with `interface` and `policy` blocks, mirroring cc-sdd's structure exactly. The project's `AGENTS.md` is created or updated to reference the installed skills so Codex knows to use them.

Slash commands (legacy) are not used.

## Consequences

Positive:

- Both agents land on the modern, recommended mechanism.
- All skills are committed to the project repo, shareable with teams.
- Aligns with `gotalab/cc-sdd`, which is the most mature multi-agent SDD harness — we benefit from a validated path.
- Skills support auto-discovery in Claude Code (the agent picks them up by description), reducing the cognitive load of remembering slash commands.

Negative / trade-offs:

- The Codex path (`.agents/skills/`) is a community convention rather than a documented OpenAI feature. Adoption depends on Codex reading `AGENTS.md` and following the listed instructions. Mitigation: update `AGENTS.md` defensively with explicit invocation instructions; verify the skills are actually invoked during integration testing.
- Two source trees inside this repo (`src/skills/claude-code/` and `src/skills/codex/`) because frontmatter and body conventions differ. Some duplication is unavoidable. Mitigation: keep skills small enough that maintaining two variants is cheap.
- We carry forward less by not supporting `.claude/commands/` legacy. Users on very old Claude Code versions would not see our skills; acceptable given the audience uses up-to-date Claude Code.

## Alternatives Considered

- **Slash commands only (`.claude/commands/`)** — rejected. Anthropic's docs flag this as legacy merged into skills. We would lose auto-discovery and supporting files for no benefit.
- **User-level Codex Custom Prompts (`~/.codex/prompts/`)** — rejected. Not shareable with teammates or future contributors of a project. Cannot be checked into a repo.
- **Single mechanism for both agents** — rejected as not feasible. The agents have different conventions (`.claude/skills/` vs `.agents/skills/`), different frontmatter, different invocation discovery. Trying to unify forces square-peg fixes.
- **Heavy CLI with full TUI replacing the agents** — rejected. See [ADR-0002](0002-two-phase-architecture.md). Reinventing the agent's interview UX is wasted effort and worse UX.
