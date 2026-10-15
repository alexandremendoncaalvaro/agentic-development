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

- [x] Receipt in `.agentic/receipts/release.jsonl` from `release-plan.mjs`, gate check in `sequence-gate.mjs`, preflight and ADR in one PR, audited (enforcement tooling).

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

### 2026-10-15 — review and audit of bbded9c

Two-axis review and the audit of the enforcement-tooling groups (CV on two
models, HK, GH): no blocker. Findings and dispositions:

- Concern (Standards), a `package.json` without a name gave a false `clear`:
  fixed, the check is `runtime-unavailable` unless both name and version
  are strings; pinned by a test.
- Concern (Standards), a per-stage approval without the package identity
  wrote an empty receipt: fixed, no receipt and `unavailable: missing
  package name or version`; pinned by a test.
- Minor violation (CV, second model), the built entry's "Nine tests went
  red" is wrong: eight of the nine failed before the code; the negative case
  "an unapproved or mismatched plan writes no release receipt" passes on the
  base by construction. Corrected here, since this log is append-only.
- Judgement-call (CV), the `tfa.mode` observation had no retained artifact:
  the redacted output of `npm profile get --json` on 2026-10-15 was
  `{'tfa': {'pending': None, 'mode': 'auth-and-writes'}, 'name': '...',
  'email': '...', ...}`.
- Judgement-call (CV), the release frequency had no recorded window: ADR-0096
  now names the six tags and the command.
- Judgement-call (CV), the preflight warning is prose: the CHANGELOG now
  says the step tells the agent to warn.
- Notes accepted and recorded in ADR-0096: workspace publish forms are not
  seen, a dry-run publish is logged, a receipt keeps the first approval time.
  `pnpm publish` and `yarn publish` are now pinned by a test.
- HK, GH: no finding.

### 2026-10-15 — delta review of 3d56ffd

Both axes ship as-is. The Plan line's `.agentic/receipts/release.jsonl` is
superseded by `<git common dir>/agentic/release.jsonl` (ADR-0096 decision
3). Note accepted: the gate treats an empty-string name as a name, a
shadow-only and unlikely case.
