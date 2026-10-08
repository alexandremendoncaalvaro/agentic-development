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
- [x] The `agentic-session` plugin runs the script on session start, after each main-loop turn and after a compaction, and shows the full briefing in a pane opened by `/agentic-briefing` (the band keeps only the context reading, per the ADR-0090 addendum of 2026-10-08); it computes nothing, injects nothing, blocks nothing, and draws nothing unasked when the script is absent or fails (the pane the owner opens then says why, in one line).
- [x] `/ad-brief` reads the same script, on both hosts.
- [x] The cost of a run on this repository is measured (median of repeated runs) before the band ships, and stated.
- [x] Tests: the script on fixture repositories (one active task, none, several, a deviation entry, a missing roadmap, an unreadable file); the plugin's pure module on recorded script output (pane model, absent script).

## Plan

- [x] Owner accepts ADR-0090 and approves this plan.
- [x] Slice 1, the script: red, then green (`/ad-tdd`) on fixture repositories; parity; measure its run time.
- [x] Slice 2, the band and the pane: red, then green in the plugin's pure module; live check in the desktop app (owner-observed, at a width that seats the pane and one that does not).
- [x] Slice 3, `/ad-brief` reads the script; Task 0106's criteria close with slice 1's gate result.
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

### 2026-10-08 — slice 2 delta re-review, slice 3

Slice 2 delta re-review (b03d7ce..6add09a), fresh context on both axes: no
Blockers. One new Standards Concern, fixed test first: "`session.end` sets
`state.briefing = null` but does not advance `briefingRun`", so a run in
flight at `/clear` could bring the old briefing back; `clearReadings` now
advances the counter. Notes taken: the pane tolerates a briefing without
`cannotTell` (a project install and a user install can differ in version);
the Markdown cut handles a single long line; a stale comment, the script
header's wrap, and the fixture's escaped characters fixed. Spec Notes taken:
the second criterion now states the one-line message in the pane the owner
opens, and slice 2's plan item is unchecked again because the narrow-width
live check is still pending on the owner.

Slice 3: `/ad-brief`'s standalone brief, on both hosts, runs the briefing
script first and takes its JSON as the task evidence, carrying every
`cannotTell` entry as an unknown fact; the manual search for the active task
remains the fallback when the script is absent or fails. A static test in
`test/skills.test.js` pins the command, its order before the manual search,
and `cannotTell`. Task 0106 closes with this task's audit.

### 2026-10-08 — slice 3 review

`/ad-review` on 6add09a..9598663, fresh context on both axes: no Blockers.
Both axes raised the same Concern, accepted: `/ad-brief` ran the script
without `--session`, so it "can never show the evidence-gate result", while
its text said the pane and the brief "cannot disagree". No environment
variable exposes the session id to the model (checked in this session), so
the brief now adds `--session <session-id>` when the id is known and
otherwise carries the gate as an unknown fact, never as "nothing would
block"; the overclaim is gone, and the static test pins both. Notes taken:
the test's order check now anchors on the manual search, and the script
header no longer names the band.

### 2026-10-08 — branch audit

`/ad-audit` on origin/main..f26649d (30 files): 12 groups dispatched (CV,
critical, with two cross-model passes in reordered rule and file order; HK;
AGENTS.md; GUIDELINES.md; ARCHITECTURE.md; CONTEXT.md; ADR-0030, 0048, 0057,
0088, 0089, 0090), the machine store's .NET and GitHub CI groups and the
other ADRs N/A as untouched. Gate: `npm run verify` 1374 of 1374. Every
reviewer's anchors matched. No blockers.

Fixed:

- Major, ARCHITECTURE.md: the companion-plugin bullet and the boundary rule
  did not describe the pane, `/agentic-briefing`, or the plugin's dependency
  on the installed script path; minor and nit, the project-evidence bullet,
  Observability and the test layout missed the briefing script. All updated,
  with the guards named (`scriptCandidates`, `evidencePathFor`).
- CV.8 (both cross-model passes; minor to major): "flags exactly the seven
  real deviations" was false at HEAD, because the slice 2 entry quotes the
  trigger phrases and read as an eighth deviation. Quoted spans and
  backticked spans are now left out of the text match (regression test). The
  enumeration, re-run with the script's patterns over every `doc/tasks/*.md`
  Notes entry, now gives seven: tasks 0048 (two), 0080 (two), 0107, 0108 and
  0109; the 0111 entries no longer match.
- CV.3 (pass A): ADR-0090 decision 3 still said the band and the skill
  "cannot disagree"; a second addendum states that the receipt gate's result
  is session-scoped, and `doc/adr/PROJECTION.md` gains the ADR-0090 row.
- CV.1 (pass A, nit): commit f26649d carried code under a `docs(task)`
  subject, because the `fix(ad-brief)` subject was 74 characters, the
  commit-msg gate refused it, and the refusal was filtered out of the output.
  The unpushed commit was split into 5045d46 (fix) and d059cf9 (docs).
- GUIDELINES 2.2 (judgement-call): a failed read of `doc/tasks/` other than
  absence is now named in `unreadable` (regression test). GUIDELINES 9.5: the
  tests added by fixes now carry the `regression: task-0111` prefix.
- CONTEXT.md (judgement-calls): a Work-in-progress briefing entry, and the
  Companion plugin entry names the pane.

Refuted with evidence: the primary CV pass's major CV.5 finding that the
reviewed range head 9598663 "already contains the fix". `git show
41004fb:` and `9598663:src/skills/claude-code/ad-brief/SKILL.md` contain no
`--session` (0 matches each); the fix landed after the review.

Accepted as recorded, not changed: the cost and mutation figures above are
exploratory. The measurement loop and the mutation runner were scratch
scripts outside the repository; the figures are not decision evidence beyond
the criterion's "measured and stated". The owner's live check is quoted from
the session with no artifact, and the narrow-width check stays pending. The
plugin contract statement behind the rejected "command may vanish" finding is
the plugin-authoring skill's text for build 2.1.289: "A reload is a fresh load
of the module: `register` runs again and `session.start` fires again." The
session-id check was `env | grep -iE "session|claude"` in this session, which
listed no session id variable. The hard-coded `main` base stays with Task
0100, and the awaited run, bounded by its 10-second timeout, with the
measured median above. Not taken: the short parameter names (`b`, `el`),
a style nit in small pure functions.

### 2026-10-08 — branch re-audit

Re-audit of 99356ec (tree e4c3adb), the seven groups the fixes touched (CV,
critical, with two cross-model passes; ARCHITECTURE.md; CONTEXT.md; ADR-0030;
ADR-0057; ADR-0090; GUIDELINES.md); HK, AGENTS.md, ADR-0048, ADR-0088 and
ADR-0089 keep their first-pass verdicts, since the fixes did not touch their
subjects. Gate: `npm run verify` 1376 of 1376. No blockers, no violations.

The first audit's target f26649d was rewritten into 5045d46 and d059cf9;
d059cf9 has f26649d's tree (c4f14afe), so its findings apply unchanged. The
19 findings with their severity and the re-audit's disposition: 1 major,
2 major, 3 minor, 4 minor, 5 nit (ARCHITECTURE.md) resolved; 6 major (CV.8)
resolved, re-enumerated at HEAD as seven; 7 minor (CV.3) resolved; 8 nit
(CV.1) resolved, tree-identical split; 9 major (CV.5) rejection upheld;
10 minor (CV.5) accepted as exploratory; 11 minor (CV.7) resolved; 12 minor
(CV.5) accepted, disclosed; 13 minor (CV.1) resolved; 14 minor and 15 minor
(GUIDELINES.md) resolved; 16 nit rejected; 17 minor and 18 minor accepted;
19 minor (CONTEXT.md) resolved. The slice 2 entry's "exactly the seven" holds
again at HEAD, corrected by the branch audit entry above.

New in the re-audit, all minor: ADR-0057 decision 4 asks for a scratch
`init` that shows a new script installs, and none was recorded. Run at
99356ec in a scratch repository with `init --agent both --scope project -y`:
`briefing.mjs` installed under `.claude/` and `.agents/`, both `ad-brief`
copies carry `--session <session-id>`, the script ran there and reported
`task`, `roadmap`, `gate` and `git` as unknown; the user-scope install was
untouched. Also minor: the pane's one-line "No briefing" message against
decision 2's "draws nothing" (recorded above as a decision); two test files
missing from ARCHITECTURE.md's test layout, a gap already on main; and a
process slip in this audit: the re-audit handoffs reused the first pass's
inline rule text, so two reviewers audited against the files on disk
instead, which they reported.

### 2026-10-08 — narrow-width check

The owner approved the pane at the narrow width ("tudo aprovado"), which
closes slice 2's live check; the agent did not observe that width itself.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
