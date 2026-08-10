# ADR-0062: Default bare `init` to both hosts

**Status:** accepted
**Date:** 2026-08-10
**Deciders:** Alexandre Alvaro

## Context

The kit ships matching Claude Code and Codex skill sets, but a non-interactive `agentic init --yes` without `--agent` chooses only agents already represented by a local configuration directory. A new repository and a repository containing only `.claude/` therefore receive Claude skills only; Codex skills are silently absent even though the kit supports both hosts.

The failure reproduces in both layouts. The installed Codex destination is `.agents/skills`, which is the current repository-local discovery root documented for Codex. The failure is agent selection before installation, not a missing Codex source tree or a wrong Codex skill path.

## Decision

We will make a non-interactive `init` without `--agent` install skills for both Claude Code and Codex. Explicit `--agent claude-code`, `--agent codex`, and `--agent both` selections remain authoritative. Interactive selection remains an explicit operator choice.

## Consequences

Positive:

- A bare bootstrap provides the dual-host kit it advertises, including for an empty repository or one that starts with only `.claude/`.
- Codex uses the documented `.agents/skills` repository path without requiring the operator to discover a hidden `--agent both` workaround.
- Single-host installs stay available through the existing explicit flag.

Negative:

- A non-interactive bootstrap that previously created only Claude files now also creates the Codex skill tree and state file.
- Operators that intentionally want a Claude-only unattended install must state that intent with `--agent claude-code`.

## Alternatives Considered

* **Keep the detected-agent default** — rejected because absence of `.agents/` is exactly the state in which Codex needs installing.
* **Treat `.claude/` as evidence that Codex is installed** — rejected because it would make detection report a false fact instead of choosing a better bootstrap default.
* **Install Codex skills under `.codex/skills`** — rejected because Codex documents `.agents/skills` as the repository discovery path; `.codex/agents` remains the separate subagent destination.
* **Print a warning and keep Claude-only installation** — rejected because a warning does not provide the missing capability and is easy to lose in a non-interactive install log.
