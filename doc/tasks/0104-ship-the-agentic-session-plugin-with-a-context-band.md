# Task `0104`: Ship the agentic-session plugin with a context band

**Status:** in-progress
**Created:** 2026-10-07
**Scope ref:** doc/product/PRD.md (Next tier, Optional Claude Code companion plugin)
**Evidence ref:** doc/research/0035-ground-claude-code-session-plugin.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The owner wants the context band from the RESEARCH-0033 spike in the kit, as
an opt-in Claude Code plugin, shown only above a fill threshold, with a
one-press `/ad-handoff`. ADR-0088 amends ADR-0041 to allow an
additive companion plugin; GROUND-0035 grounds the marketplace layout, the
vendor's `token-weather` pattern, and the numeric user option; RESEARCH-0036
surveyed the mods ecosystem and set the measure toward auto-compaction.

## Acceptance Criteria

- [x] `.claude-plugin/marketplace.json` lists `agentic-session` with a relative source `./plugins/agentic-session`, and the entry name equals the manifest name.
- [x] `plugins/agentic-session/` holds a manifest with a `threshold` number option (default 60, min 1, max 99), a `hooks/hooks.json` naming one ESM module, and that module.
- [x] The fill is measured toward the auto-compact point (`autoCompactThreshold` from `$.session.usage({ breakdown: 'summary' })`, the local estimate that sends no token-count request) when auto-compaction is on, and toward the model's window otherwise; the band names which.
- [x] With the fill at or above the threshold, the band shows the percentage and a right-aligned `AD handoff` button that submits `/ad-handoff`; below it, with no reading, or while the engine shows a survey, nothing is drawn and the engine's own band stands.
- [x] The reading is taken on `session.start`, on each main-loop `turn.complete` (subagent turns skipped) and after `session.compact`, dropped on `session.end`, never on every draw; a failed reading hides the band and is logged to the debug log only.
- [x] The plugin intercepts no tool call and rewrites no prompt.
- [x] Unit tests in `test/` cover the show/hide rule at, below and above the threshold, a missing reading, and the threshold bounds; static tests check both manifests' shape and that the npm package does not ship the plugin.
- [x] Loaded in the desktop app, the band appears above a threshold set below the current fill and disappears above it; the owner confirms (owner-attested, no retained artifact; see Notes for the blobs it ran on).
- [x] `README.md` gains an install section with the version floor; `ARCHITECTURE.md` and `CONTEXT.md` name the companion plugin; `CHANGELOG.md` records it; `npm run verify` passes.

## Plan

Slice 1 — the band (this task):

- [x] Red: `test/session-plugin.test.js` for the show/hide rule and the manifests.
- [x] Green: `plugins/agentic-session/hooks/band.mjs` (pure rule, no `$`), `register.mjs` (events and drawing, the `token-weather` shape), `plugin.json`, `hooks.json`, `.claude-plugin/marketplace.json`.
- [x] Live check: `claude plugin marketplace add <worktree>` and `claude plugin install agentic-session@agentic-development` from the desktop app's engine, threshold below and above the current fill.
- [x] Docs: README install section, ARCHITECTURE pattern, CONTEXT term, CHANGELOG.
- [x] `/ad-review` (first pass, on the uncommitted implementation over c6e3ea7).
- [x] `/ad-audit` at 43a558f; its fixes applied.
- [ ] `/ad-review` of the final branch, verdicts recorded with severity, disposition and target SHA.
- [ ] `/ad-commit`; PR and merge on the owner's approval; CI green on Ubuntu and Windows.

Slices 2 and 3 are Tasks 0105 (resume chip) and 0106 (verify-before-done
receipt), after this one.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Opened after the owner chose plugin distribution and a threshold band.
The ground record, ADR-0088 and this plan are committed before any plugin
code; implementation waits for the owner's approval of the plan.

The owner approved the plan and accepted ADR-0088 in chat; the owner also
replaced Task 0106's display-only receipt with the shadow mode of evidence
gates, to be planned in its own front.

### 2026-10-07 — implementation, live check and review

Red, then green: `test/session-plugin.test.js` failed on the missing plugin
and passes after it (12 tests); `npm run verify` passes. The engine's own
validator (`claude plugin validate`, engine 2.1.289) passes the plugin and the
marketplace, with one warning for the deliberately absent `version`, so an
install tracks each commit on `main`; it lists the hooks as `session.start`,
`turn.complete`, `session.compact`, `session.end`, `ui.render{AbovePrompt}`
and no tool or prompt hook.

Live check in the owner's desktop session (engine 2.1.289), the plugin loaded
by the session's hot reload rather than a marketplace install, so the
installed path is not tied to a worktree that will be removed; the marketplace
install is the documented path after merge. With the default threshold of 60
the band showed "Context 82% of the auto-compact point" with the button; with
the threshold at 99 it was hidden. The owner confirmed both. During the check
the owner asked for the button at the right edge and a label that names the
kit, settled on `AD handoff`.

Fresh-context review on both axes (local review files, gitignored; findings
quoted here): no Blocker. Fixed: a failed reading kept a stale band on screen,
against ADR-0088's fail-closed rule, so a failure now hides it (Spec); the band
could show a pre-`/compact` or pre-`/clear` figure, so it re-reads after
`session.compact` and drops the reading on `session.end` (Standards); the
reading moved from module scope into the `register` closure (Standards); the
task and ADR text now say `AD handoff` and `breakdown: 'summary'` (Spec).
Refuted: a threshold changed in `/config` does reach the module, since the
engine reloads it with the new options (plugin-authoring reference, "a change
there reloads the module"). Left as is: the empty catch logs nothing, since
the band failing closed is the intended outcome; the source-regex test stays
because the engine itself reads hooks from source.

### 2026-10-07 — audit at 43a558f and corrections

The status was set to `done`, and the `/ad-audit` and PR boxes ticked, before
either happened; this entry reopens the task as `in-progress`.

`/ad-audit` of `feat/claude-code-session-plugin` at 43a558f (groups CV with a
second pass, GH, AGENTS.md, GUIDELINES.md, ARCHITECTURE and CONTEXT, ADRs; HK
and NET not applicable) found no blocker. Every finding, with severity and
disposition:

1. CV major: task `done` with audit and PR ticked early. Fixed (this entry).
2. CV major: the review note named no target SHA and no severities. Fixed in
   part: the first review's verdicts were not persisted, only its inputs, so
   their severities cannot be quoted from a durable record; a second review of
   the final branch is planned and will be recorded in full.
3. CV major: the live check was not labelled owner-attested and named no code
   state. Fixed: owner-attested, no screenshot retained; the copy the desktop
   session loaded is byte-identical to the plugin files at 43a558f
   (`register.mjs` c28578e, `band.mjs` da1373d, `plugin.json` 559e155,
   `hooks.json` 6786067, by `git hash-object`). The debug-log line added in
   fix 12 runs only on a failed reading and is covered by a unit test, not by
   the live check.
4. CV minor: RESEARCH-0036 and Tasks 0105/0106 said ADR-0088 was proposed, and
   0036's star counts and 21-row table were unlabelled. Fixed: 0036 updated
   and its counts labelled exploratory; 0105 and 0106 got appended notes.
5. ADR minor: ADR-0088 item 5 and Task 0106 still planned the display-only
   receipt the owner replaced. Fixed: item 5 now plans only the resume chip;
   Task 0106 is re-scoped to show the evidence-gate shadow result.
6. ADR/CV nit: ADR-0088 item 4 and ARCHITECTURE omitted the re-read after
   compaction and the drop on session end. Fixed.
7. ADR judgement: the band's relation to the ADR-0055 `Stop` nudge was
   unstated. Fixed: the nudge stays the Codex and no-plugin fallback (ADR-0088
   item 4, ARCHITECTURE, CONTEXT).
8. ARCH minor: Deployment Topology lacked the marketplace channel, and the mod
   was not told apart from the third execution mode. Fixed.
9. CONTEXT nit: no Relationships line for the Companion plugin. Fixed.
10. AGENTS minor: Repository Layout lacked `.claude-plugin/marketplace.json`
    and `plugins/agentic-session/`. Fixed.
11. AGENTS nit: `format:check` did not cover the plugin. Fixed: the globs now
    include `plugins/**/*.{mjs,json}` and `.claude-plugin/*.json`; the plugin
    files already passed.
12. GUIDELINES minor (section 2.2): the catch in `register.mjs` swallowed the
    failure. Fixed test-first: a new test failed (nothing logged), then
    passed after the catch logs the reason with `$.ui.log(..., { to: 'debug' })`
    (engine 2.1.289 typings, `UiLogOptions`), keeping the band hidden.
13. GH note: Windows and Node 22.13 are proven only by CI after the push.
    Open until CI runs.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
