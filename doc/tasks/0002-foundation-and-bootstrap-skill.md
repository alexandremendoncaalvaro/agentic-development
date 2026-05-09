# Task 0002: Build skill source tree and ship `agentic-bootstrap` for both agents

**Status:** proposed
**Created:** 2026-05-08
**Owner:** Alexandre Alvaro
**Board ref:**

## Context

First implementation chunk of v0.2 (Chunk 1 in [doc/v0.2-cli-plan.md](../v0.2-cli-plan.md)). Establishes the skill source layout under `src/skills/<agent>/<skill>/`, refactors `agentic init` from "print prompt" (v0.1) to "install skills" (v0.2 per [ADR-0002](../adr/0002-two-phase-architecture.md)), and ships the first working skill — `agentic-bootstrap`, which generates `AGENTS.md`. Validates the entire install model end-to-end before any other skills are added, so later skills only have to follow the proven pattern.

## Acceptance Criteria

- [ ] `src/skills/claude-code/agentic-bootstrap/SKILL.md` exists with frontmatter matching Anthropic's Skills format (`name`, `description`, `allowed-tools`, `argument-hint`)
- [ ] `src/skills/codex/agentic-bootstrap/SKILL.md` and `src/skills/codex/agentic-bootstrap/agents/openai.yaml` exist matching cc-sdd's Codex format ([ADR-0001](../adr/0001-skills-mode-for-claude-and-codex.md))
- [ ] `agentic init` installs the skill into the correct path per agent choice (`.claude/skills/agentic-bootstrap/` or `.agents/skills/agentic-bootstrap/`)
- [ ] Integration test (vitest) spawns the CLI in a `mktemp` directory, asserts files land at expected paths, asserts idempotency on re-run
- [ ] Manual end-to-end: `/agentic-bootstrap` invokable in Claude Code, runs the AGENTS.md interview, writes the file at the repo root

## Plan

- [ ] Create `src/skills/{claude-code,codex}/agentic-bootstrap/` directory structure
- [ ] Write `SKILL.md` for Claude Code (Markdown body with `agents-general.md` + `agents-project.md` content inlined; frontmatter as above)
- [ ] Write `SKILL.md` for Codex (XML-tagged body — `<background_information>`, `<instructions>`; minimal frontmatter)
- [ ] Write `agents/openai.yaml` for Codex (`interface.display_name`, `interface.short_description`, `policy.allow_implicit_invocation: false`)
- [ ] Refactor `src/commands/init.js`: remove prompt-printing, add skill-copying logic that reads `src/skills/<agent>/` and writes to target's `.claude/skills/` or `.agents/skills/`
- [ ] Update TUI: ask which agent(s) (Claude Code / Codex / both); confirm skill list (only `agentic-bootstrap` for now)
- [ ] Write `test/init.test.js` covering: greenfield install, brownfield install, both-agents install, idempotent re-run
- [ ] Manual e2e in a real test project, log result in Notes
- [ ] Commit on `cli` branch

## Notes

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
