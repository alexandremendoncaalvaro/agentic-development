# PRISM-0045: Measure the kit from daily use

**Status:** recorded
**Decision ref:** doc/tasks/0126-measure-the-kit-from-daily-use.md

## Decision

Decide whether the review-economy and context changes released from version 1.5.0 onward reduced redundant review and the owner's repeated corrections in daily use: keep them as they are, or reopen the review-economy work (ADR-0091) with the numbers attached.

## Objective

Compare one baseline period before the changes with one follow-up period after them, using aggregate counts read from the owner's local Claude Code session transcripts, so that the kit's effect is measured from real work instead of synthetic receipts, at no cost beyond reading local files. The owner declined paid live trials on 2026-10-15 and asked for this instead.

## Evaluation question

Between the baseline period [2026-09-15, 2026-10-15) and the follow-up period [2026-10-15, 2026-11-14), both half-open in UTC and 30 days long, how did reviewer and auditor dispatches per pull request, CI failure reads per pull request, and the owner's standing-rule corrections per session change?

## Claim

Descriptive and comparative for one owner on one machine: the counts describe how the kit was used in each period, and a change between periods is consistent with, not proof of, an effect of the released changes. It is not a causal estimate, does not cover Codex sessions or other machines, and does not measure review quality.

## Evidence

- Reviewer and auditor dispatches, counted from tool calls that dispatch `fresh-context-reviewer` or `audit-group-reviewer` in main (non-sidechain) transcript lines (primary).
- Pull requests created and CI failure reads, counted from shell commands matching `pr create` and `run view ... --log-failed` (primary, as denominators and a guardrail).
- Owner corrections of standing rules, counted from the owner's own messages matching a frozen lexicon per rule: language, repetition, emoji, estimates (secondary; a lexical proxy).
- Sessions, counted as distinct session identifiers with a main line in the period (denominator).

## Tasks

- Normal work in both periods; nothing is staged for the measurement.
- Run `node eval/daily-use.mjs --from 2026-09-15 --to 2026-10-15` for the baseline after this plan is committed, and `node eval/daily-use.mjs --from 2026-10-15 --to 2026-11-14` on or after 2026-11-14, with the script and lexicon unchanged from the commit that last freezes this plan (see Amendment).
- The owner runs a new /insights report for the follow-up period; it is read beside the counts, not merged into them.

## Measures

- Primary: reviewer dispatches per pull request; auditor dispatches per pull request.
- Secondary: owner corrections per session, in total and by rule.
- Guardrails: CI failure reads per pull request; sessions and pull requests per period, to show whether volume changed.
- Every ratio is rounded to two decimals and is null when its denominator is zero.

## Data sources

- Local Claude Code transcripts under `~/.claude/projects/` (`AGENTIC_TRANSCRIPTS_DIR` overrides), all projects on the machine, read-only. Transcripts are private: the study records aggregates only, never text.
- The owner's /insights reports of 2026-10-15 (baseline context) and of the follow-up period.

## Decision rule

Set before the baseline is read. The thresholds are a design choice of this plan, not values set by the owner or derived from data, and are labelled so. Applied once, after the follow-up run:

1. If either period has fewer than 10 pull requests created or fewer than 20 sessions, report the counts and decide nothing (too little use to compare).
2. Keep the changes if reviewer dispatches per pull request fall by at least 25% and CI failure reads per pull request do not rise by more than 25%.
3. Reopen the review-economy work with the numbers if reviewer dispatches per pull request do not fall, or if CI failure reads per pull request rise by more than 25%.
4. Otherwise, report the numbers to the owner without a recommendation.

Owner corrections per session are reported beside the decision and do not decide it, because the lexicon is a proxy.

## Limits

- One owner and one machine; Claude Code transcripts only, so Codex sessions are not counted.
- The two periods differ in workload; volume guardrails show it but cannot remove it.
- Lexical correction counts miss corrections phrased otherwise and can count a phrase used for another purpose; they are a trend signal, not a measure of compliance.
- A dispatch counts a reviewer started, not a review that changed the outcome.
- Older transcripts without an `origin` field are read by a fallback rule (a plain message that is not meta and does not open with markup), which may admit some system text.
- Transcript retention limits the baseline to what the machine still holds.

## Amendment

2026-10-15, before the deciding follow-up run: the first baseline run at 218457d was followed by a fresh-context review that found defects in the instrument, not in the measures. A line copied into a resumed session's file was counted twice; a commit message or echo that mentioned `pr create` or `run view --log-failed` counted as a command; a compacted summary or an interruption marker counted as an owner message in the older-transcript fallback; an impossible date or an empty period ran silently. The script was corrected (duplicate lines skipped by `uuid`, commands matched in command position after quoted text is removed, the two system messages excluded, bad dates and periods refused) and this plan was frozen again before the baseline was read a second time. The measures, the correction lexicon and the decision rule did not change. The periods are stated half-open, so the follow-up starts on 2026-10-15. RESEARCH-0046 records both baseline runs. Review rounds, named in Task 0126's first criterion, are not a separate measure: reviewer dispatches per pull request stand for them, as this plan's measures already said before either run.

## Sources

### M1 — Goal/Question/Metric
- Source: NASA, Goal/Question/Metric paradigm, https://ntrs.nasa.gov/api/citations/19920010178/downloads/19920010178.pdf (accessed 2026-10-15 via the ad-prism source catalog)
- Supports: deriving the measures from the decision and the question rather than from available data
- Contribution: the goal, question and metric chain this plan follows
- Adaptation: one decision, one comparative question, primary measures tied to the decision rule
- Retained limit: it does not set thresholds or sample sizes

### M2 — Proportionate assurance and fit for purpose
- Source: UK Government, The Aqua Book, https://www.gov.uk/guidance/the-aqua-book (accessed 2026-10-15 via the ad-prism source catalog)
- Supports: freezing the plan before the data is read, and stating limits beside the result
- Contribution: proportionate analytical assurance with explicit responsibilities
- Adaptation: the script, lexicon and rule are committed before the baseline run
- Retained limit: it governs process quality, not the content of the decision rule
