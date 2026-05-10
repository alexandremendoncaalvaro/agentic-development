# Task `0025`: Ship `agentic-commit` workflow-operational skill

**Status:** proposed
**Created:** 2026-05-10
**Owner:** Alexandre Alvaro
**Spec ref:** [ADR-0023](../adr/0023-agentic-commit-skill.md)
**Board ref:**

## Context

[ADR-0023](../adr/0023-agentic-commit-skill.md) accepts a workflow-operational skill that scaffolds atomic Conventional Commits with DCO `Signed-off-by` sign-off. First of the three-skill commit/PR/merge bundle drafted on 2026-05-10. Pairs with [task-0026](0026-agentic-pr-skill.md) (`agentic-pr`) and [task-0027](0027-agentic-merge-skill.md) (`agentic-merge`).

Profile placement: universal at `solo` / `team` / `mature`; not at `poc` (commit discipline aligns with the other artifact-producing layers).

## Acceptance Criteria

- [ ] [`src/skills/claude-code/agentic-commit/SKILL.md`](../../src/skills/claude-code/agentic-commit/SKILL.md) — name, allowed-tools `Read, Bash`, trigger keywords from ADR-0023.
- [ ] [`src/skills/codex/agentic-commit/{SKILL.md,agents/openai.yaml}`](../../src/skills/codex/agentic-commit/) — Codex parity, `<background_information>` / `<instructions>` / `<output_contract>` template.
- [ ] [`src/lib/profiles.js`](../../src/lib/profiles.js) — `agentic-commit` in `solo` / `team` / `mature` `universal` lists.
- [ ] [`src/commands/init.js`](../../src/commands/init.js) — slashLine summary lists `/agentic-commit` for non-`poc` profiles.
- [ ] [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) — `SKILL_DESCRIPTIONS` entry.
- [ ] [`README.md`](../../README.md) — skill table + count refreshed (universal at `solo` / `team` / `mature`).
- [ ] Four-phase body per ADR-0023 §2: scope intake → stage-split → draft message → sign + write. Conventional Commits format. `Signed-off-by` from `git config user.name` / `user.email`. No `Co-Authored-By` trailer.
- [ ] Tests: profile-coverage assertion in [test/profile.test.js](../../test/profile.test.js) for `solo` / `team` / `mature` only.
- [ ] Dogfood install refreshed; skill lands at `.claude/skills/agentic-commit/` and `.agents/skills/agentic-commit/`.
- [ ] `npm test` passes.

## Plan

- [x] Draft + accept [ADR-0023](../adr/0023-agentic-commit-skill.md).
- [ ] Implement [Claude](../../src/skills/claude-code/agentic-commit/SKILL.md) + [Codex](../../src/skills/codex/agentic-commit/SKILL.md) skill bodies.
- [ ] Wire profiles + init + rootdoc + tests.
- [ ] Dogfood refresh.
- [ ] Atomic commits + PR + merge.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- **2026-05-10** — Task opened. Decisions confirmed: trailer = `Signed-off-by` only, identity = live from `git config`, atomic enforcement = stage-split interactively, profile placement = `solo` / `team` / `mature`, posture = helper not blocker.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
