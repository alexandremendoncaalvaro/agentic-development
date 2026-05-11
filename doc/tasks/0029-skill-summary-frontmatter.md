# Task `0029`: Move skill table descriptions into per-skill frontmatter `summary:`

**Status:** proposed
**Created:** 2026-05-10
**Owner:** Alexandre Alvaro
**Spec ref:**
**Board ref:**

## Context

`/ad-deepen` surfaced Candidate 1 (this session, 2026-05-10): `src/lib/rootdoc.js` `SKILL_DESCRIPTIONS` dict duplicates each skill's identity surface. Every skill currently carries:

- Anthropic-spec `description:` field in SKILL.md frontmatter (trigger keywords; drives skill-router auto-load).
- Hand-tuned ≤80-char string in `rootdoc.js` `SKILL_DESCRIPTIONS` dict (drives the managed `Skills installed by agentic` table in downstream AGENTS.md).
- README skill-table row (drives human discoverability).

Grilling Phase 1 settled render policy: section-build-time live read from installed SKILL.md (Branch B). Disk stays canonical per ADR-0009.

Grilling Phase 2 revealed the original proposal ("read `description`, drop dict") is wrong-shaped — frontmatter descriptions are 334-680 chars with trigger keywords; first-sentence truncation is 100-300 chars and reads worse than the hand-tuned table copy. Two audiences want different content.

Refined shape: add a kit-specific `summary:` frontmatter field per skill. Anthropic-spec `description` stays trigger-keyword-rich for the skill router. `summary` carries the compressed cell for AGENTS.md table + future readers. `rootdoc.js` reads `summary` from installed SKILL.md frontmatter at render time. Single source of truth per audience.

Three-criteria ADR rule (per ADR-0022 §5): hard-to-reverse marginal, surprising borderline, real-trade-off yes → skip ADR per default-skip. Convention documented in AGENTS.md Gotchas.

## Acceptance Criteria

- [ ] `summary:` field added to all 23 Claude Code SKILL.md frontmatter files under `src/skills/claude-code/ad-*/SKILL.md`.
- [ ] `summary:` field added to all 22 Codex SKILL.md frontmatter files under `src/skills/codex/ad-*/SKILL.md` (no `ad-subagent` on Codex).
- [ ] `summary:` values match current `SKILL_DESCRIPTIONS` dict semantics (≤120 chars, table-ready, no trigger-keyword padding).
- [ ] `src/lib/rootdoc.js`: `SKILL_DESCRIPTIONS` dict removed; `buildSection` reads `summary:` from each installed `SKILL.md` at render time (target-tree, not source-tree — `rootdoc.js` has no kit-root access).
- [ ] Parser: hand-rolled frontmatter line scan (no new runtime dep on js-yaml; matches the kit's no-build-step shape).
- [ ] Failure mode: missing `summary:` in installed SKILL.md → throw with a clear `agentic: skill <name> missing required summary field in installed SKILL.md` message. Tight failure surfaces incomplete kit installs early.
- [ ] `test/skills.test.js`: static assertion that every source SKILL.md (Claude + Codex) carries a non-empty `summary:` field.
- [ ] `test/lib.test.js`: `updateRootDoc` test fixture skills carry `summary:` so the section-render path exercises the new reader.
- [ ] AGENTS.md Gotchas: one-line convention note pointing at this task.
- [ ] Dogfood install refreshed; `.claude/skills/ad-*/SKILL.md` + `.agents/skills/ad-*/SKILL.md` carry the new field. AGENTS.md managed section rebuilds with the same cell text via the new path.
- [ ] `npm test` passes.

## Plan

- [ ] Draft this task.
- [ ] Add `summary:` to 45 SKILL.md files (23 Claude + 22 Codex). Copy values from current `SKILL_DESCRIPTIONS` dict.
- [ ] Refactor `rootdoc.js`: drop dict, add `readSummary(skillName, cwd)` helper, wire `buildSection` through it.
- [ ] Update `test/skills.test.js` + `test/lib.test.js`.
- [ ] Add AGENTS.md gotcha line.
- [ ] Dogfood refresh + verify managed-section cell text unchanged.
- [ ] Commit (atomic per concern), PR, merge.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- **2026-05-10** — Task opened after `/ad-deepen` grilling loop refined the proposal shape. Phase 1: section-build-time live read (Branch B). Phase 2: `summary:` field is the kit-specific extension; original "use Anthropic-spec `description`" shape rejected as too lossy for table cells.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Managed-section cell text round-trips: post-refactor AGENTS.md table cells match pre-refactor cells byte-for-byte across all 23 skills.
- [ ] Status updated to `done` and Notes log closes the task
