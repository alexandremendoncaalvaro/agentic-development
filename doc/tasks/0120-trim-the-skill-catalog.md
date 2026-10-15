# Task `0120`: Trim the skill catalog

**Status:** in-progress
**Created:** 2026-10-15
**Scope ref:** doc/adr/0085-gate-skill-effects-inside-the-skill.md (decision 3 amended by a new ADR)
**Evidence ref:** doc/research/0030-skill-invocation-control-and-listing-budget.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

Skill descriptions total about 13.6k characters per host against a listing budget of about 8k on a 200k window; the largest SKILL.md bodies exceed the 5k-token guidance; 13 Claude Code skills open with a ceremonial "Confirm regime" step and 21 Codex skills repeat an outdated warning.

## Acceptance Criteria

- [x] A test caps every SKILL.md at 500 lines and 20,000 bytes on both hosts; `ad-hooks` moves its session tier to a reference file.
- [x] No SKILL.md carries the "Confirm regime" step or the Codex "less mature" warning (tests); routing lines survive as one "Not for" line.
- [ ] Every description is at most 200 characters, use case and triggers first (test); a new ADR amends ADR-0085 decision 3.
- [x] `ad-project-state` is not user-invocable on Claude Code (test).
- [ ] After merge, the listing probe of RESEARCH-0030 is rerun; if the listing still overflows, `ad-hooks` documents the `skillOverrides` name-only opt-in for setup skills (ADR-0085 item 4).

## Plan

- [x] PR: body cap, reference split, ceremony removal (tests first).
- [ ] PR: description cap 200 with the ADR and every rewrite.
- [ ] Listing probe after release.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-15 — planned

Planned from the kit audit of 2026-10-15 after a read-only verification of
its claims against the code. The owner approved doing every remaining
package on 2026-10-15. The owner chose to keep `ad-brief`, `ad-next` and `ad-roadmap` separate and to revisit an optional pack for personal skills only after the listing is measured.

### 2026-10-15 — body cap and ceremony

The new body test went red on 30 skill files: 29 with the regime step or the
Codex warning, and `claude-code/ad-hooks` at 25,162 bytes. The regime step
was in 13 Claude Code skills (not every skill, as the audit said) and the
warning in 21 Codex skills. Nine regime sections became "Not for" lists;
four held real content and were renamed instead (`ad-release` preconditions,
`ad-rules` request classification, `ad-merge` and `ad-pr` scope with their
release-plan rules). `ad-hooks` is now 11,339 bytes, its session tier in
`references/session-tier.md`. `ad-project-state` is `user-invocable: false`
(menu hygiene only; its description stays in the listing).
