# Task `0104`: Ship the agentic-session plugin with a context band

**Status:** done
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
- [x] The reading is taken on `session.start` and on each main-loop `turn.complete` (subagent turns skipped), never on every draw.
- [x] The plugin intercepts no tool call and rewrites no prompt.
- [x] Unit tests in `test/` cover the show/hide rule at, below and above the threshold, a missing reading, and the threshold bounds; static tests check both manifests' shape and that the npm package does not ship the plugin.
- [x] Loaded in the desktop app, the band appears above a threshold set below the current fill and disappears above it; the owner confirms.
- [x] `README.md` gains an install section with the version floor; `ARCHITECTURE.md` and `CONTEXT.md` name the companion plugin; `CHANGELOG.md` records it; `npm run verify` passes.

## Plan

Slice 1 — the band (this task):

- [x] Red: `test/session-plugin.test.js` for the show/hide rule and the manifests.
- [x] Green: `plugins/agentic-session/hooks/band.mjs` (pure rule, no `$`), `register.mjs` (events and drawing, the `token-weather` shape), `plugin.json`, `hooks.json`, `.claude-plugin/marketplace.json`.
- [x] Live check: `claude plugin marketplace add <worktree>` and `claude plugin install agentic-session@agentic-development` from the desktop app's engine, threshold below and above the current fill.
- [x] Docs: README install section, ARCHITECTURE pattern, CONTEXT term, CHANGELOG.
- [x] `/ad-review`; `/ad-audit`; `/ad-commit`; PR on the owner's approval.

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

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
