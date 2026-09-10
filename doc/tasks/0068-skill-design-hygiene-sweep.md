# Task `0068`: Skill design hygiene sweep

**Status:** proposed
**Created:** 2026-09-09
**Scope ref:** src/skills/claude-code/ad-skill/SKILL.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The skill-by-skill audit found the kit above the usual bar (names match directories, descriptions state what and when, every link and script resolves, bodies under 500 lines) but with systemic inconsistencies: `allowed-tools` is not held to the kit's own "minimal and complete" rule; two authoring skeletons coexist; `ad-spike` commits directly without DCO; a few summaries, links, and spec citations are wrong. This task makes the kit consistent with its own `ad-skill` standard and locks the skeleton by test.

## Acceptance Criteria

- [ ] `ad-ground`, `ad-review`, `ad-audit` declare `Write`; `ad-tdg` declares `Write, Edit`; `ad-derisk` drops `Write, WebFetch, WebSearch` and declares `Edit`; `ad-publish` and `ad-report` declare the tools their bodies use.
- [ ] The five Claude Code skills using the Codex XML shape (`ad-publish`, `ad-report`, `ad-template-tune`, `ad-voice`, `ad-voice-tune`) use the dominant skeleton (`# /ad-x`, purpose paragraph, `## Step N`, `## Output contract`, `## Next`); the seven skills without `## Next` gain it; the `Step 0` plus `Phase N` mix is normalized.
- [ ] A test asserts every Claude Code skill except `ad-philosophy` has `## Output contract` and `## Next`.
- [ ] `ad-spike` Step 5 routes to `/ad-commit` instead of running `git commit -m`.
- [ ] `ad-subagent` summary and body agree on host scope; `ad-diagnose` references `CONTEXT.md` in inline code, not a relative link; `ad-deepen`'s candidate template uses inline code for example paths.
- [ ] `ad-skill` states the 1,024-character specification maximum, notes 1,536 as the Claude Code listing cut and `when_to_use` as Claude-Code-only, and documents the two invocation classes of ADR-0073.
- [ ] Codex variants receive the same fixes; dogfood copies refreshed; `CHANGELOG.md` updated.

## Plan

- [ ] Ground (in-repo): pick `ad-ground` as the skeleton reference example; list each deviation with file and line.
- [ ] Red: the skeleton test.
- [ ] Green: apply the edits skill by skill, both hosts.
- [ ] Refresh dogfood; full suite; `CHANGELOG.md`.
- [ ] `/ad-review`, `/ad-commit`, `/ad-pr`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-09

Task created from the workflow-readiness audit (`.context/audit-ad-workflow-readiness.md`), section 3, findings 4 through 14. In Claude Code `allowed-tools` grants pre-approval rather than restricting tools, so the `allowed-tools` items are consistency fixes, not functional blockers.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
