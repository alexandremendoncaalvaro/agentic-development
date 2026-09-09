# Task `0071`: Make roadmap readable at a glance

**Status:** in-progress
**Created:** 2026-09-09
**Scope ref:** doc/adr/0053-ad-roadmap-progress-rollup.md
**Evidence ref:** doc/research/0012-ground-readable-roadmap.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The current `/ad-roadmap` output leads with percentages, tier labels, and artifact terminology. A reader arriving without project context can see the counts but cannot quickly understand the main delivery front, why it matters, what is being worked on now, or what comes next. The rollup should remain read-only and evidence-backed while translating the same ledger into plain language and a standard Markdown checklist that is understandable in about thirty seconds.

## Acceptance Criteria

- [x] The output opens with a plain-language, thirty-second overview naming the main delivery front, the next front, overall progress, and any blocker.
- [x] The roadmap is rendered as a standard Markdown checklist using `[x]` for delivered work and `[ ]` for work that remains; an in-progress item uses nested completed and open subtasks instead of a non-standard checkbox marker.
- [x] The active front explains what is being delivered, why it matters, what is already done, and what remains in language understandable without prior project context.
- [x] Broad reconciliation still reads task/spec frontmatter and checkboxes, while only in-progress tasks receive a focused read of `## Context` and `## Acceptance Criteria` for the active-front explanation.
- [x] When no task is in progress, the output says so and presents the first remaining roadmap item as the next front instead of inventing current work.
- [x] MVP / Next / Later tiers, percentages, task identifiers, spec identifiers, and ADR identifiers remain supporting evidence rather than the primary explanation.
- [x] ADR-0053 and its state projection record the refined output and focused-read contract without changing the skill's read-only boundary or duplicating the task ledger.
- [x] A behavior-shaped source test protects the new output contract on Claude Code and Codex, and demonstrates the expected RED before the skill text changes.
- [x] Both canonical host variants carry the same behavior; dogfood copies and state files are refreshed; `CHANGELOG.md` is updated.

## Plan

- [x] Persist and validate the grounding receipt from official task-list and plain-language guidance, a public roadmap implementation, the in-repo `ad-handoff` pattern, and git history.
- [x] RED: add one test that requires the newcomer overview, standard checklist, focused active-task read, and nested progress on both hosts.
- [x] Amend `doc/adr/0053-ad-roadmap-progress-rollup.md` and `doc/adr/PROJECTION.md` for the refined contract.
- [x] GREEN: update both canonical `ad-roadmap` skills with the approved output shape and focused read rules.
- [x] Refresh dogfood, update `CHANGELOG.md`, and run the targeted and full test suites.
- [x] Run `/ad-review` and `/ad-audit` on the final implementation.
- [ ] Run `/ad-commit` and push the resulting commit to PR #130.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- 2026-09-09 — Grounding recorded at `doc/research/0012-ground-readable-roadmap.md` and validated with four official sources, one public implementation, three in-repo references, and git history (`valid: true`, no unreadable sources).
- 2026-09-09 — RED 1: the targeted dual-host contract failed on the former Claude output because no thirty-second overview existed. GREEN 1 passed after the plain-language overview, active-front explanation, standard checklist, focused read, and no-current-work path were added.
- 2026-09-09 — Dogfood exposed several tasks simultaneously marked `in-progress`. RED 2 pinned current-task selection to live repository evidence; GREEN 2 passed after both hosts preferred a working-tree task, then the most recently committed task, and disclosed any remaining tie.
- 2026-09-09 — Project dogfood refreshed both hosts; source/install `cmp` checks passed; `npm pack --dry-run` included the package; `npm test` passed 861/861; `git diff --check` passed; no orphan TODO/FIXME was introduced. The generic skill-creator validator was not applicable because it rejects the kit-required `summary` field; the repository's frontmatter, summary, description-budget, install, and package tests passed.
- 2026-09-09 — Final two-axis review found no open Standards or Spec issue. Maximum-gate reaudit accounted for 9/9 rule groups and 12/12 changed files, carried the late multi-task finding as resolved, and found no blocker, open question, or rule gap. Ephemeral trails: `.agentic/reviews/20260909T173610Z-working-tree-task-0071-rerun.md` and `.agentic/reviews/20260909T173654Z-audit-working-tree-task-0071-rerun.md`.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
