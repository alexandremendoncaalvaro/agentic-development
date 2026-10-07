# Task `0107`: Check the gate-run receipt before push, in shadow

**Status:** in-progress
**Created:** 2026-10-07
**Scope ref:** doc/adr/0089-check-workflow-receipts-in-shadow-before-landing.md (decisions 1 to 4, gate-run check)
**Evidence ref:** doc/research/0038-ground-gate-run-receipt-shadow-check.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The tracer bullet for ADR-0089: the cheapest receipt (a local gate run keyed
to the commit SHA and exit code) and the first check of the shadow gate, end to
end on both hosts. It proves the gate script, its matching, its freshness rule
and its evidence line before the other checks reuse them.

## Acceptance Criteria

- [x] A gate-run wrapper runs the repository's CI-mirror command and records the commit SHA, the command, the exit code and the time under `.agentic/receipts/`; in this repository the pre-push runner writes it, and `ad-pr`'s preflight writes it for consumers.
- [x] `sequence-gate.mjs`, byte-identical in both `ad-hooks` trees, runs on `PreToolUse` for Bash and, before `git push` or `gh pr create`, appends a "would block" line to the ADR-0083 evidence file when no fresh gate-run receipt with exit 0 exists for `HEAD`; it always exits 0 and emits no decision object.
- [x] Freshness follows ADR-0089 decision 3: `HEAD`, or only receipt-neutral paths changed since the receipt (`.agentic/gates.json`, default `doc/tasks/**`).
- [x] `AD_SEQUENCE_GATE=0` silences it; malformed input exits 0 silently.
- [x] Contract tests by mock stdin cover a fresh receipt, a missing one, a stale one, a receipt-neutral change, a failing exit code, an unrelated command, and both hosts' event shapes; this repository wires the hook for dogfood.

## Plan

- [x] `/ad-ground` the `PreToolUse` input shapes on both hosts and the evidence line format; record the GROUND study.
- [x] Red, then green (`/ad-tdd`); partly test-after with mutation checks, see Notes 2026-10-07.
- [x] `ad-hooks` text and wiring; ARCHITECTURE and CONTEXT terms; CHANGELOG.
- [ ] `/ad-review`; `/ad-audit`; `/ad-commit`; PR on the owner's approval.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Planned with ADR-0089 (proposed) from RESEARCH-0037. Implementation waits for
the owner's acceptance of ADR-0089 and approval of this plan.

### 2026-10-07 — plan approved

The owner accepted ADR-0089 and approved this plan.

### 2026-10-07 — implementation and reviews

GROUND-0038 was committed (6ec9f9b) before the first implementing commit
(240fc16). The tracer-bullet test failed first on the missing module, then on
`would-block` (the receipt file itself entered the fixture's commit; the
receipts directory is now always neutral), then passed. It was then flaky,
failing 4 of 6 runs: a copy of the real index carries a fresh mtime, so git
trusted the stat of a same-size edit in the base commit's second and recorded
the old content. The temporary index now starts empty (10 of 10 passes; 0.20 s
for this repository's 1,019 files), recorded in GROUND-0038 D3. A
deterministic test for that race was tried and dropped: a mutant survived it,
so it did not test what it claimed.

Not strictly test-first: the green step implemented the whole first check, so
the stale, neutral, override, failed-exit, unrelated-input and kill-switch
tests were written after the code. Each was then mutation-checked: removing
the all-paths rule, the exit filter, the `gates.json` override, the kill switch
or the `gh pr create` action each turned the suite red. Two mutants survived
and were acted on: the exact-tree branch was redundant with the diff rule and
was removed, and the non-Bash test only read stdout and now also checks that
no evidence file appears.

Deviation from AC 1: the receipt is written by an npm `postverify` script,
which runs after `npm run verify` passes, whether run by hand or by the
pre-push runner (`scripts/hook-npm-test.js` runs `npm run verify`). `ad-pr`
records it for consumers after its local gates.

Fresh-context review of c0e87ff..240fc16, every finding with severity and
disposition:

- Standards Major: a rename into a neutral path hid the removed source
  (reproduced by the reviewer). Fixed test-first in c367ebc: `--no-renames`.
- Standards Major: `core.quotePath` quoted non-ASCII neutral paths, a false
  would-block. Fixed test-first in c367ebc: `-z`.
- Standards Minor: `git -C x push` and other global options were missed.
  Fixed test-first in c367ebc.
- Standards Minor: `gate-run.mjs` threw outside a repository and could fail
  `postverify`. Fixed test-first in c367ebc: it explains and exits 0.
- Standards Minor: the empty index's cost was unmeasured. Accepted, measured
  (GROUND-0038 D3).
- Standards Nit: no test for a malformed `gates.json`. Added; it already
  passed (`runtime-unavailable`, exit 0).
- Spec Major: no Codex-shaped event test. Added; it already passed (both
  hosts send `tool_name: "Bash"` and `tool_input.command`, GROUND-0038 E1).
- Spec Major: ADR-0089 named the commit SHA while the code keys the tree.
  Fixed: ADR-0089 addendum (29b6dd2).
- Spec Minor: GROUND-0038 measured the seeded index. Fixed: E2 and D3
  updated (29b6dd2).
- Spec Minor: the receipt comes from `postverify`, not the runner. Accepted,
  recorded above.
- Spec Nit: the evidence file also logs `clear` and `runtime-unavailable`.
  Accepted, recorded in the ADR-0089 addendum (false blocks count
  `would-block` only).
- Spec Nit: acceptance boxes unticked. Fixed in this entry's commit.

Delta review of 240fc16..499986e: no Blocker. Concern: quoted `-C`/`-c`
values were missed. Fixed test-first in 0b760ac. Concern: no negative matcher
cases. Fixed in 0b760ac (`git commit`, `git status`, `git stash push`,
`git remote add push`). Note: the RESEARCH-0039 draft had entered the docs
commit by mistake. Fixed: the commit was split before push (29b6dd2), and the
study lands in its own commit.

### 2026-10-07 — audit at 2dfdf8c

Correction to the entry above: 499986e, the head of the "delta review of
240fc16..499986e", was rewritten before push when the RESEARCH-0039 draft was
split out; its content is c367ebc plus 29b6dd2, which are in this branch, and
0b760ac and later were not re-reviewed by that pass. The mutation-check and
run-count results in that entry are author-reported: they were observed in the
authoring session and their output was not retained.

`/ad-audit` of `docs/evidence-gates-study` at 2dfdf8c (groups CV with a
cross-model second pass in two orders, GH, HK, AGENTS.md, GUIDELINES.md,
ARCHITECTURE and CONTEXT, ADRs; NET not applicable; every changed file read by
at least one reviewer, anchors matched; local gate green, 1281 tests): no
blocker. Every finding, with severity and disposition:

1. CV Major (both CV passes): the transcript counts in RESEARCH-0037 and
   ADR-0089 rest on a private corpus with unretained scripts. Fixed: labelled
   exploratory, kept out of decision evidence; the study adds the owner's
   stated need as E0, and the ADR's context no longer cites the count.
2. ARCH/CONTEXT Major: **Gate evidence line** and **Gate terminal state**
   described only the artifact gate. Fixed: both now define each gate's file,
   fields and closed set of states.
3. CV Minor (all three CV passes, ADRs): the rewritten 499986e. Fixed: the
   correction above.
4. CV Minor (CV, run B): mutation and run counts without artifacts. Fixed:
   labelled author-reported, here and in GROUND-0038 D3.
5. CV Minor (run B): GROUND-0038 D3 named 6ec9f9b for test runs on a later
   tree. Fixed.
6. ARCH/CONTEXT and GUIDELINES Minor: "rule CV.5" cited from tracked files
   and a shipped script, unresolvable in the repository. Fixed: removed from
   CONTEXT, ADR-0089 and `gate-run.mjs`.
7. GUIDELINES Minor (2.2): torn receipt lines and missing trees were dropped
   silently. Fixed test-first: the new test failed (field absent), then
   passed; the evidence line carries `unreadable_receipts`.
8. ADRs Minor: a failed evidence write was dropped silently. Accepted as a
   recorded decision (ADR-0089 second addendum): shadow mode may lose a line,
   never reports a pass, and Task 0110 states the limit.
9. ADRs Minor: ADR-0089 decision 4 named the ADR-0083 evidence file. Fixed:
   the addendum names the gate's own file.
10. ADRs Minor (judgement): ADR-0083 decision 3's validator clause does not
    fit a receipt gate. Fixed: the amendment now names that clause, in the
    ADR-0089 and ADR-0083 headers and PROJECTION.
11. ADRs Nit: PROJECTION did not say decision 1's never-denies stanza still
    binds receipt gates. Fixed.
12. HK Minor: the Codex command was only checked structurally. Fixed: a
    POSIX-only test runs it through `/bin/sh`; it passed, and failed when the
    script path in `.codex/hooks.json` was broken.
13. CV Minor (run A): the Paperclip figures in RESEARCH-0039 lack an
    artifact. Rejected: public data observed in this session through `gh api`,
    with the reproduction commands in the study's provenance.
14. CV Nit: no review of the final head. Addressed by this audit; its fixes
    get a delta re-audit before the pull request.

### 2026-10-07 — re-audit at 1b39846

Re-audit of 2dfdf8c..1b39846 (CV, and ADRs with ARCHITECTURE, CONTEXT and
GUIDELINES): every prior finding resolved, the Paperclip rejection upheld in
part (its figures are dated in the study). New, with dispositions:

- CV Minor: items 7 and 12 above state red runs without artifacts. Accepted
  as a label: both are author-reported; the red outputs were observed in the
  authoring session and not retained, and 2bceb12 holds the test and the fix
  together.
- CV Nit: the 2dfdf8c gate run (1281 tests) is in the auditor's local trail,
  not in a tracked record. Accepted: the tracked claim is this entry's; the
  head's gate is re-run before the pull request.
- ADRs Minor: the lost-line decision contradicts ADR-0083 decision 5 without
  naming it in the amendment pair. Fixed: ADR-0089, ADR-0083 and PROJECTION
  now name decision 5's every-state-is-recorded clause.
- GUIDELINES Nit: `unreadable_receipts` is a lower bound. Fixed: Task 0110's
  read-out says so.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
