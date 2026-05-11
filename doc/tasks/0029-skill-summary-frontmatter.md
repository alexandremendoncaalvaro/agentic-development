# Task `0029`: Move skill table descriptions into per-skill frontmatter `summary:`

**Status:** done
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

- [x] `summary:` field added to all 23 Claude Code SKILL.md frontmatter files under `src/skills/claude-code/ad-*/SKILL.md`.
- [x] `summary:` field added to all 22 Codex SKILL.md frontmatter files under `src/skills/codex/ad-*/SKILL.md` (no `ad-subagent` on Codex).
- [x] `summary:` values match current `SKILL_DESCRIPTIONS` dict semantics (≤320 chars, table-ready, no trigger-keyword padding — the 320 cap is the enforced static-coverage invariant in `test/skills.test.js`; the relaxation from the originally-drafted 120 lands here so the existing hand-tuned descriptions (longest is `ad-deepen` at 298 chars) keep their information without rewriting).
- [x] `src/lib/rootdoc.js`: `SKILL_DESCRIPTIONS` dict removed; `buildSection` reads `summary:` from each installed `SKILL.md` at render time (target-tree, not source-tree — `rootdoc.js` has no kit-root access).
- [x] Parser: hand-rolled frontmatter line scan (no new runtime dep on js-yaml; matches the kit's no-build-step shape).
- [x] Failure mode: missing or empty `summary:` in installed SKILL.md → `readSkillSummary` throws with a clear `skill <name> is installed but no SKILL.md carries a non-empty \`summary:\` frontmatter field` message; if the skill is referenced but not installed at any location, throws `skill <name> not found at any installed location; cannot read summary`. The shipped wording differs from the original AC draft; tight failure surfaces incomplete kit installs early either way. v0.15.2 added the empty-summary guard via regex tightening (`\s*` → `[ \t]*`) after the posthumous review caught the latent capture-next-line bug.
- [x] `test/skills.test.js`: static assertion that every source SKILL.md (Claude + Codex) carries a non-empty `summary:` field.
- [x] `test/lib.test.js`: `updateRootDoc` test fixture skills carry `summary:` so the section-render path exercises the new reader.
- [x] AGENTS.md Gotchas: one-line convention note pointing at this task.
- [x] Dogfood install refreshed; `.claude/skills/ad-*/SKILL.md` + `.agents/skills/ad-*/SKILL.md` carry the new field. AGENTS.md managed section rebuilds with the same cell text via the new path.
- [x] `npm test` passes.

## Plan

- [x] Draft this task.
- [x] Add `summary:` to 45 SKILL.md files (23 Claude + 22 Codex). Copy values from current `SKILL_DESCRIPTIONS` dict.
- [x] Refactor `rootdoc.js`: drop dict, add `readSummary(skillName, cwd)` helper, wire `buildSection` through it.
- [x] Update `test/skills.test.js` + `test/lib.test.js`.
- [x] Add AGENTS.md gotcha line.
- [x] Dogfood refresh + verify managed-section cell text unchanged.
- [x] Commit (atomic per concern), PR, merge.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- **2026-05-10** — Task opened after `/ad-deepen` grilling loop refined the proposal shape. Phase 1: section-build-time live read (Branch B). Phase 2: `summary:` field is the kit-specific extension; original "use Anthropic-spec `description`" shape rejected as too lossy for table cells.
- **2026-05-10 — v0.15.2 follow-up.** Posthumous fresh-context review of the d7fd731..9163acc range surfaced one Blocker + four Concerns. Blocker: `/^summary:\s*(.+)$/m` in `readSkillSummary` — `\s` matches `\n` in JavaScript, so an empty-summary skill silently captured the next frontmatter line. Fixed by restricting to horizontal whitespace `[ \t]*`. Concerns: cap drift (120 vs 320) reconciled to 320 in AC + JSDoc; failure-mode wording reconciled to shipped string in AC; throw-path tests added (empty-summary + skill-not-found); `seedInstalledSkill` parameterized for `agent: 'codex'` and a Codex-only-install integration test added. v0.15.2-beta.1 publishes the regex fix.
- **2026-05-10 — Shipped.** Three-commit chain on branch `refactor/v0.15.1-skill-summary-frontmatter`:
  - `2f8e449` adds `summary:` to all 45 SKILL.md files.
  - `2778c77` refactors `rootdoc.js` (drops dict, adds `readSkillSummary`; lazy buildSection; updated tests).
  - `ca1f792` dogfood refresh + AGENTS.md gotcha.
  - Managed-section cell text round-trips byte-identical (DoD met).
  - 179/179 tests pass.
  - Status flipped `proposed` → `done`.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Managed-section cell text round-trips: post-refactor AGENTS.md table cells match pre-refactor cells byte-for-byte across all 23 skills.
- [x] Status updated to `done` and Notes log closes the task
