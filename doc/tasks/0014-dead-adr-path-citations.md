# Task `0014`: Drop dead ADR path citations from Codex skill bodies

**Status:** in-progress
**Created:** 2026-07-29
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

Commit `576bb9d` archived twenty-four implemented ADRs and swept the repo for references, keeping plain-text `ADR-NNNN` mentions as breadcrumbs resolvable via git log. The sweep stripped markdown-link wrappers, so it missed the Codex host's citation form — `ADR-NNNN (\`doc/adr/NNNN-slug.md\`)` in backticks, not a link. Five Codex skill bodies still cite file paths for ADRs the kit deleted, and those bodies install into every consuming project pointing at files that do not exist. The Claude Code host is already clean, so this is also a host-parity gap.

This was previously logged twice as a single dangling `ADR-0022` reference in `ad-grill-me`, on the belief that the ADR had never been created. Git history says otherwise: `67570bc` created it and `576bb9d` archived it. The reference is not dangling by accident and it is not one skill — it is one class across five.

## Acceptance Criteria

- [x] No `SKILL.md` in `src/skills/` cites a `doc/adr/NNNN-*.md` path that does not resolve, outside fenced example blocks.
- [x] Codex bodies keep the plain-text `ADR-NNNN` breadcrumb, matching the Claude Code host and the `576bb9d` convention.
- [x] A test fails when a dead ADR path is introduced, verified by running it against the unfixed tree.
- [x] Dogfood regenerated; `npm test` green.

## Plan

- [x] Enumerate the whole class: every `doc/adr/` path cited in `src/`, `prompts/`, `templates/`, tested for existence.
- [x] Strip the dead parentheticals from the five Codex bodies.
- [x] Add the regression test to `test/skills.test.js`; prove it red against the unfixed tree.
- [x] `node bin/agentic.js update --yes --force`; `npm test`.
- [x] Fresh-context review.
- [ ] PR opened.
- [ ] Merged on CI green.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-07-29

No ADR: this enforces a convention `576bb9d` already established rather than deciding anything new.

`ad-pr` keeps its live `doc/adr/0032-...` path, and `ad-archive`'s dead-looking paths sit inside a fenced block illustrating the skill's own report output — the test skips fenced blocks for exactly that reason. Live ADRs keep their paths on the Codex host, which is that host's existing convention; only the archived ones lose them.

Standards review raised three concerns, all accepted and fixed here: the Plan checkboxes lagged the diff; the fence detector could be flipped permanently by an unterminated fence, silently disabling the guard for the rest of a file (it now asserts a balanced count); and the guard read only `SKILL.md`, missing subagent manifests that install just as widely (it now covers every installed file in the skill directory). The reviewer independently re-derived the archived-ADR set from `576bb9d` and found no missed instance of the class.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
