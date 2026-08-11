# Task `0047`: Add per-language guideline presets

**Status:** proposed
**Created:** 2026-08-11
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

`ad-guidelines` currently detects language signals but does not ship curated
guideline presets for Rust, Python, Go, TypeScript, or C++. The accepted PRD
places those presets in the Later tier so a project gets useful language
conventions without the kit pretending that one language's rules fit another.
The preset content and its override boundary are durable product decisions,
not a mechanical extension of detection.

## Acceptance Criteria

- [ ] A documented, deterministic selection rule maps supported repository signals to the appropriate Rust, Python, Go, TypeScript, or C++ preset without guessing when signals conflict or are absent.
- [ ] Each preset provides language-specific conventions while preserving project-owned decisions and the existing `GUIDELINES.md` lifecycle.
- [ ] The preset source is dual-host, progressively disclosed, and covered by tests for selection, conflicts, and preservation of local content.
- [ ] The local test gate and a fresh-context review pass before the task closes.

## Plan

- [ ] Use `/ad-grill-me` and `/ad-spec` to decide the preset boundary, selection precedence, and how project rules override kit defaults.
- [ ] Ground each language's official conventions and current repository-detection behavior before drafting a preset.
- [ ] Implement the selected dual-host design with focused deterministic tests and dogfood refresh.
- [ ] Run the local gate and fresh-context review.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-11

Registered from the accepted PRD's Later-tier roadmap. No preset is implied by
this task until the specification establishes its source and override rules.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
