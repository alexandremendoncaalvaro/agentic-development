# Task `0102`: Name the scope in the scratch install check

**Status:** in-progress
**Created:** 2026-10-07
**Scope ref:** doc/adr/0057-skills-deterministic-steps-as-scripts.md (Decision 4)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

ADR-0057 Decision 4 asks for "a scratch `init`" to verify that a new script
installs, without naming `--scope project`. A bare `init` targets the user
scope, and on 2026-09-30 it rewrote the owner's machine-global skill installs
with an unmerged branch's kit (Task 0092). The check must say where it
installs.

## Acceptance Criteria

- [x] ADR-0057 carries an addendum that names `--scope project` in a disposable directory for the scratch check.
- [x] Every skill or doc that repeats the scratch-init step names the scope too.
- [x] `npm run verify` passes.

## Plan

- [x] Grep for the scratch-init instruction across `doc/` and `src/skills/`.
- [x] Addendum plus the textual fixes.
- [ ] `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Routed from the `/ad-level-up` curation of 2026-10-07, which the owner approved in chat; it supersedes the unmerged task-0094 draft for this item.

### 2026-10-08 — plan approved

The owner approved the kit hygiene batch ("ok"), built in one branch with
Tasks 0112 and 0113.

### 2026-10-08 — built

`git grep` across the tree outside `doc/tasks/` found the unscoped scratch
`init` only in ADR-0057's decision 4, and the same unscoped
`update --yes` re-sync in ADR-0057's and ADR-0056's decision 4. Both ADRs
carry an addendum naming `--scope project` (and, for the scratch check, a
disposable directory), with PROJECTION rows. AGENTS.md already names the
scope for the dogfood re-sync.

### 2026-10-09 — batch review

Fresh-context review of `origin/main..16e6aba` (Standards and Spec axes, verdicts at `.agentic/reviews/20261008T231440Z-commit-range-batch-verdicts.md`), no Blocker. Fixed: ADR-0056 and ADR-0057 mark their decision 4 in place as amended by the addendum, as PROJECTION requires of a self-amendment.

### 2026-10-09 — review and audit record

Fresh-context review of `origin/main..16e6aba` (Standards and Spec axes) and the `/ad-audit` of `origin/main..23252ae` (19 rule groups, the critical claims group run three times across two models; gate `npm run verify` exit 0, 1394 of 1394). Neither found a Blocker. Batch-wide findings and the full table are in the pull request body. Findings for this task, as severity, finding, disposition:

- Audit major: GUIDELINES §9.4 still ran `init` / `update` against a tmp directory without a scope, so the built note's "only in ADR-0057" was wrong. Fixed: §9.4 names `--scope project`. The search behind this note: `git grep -nE 'bin/agentic\.js (init|update)|scratch .?init'` excluding `doc/tasks`, `CHANGELOG.md`, `doc/research`, the dogfood copies and `test`, keeping lines without `--scope`; the remaining hits (AGENTS.md quick start, README, `doc/guides/installation.md`) are consumer setup, not scratch checks.
- Review Note: ADR-0056 and ADR-0057 did not mark decision 4 in place. Fixed in 23252ae.
- Review Note: no changelog entry. Accepted: no shipped behaviour changed.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
