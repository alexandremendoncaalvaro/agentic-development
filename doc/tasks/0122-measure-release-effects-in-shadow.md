# Task `0122`: Measure release effects in shadow

**Status:** in-progress
**Created:** 2026-10-15
**Scope ref:** doc/adr/0089-check-workflow-receipts-in-shadow-before-landing.md (decision 2 amended by a new ADR)
**Evidence ref:** doc/research/0044-ground-review-economy-and-context-budget.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

`ad-release`, `ad-publish` and `ad-merge` are gated only by an approval step in prose. A skill-frontmatter hook would fire only after the skill is invoked and would trust receipts the agent writes. The npm one-time password is the barrier the agent cannot forge; ADR-0083 and ADR-0089 require a measurement before any block.

## Acceptance Criteria

- [x] An approved release plan leaves a local release receipt naming the package, version, plan digest and time; an unapproved or mismatched plan writes nothing (tests).
- [x] The receipt gate logs a shadow `release` check before `npm publish` and `<gh> release create`: clear only with a receipt for the `package.json` name and version (tests; always exit 0).
- [x] `ad-release` preflight warns when the npm account's two-factor mode does not cover writes.
- [x] A new ADR records the measurement and amends ADR-0089 decision 2; ADR-0085 points to it.

## Plan

- [ ] Receipt in `.agentic/receipts/release.jsonl` from `release-plan.mjs`, gate check in `sequence-gate.mjs`, preflight and ADR in one PR, audited (enforcement tooling).

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-15 — planned

Planned from the kit audit of 2026-10-15 after a read-only verification of
its claims against the code. The owner approved doing every remaining
package on 2026-10-15. No block is added now: the binding ADRs require measurement first.

### 2026-10-15 — built

Nine tests went red, then green: the planner writes one receipt per
approval scope, none for an unapproved or mismatched plan, a stage-scoped
one for a per-stage publish approval, and reports `unavailable` outside a
repository; the gate logs `would-block` without a receipt, `clear` for the
package version (also from a linked worktree), `would-block` for another
version and `runtime-unavailable` without `package.json`. Deviation from
the plan: the receipt lives in `<git common dir>/agentic/release.jsonl`, not
`.agentic/receipts/`, because the publish runs in a disposable worktree at
the tag (ADR-0096 decision 3). `npm profile get --json` on the owner's
account read `tfa.mode` = `auth-and-writes` on 2026-10-15, the field the
preflight step reads; the step is prose, since it needs the network and a
login.
