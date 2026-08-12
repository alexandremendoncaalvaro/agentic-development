# Task `0045`: Automate AGENTS and GUIDELINES reciprocity

**Status:** done
**Created:** 2026-08-11
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:** doc/specs/0003-constitution-reciprocity.md
**Board ref:**

## Context

When a project has both `AGENTS.md` and `GUIDELINES.md`, repeating detailed
rules in both creates two competing sources of truth. The PRD's Next tier
defines the intended boundary: `AGENTS.md` stays operational and points to
`GUIDELINES.md`; `ad-drift` detects rule duplication. This task turns that
product commitment into observable installer and audit behavior.

## Acceptance Criteria

- [x] `ad-bootstrap` writes an operational pointer to `GUIDELINES.md` instead of duplicating detailed rules when that file exists.
- [x] `ad-drift` identifies duplicated detailed rules while accepting a load-bearing pointer as the intended relationship.
- [x] The behavior is delivered for both hosts, dogfooded, and covered by deterministic tests.
- [x] The local test gate and a fresh-context review pass before the task closes.

## Plan

- [x] Ground the current `ad-bootstrap`, `ad-guidelines`, and `ad-drift` behavior against the binding documentation discipline.
- [x] Add focused tests for pointer generation and duplication detection before changing skill sources or scripts.
- [x] Implement the smallest dual-host change, refresh dogfood, and update only the canonical documentation that defines the relationship.
- [x] Run the local gate and fresh-context review.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-11

Registered from the accepted PRD's Next-tier roadmap. No feature specification
exists yet; create one first if grounding reveals a feature boundary broader
than the stated pointer-and-drift behavior.

### 2026-08-11 — grounded scope

The existing bootstrap templates already select pointer stubs for the four
mapped sections when `GUIDELINES.md` exists. The missing enforcement is a
deterministic `ad-drift` fact: its current script checks six structural
categories but cannot identify a mapped AGENTS section that lacks its
GUIDELINES pointer. Spec-0003 limits the implementation to that explicit
boundary; semantic prose comparison is out of scope.

### 2026-08-11 — implementation verified

TDD began with a red fixture for a mapped AGENTS section missing its pointer.
The dual-host scanner then passed that fixture and the pointer, absent-document,
unreadable-content, plain-text-pointer, pointer-outside-section, ATX-heading,
and fenced-code fixtures. A static test locks the four existing bootstrap
mappings inside their `when-guidelines-md-exists` branches. Both script copies
remain byte-identical and were refreshed into the repository's dogfood install.

### 2026-08-11 — closed

The local gate passed with 589 tests. The two-axis `ad-review` found no
Standards or Spec findings; its ignored review handoff records the working-tree
diff and source context. No TODO or FIXME was introduced.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
