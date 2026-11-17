# Task `0127`: Bound the resume turn and size handoffs against working space

**Status:** in-progress
**Created:** 2026-11-17
**Scope ref:** doc/research/0048-ground-bounded-resume-protocol.md
**Evidence ref:** doc/research/0047-lean-resume-context-budget.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

A session resumed from an `ad-handoff` file reached 136k of a 168k auto-compact point in one turn: a 104k fixed floor plus 29k of inline reconciliation the template demands (RESEARCH-0047). The owner asked for a rule enforced by the kit, not a promise.

## Acceptance Criteria

- [x] The handoff template's `Resume protocol` (both hosts) reads only the handoff in full, treats references as pointers read just in time and bounded, runs only a fixed set of bounded probes inline, delegates every other reconciliation to one subagent returning a short digest, and states a resume budget.
- [x] The template no longer calls references "reading obligations" or orders every referenced artifact read.
- [x] `ad-handoff` caps the handoff's size and states the hand-off threshold against working space (auto-compact point minus the fixed floor), never a fixed total.
- [x] The `agentic-session` band reports the conversation's share of working space when the context breakdown carries a `Messages` row, and falls back to the current basis otherwise.
- [x] Static contract tests and band unit tests cover each item above; `npm run verify` is green.
- [x] A repo script measures a resume turn's context growth from a transcript, with a fixture test.
- [x] Fresh-context review on both axes, findings dispositioned.
- [ ] The installed kit is updated and a resume under the new protocol is measured against RESEARCH-0047 E1.

## Plan

- [x] Records (RESEARCH-0047, GROUND-0048).
- [x] TDD the template, skill, band and script.
- [x] Gate and fresh-context review.
- [x] Commit locally.
- [x] Install the user-scope skills; the band ships with the plugin after merge.
- [ ] Measure a resume under the new protocol.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- 2026-11-17: Opened from RESEARCH-0047 and GROUND-0048. `~/.claude/settings.json` belongs to the owner: its floor reductions are proposed, not applied.
- 2026-11-17: Fresh-context review, Sonnet, once per axis. Standards: no blocker; ADR-0088 lacked the new band basis, so a dated addendum records it; the rest were nits, left. Spec: resume-cost.mjs reported only first-to-last growth, not E1's growth past the first call, so it now emits `growthPastFirstCall` (baseline reproduces E1: 29,241) and skips subagent rows; the inline fallback now stays inside the 10,000-token budget; the skill says what to do when the host shows no context panel; the contract pins the in-full read, the cheapest model, the 80% share and a broader no-mandate check; CHANGELOG and README match. Untested fallback inputs for the band (non-numeric tokens) were left as a nit: the code handles them. Each fix was checked by a test going red then green; `npm run verify` green, 1673 tests.
- 2026-11-17: Installed at user scope (`agentic update --scope user --agent both --yes`): only the four `ad-handoff` files changed, byte-identical to `src/skills`. The `agentic-session` band installs from the marketplace at a main commit, so its change reaches the desk only after merge. Measurement: a headless `claude -p` run failed on an expired OAuth session, so the A/B ran as two read-only Sonnet Explore subagents resuming the same Maestro handoff, one carrying the old protocol, one the new (same body otherwise). Before: 4 calls, growth 11,820 tokens, 6,433 past the first call, 19,419 chars of tool output (Bash 7,447). After: 3 calls, growth 6,918, 1,150 past the first call, 15,505 chars (Bash 2,360). A proxy and a lower bound: the read-only subagent could not query PRs, CI or sessions, the checks that drove E1's 29,241. The criterion stays open until a real desk resume is measured with `node eval/resume-cost.mjs <transcript> <handoff file name>` against E1.
