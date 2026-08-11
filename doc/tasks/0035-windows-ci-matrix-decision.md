# Task 0035: Decide the Windows CI matrix leg

**Status:** proposed
**Created:** 2026-08-06
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

The kit claims a portability bar of macOS + Linux + Windows contributors
(task-0031 checklist), but no Windows execution of the test suite or the
`ad-audit` skill script has ever been observed anywhere — CI is ubuntu-only
and the claim is recorded as an explicit OPEN QUESTION in task-0031's Notes.
The gap has since widened: `scripts/hook-npm-test.js` carries a
`shell: process.platform === 'win32'` branch that has never run on Windows,
and the chmod-000 probe test self-skips there by design. ADR-0007 §6 makes a
CI-matrix addition its own decision (own ADR/task, never a drive-by), which
is why this task exists instead of a matrix edit riding another PR. Without
it, every "portable" claim about kit scripts stays design-intent rather than
verified outcome, and a Windows contributor is the first CI.

## Acceptance Criteria

- [ ] An ADR records the decision: adopt a `windows-latest` matrix leg, or
      reject it with rationale (e.g. document Linux/macOS as the supported
      contributor platforms) — either outcome closes the question.
- [ ] If adopted: `windows-latest` runs green in `.github/workflows/test.yml`
      on a real PR, including `test/skill-scripts.test.js` (probe execution)
      and the platform-guarded skips behaving as designed.
- [ ] If adopted: the `protect-main` ruleset's required checks are updated to
      match the new matrix (or the ADR records why the Windows leg is
      non-required).
- [ ] task-0031's Windows OPEN QUESTION and the AGENTS.md/GUIDELINES.md
      platform claims are reconciled with the decision (reference, not
      duplication).

## Plan

- [ ] Draft the ADR via `/ad-adr` with both options costed: matrix minutes,
      the `core.symlinks`/CRLF gotchas already named in task-0031, and the
      win32 branches now in the tree (`scripts/hook-npm-test.js`,
      probe test skips).
- [ ] Alê decides (this is the HITL gate).
- [ ] If adopted: add the matrix leg in `.github/workflows/test.yml` on a
      branch, open a PR, observe the Windows run's actual output.
- [ ] Close the loop: flip this task's boxes only after the observed run (or
      the rejection ADR) exists.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-06

Registered from the task-0033 follow-up queue (Alê's go). Grounding carried
from task-0031's Notes: Node `.mjs` scripts were chosen precisely to avoid
POSIX-shell assumptions, but no Windows run was ever observed; the claim
remains design-intent. New since then: the pre-push gate runner's win32
`shell` branch and the chmod-000 test's platform skip (task-0033).

### 2026-08-11 — recoverable implementation evidence

[`PR #90`](https://github.com/alexandremendoncaalvaro/agentic-development/pull/90),
`fix: make the kit's own gate pass on Windows`, implemented a Windows matrix
lane and corrected the portability defects that lane exposed. Its
[successful four-leg run](https://github.com/alexandremendoncaalvaro/agentic-development/actions/runs/31530163905)
is recorded at GitHub Actions run `31530163905`.
The branch was later closed and deleted during repository cleanup, but its
tip `d6e6494` remains reachable from the closed PR. It must be ported onto a
new branch from current `main`, rather than reopened as-is: GitHub reports it
as conflicting with the current base, and its final dogfood-only commit did
not receive a fresh CI run.

No acceptance box is checked by this evidence alone. The ADR adoption or
rejection, a current-base CI run, and the `protect-main` required-check update
remain outstanding. If Alê adopts Windows, recover the implementation by
selectively applying it to a new branch, refresh dogfood state, run the full
gate, observe the four matrix jobs, and then update the ruleset with their
observed job names.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
