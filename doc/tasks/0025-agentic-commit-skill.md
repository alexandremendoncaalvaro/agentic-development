# Task `0025`: Ship `agentic-commit` workflow-operational skill

**Status:** done
**Created:** 2026-05-10
**Owner:** Alexandre Alvaro
**Spec ref:** [ADR-0023](../adr/0023-agentic-commit-skill.md)
**Board ref:**

## Context

[ADR-0023](../adr/0023-agentic-commit-skill.md) accepts a workflow-operational skill that scaffolds atomic Conventional Commits with DCO `Signed-off-by` sign-off. First of the three-skill commit/PR/merge bundle drafted on 2026-05-10. Pairs with [task-0026](0026-agentic-pr-skill.md) (`agentic-pr`) and [task-0027](0027-agentic-merge-skill.md) (`agentic-merge`).

Profile placement: universal at `solo` / `team` / `mature`; not at `poc` (commit discipline aligns with the other artifact-producing layers).

## Acceptance Criteria

- [x] [`src/skills/claude-code/agentic-commit/SKILL.md`](../../src/skills/claude-code/agentic-commit/SKILL.md) — name, allowed-tools `Read, Bash`, trigger keywords from ADR-0023. _Path renamed to `src/skills/claude-code/ad-commit/SKILL.md` after ADR-0026 shipped in the same branch; pre-rename path preserved here as historical record._
- [x] [`src/skills/codex/agentic-commit/{SKILL.md,agents/openai.yaml}`](../../src/skills/codex/agentic-commit/) — Codex parity. Post-rename path: `src/skills/codex/ad-commit/`.
- [x] [`src/lib/profiles.js`](../../src/lib/profiles.js) — `ad-commit` in `solo` / `team` / `mature` `universal` lists.
- [x] [`src/commands/init.js`](../../src/commands/init.js) — slashLine summary lists `/ad-commit` for non-`poc` profiles.
- [x] [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) — `SKILL_DESCRIPTIONS` entry.
- [x] [`README.md`](../../README.md) — skill table + count refreshed (universal at `solo` / `team` / `mature`).
- [x] Four-phase body per ADR-0023 §2: scope intake → stage-split → draft message → sign + write. Conventional Commits format. `Signed-off-by` from `git config user.name` / `user.email`. No `Co-Authored-By` trailer.
- [x] Tests: profile-coverage assertion in [test/profile.test.js](../../test/profile.test.js) for `solo` / `team` / `mature` only.
- [x] Dogfood install refreshed; skill lands at `.claude/skills/ad-commit/` and `.agents/skills/ad-commit/`.
- [x] `npm test` passes (179/179 at closure).

## Plan

- [x] Draft + accept [ADR-0023](../adr/0023-agentic-commit-skill.md).
- [x] Implement Claude + Codex skill bodies (commits 276c174 + post-rename b1e5cc6).
- [x] Wire profiles + init + rootdoc + tests (commit afabd8c).
- [x] Dogfood refresh (commits 507483d + b8fa60b).
- [ ] PR + merge — pending user authorization on the bundled v0.15 PR.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- **2026-05-10** — Task opened. Decisions confirmed: trailer = `Signed-off-by` only, identity = live from `git config`, atomic enforcement = stage-split interactively, profile placement = `solo` / `team` / `mature`, posture = helper not blocker.
- **2026-05-10 — Shipped.** Skill source landed in commit 276c174 (Claude + Codex variants); wiring in afabd8c; dogfood install in 507483d. Per [ADR-0026](../adr/0026-slash-command-rename-ad-prefix.md) (also shipped on this branch), the skill renamed `agentic-commit` → `ad-commit` in commits b1e5cc6 + b8fa60b. Acceptance criteria references in this file preserve the pre-rename `agentic-commit` path as historical record per ADR-0004 append-only; the live skill is `ad-commit`. Status flipped `proposed` → `done`.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (179/179)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10) — to run on the bundled v0.15 PR
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
