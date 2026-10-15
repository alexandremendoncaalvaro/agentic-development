# RESEARCH-0046: How the kit was used before the review-economy changes

**Status:** draft
**Created:** 2026-10-15
**Question:** In the owner's daily use from 2026-09-15 to 2026-10-15, how many reviewer and auditor dispatches, CI failure reads and standing-rule corrections occurred per session and per pull request?
**Stakes:** low times reversible
**Confidence:** Conditional

## Conclusion and confidence

Before the review-economy changes, the owner's sessions dispatched about 3.3 reviewers and 9.1 auditors per pull request created, and the owner corrected a standing rule in about two of every five sessions. Auditor dispatches outnumbered reviewer dispatches almost three to one, which is consistent with the redundant review the owner reported. Conditional: the counts are measured, but the period is one owner on one machine, the correction count is a lexical proxy, and the comparison that decides anything waits for the follow-up period under PRISM-0045.

## Question and scope

Baseline for PRISM-0045: the period ends on 2026-10-15, before version 1.5.0 (review economy, ADR-0091) had run for a meaningful time. Claude Code transcripts on the owner's main machine, all projects; Codex sessions excluded.

## Hypothesis

Not applicable to a baseline; PRISM-0045 holds the decision rule the follow-up period is judged by.

## Method

`node eval/daily-use.mjs --from 2026-09-15 --to 2026-10-15`, run on 2026-10-15 at commit 218457d, which froze the script, its correction lexicon and PRISM-0045 before this run. The output is aggregate counts and ratios only.

## Evidence

### E1 — Baseline counts
**Tier:** Measurement
**Strength:** High
**Provenance:** S1

| Measure | Value |
| --- | --- |
| Sessions | 216 |
| Owner messages | 1552 |
| Reviewer dispatches | 398 |
| Auditor dispatches | 1085 |
| Pull requests created | 119 |
| CI failure reads | 46 |
| Owner corrections (messages) | 90 |
| Corrections by rule: language, repetition, emoji, estimates | 49, 39, 21, 10 |
| Reviewer dispatches per pull request | 3.34 |
| Auditor dispatches per pull request | 9.12 |
| CI failure reads per pull request | 0.39 |
| Reviewer dispatches per session | 1.84 |
| Auditor dispatches per session | 5.02 |
| Owner corrections per session | 0.42 |

## Limitations and what would reverse the conclusion

- One owner and one machine; another machine's sessions are not included.
- The correction lexicon counts phrases, not intent; a correction worded otherwise is missed, and a matching phrase used for another purpose is counted.
- A dispatch counts a reviewer started, not one that changed the outcome; a pull request counts a `pr create` command, including any that failed.
- Transcript retention bounds the period to what the machine still holds.
- A reading of the same transcripts by a different rule would change the counts; the frozen script is the reference.

## Provenance and artifacts

- S1 — `eval/daily-use.mjs` at 218457d over `~/.claude/projects/`, run 2026-10-15 (accessed 2026-10-15 via local execution); the JSON output is reproduced in E1.

## Assessment

To be completed after the follow-up run on or after 2026-11-16 for 2026-10-16 to 2026-11-15, read beside a new /insights report, under PRISM-0045's decision rule.

## Derived decision

None yet; PRISM-0045 decides after the follow-up period.
