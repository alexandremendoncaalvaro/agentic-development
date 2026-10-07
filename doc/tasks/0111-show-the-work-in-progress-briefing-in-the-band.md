# Task `0111`: Show the work-in-progress briefing in the band

**Status:** proposed
**Created:** 2026-10-07
**Scope ref:** doc/product/PRD.md (Next tier, Optional Claude Code companion plugin)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

The owner keeps asking the same questions during a session: what is the focus
right now, which stage of the plan the work is in, whether the plan was
approved and is frozen, whether the work deviated and with what justification,
how far the roadmap has moved, and what "done" means for the current task.
`/ad-brief` and `/ad-roadmap` answer them only when asked. The owner wants
them visible continuously, at a glance, in a side panel or the context band of
the `agentic-session` plugin, the surface Task 0106 already extends.

The facts exist in tracked files: the active task's status, acceptance
criteria, plan checkboxes, Definition of Done and dated Notes (plan approval,
deviations with their reasons), the roadmap tiers, and the receipt gates'
evidence. Whether a Claude Code mod can render a continuous panel, and how it
reads those facts, is not yet grounded.

Sequenced by the owner on 2026-10-07: after Task 0109, together with Task
0106, which displays the gate result on the same surface.

## Acceptance Criteria

- [ ] At a glance, the panel names the active task and its status, the current plan stage (checked and open plan items), and whether the plan was approved before the first implementing commit.
- [ ] It shows recorded deviations from the plan with the reason each Notes entry gives, and nothing when there are none.
- [ ] It shows roadmap progress and the active task's open acceptance criteria and Definition of Done items.
- [ ] Every fact is read from tracked files or receipts, never inferred by the plugin; with no active task or an unreadable source, the panel says so instead of guessing.
- [ ] Nothing is injected into the model's context and nothing is blocked.

## Plan

- [ ] `/ad-ground` the Claude Code mod surfaces (panel, band, status line), how a mod reads repository files, and how `ad-brief` and `ad-roadmap` resolve the active task; risk register (`/ad-derisk`).
- [ ] Proposal, design and plan for the owner's approval; criteria above revised against the grounded surface.
- [ ] Build with Task 0106 (`/ad-tdd`); live check; `/ad-review`; `/ad-audit`; `/ad-commit`; PR on the owner's approval.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Proposed from the owner's request during Task 0108. The owner chose to place
it after Task 0109 and to build it with Task 0106. The criteria are
provisional until the grounding step settles what the plugin surface can show.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
