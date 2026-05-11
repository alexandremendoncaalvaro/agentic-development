# Task `0027`: Ship `agentic-merge` workflow-operational skill

**Status:** done
**Created:** 2026-05-10
**Owner:** Alexandre Alvaro
**Spec ref:** [ADR-0025](../adr/0025-agentic-merge-skill.md)
**Board ref:**

## Context

[ADR-0025](../adr/0025-agentic-merge-skill.md) accepts a workflow-operational skill that evaluates a PR (CI / fresh-context review / linked task / unresolved comments / mergeability) and performs the merge via `gh pr merge`. Third of the three-skill commit/PR/merge bundle drafted on 2026-05-10.

CI green is the hard gate per user decision 5; everything else surfaces as warning and yields to senior engineer judgment. Repo's allowed merge modes drive the `gh pr merge --squash|--rebase|--merge` flag selection.

Profile placement: universal at `solo` / `team` / `mature`; not at `poc`.

## Acceptance Criteria

- [x] [`src/skills/claude-code/agentic-merge/SKILL.md`](../../src/skills/claude-code/agentic-merge/SKILL.md) — name, allowed-tools `Read, Bash, Grep`, trigger keywords from ADR-0025. _Post-rename path: `src/skills/claude-code/ad-merge/SKILL.md` per [ADR-0026](../adr/0026-slash-command-rename-ad-prefix.md)._
- [x] [`src/skills/codex/agentic-merge/{SKILL.md,agents/openai.yaml}`](../../src/skills/codex/agentic-merge/) — Codex parity. Post-rename: `src/skills/codex/ad-merge/`.
- [x] [`src/lib/profiles.js`](../../src/lib/profiles.js) — `ad-merge` in `solo` / `team` / `mature` `universal` lists.
- [x] [`src/commands/init.js`](../../src/commands/init.js) — slashLine summary lists `/ad-merge` for non-`poc` profiles.
- [x] [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) — `SKILL_DESCRIPTIONS` entry.
- [x] [`README.md`](../../README.md) — skill table + count refreshed.
- [x] Four-phase body per ADR-0025 §2: preflight → evaluate → decision → merge. CI green = hard gate (with explicit user override). Other findings = warnings. Merge mode auto-detected from `gh repo view`; user asked when multiple allowed. `--delete-branch` by default.
- [x] Tests: profile-coverage assertion in [test/profile.test.js](../../test/profile.test.js) for `solo` / `team` / `mature` only.
- [x] Dogfood install refreshed; skill lands at `.claude/skills/ad-merge/` and `.agents/skills/ad-merge/`.
- [x] `npm test` passes (179/179 at closure).

## Plan

- [x] Draft + accept [ADR-0025](../adr/0025-agentic-merge-skill.md).
- [x] Implement Claude + Codex skill bodies (commits d4f7227 + post-rename b1e5cc6).
- [x] Wire profiles + init + rootdoc + tests (commit afabd8c).
- [x] Dogfood refresh (commits 507483d + b8fa60b).
- [x] PR + merge — landed via PR #25 (merge commit d7fd731) on 2026-05-10.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- **2026-05-10** — Task opened. Decisions confirmed: CI green hard-gate (user can override loudly); review / linked-task / unresolved comments are warnings; merge mode auto-detected from repo policy; `--delete-branch` by default.
- **2026-05-10 — Shipped.** Skill source landed in commit d4f7227; wiring in afabd8c; dogfood install in 507483d. Renamed `agentic-merge` → `ad-merge` in commits b1e5cc6 + b8fa60b per [ADR-0026](../adr/0026-slash-command-rename-ad-prefix.md). Pre-rename path preserved in this file's acceptance lines as historical record. Status flipped `proposed` → `done`.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (179/179)
- [x] Code review completed — fresh-context review on the v0.15 + rename bundle (artifact: .agentic/reviews/2026-05-10T23-30-00Z-v0.15.0-bundle-with-rename-review.md, gitignored). 5 Concerns surfaced and addressed in fix commit a5c31eb before merge.
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
