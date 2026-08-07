# Task `0038`: ship `ad-roadmap` progress-rollup skill

**Status:** done
**Created:** 2026-08-07
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

A decision-maker's recurring question — how much of the plan is done, how much is left, are we on track — has no skill. `ad-next` answers a different question (what to do next, for the practitioner) and `ad-prd` authors the roadmap; neither rolls up completion. This task ships `ad-roadmap` per ADR-0053: a read-only rollup that reconciles the PRD roadmap spine against implementing specs and tasks and returns a percentage plus a per-tier done / in progress / blocked / remaining breakdown.

## Acceptance Criteria

- [x] `src/skills/claude-code/ad-roadmap/SKILL.md` exists, read-only (`allowed-tools: Read, Glob, Grep, Bash` — no Write), no emoji, one example output block.
- [x] `src/skills/codex/ad-roadmap/SKILL.md` exists as the compressed twin with the same contract.
- [x] `src/skills/codex/ad-roadmap/agents/openai.yaml` declares `interface.display_name`, `interface.short_description`, `policy.allow_implicit_invocation: false`.
- [x] `doc/adr/0053-ad-roadmap-progress-rollup.md` (Status: proposed) justifies the skill and the boundary vs `ad-next`.
- [x] `ad-roadmap` registered in the `solo`, `team`, and `mature` universal arrays in `src/lib/profiles.js` (not `poc`).
- [x] `node bin/agentic.js update --yes` regenerates the installed mirrors, `agentic-state.json`, and the AGENTS.md skills table.
- [x] `npm test` passes.

## Plan

- [x] Ground in `ad-next` / `ad-drift` shape, `templates/adr.md`, `templates/task.md`, `src/lib/profiles.js`, `test/skills.test.js`.
- [x] Write both SKILL.md files, the codex `openai.yaml`, ADR-0053, and this task.
- [x] Register the skill in `src/lib/profiles.js`.
- [x] Run `node bin/agentic.js update --yes`; capture output.
- [x] Run `npm test`; fix any failures; re-run until green.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-07

Skill designed and grounded: read-only completion rollup for a decision-maker. Boundary vs `ad-next` recorded in ADR-0053 (different question: completion rollup vs next-action list) and cross-referenced in both SKILL bodies. Defensive on a missing `doc/specs/` (absent in this repo). ADR left `proposed` per the kit convention that the owner accepts later.

Correction to the note above: the line "ADR left `proposed` per the kit convention that the owner accepts later" is inaccurate about how this ships. The skill is built and deliberately held at ADR-0053 `proposed`; per kit convention (no skill ships without an accepted ADR) it will be ratified to `accepted` on-branch BEFORE it lands — matching the ADR-0052 precedent (proposed → implemented → ratified to accepted before merge) — at which point this task flips to `done`. ADR-0053 stays `proposed` for now (the owner's acceptance gate). Also this session: mirrors regenerated via `node bin/agentic.js update --yes` and `npm test` green at 412/412; both Acceptance-Criteria boxes checked accordingly.

### 2026-08-07 (close)

Owner accepted ADR-0053. Ratified `proposed` → `accepted`; the ADR state projection updated to 30 accepted ADRs in this same commit (per the projection maintenance rule). Fresh-context Standards review passed with no blockers; three precision fixes applied (codex trigger-phrase parity, empty-`## Roadmap` → `N/A` rule to avoid divide-by-zero, and this task record's honesty correction above). Full suite green at 417. Task closed.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
