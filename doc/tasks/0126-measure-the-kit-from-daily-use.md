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

- [x] A repo-only script reads local session transcripts and prints aggregate metrics per period: reviewer and auditor dispatches per session and per pull request (which stand for review rounds), owner corrections on standing rules, and CI failure reads per pull request; it prints no transcript text.
- [x] Its metrics and comparison rule are frozen with `ad-prism` before the baseline is read.
- [x] The baseline for 2026-09-15 to 2026-10-15 is recorded in a doc/research study, aggregates only.
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

### 2026-10-15 — baseline

Run at 218457d after the freeze: 216 sessions, 119 pull requests, 398
reviewer and 1085 auditor dispatches (3.34 and 9.12 per pull request), 46 CI
failure reads (0.39 per pull request), 90 owner messages correcting a
standing rule (0.42 per session). Recorded in RESEARCH-0046, aggregates only.
The follow-up date is 2026-11-16; the last criterion and the Plan item close
then, with the re-run and a new /insights report.

### 2026-10-15 — review of 0ec20de and a second freeze

Two-axis review, no blocker. Spec concern: review rounds were named in the
first criterion but not measured; adding a measure after reading the baseline
would choose a metric from the data, so the criterion now says what the frozen
plan measured (dispatches per pull request stand for rounds), recorded here
as the deviation. Standards concerns, fixed test-first: duplicate lines from
resumed sessions, quoted mentions counted as commands, system text counted as
owner messages in the fallback, and silent bad dates or empty periods (two
tests went red, then green). PRISM-0045 gained an Amendment and was frozen
again before the second baseline run; measures, lexicon and decision rule are
unchanged, and the periods are half-open with the follow-up on [2026-10-15,
2026-11-14). Notes accepted: the interpretive line in RESEARCH-0046 is
removed; the lexicon stays a proxy.
