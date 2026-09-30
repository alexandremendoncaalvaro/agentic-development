# Task `0092`: Report cited record state before a commit

**Status:** in-progress
**Created:** 2026-09-30
**Scope ref:** src/skills/claude-code/ad-commit/SKILL.md (Phase 3, draft message)
**Evidence ref:** doc/research/0031-ground-cited-record-state-probe.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

Rule CV.7 of the practitioner's machine store says a record (a ground
receipt, an ADR, a spec) was written *before* the work it governs only when
its commit is an ancestor of the first commit implementing it; otherwise the
message must say "recorded alongside". The rule exists and still broke three
times, each time by commit order alone while the record already existed in the
working tree: Task 0048 (the rule's origin), and twice in Task 0084 (Notes,
2026-09-21 re-audit; 2026-09-22 focused audit, where the commit adding
`--fixture-skills` cited GROUND-0028's addendum that landed one commit later).
Nothing in `/ad-commit` checks it, so every occurrence was caught only by a
later audit.

ADR-0057 routes a deterministic, consistency-critical sub-step to a bundled
script the agent executes. Which cited records are already in `HEAD`, staged
in this commit, only on disk, or not found is such a step; whether the
message's wording claims precedence stays the agent's judgment.

## Acceptance Criteria

- [ ] `/ad-commit` on both hosts bundles a read-only probe that takes a draft commit message (file path or `-` for stdin) and reports, as JSON, every cited record id with its resolved path and one state: `in-head`, `staged`, `working-tree`, `archived` (only in history), or `not-found`.
- [ ] The probe recognizes the id forms the repository's history uses: `GROUND-`, `RESEARCH-`, and `PRISM-NNNN` (resolved under `doc/research/`), `ADR-NNNN` (`doc/adr/`), `task-NNNN` / `Task NNNN` (`doc/tasks/`), and `Spec NNNN` / `spec-NNNN` (`doc/specs/`).
- [ ] The probe works on a repository with no commits, strips `GIT_DIR`, `GIT_WORK_TREE`, and `GIT_INDEX_FILE` like the kit's other git probes, never writes, and exits 0 with a report or 1 on a usage error.
- [ ] `/ad-commit` Phase 3 runs the probe on the draft and states the consequence: a record not `in-head` may not be described as preceding the work (write "recorded alongside"), a `working-tree` record is staged with the commit when it is the same concern, and a `not-found` id is corrected before committing. The skill stays a helper: the probe never blocks.
- [ ] The script is byte-identical across the two host trees, installs into a consumer (`npm pack --dry-run` plus a scratch `init`), and the dogfood installs are refreshed.
- [ ] `CHANGELOG.md` records the change under `[Unreleased]`.

## Plan

- [ ] Ground record committed ahead of the code (CV.7).
- [ ] Red/green one behavior at a time in `test/commit-records.test.js`, through the script's CLI on a temporary git repository.
- [ ] Copy the script to the Codex tree; edit both `SKILL.md` Phase 3 bodies; refresh the dogfood install.
- [ ] `CHANGELOG.md`; `npm pack --dry-run` and a scratch `init`; `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-30

Opened from the `/ad-level-up` pass (item C3); the owner approved the shape:
an advisory script in `/ad-commit` on both hosts. Placed in a new test file
rather than `test/skill-scripts.test.js`, which is already past the §3.3
review threshold with no seam this change would respect.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
