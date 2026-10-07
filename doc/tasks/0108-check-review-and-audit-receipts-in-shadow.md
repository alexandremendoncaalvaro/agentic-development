# Task `0108`: Check review and audit receipts before PR actions, in shadow

**Status:** in-progress
**Created:** 2026-10-07
**Scope ref:** doc/adr/0089-check-workflow-receipts-in-shadow-before-landing.md (decisions 1 and 2, review and audit check)
**Evidence ref:** doc/research/0040-ground-review-and-audit-receipts.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The check that answers the owner's most repeated question (RESEARCH-0037 E1):
was this exact state reviewed and audited before the pull request is opened,
readied or merged. `ad-audit` already writes the target SHA; `ad-review` does
not, and no single file summarizes an audit.

## Acceptance Criteria

- [x] `ad-review` writes the reviewed target SHA into its verdicts file, on both hosts.
- [x] `ad-audit` writes one summary file per audit with the target SHA and each finding's severity and disposition.
- [x] `sequence-gate.mjs` logs "would block" before `gh pr create`, `gh pr ready` and `gh pr merge` when a fresh review or audit receipt for `HEAD` is missing, naming which, under the same freshness rule as Task 0107.
- [x] `.agentic/gates.json` can turn the review or audit requirement off per repository; a repository whose review is done by a bot reads that evidence on the head SHA only when a local command does so within the hook's time budget.
- [x] Tests cover each receipt present, missing and stale, and the per-repository switches.

## Plan

- [x] Red, then green in the skill scripts and the gate (`/ad-tdd`); byte parity across both hosts.
- [x] Skill text for `ad-review` and `ad-audit`; CHANGELOG.
- [ ] `/ad-review`; `/ad-audit`; `/ad-commit`; PR on the owner's approval.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Planned with ADR-0089 (proposed) from RESEARCH-0037. Implementation waits for
the owner's acceptance of ADR-0089 and approval of this plan.

### 2026-10-07 — plan approved

The owner accepted ADR-0089 and approved this plan.

### 2026-10-07 — implementation and review

GROUND-0040 was committed (b368965) before the first implementing commit
(0b52d75). The gate was built one behaviour per cycle through its command
line. Each new behaviour failed first for the expected reason (no line for
`gh pr merge`, `would-block` before receipts were read, no audit line, the
`gh pr ready` action missing, the switch ignored, the command not run, a
timeout read as `would-block`, a committed review making itself stale).
Tests for a stale review, a reworded commit and a working-tree review
passed on first run through the shared freshness code; bypassing the
freshness comparison turned the stale tests red. Two older tests that read
the evidence file as one line now read its first line, since each check
writes its own line.

Beyond the ask: `.agentic/reviews/**` joined `.agentic/receipts/**` as
always receipt-neutral, which also applies to the gate-run check, so that a
committed review or audit file never invalidates the receipts.

Fresh-context review of origin/main..503295b, every finding with severity
and disposition:

- Standards Concern: a chained `git push && gh pr create` logged only the
  first action. Fixed test-first in 3ba8e82.
- Standards Concern: `gh pr ready <n>` and `gh pr merge <n>` compare with
  the local `HEAD`, which is the pull request's head only when its branch
  is checked out. Accepted as a limit: resolving the pull request needs a
  network call inside the hook; the `ad-hooks` text states it, and Task 0110
  labels each would-block event against the state it named.
- Standards Concern: every receipt file was resolved eagerly. Measured
  first: 300 files took 18.4 s against 1.1 s with none. Fixed test-first in
  3ba8e82: each check reads the newest 20 files (a design choice under the
  30-second Codex hook timeout); 300 files now take 0.72 s in three runs.
- Standards Note: short or uppercase targets vanished, and a body line could
  stand in for the header. Fixed test-first: the target is read from the
  first line, and any target that is neither a full SHA nor `none (working
  tree)` counts as unreadable, as does a summary without a target.
- Standards Note: A2 and D2 of GROUND-0040 unverifiable. Rejected: A2 was
  fetched in this session; D2 is a measurement whose command is in the
  record.
- Standards Note: `CONTEXT.md:55` overlong line. Rejected: that line is not
  in this diff.
- Spec Concern: this task still `proposed`, criteria unchecked. Fixed by
  this entry.
- Spec Concern: no stale-audit, single-switch or `gh pr ready` receipt test.
  Added; they passed on first run.
- Spec Concern: `timeoutSeconds` unchecked (0 disabled the limit). Fixed
  test-first: it must be above 0 and at most 20, otherwise
  `runtime-unavailable`.
- Spec Note: a command was honoured for any check. Fixed test-first: the
  review only, per ADR-0089 decision 7.
- Spec Note: the receipt-neutral change reaches the gate-run check. Recorded
  above.
- Spec Note: e812952 closes Task 0107 in this range. The pull request body
  says so.

Local gate at 3ba8e82: `npm run verify` exit 0, 1303 tests.

### 2026-10-07 — audit at 9e958c5

`/ad-audit` of origin/main..9e958c5 (groups CV with a cross-model second pass
in two orders, GH, HK, AGENTS.md, GUIDELINES.md, ARCHITECTURE and CONTEXT,
ADRs; NET not applicable; every changed file read by at least one reviewer,
the installed copies checked by `cmp`; anchors matched; local gate green,
1303 tests): no blocker. Every finding, with severity and disposition:

1. CV Minor (all three CV passes): the 18.4 s figure had no reproduction
   command, and two reviewers measured 6.2 to 6.9 s for the old code. Fixed:
   re-measured with a recorded command. In a scratch repository with 300
   verdicts files naming a commit that HEAD no longer matches, `gh pr merge`
   took 8.41, 8.24 and 8.28 s with the gate at 503295b and 0.71, 0.68 and
   0.70 s at this branch's head, at a load average near 9; the evidence file
   held 12 lines, so every run executed. The 18.4 s single run is superseded,
   and the code comment no longer carries a number. Reproduction: extract
   `git archive 503295b src/skills/claude-code/ad-hooks/scripts` into a
   non-symlinked directory (`realpath`; through a symlink the script's main
   guard does not fire), write 300 `<n>-x-verdicts.md` files with
   `Target-SHA: <first commit>`, commit a change, and pipe a Bash
   `gh pr merge` event into each script under `/usr/bin/time -p`.
2. CV Minor (passes A and B): "each new behaviour failed first" and the
   red-first order have no retained artifact; tests and code share commits.
   Accepted as a label: author-reported, observed in the authoring session.
   The mutation claim was reproduced by two reviewers in disposable copies
   (bypassing the freshness comparison turned five tests red).
3. CV Minor (pass B): the A2 rejection above rests on the author's fetch.
   Accepted as a label: A2 is a public page, cited with its access date and
   method in GROUND-0040, open to the same re-check.
4. CV Minor (pass B): the `ad-hooks` text said the read-out labels other pull
   requests, which Task 0110 did not say. Fixed: the text now says the
   read-out must label them, and Task 0110's Notes carry both labelling
   inputs.
5. CV Nit: the Notes omit the reviewers' positive notes. Accepted: they are
   not findings.
6. GUIDELINES Minor (12.5): the review command ran through a shell. Fixed
   test-first: it is an argument list run without a shell, and a string is
   `runtime-unavailable`; the remaining exception, a repository-configured
   program, is recorded in ADR-0089's third addendum under decision 7.
7. GUIDELINES Minor (9.5): the chained-command fix lacked the regression
   name. Fixed: the test is named `regression: task-0108 review, ...`.
8. GUIDELINES Minor (2.5): `checkSetting` drops the parse error. Rejected:
   the error surfaces as the `runtime-unavailable` line's output, as its
   comment states.
9. AGENTS.md Minor: the same shell-execution trust question. Fixed with 6.
10. ARCH/CONTEXT Minor: ARCHITECTURE said one line per action. Fixed.
11. ARCH/CONTEXT Minor: **Review verdicts** did not name the `Target-SHA:`
    line. Fixed; it now links the gate.
12. ARCH/CONTEXT Minor: no term for the audit summary. Fixed: **Audit
    summary** added, and **Audit handoff** warns against conflating them.
13. ARCH/CONTEXT Nit: long lines in CONTEXT. Rejected: CONTEXT keeps one
    line per paragraph in most terms (125 lines over 100 characters before
    this branch).
14. ARCH/CONTEXT Nit: `runtime-unavailable` lines lack the fields **Gate
    evidence line** lists. Rejected for this task: pre-existing since Task
    0107, unchanged here.
15. ADRs Minor: tree-keyed review and audit freshness was not in ADR-0089.
    Fixed: third addendum.
16. ADRs Minor: `.agentic/reviews/**` always neutral was not in ADR-0089.
    Fixed: same addendum.
17. ADRs Nit: decision 7 says the check is off when the read is impossible;
    the code logs `runtime-unavailable`. Fixed in the addendum: a broken read
    is counted, `"review": false` turns it off.
18. CV Minor (pass B): GROUND-0040 D2's command failed on an empty
    repository. Fixed: it adds a file first.
19. CV Note (pass B): `git log -S'review receipt'` now returns more commits
    than D3 records. Accepted: true when recorded; later commits added the
    phrase.

GH and HK: no finding. GH.3 (rules in flight) must be re-run before the push.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
