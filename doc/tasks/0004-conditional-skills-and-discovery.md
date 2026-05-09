# Task 0004: Conditional skills (`agentic-design`, `agentic-skill`, `agentic-subagent`) and feature detection

**Status:** proposed
**Created:** 2026-05-08
**Owner:** Alexandre Alvaro
**Board ref:**

## Context

Chunk 3 of v0.2 (per [doc/v0.2-cli-plan.md](../v0.2-cli-plan.md)). Adds the optional skills that only make sense in specific project contexts (frontend → `agentic-design`; Claude Code → `agentic-subagent`). Wires project feature detection into the TUI so defaults are intelligent without forcing the user to reason about every skill on every install.

## Acceptance Criteria

- [ ] `agentic-design` exists for Claude Code and Codex
- [ ] `agentic-skill` exists for both agents (a skill that creates new skills, meta but useful)
- [ ] `agentic-subagent` exists for Claude Code only (subagents are a CC-specific feature)
- [ ] `src/lib/detect.js` exports `detectFeatures(cwd)` returning at minimum `{ frontend: boolean, hasClaudeCode: boolean, hasCodex: boolean }`
- [ ] TUI shows detected features in a `p.note(...)` panel and proposes appropriate skill defaults (already-checked checkboxes); user can override
- [ ] Integration tests cover: frontend-detected scenario (`agentic-design` checked by default), no-frontend (`agentic-design` unchecked), Claude-only project, Codex-only project, both-agents project

## Plan

- [ ] Write `agentic-design` for both agents (uses the bootstrap-from-tokens approach from `prompts/design.md`; no template since DESIGN.md is bootstrapped from real tokens)
- [ ] Write `agentic-skill` for both agents (template inlined: `templates/skill.md`)
- [ ] Write `agentic-subagent` for Claude Code only (template inlined: `templates/subagent.md`)
- [ ] Implement `detectFeatures(cwd)` in `src/lib/detect.js`:
      - Frontend signals: `package.json` deps include React/Vue/Svelte/Solid/Preact, OR existence of `*.tsx`/`*.jsx`, OR `tailwind.config.*` / `tokens.json`
      - Claude Code signals: existence of `.claude/` directory
      - Codex signals: existence of `.openai/` or `.agents/skills/` directory
- [ ] Wire `detectFeatures()` into the TUI default selection
- [ ] Extend integration tests with feature-conditional scenarios
- [ ] Manual e2e on a frontend project, a backend project, a mixed project, log in Notes
- [ ] Commit on `cli` branch

## Notes

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
