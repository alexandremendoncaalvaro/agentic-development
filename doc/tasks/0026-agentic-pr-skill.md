# Task `0026`: Ship `agentic-pr` workflow-operational skill

**Status:** done
**Created:** 2026-05-10
**Owner:** Alexandre Alvaro
**Spec ref:** ADR-0024
**Board ref:**

## Context

ADR-0024 accepts a workflow-operational skill that scaffolds opening a PR via `gh pr create` with a uniform body shape (Summary / Test plan / Links). Second of the three-skill commit/PR/merge bundle drafted on 2026-05-10. Pairs with [task-0025](0025-agentic-commit-skill.md) (`agentic-commit`) and [task-0027](0027-agentic-merge-skill.md) (`agentic-merge`).

Profile placement: universal at `solo` / `team` / `mature`; not at `poc`.

## Acceptance Criteria

- [x] [`src/skills/claude-code/agentic-pr/SKILL.md`](../../src/skills/claude-code/agentic-pr/SKILL.md) — name, allowed-tools `Read, Bash, Glob, Grep`, trigger keywords from ADR-0024. _Post-rename path: `src/skills/claude-code/ad-pr/SKILL.md`._
- [x] [`src/skills/codex/agentic-pr/{SKILL.md,agents/openai.yaml}`](../../src/skills/codex/agentic-pr/) — Codex parity. Post-rename: `src/skills/codex/ad-pr/`.
- [x] [`src/lib/profiles.js`](../../src/lib/profiles.js) — `ad-pr` in `solo` / `team` / `mature` `universal` lists.
- [x] [`src/commands/init.js`](../../src/commands/init.js) — slashLine summary lists `/ad-pr` for non-`poc` profiles.
- [x] [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) — `SKILL_DESCRIPTIONS` entry.
- [x] [`README.md`](../../README.md) — skill table + count refreshed.
- [x] Four-phase body' ' preflight → scope assembly → draft body → open + report. `gh` CLI soft-fail with install hint. Title format = Conventional Commits.
- [x] Tests: profile-coverage assertion in [test/profile.test.js](../../test/profile.test.js) for `solo` / `team` / `mature` only.
- [x] Dogfood install refreshed; skill lands at `.claude/skills/ad-pr/` and `.agents/skills/ad-pr/`.
- [x] `npm test` passes (179/179 at closure).

## Plan

- [x] Draft + accept ADR-0024.
- [x] Implement Claude + Codex skill bodies (commits 5271efe + post-rename b1e5cc6).
- [x] Wire profiles + init + rootdoc + tests (commit afabd8c).
- [x] Dogfood refresh (commits 507483d + b8fa60b).
- [x] PR + merge — landed via PR #25 (merge commit d7fd731) on 2026-05-10.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- **2026-05-10** — Task opened. Decisions confirmed: `gh` CLI soft-fail (warn + hint, not hard refuse); helper posture (CI not green / no back-link warns, does not block on user confirmation).
- **2026-05-10 — Shipped.** Skill source landed in commit 5271efe; wiring in afabd8c; dogfood install in 507483d. Renamed `agentic-pr` → `ad-pr` in commits b1e5cc6 + b8fa60b. Pre-rename path preserved in this file's acceptance lines as historical record. Status flipped `proposed` → `done`.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (179/179)
- [x] Code review completed — fresh-context review on the v0.15 + rename bundle (artifact: .agentic/reviews/2026-05-10T23-30-00Z-v0.15.0-bundle-with-rename-review.md, gitignored). 5 Concerns surfaced and addressed in fix commit a5c31eb before merge.
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
