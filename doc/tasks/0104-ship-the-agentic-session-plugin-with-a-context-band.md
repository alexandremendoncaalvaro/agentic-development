# Task `0104`: Ship the agentic-session plugin with a context band

**Status:** proposed
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
one-press `/ad-handoff`. ADR-0088 (proposed) amends ADR-0041 to allow an
additive companion plugin; GROUND-0035 grounds the marketplace layout, the
vendor's `token-weather` pattern, and the numeric user option; RESEARCH-0036
surveyed the mods ecosystem and set the measure toward auto-compaction.

## Acceptance Criteria

- [ ] `.claude-plugin/marketplace.json` lists `agentic-session` with a relative source `./plugins/agentic-session`, and the entry name equals the manifest name.
- [ ] `plugins/agentic-session/` holds a manifest with a `threshold` number option (default 60, min 1, max 99), a `hooks/hooks.json` naming one ESM module, and that module.
- [ ] The fill is measured toward the auto-compact point (`autoCompactThreshold` from `$.session.usage({ breakdown: true })`) when auto-compaction is on, and toward the model's window otherwise; the band names which.
- [ ] With the fill at or above the threshold, the band shows the percentage and a `Handoff` button that submits `/ad-handoff`; below it, or with no reading, nothing is drawn and the engine's own band stands.
- [ ] The reading is taken on `session.start` and on each main-loop `turn.complete` (subagent turns skipped), never on every draw.
- [ ] The plugin intercepts no tool call and rewrites no prompt.
- [ ] Unit tests in `test/` cover the show/hide rule at, below and above the threshold, a missing reading, and the threshold bounds; static tests check both manifests' shape and that the npm package does not ship the plugin.
- [ ] Installed from the local marketplace in the desktop app, the band appears above a threshold set below the current fill and disappears above it; the owner confirms.
- [ ] `README.md` gains an install section with the version floor; `ARCHITECTURE.md` and `CONTEXT.md` name the companion plugin; `CHANGELOG.md` records it; `npm run verify` passes.

## Plan

Slice 1 — the band (this task):

- [ ] Red: `test/session-plugin.test.js` for the show/hide rule and the manifests.
- [ ] Green: `plugins/agentic-session/hooks/band.mjs` (pure rule, no `$`), `register.mjs` (events and drawing, the `token-weather` shape), `plugin.json`, `hooks.json`, `.claude-plugin/marketplace.json`.
- [ ] Live check: `claude plugin marketplace add <worktree>` and `claude plugin install agentic-session@agentic-development` from the desktop app's engine, threshold below and above the current fill.
- [ ] Docs: README install section, ARCHITECTURE pattern, CONTEXT term, CHANGELOG.
- [ ] `/ad-review`; `/ad-audit`; `/ad-commit`; PR on the owner's approval.

Slices 2 and 3 are Tasks 0105 (resume chip) and 0106 (verify-before-done
receipt), after this one.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Opened after the owner chose plugin distribution and a threshold band.
The ground record, ADR-0088 and this plan are committed before any plugin
code; implementation waits for the owner's approval of the plan.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
