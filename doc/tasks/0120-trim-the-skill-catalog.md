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
- [x] Every description is at most 200 characters, use case and triggers first (test); a new ADR amends ADR-0085 decision 3.
- [x] `ad-project-state` is not user-invocable on Claude Code (test).
- [ ] After merge, the listing probe of RESEARCH-0030 is rerun; if the listing still overflows, `ad-hooks` documents the `skillOverrides` name-only opt-in for setup skills (ADR-0085 item 4).

## Plan

- [x] PR: body cap, reference split, ceremony removal (tests first).
- [x] PR: description cap 200 with the ADR and every rewrite.
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

### 2026-10-15 — review of 9573e0e

Corrects the entry above: the regime step was also in 13 Codex skills, as
inline text the heading-only test missed (spec review Blocker). The test now
matches "confirm regime" in any form; the Codex steps became "Not for" lists,
with `ad-release` and `ad-rules` renamed to their real step. Stale regime and
Step 4 references in the `ad-tdd` and `ad-tdg` summaries and output
contracts were updated, and `ad-hooks` states its session-hook approval step
in the skill body again (standards review, ADR-0085).

### 2026-10-15 — description cap

Lowering the cap to 200 turned 88 cases red (44 skills on two hosts). Every
description was rewritten as use case then trigger phrases, the same text on
both hosts (the four that differed by host now match); they total 7,099
characters per host, down from about 13,600. ADR-0093 amends ADR-0085
decision 3. The listing probe waits for the release.

### 2026-10-15 — review of the description cap

Spec review: five descriptions lost cues that separate them from a neighbour.
`ad-roadmap` regained "roadmap" and "specs and tasks"; `ad-research` regained
"not code" and "literature review"; `ad-spike` traded "evaluate approaches"
for "golden fixture" and "uncertain technique"; `ad-audit` says it is heavier
than `ad-review`; `ad-report` gained trigger phrases. Standards review:
AGENTS.md and ARCHITECTURE.md still named the 350 cap; ADR-0093 decision 4
now names this task.
