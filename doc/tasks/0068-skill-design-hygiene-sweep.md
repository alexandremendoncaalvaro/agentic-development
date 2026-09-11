# Task `0068`: Skill design hygiene sweep

**Status:** in-progress
**Created:** 2026-09-09
**Scope ref:** src/skills/claude-code/ad-skill/SKILL.md
**Evidence ref:** doc/research/0015-ground-skill-authoring-hygiene.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The skill-by-skill audit found the kit above the usual bar (names match directories, descriptions state what and when, every link and script resolves, bodies under 500 lines) but with systemic inconsistencies: `allowed-tools` is not held to the kit's own "minimal and complete" rule; two authoring skeletons coexist; `ad-spike` commits directly without DCO; a few summaries, links, and spec citations are wrong. This task makes the kit consistent with its own `ad-skill` standard and locks the skeleton by test.

## Acceptance Criteria

- [x] `ad-ground`, `ad-review`, `ad-audit` declare `Write`; `ad-tdg` declares `Write, Edit`; `ad-derisk` drops `Write, WebFetch, WebSearch` and declares `Edit`; `ad-publish` and `ad-report` declare the tools their bodies use.
- [x] The six Claude Code skills using the Codex XML shape (`ad-publish`, `ad-report`, `ad-template-tune`, `ad-voice`, `ad-voice-tune`, `ad-prism`) use the dominant skeleton (`# /ad-x`, purpose paragraph, `## Step N`, `## Output contract`, `## Next`); every skill except `ad-philosophy` carries the two closing sections; the `Step 0` plus `Phase N` mix is normalized.
- [x] A test asserts every Claude Code skill except `ad-philosophy` has `## Output contract` and `## Next`.
- [x] `ad-spike` Step 5 routes to `/ad-commit` instead of running `git commit -m`.
- [x] `ad-subagent` summary and body agree on host scope; `ad-diagnose` references `CONTEXT.md` in inline code, not a relative link; `ad-deepen`'s candidate template uses inline code for example paths.
- [x] `ad-skill` states the 1,024-character specification maximum, notes 1,536 as the Claude Code listing cut and `when_to_use` as Claude-Code-only, and documents the two invocation classes of ADR-0073.
- [x] Codex variants receive the same fixes; dogfood copies refreshed; `CHANGELOG.md` updated.

## Plan

- [x] Ground across host documentation, public references, in-repo patterns, and git history; pick `ad-ground` as the local skeleton reference.
- [x] Red: the skeleton test.
- [x] Green: apply the edits skill by skill, both hosts.
- [x] Refresh dogfood; full suite; `CHANGELOG.md`.
- [x] `/ad-review`.
- [ ] `/ad-commit`.
- [ ] `/ad-pr`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-09

Task created from the workflow-readiness audit (`.context/audit-ad-workflow-readiness.md`), section 3, findings 4 through 14. In Claude Code `allowed-tools` grants pre-approval rather than restricting tools, so the `allowed-tools` items are consistency fixes, not functional blockers.

### 2026-09-11

Ground record `doc/research/0015-ground-skill-authoring-hygiene.md` retained the
tool, routing, reference, and per-host skeleton corrections. The scope now
includes `ad-prism`, added after this task was proposed. The related proposal to
count quoted trigger phrases was rejected because it measures punctuation rather
than activation; Task 0069 records that resolution and Task 0048 remains the
owner of behavioral trajectory evaluation.

The implementation added red-first regressions for repeated ADR amendment fields,
the Claude closing-section and numbered-step skeleton, direct tool declarations,
heading vocabulary, and host/commit hand-offs. The focused regressions and the
full 924-test suite pass; `npm pack --dry-run --json` includes 333 files at
1,722,791 unpacked bytes. Project dogfood was refreshed for both hosts. The
tracked `AGENTS.md` managed section was intentionally left unchanged by the
installer's ADR-0051 safeguard; its existing summary remains accurate.

The first two-axis review found a stale skill-count claim in the changelog and a
missing direct `Write` pre-approval on `ad-report`. Both were corrected with the
tool-surface regression returning red then green. The final review reported no
Standards or Spec findings; its ephemeral audit trail is under
`.agentic/reviews/20260911T141306Z-working-tree-canonical-rerun.md`.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
