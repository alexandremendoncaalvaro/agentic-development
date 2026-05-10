# Task `0026`: Ship `agentic-pr` workflow-operational skill

**Status:** proposed
**Created:** 2026-05-10
**Owner:** Alexandre Alvaro
**Spec ref:** [ADR-0024](../adr/0024-agentic-pr-skill.md)
**Board ref:**

## Context

[ADR-0024](../adr/0024-agentic-pr-skill.md) accepts a workflow-operational skill that scaffolds opening a PR via `gh pr create` with a uniform body shape (Summary / Test plan / Links). Second of the three-skill commit/PR/merge bundle drafted on 2026-05-10. Pairs with [task-0025](0025-agentic-commit-skill.md) (`agentic-commit`) and [task-0027](0027-agentic-merge-skill.md) (`agentic-merge`).

Profile placement: universal at `solo` / `team` / `mature`; not at `poc`.

## Acceptance Criteria

- [ ] [`src/skills/claude-code/agentic-pr/SKILL.md`](../../src/skills/claude-code/agentic-pr/SKILL.md) — name, allowed-tools `Read, Bash, Glob, Grep`, trigger keywords from ADR-0024.
- [ ] [`src/skills/codex/agentic-pr/{SKILL.md,agents/openai.yaml}`](../../src/skills/codex/agentic-pr/) — Codex parity.
- [ ] [`src/lib/profiles.js`](../../src/lib/profiles.js) — `agentic-pr` in `solo` / `team` / `mature` `universal` lists.
- [ ] [`src/commands/init.js`](../../src/commands/init.js) — slashLine summary lists `/agentic-pr` for non-`poc` profiles.
- [ ] [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) — `SKILL_DESCRIPTIONS` entry.
- [ ] [`README.md`](../../README.md) — skill table + count refreshed.
- [ ] Four-phase body per ADR-0024 §2: preflight → scope assembly → draft body → open + report. `gh` CLI soft-fail with install hint. Title format = Conventional Commits.
- [ ] Tests: profile-coverage assertion in [test/profile.test.js](../../test/profile.test.js) for `solo` / `team` / `mature` only.
- [ ] Dogfood install refreshed; skill lands at `.claude/skills/agentic-pr/` and `.agents/skills/agentic-pr/`.
- [ ] `npm test` passes.

## Plan

- [x] Draft + accept [ADR-0024](../adr/0024-agentic-pr-skill.md).
- [ ] Implement Claude + Codex skill bodies.
- [ ] Wire profiles + init + rootdoc + tests.
- [ ] Dogfood refresh.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- **2026-05-10** — Task opened. Decisions confirmed: `gh` CLI soft-fail (warn + hint, not hard refuse); helper posture (CI not green / no back-link warns, does not block on user confirmation).

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
