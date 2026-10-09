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

### 2026-10-09 — re-audit corrections

Re-audit of six groups at `ae477da` (architecture, guidelines, glossary, ADR-0074, ADR-0049, and the claims group twice across two models): no Blocker. The earlier note's pointer to a batch-wide table "in the pull request body" named a body that does not exist yet; the batch-wide facts are: the first audit ran 19 rule groups at `23252ae` with the critical claims group three times across two models, neither audit found a Blocker, and the pull request body will repeat this once opened.

- Re-audit minor (CV.8): the recorded search did not return the hits the note listed. Its actual output, `git grep -nE 'bin/agentic\.js (init|update)|scratch .?init'` with the stated exclusions and `--scope` lines removed: AGENTS.md 16, 17 and 83 (setup lines and the PROJECTION pointer), ADR-0056 and ADR-0057 decision 4 and their addenda (the record of this very fix), PROJECTION.md 42 (its row), two `eval/receipts` command strings (recorded trial data) and `package.json` 26 (`init --help` in the smoke test). None is a scratch install step; README and `doc/guides/installation.md` match only `agentic (init|update)`, as consumer setup.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
