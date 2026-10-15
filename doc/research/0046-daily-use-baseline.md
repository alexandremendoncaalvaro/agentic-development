# RESEARCH-0046: How the kit was used before the review-economy changes

**Status:** draft
**Created:** 2026-10-15
**Question:** In the owner's daily use from 2026-09-15 to 2026-10-15, how many reviewer and auditor dispatches, CI failure reads and standing-rule corrections occurred per session and per pull request?
**Stakes:** low times reversible
**Confidence:** Conditional

## Conclusion and confidence

Before the review-economy changes, in the period [2026-09-15, 2026-10-15), the owner's sessions dispatched about 7.2 reviewers and 20 auditors per pull request created, and the owner corrected a standing rule in about one of every three sessions. Conditional: the counts are measured by the corrected, re-frozen instrument, but the period is one owner on one machine, the correction count is a lexical proxy, and the comparison that decides anything waits for the follow-up period under PRISM-0045.

## Question and scope

Baseline for PRISM-0045: the period is half-open in UTC and ends before 2026-10-15, before version 1.5.0 (review economy, ADR-0091) had run for a meaningful time. Claude Code transcripts on the owner's main machine, all projects; Codex sessions excluded.

## Hypothesis

Not applicable to a baseline; PRISM-0045 holds the decision rule the follow-up period is judged by.

## Method

`node eval/daily-use.mjs --from 2026-09-15 --to 2026-10-15`, run twice on 2026-10-15. The first run, at 218457d, used the script as first frozen; a review then found instrument defects (duplicated lines from resumed sessions, quoted mentions counted as commands, system text in the older-transcript fallback). The script was corrected and PRISM-0045 frozen again at a6ee778, with measures, lexicon and decision rule unchanged, and the second run is the baseline. Both outputs are aggregate counts and ratios only.

## Evidence

### E1 — Baseline counts, corrected instrument (a6ee778)
**Tier:** Measurement
**Strength:** High
**Provenance:** S1

| Measure | Value |
| --- | --- |
| Sessions | 216 |
| Owner messages | 1518 |
| Reviewer dispatches | 389 |
| Auditor dispatches | 1082 |
| Pull requests created | 54 |
| CI failure reads | 41 |
| Owner corrections (messages) | 70 |
| Corrections by rule: language, repetition, emoji, estimates | 31, 33, 8, 7 |
| Reviewer dispatches per pull request | 7.2 |
| Auditor dispatches per pull request | 20.04 |
| CI failure reads per pull request | 0.76 |
| Reviewer dispatches per session | 1.8 |
| Auditor dispatches per session | 5.01 |
| Owner corrections per session | 0.32 |

### E2 — First run, defective instrument (218457d)
**Tier:** Measurement
**Strength:** Low
**Provenance:** S2

Superseded by E1 and kept for the record: 216 sessions, 1552 owner messages, 398 reviewer and 1085 auditor dispatches, 119 pull requests, 46 CI failure reads, 90 owner corrections. Most of the difference is pull requests: 65 of the 119 were mentions of `pr create` inside quoted text or messages, not commands.

## Limitations and what would reverse the conclusion

- One owner and one machine; another machine's sessions are not included.
- The correction lexicon counts phrases, not intent; a correction worded otherwise is missed, and a matching phrase used for another purpose is counted.
- A dispatch counts a reviewer started, not one that changed the outcome; a pull request counts a `pr create` command, including any that failed.
- Transcript retention bounds the period to what the machine still holds.
- A reading of the same transcripts by a different rule would change the counts; the frozen script is the reference.

## Provenance and artifacts

- S1 — `eval/daily-use.mjs` at a6ee778 over `~/.claude/projects/`, run 2026-10-15 (accessed 2026-10-15 via local execution); the JSON output is reproduced in E1.
- S2 — `eval/daily-use.mjs` at 218457d, the same transcripts and period, run 2026-10-15 (accessed 2026-10-15 via local execution); summarized in E2.

## Assessment

To be completed after the follow-up run on or after 2026-11-14 for [2026-10-15, 2026-11-14), read beside a new /insights report, under PRISM-0045's decision rule.

## Derived decision

None yet; PRISM-0045 decides after the follow-up period.
