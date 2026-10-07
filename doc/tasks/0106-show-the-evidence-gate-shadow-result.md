# Task `0106`: Show the evidence-gate shadow result in the band

**Status:** proposed
**Created:** 2026-10-07
**Scope ref:** doc/product/PRD.md (Next tier, Optional Claude Code companion plugin)
**Evidence ref:** doc/research/0035-ground-claude-code-session-plugin.md
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

"Verify before claiming done" is one of the owner's core rules. This task first
planned a display-only receipt row computed from tool calls (RESEARCH-0036 E5).
The owner replaced it with the shadow mode of evidence gates: a gate script,
shared by both hosts under ADR-0083, records "would block" when a required step
(review, audit, verify run, approved publication) has no receipt for the
current commit. That gate is planned in its own front and needs its own ADR.
What remains for the plugin is display: show the gate's latest shadow result in
the context band, so the owner sees it without asking.

This task waits for the evidence-gates ADR and its first gate slice; its
acceptance criteria are written against that ADR's receipt format.

## Acceptance Criteria

- [ ] The band shows the latest evidence-gate shadow result for the current session (which step would have blocked, or nothing when none would), read from the gate's own evidence, never computed by the plugin.
- [ ] Nothing is injected into the model's context; the row is display-only and the plugin blocks nothing.
- [ ] With no gate evidence, or a reading that fails, the band draws as it does without this row.
- [ ] Tests cover a would-block result, a clean result, and missing evidence.

## Plan

- [ ] Wait for the evidence-gates ADR and its shadow-mode slice; then red, then green in `test/session-plugin.test.js` and the plugin's pure module.
- [ ] Live check; docs; `/ad-review`; `/ad-audit`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Planned with Task 0104 under ADR-0088 (proposed), from RESEARCH-0036's
shortlist; starts after Task 0104 lands.

### 2026-10-07 — re-scoped

The owner dropped the display-only verify-before-done receipt in favour of the
shadow mode of evidence gates (recorded in Task 0104's Notes). ADR-0088 item 5
now plans only the resume chip and leaves this receipt to the gate decision.
This task is re-scoped to display the gate's shadow result, renamed from
`0106-show-a-verify-before-done-receipt.md`, and marked HITL because it waits on
that decision.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
