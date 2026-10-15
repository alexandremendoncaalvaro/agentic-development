# Task `0117`: Review the uncovered delta once, and audit by risk

**Status:** in-progress
**Created:** 2026-10-15
**Scope ref:** doc/adr/0091-review-the-uncovered-delta-once.md
**Evidence ref:** doc/research/0044-ground-review-economy-and-context-budget.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The kit audit of 2026-10-15 scored review economy 1.6 of 4: no skill reads the coverage ledger, a fix triggers a full re-review, the shadow gate expects an audit before every pull request action, and the critical second pass ran on the same model as the first. The owner approved this package on 2026-10-15 together with restarting the task 0110 shadow window.

## Acceptance Criteria

- [x] The receipt gate logs no audit line for a pull request action when no changed path matches `auditPaths` in `.agentic/gates.json`, and logs the audit check as before when one does.
- [x] The gate counts a review receipt with `Base-SHA:` only when an earlier review receipt covers that base; an unchained delta reads as would-block.
- [x] `ad-review` (both hosts) reads the coverage ledger first, reviews only the uncovered delta after a covered review, and writes `Base-SHA:` for a delta.
- [x] `ad-audit` (both hosts) is described for high-risk or uncovered work, re-audits only changed groups, and runs one critical second pass on a model other than the first, recorded in the trail.
- [x] The workflow checkpoint names review of the uncovered delta and audit by risk.
- [x] This repository's `.agentic/gates.json` names its high-risk paths.
- [x] ADR-0091 accepted with the projection and the `Amended by:` lines on ADR-0036, ADR-0074 and ADR-0089 in the same commit.
- [x] Task 0110 records the window restart at this change's merge.
- [ ] `npm run verify` green; dogfood install refreshed.

## Plan

- [x] Tests first in `test/sequence-gate.test.js` for the audit-by-risk and chained-delta behaviours; then `sequence-gate.mjs` and `review-receipts.mjs`, byte-identical in both host trees.
- [x] Checkpoint text and its test.
- [x] `ad-review`, `ad-audit` and `ad-hooks` skill text in both hosts; skill tests that pin the changed contract lines.
- [x] `.agentic/gates.json` `auditPaths`; ADR acceptance and projection; task 0110 Notes.
- [ ] Delta review of the range, one audit of the gate change (it is enforcement tooling), local gate, pull request.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-15 — plan approved

The owner approved this plan and accepted ADR-0091 on 2026-10-15, with the
task 0110 shadow window restarting when this change lands.

### 2026-10-15 — built

Seven gate tests went red first (no audit-by-risk, no chained delta), then
green; the existing fixture became a feature branch over `main` whose every
path is high-risk, so the earlier audit tests keep their meaning. The
checkpoint test asserted the new fifth line red, then green. Skill text
changed in both hosts; ADR-0091 and ADR-0092 accepted with the projection.
On this branch the real gate asks for the audit, because it changes
`src/skills/*/ad-hooks/scripts/**`.
