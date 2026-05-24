# Task `0002`: `audit Codex ad-review single-session axis bleed against Claude Code two-reviewer split`

**Status:** `proposed`
**Created:** `2026-05-24`
**Owner:** `Alexandre Alvaro`
**Spec ref:** `doc/specs/0002-two-axis-fresh-context-review.md`
**Board ref:** ``

## Context

The Codex variant of `ad-review` (rewritten in commit `3fabb92`) uses a **single-session two-axis review**: one reviewer reads both Standards-axis context (AGENTS / ARCHITECTURE / GUIDELINES / CONTEXT / accepted ADRs) and Spec-axis context (task / spec / PRD / issue), then classifies findings under `## Standards Findings` and `## Spec Findings` headings in the same reply. The Claude Code variant uses the §10 ideal: **two parallel `Task` sub-agents**, each with only its axis's slice of context.

The two-axis dichotomy is borrowed from `mattpocock/skills/review`, where the explicit reason for two reviewers is that one reviewer with both axes loaded rationalizes across them. The Codex variant claims schema rigor (output ordering) substitutes for context separation. The §10 self-review of commit `3fabb92` flagged this:

> `src/skills/codex/ad-review/SKILL.md:111`: Concern: The instruction "Read the diff once, classify each finding into exactly one axis before adding it to the report" is the sole mechanism preventing cross-axis rationalization in the single-session model. […] The reviewer has both Standards and Spec material loaded simultaneously and the instruction is advisory. […] This is a genuine degradation from §10 ideal that is not fully disclosed to the user.

(Audit trail: `.agentic/reviews/20260524T031236Z-v0.17.1-vs-HEAD.md`, Standards Concern #3.)

ADR-0007 Addendum (2026-05-24) already captured the follow-up: "If field evidence shows axis bleed in practice, a future ADR may reintroduce a stricter Codex path."

What breaks without this task: the kit ships a Codex variant that may be silently degrading §10 fidelity. Without field measurement, we cannot decide whether to (a) accept the trade-off, (b) promote the optional user-initiated subagent escalation from the bottom of the skill to the default path, or (c) ship a different structural enforcement (e.g., forcing the agent to produce the Standards-axis findings first, then re-read the diff afresh before producing the Spec-axis findings).

This task assumption being tested: **a single Codex reviewer with both axes loaded will miss Standards findings the Spec axis would have masked (and vice versa) at a measurable rate compared to two fresh-context reviewers on Claude Code reviewing the same diffs.**

## Acceptance Criteria

- [ ] At least 3 historical diffs (PRs / branches / commit ranges) selected for the comparison. Each diff must have material on both axes (i.e. touches behavior covered by ADRs / AGENTS / etc. AND implements a tracked spec or task) so both axes have something to find.
- [ ] Each selected diff run through the Codex variant of `ad-review` — output captured.
- [ ] Same diff run through the Claude Code variant of `ad-review` (two parallel `Task` sub-agents) — output captured.
- [ ] Finding sets compared per diff. A finding is a "miss" if it appears on one variant but not the other AND would have been catchable on the missing side given the context that variant received.
- [ ] Report written to `doc/decisions/axis-bleed-audit-<date>.md` (or appended to ADR-0007 Addendum) with: number of misses per direction (Standards-miss-on-Codex, Spec-miss-on-Codex, Codex-found-but-Claude-missed), severity distribution, qualitative examples.
- [ ] Decision rendered: keep current Codex variant / promote subagent escalation to default / ship structural enforcement / open separate ADR.
- [ ] If the decision changes the Codex variant: SKILL.md edit + commit + dogfood sync.

## Plan

- [ ] Pick 3+ historical diffs. Candidates: `v0.16.0-beta.1..v0.17.0-beta.1` (ad-handoff + first ad-review rewrite), `v0.17.0-beta.1..v0.17.1-beta.1` (broken Codex variant attempt), `v0.17.1-beta.1..v0.17.2-beta.1` (Codex rewrite), `v0.17.2-beta.1..v0.17.3-beta.1` (self-review followups). Each has both Standards (ADR-0007, AGENTS.md, GUIDELINES.md) and Spec (commit-body promises) material.
- [ ] For each diff, invoke Codex variant manually via the kit-installed skill. Capture output to `doc/decisions/scratch/axis-bleed-codex-<diff-slug>.md`.
- [ ] For each diff, invoke Claude Code variant (`/ad-review <range>`). Capture two-axis subagent output to `doc/decisions/scratch/axis-bleed-claude-<diff-slug>.md`.
- [ ] Diff the finding sets. Tag each finding as `both`, `codex-only`, `claude-only`. Of the unique-to-one-side findings, manually re-classify which were missed-due-to-context-blindness vs missed-due-to-reviewer-variance.
- [ ] Write `doc/decisions/axis-bleed-audit-2026-05-NN.md` summarising: methodology, per-diff results, aggregate miss rates per direction, severity skew, decision proposed.
- [ ] If decision is to change the Codex variant, draft an ADR superseding the relevant slice of ADR-0007 Addendum and propose the SKILL.md edit. Otherwise, update ADR-0007 Addendum's follow-up paragraph with the audit result + decision-to-keep.
- [ ] `/ad-review main..HEAD` on the audit report itself before merge.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
