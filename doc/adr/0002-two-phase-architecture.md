# ADR-0002: Two-phase architecture (CLI install + agent skills)

**Status:** accepted
**Date:** 2026-05-08
**Deciders:** Alexandre Alvaro

## Context

The kit needs to deliver a smooth onboarding experience: starting from an empty or existing project, a developer should end up with a curated set of artifacts (`AGENTS.md`, `ARCHITECTURE.md`, ADRs, optional `DESIGN.md`, skills, subagents) that follow the kit's principles (see [WORKFLOW.md](../../WORKFLOW.md)).

The work splits naturally into two kinds of activity:

1. **Filesystem operations** — auto-detecting project state, choosing which skills to install for which agent, writing skill files into the right directories, scaffolding root doc files (`CLAUDE.md`, `AGENTS.md`), updating them idempotently.
2. **Content generation through interview** — asking the developer about stack, build commands, architectural patterns, naming conventions; reading the existing codebase to verify or contradict; producing the final markdown content of each artifact.

These two activities have different best tools. Filesystem ops are deterministic and fit a small CLI well. Interview-driven generation is a multi-turn conversation with code-reading capability — exactly what Claude Code and Codex already provide natively.

The v0.1.0-beta.1 CLI tried to bridge both by printing a self-contained prompt the developer would paste into the agent. It worked but was clunky, and as we add more artifact types it would scale poorly: every new artifact would either need its own CLI prompt printer or the developer would lose the benefit of the CLI altogether.

GitHub's [spec-kit](https://github.com/github/spec-kit) and [gotalab/cc-sdd](https://github.com/gotalab/cc-sdd) both solve this same problem with the same architecture: a small CLI that installs slash commands or skills, and the agents do the rest.

## Decision

Adopt a two-phase architecture, with a clear tool boundary between them:

- **Phase 1 — `agentic init` (CLI).** Filesystem only. Auto-detects project mode and features, runs a small TUI to confirm choices, copies skills from this kit's `src/skills/<agent>/` into the target's `.claude/skills/` and/or `.agents/skills/`, creates or updates the agent's root doc file. Does not interview the developer about content. Idempotent on re-run.
- **Phase 2 — Skills in the agent.** The developer invokes `/agentic-bootstrap`, `/agentic-architecture`, `/agentic-adr`, etc. inside Claude Code or Codex. Each skill embeds the relevant template inline, instructs the agent to interview the developer and read the codebase as appropriate, and produces the final artifact at the right path in the repo.

The CLI never asks for content. The agent never has to set up the filesystem.

## Consequences

Positive:

- The agent's strengths (multi-turn conversation, code reading, contextual generation) are used for the content work — we do not reinvent them.
- The CLI stays small and fast: TUI for confirmation, no interview logic, no LLM dependency.
- Easier to test: filesystem ops are deterministic and unit-testable; the agent-side skills can be exercised manually and through skill-specific golden fixtures.
- Aligns with established multi-agent SDD harnesses (spec-kit, cc-sdd), so contributors and users encounter a familiar pattern.

Negative / trade-offs:

- Two-step setup (run CLI, then run a slash command) instead of one. Mitigated by the CLI ending with a clear next-action message ("Run `/agentic-bootstrap` in Claude Code to generate AGENTS.md") and by the skills being auto-discoverable in Claude Code.
- Two different code surfaces to maintain: the CLI (Node.js) and the skills (markdown). Tracked by keeping skills small and the CLI mostly file-copy logic.
- Skills depend on the agent reading their content correctly. Coverage gaps in any agent's skill support translate to capability gaps for that agent. Mitigation: integration tests run the actual agents on the actual skill files; documented limitations per agent in each skill.

## Alternatives Considered

- **Heavy CLI with full TUI for the entire interview.** Rejected. Would replicate what Claude Code and Codex already do, badly. The CLI cannot read the codebase like the agent can, and we would lose all the conversational context the user already has open.
- **Agent-only, no CLI.** Rejected. Skills have to land somewhere on disk, and the user needs a way to install them across many projects. A CLI is the most ergonomic distribution path. spec-kit and cc-sdd reach the same conclusion.
- **CLI prompt printer (current v0.1).** Superseded by this ADR. Worked for `init` but does not scale to the full set of artifacts; every artifact would need its own printer, and the user would constantly tab between terminal and agent.
