# Task `0027`: Ship `agentic-merge` workflow-operational skill

**Status:** proposed
**Created:** 2026-05-10
**Owner:** Alexandre Alvaro
**Spec ref:** [ADR-0025](../adr/0025-agentic-merge-skill.md)
**Board ref:**

## Context

[ADR-0025](../adr/0025-agentic-merge-skill.md) accepts a workflow-operational skill that evaluates a PR (CI / fresh-context review / linked task / unresolved comments / mergeability) and performs the merge via `gh pr merge`. Third of the three-skill commit/PR/merge bundle drafted on 2026-05-10.

CI green is the hard gate per user decision 5; everything else surfaces as warning and yields to senior engineer judgment. Repo's allowed merge modes drive the `gh pr merge --squash|--rebase|--merge` flag selection.

Profile placement: universal at `solo` / `team` / `mature`; not at `poc`.

## Acceptance Criteria

- [ ] [`src/skills/claude-code/agentic-merge/SKILL.md`](../../src/skills/claude-code/agentic-merge/SKILL.md) — name, allowed-tools `Read, Bash, Grep`, trigger keywords from ADR-0025.
- [ ] [`src/skills/codex/agentic-merge/{SKILL.md,agents/openai.yaml}`](../../src/skills/codex/agentic-merge/) — Codex parity.
- [ ] [`src/lib/profiles.js`](../../src/lib/profiles.js) — `agentic-merge` in `solo` / `team` / `mature` `universal` lists.
- [ ] [`src/commands/init.js`](../../src/commands/init.js) — slashLine summary lists `/agentic-merge` for non-`poc` profiles.
- [ ] [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) — `SKILL_DESCRIPTIONS` entry.
- [ ] [`README.md`](../../README.md) — skill table + count refreshed.
- [ ] Four-phase body per ADR-0025 §2: preflight → evaluate → decision → merge. CI green = hard gate (with explicit user override). Other findings = warnings. Merge mode auto-detected from `gh repo view`; user asked when multiple allowed. `--delete-branch` by default.
- [ ] Tests: profile-coverage assertion in [test/profile.test.js](../../test/profile.test.js) for `solo` / `team` / `mature` only.
- [ ] Dogfood install refreshed; skill lands at `.claude/skills/agentic-merge/` and `.agents/skills/agentic-merge/`.
- [ ] `npm test` passes.

## Plan

- [x] Draft + accept [ADR-0025](../adr/0025-agentic-merge-skill.md).
- [ ] Implement Claude + Codex skill bodies.
- [ ] Wire profiles + init + rootdoc + tests.
- [ ] Dogfood refresh.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- **2026-05-10** — Task opened. Decisions confirmed: CI green hard-gate (user can override loudly); review / linked-task / unresolved comments are warnings; merge mode auto-detected from repo policy; `--delete-branch` by default.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
