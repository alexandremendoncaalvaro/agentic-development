# GROUND-0043: Show the work-in-progress briefing from a kit script in the session plugin

**Status:** recorded
**Decision:** A zero-dependency kit script, `briefing.mjs`, reads the active task file, the roadmap state `ad-next/scripts/survey.mjs` already computes, git history and the receipt gate's evidence, and prints one JSON briefing; the `agentic-session` Claude Code plugin runs it with `$.process.run` on session start and after each turn, shows a one-line summary in the band above the prompt and the full briefing in a pane the owner opens with a command, and never computes a fact itself.
**Decision ref:** doc/tasks/0111-show-the-work-in-progress-briefing-in-the-band.md
**Confidence:** Strong

## Decision and confidence

The facts the owner keeps asking for already live in tracked files: the task's status, acceptance criteria, plan and Definition of Done checkboxes, its dated Notes (plan approval, deviations, review records), the roadmap tiers the survey reads, and, since Task 0107, the gate's evidence lines. A Claude Code plugin can read files, run a host command without a shell, draw a band above the prompt, open a pane and register a command, so the display needs no new host capability. Computing the briefing in a script, not in the plugin, keeps one deterministic source that `ad-brief`, Codex and tests can use too, follows the kit's split of deterministic gathering into scripts and judgment into prose, and keeps the plugin a display, as ADR-0088 and Task 0106 require ("read from the gate's own evidence, never computed by the plugin"). Axis-2: Strong for the display path, which rests on this build's own type contract and an in-repo plugin that already draws a band; the active-task rule is a design choice the plan states.

## Evidence

### E1 — A plugin can read files, run a host command, draw a band, open a pane and register a command

**Strength:** High
**Provenance:** A1, C1

This build's plugin contract offers `$.fs.read`, `$.fs.list` and `$.fs.stat` (files under 4 MiB), `$.process.run(argv)` (no shell, 30-second default timeout, whole output returned), a `ui.render` hook on `AbovePrompt` for a band, `$.ui.open` with a `Pane` render hook for a side pane (opened by a command at any width, or unasked from 144 terminal columns), `$.ui.status` for a status line entry, and `$.command.register` for a slash command (A1). The kit's own `agentic-session` plugin already draws a band above the prompt, re-reads on `session.start`, `turn.complete` and `session.compact`, and fails closed when a reading is unavailable (C1).

### E2 — The kit already gathers project state deterministically in a script

**Strength:** High
**Provenance:** C2, D1

`ad-next/scripts/survey.mjs` prints one JSON object of countable facts: git branch and divergence, the six-layer stack's presence, spec and task statuses, ADR counts; it degrades instead of throwing and reports unreadable files (C2). It was introduced to keep deterministic gathering in a script and judgment in skill prose (D1). A briefing script extends the same split to the active task's checkboxes and Notes.

### E3 — Status displays elsewhere are a command run on each repaint over local state

**Strength:** Medium
**Provenance:** B1

ccstatusline fills Claude Code's status line from the host's status JSON, git commands and local files, re-runs on each repaint or on a configured interval of 1 to 60 seconds, and caches git results to bound the cost (B1). The same shape fits here: a script over local files and git, re-run at turn boundaries rather than on every draw, as the existing band already does.

### E4 — The display must not compute or inject

**Strength:** High
**Provenance:** C3, C4

ADR-0088 bounds the companion plugin to members that need the screen or the host, opt-in, outside the npm package; its item 3 excludes members that would duplicate a kit skill ("summaries, next-step suggestions, reviewer status"), and its item 8 requires a workflow-stage segment to get its own ADR (C3). The briefing is such a segment, so it needs an ADR that amends items 3 and 8 for a display of the kit's own script output. Task 0106 requires the gate's shadow result to be read from the gate's own evidence, never computed by the plugin, with nothing injected into the model's context (C4); Task 0111 repeats that every fact is read, never inferred.

## Source register

- **A1:** Claude Code plugin type contract for build 2.1.289, `plugin-authoring/types/claude-code.d.ts` (`fs`, `process.run`, `ui.open`, `Pane`, `AbovePrompt`, `command.register`) and its `examples/pane.tsx` and `examples/band.tsx`, bundled with the host (accessed 2026-10-07 via the plugin-authoring skill and Read)
- **B1:** sirmalloc/ccstatusline README, data sources and refresh interval, https://github.com/sirmalloc/ccstatusline (accessed 2026-10-07 via WebFetch)
- **C1:** `plugins/agentic-session/hooks/register.mjs` and `band.mjs`, the band, its reading events and fail-closed rule (accessed 2026-10-07 via Read)
- **C2:** `src/skills/claude-code/ad-next/scripts/survey.mjs`, header contract and output on this repository (accessed 2026-10-07 via Read and Bash)
- **C3:** `doc/adr/0088-ship-an-optional-claude-code-companion-plugin.md`, the companion plugin's scope (accessed 2026-10-07 via Read)
- **C4:** `doc/tasks/0106-show-the-evidence-gate-shadow-result.md` and `doc/tasks/0111-show-the-work-in-progress-briefing-in-the-band.md`, acceptance criteria (accessed 2026-10-07 via Read)
- **D1:** `survey.mjs`'s header cites ADR-0057, which split deterministic gathering into scripts; `git log --all --oneline -S"briefing.mjs"` returned nothing: no prior attempt found (accessed 2026-10-07 via Read and Bash)

## Limitations and reversal

Which task is "active" is a rule, not a fact: the plan takes the single task with `Status: in-progress` on the current branch, else the task touched by the newest commit ahead of main, else none, and the band says when it cannot tell. Deviation entries are only as findable as the Notes make them; the script reads entries whose heading or text names a deviation or "beyond the ask", and shows nothing rather than guessing. The pane seats unasked only from 144 terminal columns, so on a narrow terminal the owner opens it with the command. Codex has no plugin surface; there the same script backs `ad-brief`. If the host's plugin contract changes the band and pane hooks, the display moves, not the script.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs <this-path>`, then reopen every source in the register. Structural validity proves the map, not the source content.
