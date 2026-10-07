# Task `0111`: Show the work-in-progress briefing in the band

**Status:** proposed
**Created:** 2026-10-07
**Scope ref:** doc/adr/0090-show-the-work-in-progress-briefing-in-the-session-plugin.md (proposed)
**Evidence ref:** doc/research/0043-ground-work-in-progress-briefing-band.md
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

- [ ] `briefing.mjs` (both hosts, byte-identical) prints one JSON briefing: active task and the rule that chose it, status, plan items done and open, open acceptance criteria and Definition of Done items, whether the plan's approval entry precedes the first implementing commit, the deviations its Notes record, roadmap progress from the survey, and the receipt gate's latest shadow result for the session (Task 0106); it degrades instead of throwing and says "cannot tell" when a fact is missing.
- [ ] The `agentic-session` plugin runs the script on session start, after each main-loop turn and after a compaction, shows one line in the band (task, stage, open items) and the full briefing in a pane opened by `/agentic-briefing`; it computes nothing, injects nothing, blocks nothing, and draws nothing when the script is absent or fails.
- [ ] `/ad-brief` reads the same script, on both hosts.
- [ ] The cost of a run on this repository is measured (median of repeated runs) before the band ships, and stated.
- [ ] Tests: the script on fixture repositories (one active task, none, several, a deviation entry, a missing roadmap, an unreadable file); the plugin's pure module on recorded script output (band line, pane rows, absent script).

## Plan

- [ ] Owner accepts ADR-0090 and approves this plan.
- [ ] Slice 1, the script: red, then green (`/ad-tdd`) on fixture repositories; parity; measure its run time.
- [ ] Slice 2, the band and the pane: red, then green in the plugin's pure module; live check in the desktop app (owner-observed, at a width that seats the pane and one that does not).
- [ ] Slice 3, `/ad-brief` reads the script; Task 0106's criteria close with slice 1's gate result.
- [ ] `/ad-review` per slice; `/ad-audit` before the pull request; `/ad-commit`; PR on the owner's approval.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Proposed from the owner's request during Task 0108. The owner chose to place
it after Task 0109 and to build it with Task 0106. The criteria are
provisional until the grounding step settles what the plugin surface can show.

### 2026-10-07 — grounded, ADR and plan drafted

GROUND-0043 grounds the display: a plugin can read files, run a host command
without a shell, draw the band and open a pane, and the kit already gathers
state in `survey.mjs`. ADR-0088 items 3 and 8 exclude this member without its
own decision, so ADR-0090 is drafted (proposed) to amend them for a display of
the kit's own script. The criteria above replace the provisional ones; the
plan waits for the owner's acceptance of ADR-0090 and approval. Task 0106 (the
gate's shadow result in the band) is folded into slice 1 and closes with it.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
