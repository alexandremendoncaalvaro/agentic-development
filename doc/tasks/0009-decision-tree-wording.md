# Task `0009`: Align "design tree" wording to "decision tree"

**Status:** in-progress
**Created:** 2026-07-28
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The interview discipline the kit adapted from [mattpocock/skills](https://github.com/mattpocock/skills) (see WORKFLOW.md Provenance) walks a tree of *decisions*, resolving the parent before its children — upstream phrases it "walk down each branch of the decision tree". The kit's adaptation drifted to "design tree", a term the upstream never uses and that under-describes the discipline: the tree's nodes are decisions awaiting the user's answer, not design elements. This task aligns the wording in the three skills that carry it (`ad-grill-me`, `ad-deepen`, `ad-domain`, both hosts). Deferred from the `ad-grill-me` rename (ADR-0038) to keep that diff a pure identifier change.

## Acceptance Criteria

- [x] Every "design tree" occurrence in skill source reads "decision tree": `ad-grill-me` (description frontmatter + body), `ad-deepen`, `ad-domain` — both hosts.
- [x] Dogfood install regenerated; state re-keyed; no managed-table change expected (no `summary:` touched).
- [x] `npm test` green (CI confirms Node 20 / 22).

## Plan

- [x] Branch `refactor/decision-tree-wording` off `main`.
- [x] Single-pass `sed` on the six source files; verify zero residue.
- [x] `node bin/agentic.js update --yes --force`; `npm test`; fresh-context review; PR on explicit go.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-07-28

Grounded against the upstream repo before renaming: `skills/productivity/grilling/SKILL.md` says "Walk down each branch of the decision tree, resolving dependencies between decisions one-by-one"; "design tree" appears nowhere upstream. The same research pass confirmed two adjacent items need no change: the kit's per-skill `agents/openai.yaml` schema (`interface.display_name` / `interface.short_description` / `policy.allow_implicit_invocation`) matches upstream exactly; and upstream's invocation taxonomy (`disable-model-invocation` + human-facing descriptions for user-invoked skills) was considered and not adopted — the kit deliberately keeps trigger-rich descriptions with auto-invocation and gates writes inside each skill's flow, whereas adopting the upstream axis would disable the auto-loading the kit's skills are designed around. `npm test` 226/226 green.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
