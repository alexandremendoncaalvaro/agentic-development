# Task `0093`: Run the audit gate once before the fan-out

**Status:** done
**Created:** 2026-09-30
**Scope ref:** src/skills/claude-code/ad-audit/SKILL.md (Steps 3 and 4); doc/adr/0052-ad-audit-empirical-falsification-lane.md (Decision 4)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

`/ad-audit` fans out one reviewer per rule-group in parallel, and each
reviewer grounds by running or inspecting output. Nothing bounds what a
reviewer runs, so several reviewers may each start the repository's full
verification gate at the same time in the same worktree. In the Task 0085
audit that is what happened: reviewers could not finish `npm run verify`
because of contention from the parallel suite runs (Task 0085, audit
disposition). ADR-0052 Decision 4 already forbids a heavy suite running
alongside the fan-out, for the orchestrator's falsification lane, because the
same overload once killed a machine; the reviewers' own runs were left out.

The fix keeps the evidence and removes the contention: the orchestrator runs
the full gate once, serially, before dispatch, persists its output, and every
group handoff carries the result; a reviewer runs only the narrowest test
command for the files it grounds. This narrows no ADR: ADR-0052 grants
reviewers read-only execution, not the full suite, and Decision 4's rationale
is the one applied here.

## Acceptance Criteria

- [x] On both hosts, `/ad-audit` has the orchestrator run the repository's full verification gate once on the audit target before any reviewer runs, persist its output beside the audit trail, and put a `Gate:` line (command, exit status, summary, log path) in every group handoff.
- [x] Both `audit-group-reviewer` briefs (Claude Code `.md`, Codex `.toml`) tell the reviewer to read the handoff's `Gate:` result instead of rerunning the full suite or gate, and to run only the narrowest test command covering the files it grounds.
- [x] A gate that fails, is killed, or does not complete is reported as such in the `Gate:` line and is not treated as a pass (CV.6).
- [x] A test locks both halves on both hosts.
- [x] The dogfood installs are refreshed, `npm run verify` passes through the hook runner, and `CHANGELOG.md` records the change under `[Unreleased]`.

## Plan

- [x] Red: one test in `test/skills.test.js` beside the ADR-0052 contract tests.
- [x] Green: edit both `SKILL.md` bodies and both reviewer briefs; refresh the dogfood install.
- [x] `CHANGELOG.md`; `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-30

Opened from the `/ad-level-up` pass (item C4); the owner approved proceeding.
Split from the fan-out freeze candidate (rejected: no observed harm), which
has a different root cause. No ground record: the governing contract is
in-repo (ADR-0052 Decision 4 and the current Step 6 "Serial and isolated"
text), and the change is instruction text with no external technique.
Numbered 0093 because 0092 is taken on the open pull request 153.

### 2026-09-30 — Built, reviewed, landed

Red first: the contract test failed on the missing gate-once step, then
passed once both `SKILL.md` bodies and both reviewer briefs carried it. Fresh
two-axis review (handoffs and verdicts at
`.agentic/reviews/2026-09-30T12-18-07Z-working-tree-*.md`, machine-local):
Spec found no Blocker and no Concern. Standards found no Blocker and five
Concerns, all applied: the gate now runs at the top of Step 4, after the
>50-file scope check that can change the target, and fills each persisted
handoff's `--- GATE ---` section before dispatch; a failed gate reaches the
verdict as a finding and an incomplete one as an OPEN QUESTION; the `Gate:`
line names the `target=<SHA>` it ran on; the test now also locks the
before-review ordering, the CV.6 not-a-pass clause, and the `Gate: none` form;
the step uses the canonical "quality gate" (CONTEXT.md names three gate
layers) and CONTEXT.md's Audit handoff entry now lists the `Gate:` line and
the gate log. The Codex rationale was reworded to the inline path. Not
applied: the two briefs stay worded per host, since Codex has no parallel
reviewers by default.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
