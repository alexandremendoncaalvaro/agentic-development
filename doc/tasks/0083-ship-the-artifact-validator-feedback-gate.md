# Task `0083`: Ship the artifact-validator feedback gate on both hosts

**Status:** proposed
**Created:** 2026-09-21
**Scope ref:** doc/specs/0008-surface-validator-failures-during-the-turn.md
**Evidence ref:** doc/research/0026-runtime-layer-deterministic-host-hooks.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:** doc/specs/0008-surface-validator-failures-during-the-turn.md
**Board ref:**

## Context

The kit's artifact validators run only when the agent remembers the skill
step, and Task 0079 closed record-level drift that reached `main` by that
route. Spec 0008 contracts the first runtime gate: after a write to a governed
artifact, the host's post-tool hook runs the owning validator and, on failure,
returns the validator's own message and a reproduction command to the model
inside the same turn, leaving one evidence line per firing outside the tree.
ADR-0083 bounds the layer this gate opens: feedback only, both hosts through
native hooks, one byte-identical script, no judgment, opt-in through
`ad-hooks`.

This task ships that gate end to end: the script, its tests, the owner map,
the `ad-hooks` tier documentation on both hosts (including the correction of
the stale Codex scope text), this repository's dogfood wiring, and the first
live capture on Claude Code. It takes number 0083 because the unmerged
`feat/live-evaluation-lane` branch already holds Tasks 0081 and 0082.

## Acceptance Criteria

- [ ] `scripts/artifact-gate.mjs` exists byte-identical under `src/skills/{claude-code,codex}/ad-hooks/`, zero dependencies, Node only, and the parity test covers it.
- [ ] Given a post-tool event whose written path is governed and whose file fails its validator, the script exits 2 and standard error carries the gate identifier, the validator's message, and a reproduction command runnable from the repository root.
- [ ] Given a governed path whose file passes, the script exits 0 with empty standard output and standard error.
- [ ] Given an ungoverned path, an event without a path, or malformed or empty standard input, the script exits 0 silently and runs no validator.
- [ ] Given a governed path whose owning validator cannot run, the script exits 2 and standard error names the state as a runtime failure, distinct from a verdict.
- [ ] Every firing on a governed path appends one JSON line to an evidence file under the OS temporary directory keyed by `session_id`, with gate identifier, terminal state, path, validator, validator output, surfaced text, reproduction command, and sequence number; `AD_ARTIFACT_GATE_EVIDENCE_DIR` redirects it; the script never writes inside the working tree unless that variable points there.
- [ ] `AD_ARTIFACT_GATE=0` yields a silent exit 0 and no evidence line for every case above.
- [ ] The owner map is declared once in the script and covers the ground receipt and the evaluation plan and report validators, with the research-study question of Spec 0008 settled and recorded in the ground record.
- [ ] The written path is recovered from Claude Code `Write` and `Edit` tool input and from the Codex write tool input, per the ground record's finding on the Codex payload shape.
- [ ] `ad-hooks/SKILL.md` on both hosts documents the gate as the third session-lifecycle member with the same key-facts shape as the first two, the Claude Code wiring block for `PostToolUse` with an `Edit|Write` matcher, and the Codex wiring block for `.codex/hooks.json`; the Codex body no longer states that the tier is out of scope on Codex.
- [ ] This repository's `.claude/settings.json` and `.codex/hooks.json` wire the gate against the in-tree script.
- [ ] One authorized live trial on Claude Code with the gate wired records a hook record for a governed write in the captured stream and a matching evidence line, with the capture kept private per ADR-0082 decision 4 and its digest recorded here.
- [ ] `CHANGELOG.md` records the new tier member.

## Plan

- [ ] `/ad-derisk`: register the unknowns (Codex write payload shape, study-versus-receipt validator ownership, `PostToolUse` exit-2 stderr delivery, hook timeout budget, Desktop environment inheritance) and retire each.
- [ ] `/ad-ground`: four-source pass on the two hosts' post-tool contracts and on the existing hook scripts as the in-repo pattern; write `doc/research/NNNN-ground-artifact-validator-gate.md` and set `Evidence ref` to it.
- [ ] Red: contract tests for every terminal state, the kill switch, the evidence line, and the two hosts' path recovery, spawning the script.
- [ ] Green: write `artifact-gate.mjs`; copy byte-identical to the Codex tree; parity test.
- [ ] Update `ad-hooks/SKILL.md` on both hosts; wire this repository's hook configuration for both hosts; refresh dogfood installs.
- [ ] Verify live on Claude Code through the live lane with the gate wired; record the capture digest and the evidence line in Notes.
- [ ] `CHANGELOG.md`; `/ad-review`; `/ad-audit`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-21

Task created from RESEARCH-0026's graduation path after the owner approved the
study. Precedent to follow: `workflow-checkpoint.mjs` and Task 0066 for
shape, tests, dogfood wiring, and the verified-contract habit; `live.mjs` on
`feat/live-evaluation-lane` for the capture privacy rule.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
