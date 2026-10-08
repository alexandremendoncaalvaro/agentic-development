# ADR-0090: Show the work-in-progress briefing in the session plugin

**Status:** accepted
**Date:** 2026-10-07
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0088, items 3 and 8, for one member only: a display of the kit's own briefing script may summarize the work in progress, and this record is the workflow-stage segment's own decision. Every other ADR-0088 item binds it unchanged.
**Related:** ADR-0057 (deterministic gathering in scripts, judgment in prose); ADR-0089 (the receipt gate whose result the band shows, Task 0106)

## Context

The owner keeps asking, during a session, what the focus is, which plan stage
the work is in, whether the plan was approved and frozen, whether the work
deviated and why, how far the roadmap has moved and what "done" means for the
current task (Task 0111). `/ad-brief` and `/ad-roadmap` answer on request
only. ADR-0088 item 3 keeps out of the session plugin any member that would
duplicate a kit skill, naming summaries and next-step suggestions, and item 8
gives a workflow-stage segment its own decision. GROUND-0043 found that every
fact the owner asks for is already in tracked files, that a plugin can run a
host command and draw both a band and a pane, and that the kit already keeps
deterministic gathering in scripts (ADR-0057).

## Decision

We will add a briefing to the `agentic-session` plugin, computed by a kit
script and only displayed by the plugin.

1. **One source.** A zero-dependency script, `briefing.mjs`, shipped with the
   kit beside the state survey, prints one JSON briefing for the repository:
   the active task (its rule stated in the script), its status, plan items,
   open acceptance criteria and Definition of Done items, the plan's approval
   and its order against the first implementing commit, the deviations its
   Notes record, the roadmap's progress from the survey, and the receipt
   gate's latest shadow result (Task 0106). It degrades instead of throwing
   and says when it cannot tell.
2. **Display only.** The plugin runs the script with `$.process.run` on session
   start, after each main-loop turn and after a compaction, never on every
   draw. It shows one line in the band above the prompt and the full briefing
   in a pane opened by a command; it computes nothing, injects nothing into
   the model's context and blocks nothing. With no repository, no script or a
   failed run, it draws nothing.
3. **Not a duplicate.** `/ad-brief` reads the same script, so the band and the
   skill cannot disagree; the plugin adds only the continuous display, which
   needs the screen. This is the amendment to ADR-0088 item 3.
4. **Codex and no plugin.** Without the plugin, `/ad-brief` remains the way to
   see the briefing; Codex has no drawing surface (ADR-0088 item 6).

## Consequences

Positive:

- The owner sees focus, stage, deviations, progress and the done condition
  without asking, and the same facts back `/ad-brief`.
- The script is testable offline and usable on both hosts.

Negative / trade-offs:

- The active-task rule is a convention; a session working across tasks may
  show the wrong one until the Notes or status catch up. Accepted: the band
  says when it cannot tell, and the rule is stated.
- Running a script after each turn costs a process start per turn; the plan
  measures it before the band ships.
- Deviations are only as visible as the Notes make them.

## Alternatives Considered

- **Keep asking `/ad-brief`** — rejected: it is the status quo the owner asked
  to replace.
- **Compute the briefing inside the plugin** — rejected: Claude-Code-only, not
  testable offline, and a second source that could disagree with `/ad-brief`.
- **A status line entry only** — rejected as the whole answer: one line cannot
  hold the plan stage, deviations and done condition; it may carry the
  one-line summary.

## Addendum 2026-10-08: the briefing lives in the pane, not the band

The owner's live check of task 0111's slice 2 changed decision 2. The
one-line summary above the prompt took room and confused more than it
helped, so the band keeps only its ADR-0088 role: the context reading and the
handoff button past the threshold. The briefing is drawn only in the pane
that `/agentic-briefing` opens, the shortcut the owner asked for. The pane
lays the script's output out as a header card, the next plan step, progress
bars, colored health marks, and the Markdown checklists. The run points of
decision 2 (session start, each main-loop turn, after a compaction) and the
rule that the plugin computes no fact stand. The status-line alternative is
not taken either.
