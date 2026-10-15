# Task `0126`: Measure the kit from daily use

**Status:** in-progress
**Created:** 2026-10-15
**Scope ref:** doc/adr/0091-review-the-uncovered-delta-once.md
**Evidence ref:** the owner's /insights reports of 2026-10-15
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

Every eval receipt is synthetic, so the kit's effect is unmeasured. The owner declined paid live trials (2026-10-15) and asked to measure from daily use instead: a baseline from recorded sessions now, and the same measurement after the changes have run for a while, alongside a new /insights report.

## Acceptance Criteria

- [x] A repo-only script reads local session transcripts and prints aggregate metrics per period: reviewer and auditor dispatches per session and per pull request, review rounds, owner corrections on standing rules, and CI failures per pull request; it prints no transcript text.
- [x] Its metrics and comparison rule are frozen with `ad-prism` before the baseline is read.
- [ ] The baseline for 2026-09-15 to 2026-10-15 is recorded in a doc/research study, aggregates only.
- [ ] The follow-up date is recorded; the re-run and a new /insights report close the study.

## Plan

- [ ] Script with tests on fixture transcripts; freeze; baseline; study; one PR.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-15 — planned

Planned from the kit audit of 2026-10-15 after a read-only verification of
its claims against the code. The owner approved doing every remaining
package on 2026-10-15. The owner chose measurement from daily use over paid live trials.

### 2026-10-15 — script and freeze

Two tests went red (script missing), then green: the counts, ratios and
correction lexicon over fixture transcripts with a secret phrase that never
reaches the output, and an empty period with a usage error for a bad date.
The script lives in `eval/` (repo-only measurement, not enforcement
tooling). PRISM-0045 freezes the measures, the lexicon (in the script) and
the decision rule, whose thresholds are labelled a design choice; it is
committed before the baseline is read. Follow-up run on or after 2026-11-16
for 2026-10-16 to 2026-11-15, with a new /insights report.
