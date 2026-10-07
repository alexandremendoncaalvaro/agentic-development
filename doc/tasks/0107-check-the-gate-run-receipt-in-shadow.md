# Task `0107`: Check the gate-run receipt before push, in shadow

**Status:** in-progress
**Created:** 2026-10-07
**Scope ref:** doc/adr/0089-check-workflow-receipts-in-shadow-before-landing.md (decisions 1 to 4, gate-run check)
**Evidence ref:** doc/research/0038-ground-gate-run-receipt-shadow-check.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The tracer bullet for ADR-0089: the cheapest receipt (a local gate run keyed
to the commit SHA and exit code) and the first check of the shadow gate, end to
end on both hosts. It proves the gate script, its matching, its freshness rule
and its evidence line before the other checks reuse them.

## Acceptance Criteria

- [x] A gate-run wrapper runs the repository's CI-mirror command and records the commit SHA, the command, the exit code and the time under `.agentic/receipts/`; in this repository the pre-push runner writes it, and `ad-pr`'s preflight writes it for consumers.
- [x] `sequence-gate.mjs`, byte-identical in both `ad-hooks` trees, runs on `PreToolUse` for Bash and, before `git push` or `gh pr create`, appends a "would block" line to the ADR-0083 evidence file when no fresh gate-run receipt with exit 0 exists for `HEAD`; it always exits 0 and emits no decision object.
- [x] Freshness follows ADR-0089 decision 3: `HEAD`, or only receipt-neutral paths changed since the receipt (`.agentic/gates.json`, default `doc/tasks/**`).
- [x] `AD_SEQUENCE_GATE=0` silences it; malformed input exits 0 silently.
- [x] Contract tests by mock stdin cover a fresh receipt, a missing one, a stale one, a receipt-neutral change, a failing exit code, an unrelated command, and both hosts' event shapes; this repository wires the hook for dogfood.

## Plan

- [x] `/ad-ground` the `PreToolUse` input shapes on both hosts and the evidence line format; record the GROUND study.
- [x] Red, then green (`/ad-tdd`); partly test-after with mutation checks, see Notes 2026-10-07.
- [x] `ad-hooks` text and wiring; ARCHITECTURE and CONTEXT terms; CHANGELOG.
- [ ] `/ad-review`; `/ad-audit`; `/ad-commit`; PR on the owner's approval.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Planned with ADR-0089 (proposed) from RESEARCH-0037. Implementation waits for
the owner's acceptance of ADR-0089 and approval of this plan.

### 2026-10-07 — plan approved

The owner accepted ADR-0089 and approved this plan.

### 2026-10-07 — implementation and reviews

GROUND-0038 was committed (6ec9f9b) before the first implementing commit
(240fc16). The tracer-bullet test failed first on the missing module, then on
`would-block` (the receipt file itself entered the fixture's commit; the
receipts directory is now always neutral), then passed. It was then flaky,
failing 4 of 6 runs: a copy of the real index carries a fresh mtime, so git
trusted the stat of a same-size edit in the base commit's second and recorded
the old content. The temporary index now starts empty (10 of 10 passes; 0.20 s
for this repository's 1,019 files), recorded in GROUND-0038 D3. A
deterministic test for that race was tried and dropped: a mutant survived it,
so it did not test what it claimed.

Not strictly test-first: the green step implemented the whole first check, so
the stale, neutral, override, failed-exit, unrelated-input and kill-switch
tests were written after the code. Each was then mutation-checked: removing
the all-paths rule, the exit filter, the `gates.json` override, the kill switch
or the `gh pr create` action each turned the suite red. Two mutants survived
and were acted on: the exact-tree branch was redundant with the diff rule and
was removed, and the non-Bash test only read stdout and now also checks that
no evidence file appears.

Deviation from AC 1: the receipt is written by an npm `postverify` script,
which runs after `npm run verify` passes, whether run by hand or by the
pre-push runner (`scripts/hook-npm-test.js` runs `npm run verify`). `ad-pr`
records it for consumers after its local gates.

Fresh-context review of c0e87ff..240fc16, every finding with severity and
disposition:

- Standards Major: a rename into a neutral path hid the removed source
  (reproduced by the reviewer). Fixed test-first in c367ebc: `--no-renames`.
- Standards Major: `core.quotePath` quoted non-ASCII neutral paths, a false
  would-block. Fixed test-first in c367ebc: `-z`.
- Standards Minor: `git -C x push` and other global options were missed.
  Fixed test-first in c367ebc.
- Standards Minor: `gate-run.mjs` threw outside a repository and could fail
  `postverify`. Fixed test-first in c367ebc: it explains and exits 0.
- Standards Minor: the empty index's cost was unmeasured. Accepted, measured
  (GROUND-0038 D3).
- Standards Nit: no test for a malformed `gates.json`. Added; it already
  passed (`runtime-unavailable`, exit 0).
- Spec Major: no Codex-shaped event test. Added; it already passed (both
  hosts send `tool_name: "Bash"` and `tool_input.command`, GROUND-0038 E1).
- Spec Major: ADR-0089 named the commit SHA while the code keys the tree.
  Fixed: ADR-0089 addendum (29b6dd2).
- Spec Minor: GROUND-0038 measured the seeded index. Fixed: E2 and D3
  updated (29b6dd2).
- Spec Minor: the receipt comes from `postverify`, not the runner. Accepted,
  recorded above.
- Spec Nit: the evidence file also logs `clear` and `runtime-unavailable`.
  Accepted, recorded in the ADR-0089 addendum (false blocks count
  `would-block` only).
- Spec Nit: acceptance boxes unticked. Fixed in this entry's commit.

Delta review of 240fc16..499986e: no Blocker. Concern: quoted `-C`/`-c`
values were missed. Fixed test-first in 0b760ac. Concern: no negative matcher
cases. Fixed in 0b760ac (`git commit`, `git status`, `git stash push`,
`git remote add push`). Note: the RESEARCH-0039 draft had entered the docs
commit by mistake. Fixed: the commit was split before push (29b6dd2), and the
study lands in its own commit.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
