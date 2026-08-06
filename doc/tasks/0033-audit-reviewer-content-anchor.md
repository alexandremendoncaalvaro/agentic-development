# task-0033: Content anchor for ad-audit reviewers (anti-fabrication / anti-stale-read)

**Status:** proposed
**Date:** 2026-08-05

## Goal

A reviewer's claim that it audited the right artifacts becomes mechanically checkable: each `audit-group-reviewer` echoes a **content anchor** — the sha256 of the rules file(s) it read and the target SHA — and the aggregator cross-checks all reviewers audited the same rule-set version and tree. A "ran/read" assertion without a matching anchor is not trusted.

## Motivating incidents

- 2026-08-05 dogfood audit (ADR-0046): one CV second-pass reviewer reported its own Read tool serving stale pre-commit file content mid-review; it caught itself only by re-verifying against `git show HEAD:<path>`. An anchor check would surface this class mechanically.
- The pattern is proven in a sibling harness: its composite review gate honors a reviewer's `ran:true` only with a checkable anchor (skill version string or vendored-rubric content hash), added after a real incident of a reviewer asserting it ran when it hadn't.

## Checklist

- [ ] Extend the ad-audit Step 1 deterministic probe to emit sha256 for each resolved rules file (machine store files + project layer files).
- [ ] Handoff template: carry the expected anchors; reviewer brief (both hosts, .md + .toml): echo `Anchors: <file>=<sha256>, target=<SHA>` alongside `Files grounded`.
- [ ] Aggregation (Step 6): anchor mismatch or absence ⇒ that reviewer's verdicts are UNVERIFIED (not silently accepted); re-dispatch or mark the group unaccounted.
- [ ] ADR-0045 framing: this directs verification at an artifact class; it does not add lenses or pressure. State this in the ADR/commit.
- [ ] Mirror on both hosts; dogfood `update --yes`; `npm test`; self-audit with `/ad-audit` before PR.

## Notes

- 2026-08-05 — Registered from the SLIM/NEST mechanism investigation. Interacts with task-0031 (preflight-scripts infrastructure): if 0031 lands first, the anchor emission belongs in the shipped probe script rather than the embedded snippet.
