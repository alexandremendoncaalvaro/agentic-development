# Task `0006`: Rename `ad-grill` to `ad-grill-me`

**Status:** in-progress
**Created:** 2026-07-28
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

[ADR-0038](../adr/0038-rename-ad-grill-to-ad-grill-me.md) renames the interview-before-research skill identifier `ad-grill` → `ad-grill-me` to align the slash command with its primary "grill me" trigger phrase. Pure identifier change — the skill's behavior is unchanged — swept across both host source trees, cross-referencing skills, the CLI, profiles, tests, narrative docs, and the regenerated dogfood install + managed AGENTS.md table. Same mechanical shape as the `ad-audit` → `ad-drift` rename (Task 0002 / ADR-0034).

## Acceptance Criteria

- [x] Both source skill dirs renamed: `src/skills/{claude-code,codex}/ad-grill` → `ad-grill-me`; frontmatter `name:`, heading, self-references, and the codex `agents/openai.yaml` `display_name` all match the new name.
- [x] Every source and narrative-doc live pointer updated to `ad-grill-me` / `/ad-grill-me`: `profiles.js`, `init.js`, cross-referencing skills (`ad-deepen`, `ad-diagnose`, `ad-domain`, `ad-handoff`, `ad-next`, `ad-philosophy`, `ad-prd` — both hosts), README, WORKFLOW, WORKFLOW-FLOWS, ARCHITECTURE, PRD — including the `../ad-grill/SKILL.md` relative link in `ad-deepen`.
- [x] Accepted ADRs left as historical records (**not** swept): [ADR-0031](../adr/0031-decide-when-grounded-posture.md) (`/ad-grill` routing-example) and [ADR-0021](../adr/0021-diagnose-discipline.md) (`agentic-grill`) record decisions made when those names were current — preserving decision-record immutability ([WORKFLOW.md](../../WORKFLOW.md) Documentation Discipline rule 9) and matching the `agentic-`→`ad-` rename convention (see [AGENTS.md](../../AGENTS.md) Gotchas — Historical naming). The live source of the escalation rule (`ad-philosophy`) is swept.
- [x] Tests updated: `test/init.test.js` expected skill set, `test/profile.test.js` universal-set assertions.
- [x] Dogfood install regenerated: `.claude/skills/ad-grill-me` + `.agents/skills/ad-grill-me` present; orphaned `ad-grill` install dirs removed; state files carry no `ad-grill`.
- [x] Managed AGENTS.md "Skills installed" table shows the `ad-grill-me` row (no `ad-grill` row).
- [x] No bare `ad-grill` identifier remains in source, outside `notes/`, except intentional residue: (a) this rename's own `doc/adr/0038` + `doc/tasks/0006` (they narrate the rename and name the old id); (b) the accepted ADRs left as historical records above; (c) the pre-existing dangling `ADR-0022` / `agentic-grill` references in the skill body + `test/profile.test.js` (the planned `agentic-grill` ADR was never created — [ADR-0021](../adr/0021-diagnose-discipline.md) §Step 0; a separate drift-fix, out of scope, and the string is `agentic-grill`, not `ad-grill`).
- [x] `npm test` green (CI confirms Node 20 / 22).

## Plan

- [x] Branch `feat/ad-grill-me-rename` off `main`.
- [x] `git mv` both source skill dirs; single-pass `sed` on the explicit source-file allowlist (safe: no `ad-grill-me` pre-exists, no other `ad-grill*` identifier).
- [x] `node bin/agentic.js update --yes --force` to regenerate dogfood copies + the managed table + state (`--force` required non-interactively to replace the managed section).
- [x] `git rm -r` orphaned `.claude/skills/ad-grill` + `.agents/skills/ad-grill`; re-run `update --yes --force`.
- [x] Verify no stray `ad-grill`; run `npm test`; fresh-context `/ad-review` before PR.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-07-28

Rename executed via `git mv` of both source skill dirs + a single-pass `sed` on an explicit source-file allowlist (safe: no `ad-grill-me` pre-existed, and `ad-grill` is the only `ad-grill*` identifier — verified no double-replacement, no residual bare `ad-grill`). Regenerated the dogfood install with `update --yes --force` (`--force` required non-interactively for the managed table), then `git rm` the orphaned `ad-grill` install dirs and re-ran `update` — matching the Task 0002 discoveries. `npm test` → 226/226 green.

Two-axis fresh-context §10 review (Standards + Spec) surfaced two real findings, both fixed: (1) the task file initially landed unchecked, Notes-empty, and missing the mandatory `## Definition of Done` section that every other merged task carries — corrected here. (2) The first draft **edited** accepted ADR-0031's `/ad-grill` routing pointer in place. Reverted: that has no precedent (the one in-repo ADR-amend, `83b0c7a`, uses annotate + dated-addendum for a *substantive* supersede, not a rename), it contradicts decision-record immutability, and it would be inconsistent with `doc/adr/0021` already referencing this same skill as `agentic-grill` untouched. Accepted ADRs are now left as historical records. Also discovered a pre-existing dangling `ADR-0022` reference (the planned grill ADR was never created) — logged as out-of-scope for this rename.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
