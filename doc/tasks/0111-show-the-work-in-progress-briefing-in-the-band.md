# Task `0111`: Show the work-in-progress briefing in the band

**Status:** in-progress
**Created:** 2026-10-07
**Scope ref:** doc/adr/0090-show-the-work-in-progress-briefing-in-the-session-plugin.md
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

- [x] `briefing.mjs` (both hosts, byte-identical) prints one JSON briefing: active task and the rule that chose it, status, plan items done and open, open acceptance criteria and Definition of Done items, whether the plan's approval entry precedes the first implementing commit, the deviations its Notes record, roadmap progress from the survey, and the receipt gate's latest shadow result for the session (Task 0106); it degrades instead of throwing and says "cannot tell" when a fact is missing.
- [x] The `agentic-session` plugin runs the script on session start, after each main-loop turn and after a compaction, and shows the full briefing in a pane opened by `/agentic-briefing` (the band keeps only the context reading, per the ADR-0090 addendum of 2026-10-08); it computes nothing, injects nothing, blocks nothing, and draws nothing when the script is absent or fails.
- [ ] `/ad-brief` reads the same script, on both hosts.
- [x] The cost of a run on this repository is measured (median of repeated runs) before the band ships, and stated.
- [x] Tests: the script on fixture repositories (one active task, none, several, a deviation entry, a missing roadmap, an unreadable file); the plugin's pure module on recorded script output (pane model, absent script).

## Plan

- [x] Owner accepts ADR-0090 and approves this plan.
- [x] Slice 1, the script: red, then green (`/ad-tdd`) on fixture repositories; parity; measure its run time.
- [x] Slice 2, the band and the pane: red, then green in the plugin's pure module; live check in the desktop app (owner-observed, at a width that seats the pane and one that does not).
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

### 2026-10-07 — plan approved

The owner accepted ADR-0090 and approved this plan. Implementation starts with
slice 1 in a new session.

### 2026-10-08 — slice 1, the script

`ad-next/scripts/briefing.mjs` ships on both hosts, byte-identical, beside
`survey.mjs` (ADR-0090 decision 1), with 18 tests in `test/briefing.test.js`
on fixture repositories: one in-progress task, none, several (newest commit
ahead of main), deviation entries, the approval before, after, on main, in
the same commit as the first code, uncommitted and absent, an agent-config-only
commit, a missing PRD, the session's gate evidence with and without a session,
an unreadable task file, corrupt and non-object evidence lines, and a
directory outside git. `npm run verify` passed (1343 of 1343 tests).

Decisions taken in the build, each a stated rule:

- `--session <id>` selects the gate evidence file; without it the gate is
  "cannot tell". The summary is the session's line count, its would-block
  count and the last line, because one action writes one line per check.
- An implementing commit touches a path outside `doc/` and the agent hosts'
  `.claude/`, `.agents/`, `.codex/` and `.agentic/`. The first run on this
  repository flagged task 0110 out of order on the commit that only refreshed
  `.claude/agentic-state.json`; the exclusion and its test came from that
  observation.
- An approval recorded in the same commit as the first code does not precede
  it; an uncommitted approval is "cannot tell".
- Roadmap progress is the survey's task counts, and "cannot tell" without
  `doc/product/PRD.md`.

Operator mutation sweep: 38 mutants, 8 survive, all searched and equivalent:
seven `??` to `||` swaps whose left side is never a falsy non-nullish value
(an object, a non-empty string, or null), and the CLI entry guard
`process.argv[1] &&`, which is always truthy when the script runs as a command.

Cost on this repository (Apple M5 Pro, Node 24.16.0, with `--session`): median
267 ms over 21 runs, minimum 165 ms; one cold run took 3.8 s. Once per turn,
that is within the band's budget; slice 2 runs it on session start, after each
main-loop turn and after a compaction, never per draw.

Known limit, as GROUND-0043 states: with several tasks in progress the newest
commit ahead of main decides, so on this branch the script names task 0110
until a commit touches this task.

### 2026-10-08 — slice 1 review and corrections

`/ad-review` on f784266..1e63877, both axes with fresh context: no Blockers;
three Standards and three Spec Concerns, all accepted and fixed test first:

- Standards: "task files with CRLF line endings silently lose all their
  checkbox items" (reproduced by the reviewer); `section` now splits on
  `\r?\n`.
- Standards: "`git log --name-only` quotes non-ASCII paths", so a docs-only
  commit read as implementing; git now runs with `core.quotePath=false`.
- Standards: a failing git was invisible; `cannotTell` now names `git` when
  the commits ahead of `main` cannot be listed. A stale local `main` against
  `origin/main` stays with Task 0100.
- Spec: "a consumer reading `cannotTell` is never told the approval order is
  unknown"; it now names `approval` then.
- Spec: a missing evidence file "would show 'nothing would block' rather than
  'cannot tell'"; it is now null and named in `cannotTell`.
- Spec and Standards: the newest-commit fallback could name a `proposed` or
  `blocked` task; it now picks only among `in-progress` tasks. This narrows
  GROUND-0043's wording to its stated intent, several tasks in progress.

Notes taken: the evidence path rule is pinned to `sequence-gate.mjs`'s
`evidencePathFor` by a test that failed when the gate's character class was
changed; the script header states that the approval entry is found by heading
only; the CHANGELOG no longer says the band and `/ad-brief` read the script
before slices 2 and 3. Correction to the slice 1 entry: "within the band's
budget" has no stated budget behind it; the measured cost is the record, and
slice 2 judges it against the band's refresh points. Not taken: removing the
fixtures' temporary directories, which `test/sequence-gate.test.js` does not do
either.

After the corrections: 22 tests in `test/briefing.test.js`, `npm run verify`
1347 of 1347, mutation sweep 39 mutants with the same 7 equivalent survivors.

### 2026-10-08 — slice 1 delta re-review

Fresh-context re-review of 1e63877..1a2da0f on both axes: every prior finding
resolved, except the hard-coded `main` base, which stays with Task 0100. No
Blockers. One new Spec Concern, accepted and fixed test first: with no
approval entry and no implementing commit "`cannotTell` now lists `approval`",
although that state is known (the plan is not approved yet, nothing is built);
`approval` is now named only when git cannot list the commits or the entry is
not committed yet.

Carried to slice 2: a session whose gate is wired but has gated nothing yet
reads "cannot tell", the same as an unwired gate; Task 0106's "nothing when
none would" display needs a way to tell them apart. GROUND-0043's wording of
the fallback rule stays as recorded; the narrowing to in-progress tasks is
stated in the script header and in the review entry above.

Mutation counts reconciled: slice 1 started at 39 mutants, 13 survivors; its
tests closed 5 (8 left). The `doc/` exclusion list removed one mutant (38,
8). The review corrections removed the `?? ''` survivor in the evidence
reader, which became a null check, and added the `orderUnknown` and
`cannotTell` operators, all killed (41 mutants, 7 survivors: six `??` swaps
and the CLI entry guard). `npm run verify`: 1348 of 1348.

### 2026-10-08 — slice 2, the pane

The plugin runs the installed `ad-next/scripts/briefing.mjs` (the project
install first, then the user install) with the session id, on session start,
after each main-loop turn and after a compaction, and draws nothing when the
script is absent, fails or prints anything but a JSON object.

Owner live check, in the desktop app, through a hot-reloaded copy of the
plugin with this session moved to this worktree: the first version showed a
one-line summary in the band and plain text in the pane. The owner rejected
both: the pane "ficou bem pobre", like a text file, and the band line took
room and "me confunde mais do que me ajuda". The briefing moved to the pane
only, reached through `/agentic-briefing`; the band is again ADR-0088's
context band. This is an owner decision, recorded as the ADR-0090 addendum of
2026-10-08, and the second criterion above is amended to match. The second
version's pane draws a header card with a status mark, a next-step card,
progress bars (SVG on the desktop, cell bars on the terminal), colored health
marks for plan approval, deviations and the gate, and the details as Markdown
checklists. The owner approved it ("agora sim!"). Observed at one pane width
only; the host contract seats a pane that a command opens at any width.

Found on the way, in slice 1's script: a note that only mentions deviations
read as one (the slice 1 entry listing its deviation tests). The text rule now
takes "deviation from", "deliberate" or "stated deviation" and "beyond the
ask", which flags exactly the seven real deviations across this repository's
tasks; headings still count on any mention.

Validated with the 2.1.289 engine's `claude plugin validate` (the 2.1.266 CLI
on PATH refuses `session.compact`, which the published plugin already hooks).
Mutation sweep over the plugin modules: every surviving mutant is a `??` to
`||` swap on a value that is never an empty string. `npm run verify`: 1365 of
1365.

### 2026-10-08 — slice 2 review and corrections

`/ad-review` on 59913f7..b03d7ce, both axes with fresh context: no Blockers.
Accepted and fixed test first:

- Standards: "a fact the script could not establish reads as a known, healthy
  state" (a green "not approved yet" when git is unavailable). The pane now
  shows the script's `cannotTell` facts: plan approval "cannot tell" with its
  reason, and a Roadmap health row when no PRD exists. Spec raised the same
  gap for the roadmap.
- Spec: Task 0106 asks for "which step would have blocked". The script's gate
  summary adds `lastWouldBlock`, and the pane names it ("latest: audit before
  gh pr merge"); a session with no would-block line reads "none of N checks
  would block".
- Standards: "a slow run that finishes after a newer one overwrites
  `state.briefing` with stale data"; a run counter now drops a superseded
  result. The handlers still await the run, bounded by its 10-second timeout;
  the measured median is 267 ms.
- Both axes: the plugin and marketplace descriptions still said the band
  carries the briefing; reworded.
- Notes taken: the status mark's color follows the status (in progress,
  done, blocked, other); the Markdown block is cut at a line boundary with a
  visible note instead of mid-line; a stale comment fixed; the test file's
  module imports merged.

Not taken, with evidence: "the command may vanish" after a reload. The host's
plugin-authoring contract states that a reload runs `register` again and fires
`session.start` again, which registers the command. Kept as a decision: with
no script the pane the owner opens shows one line saying why, instead of an
empty frame; "draws nothing" in the second criterion applies to the band
and to unasked drawing. Open: the owner observed the pane at one width only;
the narrow-width check stays pending on the owner.

After the corrections: `npm run verify` 1370 of 1370; the plugin mutation
sweep leaves only equivalent survivors (`??` to `||` on values never empty,
and `surface === 'desktop' && Svg`, since only the desktop table carries
`Svg`).

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
