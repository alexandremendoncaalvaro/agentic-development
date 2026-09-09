# Task `0066`: Ship the `UserPromptSubmit` workflow-checkpoint hook

**Status:** proposed
**Created:** 2026-09-09
**Scope ref:** doc/adr/0074-user-prompt-submit-workflow-checkpoint-hook.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

Skills and CLAUDE.md are advisory; the owner currently supplies the deterministic layer by repeating "follow the workflow" at the start of each task. ADR-0074 adds a `UserPromptSubmit` hook to the `ad-hooks` session-lifecycle tier that prints a short imperative checkpoint naming the pipeline skills on every prompt. This task ships the script, the tier documentation, the tests, the dogfood wiring, and the scaffold-time path resolution that also fixes the hard-coded `Stop` hook path.

## Acceptance Criteria

- [ ] `scripts/workflow-checkpoint.mjs` exists byte-identical under `src/skills/{claude-code,codex}/ad-hooks/`, zero dependencies, Node only.
- [ ] Given any stdin (valid JSON, empty, malformed), the script exits 0; with valid input it prints the checkpoint (at most 600 characters, imperative, naming `/ad-grill-me`, `/ad-ground`, `/ad-tdd`, `/ad-tdg`, `/ad-review`, `/ad-audit`, `/ad-commit`, and the skip-when-trivial line); with `AD_WORKFLOW_CHECKPOINT=0` it prints nothing.
- [ ] The script never exits 2 and never emits a `decision` field.
- [ ] Contract tests cover the three stdin shapes and the kill switch by spawning the script.
- [ ] `ad-hooks/SKILL.md` on both hosts documents the checkpoint as the second tier member; the Codex body states the tier is Claude-Code-scoped.
- [ ] The scaffolded `.claude/settings.json` block, for both the `Stop` and the `UserPromptSubmit` hook, uses the path of the skill's loaded base directory instead of a hard-coded `${CLAUDE_PROJECT_DIR}/.claude/skills/...` path.
- [ ] The six skills that run bundled scripts without the "substitute the base directory" sentence (`ad-ground`, `ad-architecture`, `ad-bootstrap`, `ad-community-docs`, `ad-diagnose`, `ad-guidelines`) carry it on both hosts.
- [ ] This repository's `.claude/settings.json` wires the hook against the in-tree script; a live prompt in a fresh session shows the checkpoint as injected context.
- [ ] `CHANGELOG.md` records the new tier member.

## Plan

- [ ] Ground: verify the `UserPromptSubmit` contract (stdout as context, exit codes, stdin fields) against the official hooks reference and a live invocation; write `doc/research/NNNN-ground-user-prompt-submit-hook.md`.
- [ ] Red: contract tests for the script (valid, empty, malformed stdin; kill switch; no exit 2).
- [ ] Green: write `workflow-checkpoint.mjs`; copy byte-identical to the Codex tree.
- [ ] Update `ad-hooks/SKILL.md` on both hosts (tier member, wiring block, base-path resolution) and the six skills missing the base-path sentence.
- [ ] Wire this repository's `.claude/settings.json`; refresh dogfood installs; run the full suite.
- [ ] Verify live: open a fresh session, send a prompt, confirm the checkpoint appears.
- [ ] `CHANGELOG.md`; `/ad-review`, `/ad-audit`, `/ad-commit`, `/ad-pr`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-09

Task created from the workflow-readiness audit (`.context/audit-ad-workflow-readiness.md`). Precedent to follow: `handoff-nudge.mjs` and ADR-0055 for shape, tests, and the verified-contract habit.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
