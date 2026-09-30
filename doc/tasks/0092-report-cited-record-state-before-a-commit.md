# Task `0092`: Report cited record state before a commit

**Status:** done
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

- [x] `/ad-commit` on both hosts bundles a read-only probe that takes a draft commit message (file path or `-` for stdin) and reports, as JSON, every cited record id with its resolved path and one state: `in-head`, `staged`, `working-tree`, `archived` (only in history), or `not-found`.
- [x] The probe recognizes the id forms the repository's history uses: `GROUND-`, `RESEARCH-`, and `PRISM-NNNN` (resolved under `doc/research/`), `ADR-NNNN` (`doc/adr/`), `task-NNNN` / `Task NNNN` (`doc/tasks/`), and `Spec NNNN` / `spec-NNNN` (`doc/specs/`).
- [x] The probe works on a repository with no commits, strips `GIT_DIR`, `GIT_WORK_TREE`, and `GIT_INDEX_FILE` like the kit's other git probes, never writes, and exits 0 with a report or 1 on a usage error.
- [x] `/ad-commit` Phase 3 runs the probe on the draft and states the consequence: a record not `in-head` may not be described as preceding the work (write "recorded alongside"), a `working-tree` record is staged with the commit when it is the same concern, and a `not-found` id is corrected before committing. The skill stays a helper: the probe never blocks.
- [x] The script is byte-identical across the two host trees, installs into a consumer (`npm pack --dry-run` plus a scratch `init`), and the dogfood installs are refreshed.
- [x] `CHANGELOG.md` records the change under `[Unreleased]`.

## Plan

- [x] Ground record committed ahead of the code (CV.7).
- [x] Red/green one behavior at a time in `test/commit-records.test.js`, through the script's CLI on a temporary git repository.
- [x] Copy the script to the Codex tree; edit both `SKILL.md` Phase 3 bodies; refresh the dogfood install.
- [x] `CHANGELOG.md`; `npm pack --dry-run` and a scratch `init`; `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-30

Opened from the `/ad-level-up` pass (item C3); the owner approved the shape:
an advisory script in `/ad-commit` on both hosts. Placed in a new test file
rather than `test/skill-scripts.test.js`, which is already past the §3.3
review threshold with no seam this change would respect.

### 2026-09-30 — Built, reviewed, landed

GROUND-0031 landed in its own commit (ef8072e) ahead of the code. TDD
through the CLI on throwaway repositories, one behavior per test: in-head,
staged, working-tree, archived, not-found, every id form with de-duplication,
an unborn `HEAD`, a leaked `GIT_DIR`, a file-path draft (green on arrival: the
first implementation already read a path), usage errors, outside a work tree,
and a run from a subdirectory.

Fresh two-axis review (handoffs and verdicts at
`.agentic/reviews/2026-09-30T12-05-54Z-branch-vs-main-*.md`, machine-local):
no Blocker. Applied, each test-first: git C-quoted a non-ASCII slug, so a
committed `0001-decisão` record read as `working-tree` (now
`core.quotePath=false`); an in-head record with an uncommitted edit (the
Task 0084 addendum case) read as plain `in-head`, so the report now adds
`pending: staged | unstaged`; a missing git binary read as "not inside a git
work tree" (now named, mutation-checked; an unset `PATH` falls back to the
system default and finds git, so the test points `PATH` at an empty
directory); other git failures now return the JSON error instead of a stack,
with a 64 MiB buffer. Not test-first: the rename test was green on arrival,
because the record-directory pathspec already kept a move from another
directory unpaired; `--no-renames` was added for a rename inside the record
directory, which no test drives. Phase 3 wording on both hosts now says a
`working-tree` record did not precede the work and an `archived` one did.
Refuted: "the id regex has no word boundary"; it has `\b` on both ends
(`ADR-00012`, `xtask-0001`, `Spec 1080p` yield no records). The handoff lost
the `\b` because zsh `echo` interprets backslash escapes; handoffs are now
written with `printf '%s'`.

Scratch consumer check: `npm pack --dry-run` lists both copies, and
`init --scope project --agent both --yes` in an empty repository installs and
runs them. A first attempt without `--scope project` installed at the default
user scope and rewrote the owner's machine-global skill installs with this
branch's kit; reported to the owner, not repaired silently.

### 2026-09-30 — Re-review of the fixes

A fresh Standards reviewer on the fix delta
(`.agentic/reviews/2026-09-30T12-11-05Z-fix-delta-*.md`, machine-local)
confirmed the three prior Concerns resolved and found one new one, applied
test-first: a record renamed or deleted in the index read as `in-head` with
`pending: staged` and its old path, which Phase 3 would describe as an
addendum. A rename now reports the new path with `pending: staged`; a
deletion reports `pending: staged-removal`, and Phase 3 says not to cite it as
governing the work. Left as noted: failures other than a missing binary before
a work tree is found (for example `safe.directory`) still read as "not inside
a git work tree"; the history read is not lazy.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
