# Task `0106`: Show the evidence-gate shadow result in the band

**Status:** in-progress
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

- [x] The briefing pane shows the evidence-gate shadow result for the current session (how many checks would have blocked and the latest step that would have, or that none would), read from the gate's own evidence through the kit's briefing script, never computed by the plugin. Amended 2026-10-08: the owner moved the briefing from the band to the pane (ADR-0090 addendum).
- [x] Nothing is injected into the model's context; the row is display-only and the plugin blocks nothing.
- [x] With no gate evidence the pane says it cannot tell; a reading that fails leaves the pane without a briefing; the band draws as it does without this row. Amended 2026-10-08 with the move to the pane.
- [x] Tests cover a would-block result, a clean result, and missing evidence.

## Plan

- [x] Wait for the evidence-gates ADR and its shadow-mode slice; then red, then green in `test/session-plugin.test.js` and the plugin's pure module.
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

### 2026-10-07 — paired with Task 0111

The owner asked for a continuous at-a-glance briefing (focus, plan stage,
deviations, roadmap progress, Definition of Done) on the same plugin surface.
Task 0111 tracks it; the owner chose to build the two together, after Task
0109.

### 2026-10-08 — delivered through Task 0111

Built inside Task 0111 as planned. The kit's `ad-next/scripts/briefing.mjs`
reads the gate's evidence file for the session (`gate.lines`, `wouldBlock`,
`last`, `lastWouldBlock`), and the `agentic-session` pane draws it as a health
row: "6 of 10 checks would block; latest: audit before gh pr merge", "none of
N checks would block", or "cannot tell" without evidence. The owner moved the
briefing from the band to the pane during Task 0111's live check (ADR-0090
addendum of 2026-10-08), so the criteria above are amended to the pane. Tests:
`test/briefing.test.js` (would-block, clean, missing and corrupt evidence) and
`test/session-plugin.test.js` (the pane's gate row in each state). The audit
before the pull request remains.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
