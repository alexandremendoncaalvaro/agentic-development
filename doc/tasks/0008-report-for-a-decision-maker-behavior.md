# Task `0008`: Add the report-for-a-decision-maker behavior to `ad-philosophy`

**Status:** done
**Created:** 2026-07-28
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

[ADR-0040](../adr/0040-report-for-a-decision-maker-behavior.md) adds an eighth behavior to `ad-philosophy` — *Report for a Decision-Maker* — closing the posture chain opened by [ADR-0031](../adr/0031-decide-when-grounded-posture.md): decide-when-grounded governs whether to decide or ask; the new behavior governs how the result is reported (conclusion first, self-contained, translate-not-dump, jargon expanded, clarity over compression, decisions shaped with the recommendation first). Both host files; no new skill.

## Acceptance Criteria

- [x] Both host `ad-philosophy` files carry the new behavior after *Verify Before Claiming Done*, with the six delivery rules from ADR-0040, phrased generically (no personal or team-specific text).
- [x] Frontmatter `description` (≤1536 chars, no unquoted `: ` in the claude-code plain scalar) and `summary` (≤320 chars) mention the new behavior in both host files.
- [x] The two "seven behaviors" count references per host file read "eight"; ADR-0031's "seventh behavior" stays untouched (historical record).
- [x] No other file changes beyond the regenerated dogfood install, state, and managed AGENTS.md row — plus the codex `openai.yaml` `short_description`, whose behavior enumeration this change makes stale (see Notes).
- [x] `npm test` green (CI confirms Node 20 / 22).

## Plan

- [x] Branch `feat/ad-philosophy-boss-report` off `main`.
- [x] Edit both host SKILL.md files (new section + frontmatter + count lines).
- [x] `node bin/agentic.js update --yes --force`; verify byte-identity + table row.
- [x] `npm test`; fresh-context §10 review; PR on explicit go.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-07-28

Authored the eighth behavior in both host styles (claude-code sectioned bullets; codex compact bold paragraph), placed after *Verify Before Claiming Done* per ADR-0040's placement logic. Content generalized from the decide-when-grounded framing — six delivery rules, generic English, no personal or team-specific text. Deliberate scope call: the codex `agents/openai.yaml` `short_description` enumerates the behavior list and was already stale (missing ADR-0031's decide-when-grounded); since this change alters that same enumeration, updated it to the full eight rather than leaving it two behaviors behind. ADR-0031's "seventh behavior" wording left untouched (historical record, per the ADR-immutability convention). `npm test` 226/226 green; dogfood byte-identical both hosts.

Two-axis §10 review outcome: Standards ship-as-is; Spec found one real blocker and three real concerns, all fixed. Blocker: ADR-0040's "No other file changes" sentence contradicted the same commit's openai.yaml edit — amended in the ADR (still `proposed`, same-change mutable; distinct from the accepted-ADR immutability rule). Concerns: the codex host's compression dropped the "never optimize a report for brevity" prohibition, the jargon audience-calibration sentence, and the *(per Decide When Grounded)* cross-reference — all three restored; and the frontmatter trigger list had reintroduced the un-generalized "BLUF" acronym the ADR body deliberately generalized away — dropped from both hosts.

### 2026-07-29 — closed

Shipped in PR #43 (`a303652`), merged to `main` with CI green. Every acceptance criterion and Definition-of-Done item above is checked against work that actually landed, not against intent.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
