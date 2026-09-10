# Task `0066`: Ship the `UserPromptSubmit` workflow-checkpoint hook

**Status:** in-progress
**Created:** 2026-09-09
**Scope ref:** doc/adr/0074-user-prompt-submit-workflow-checkpoint-hook.md
**Evidence ref:** doc/research/0009-ground-user-prompt-submit-hook.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

Skills and CLAUDE.md are advisory; the owner currently supplies the deterministic layer by repeating "follow the workflow" at the start of each task. ADR-0074 adds a `UserPromptSubmit` hook to the `ad-hooks` session-lifecycle tier that prints a short imperative checkpoint naming the pipeline skills on every prompt. This task ships the script, the tier documentation, the tests, the dogfood wiring, and the scaffold-time path resolution that also fixes the hard-coded `Stop` hook path.

## Acceptance Criteria

- [x] `scripts/workflow-checkpoint.mjs` exists byte-identical under `src/skills/{claude-code,codex}/ad-hooks/`, zero dependencies, Node only.
- [x] Given any stdin (valid JSON, empty, malformed), the script exits 0; with valid input it prints the checkpoint (under 900 characters, about 700 as shipped per the ADR-0074 addendum, imperative, naming `/ad-derisk`, `/ad-grill-me`, `/ad-ground`, `/ad-tdd`, `/ad-tdg`, `/ad-review`, `/ad-audit`, `/ad-commit`, `/ad-handoff`, the summary-plus-roadmap opening, and the skip-when-trivial line); with `AD_WORKFLOW_CHECKPOINT=0` it prints nothing.
- [x] The script never exits 2 and never emits a `decision` field.
- [x] Contract tests cover the three stdin shapes and the kill switch by spawning the script.
- [x] `ad-hooks/SKILL.md` on both hosts documents the checkpoint as the second tier member; the Codex body states the tier is Claude-Code-scoped.
- [x] The scaffolded `.claude/settings.json` block, for both the `Stop` and the `UserPromptSubmit` hook, uses the path of the skill's loaded base directory instead of a hard-coded `${CLAUDE_PROJECT_DIR}/.claude/skills/...` path.
- [x] The six skills that run bundled scripts without the "substitute the base directory" sentence (`ad-ground`, `ad-architecture`, `ad-bootstrap`, `ad-community-docs`, `ad-diagnose`, `ad-guidelines`) carry it on both hosts.
- [x] This repository's `.claude/settings.json` wires the hook against the in-tree script; a live prompt shows the checkpoint as injected `UserPromptSubmit` context, with the transcript extract retained as evidence.
- [x] `CHANGELOG.md` records the new tier member.

## Plan

- [x] Ground: verify the `UserPromptSubmit` contract (stdout as context, exit codes, stdin fields) against the official hooks reference and a live invocation; write `doc/research/NNNN-ground-user-prompt-submit-hook.md`.
- [x] Red: contract tests for the script (valid, empty, malformed stdin; kill switch; no exit 2).
- [x] Green: write `workflow-checkpoint.mjs`; copy byte-identical to the Codex tree.
- [x] Update `ad-hooks/SKILL.md` on both hosts (tier member, wiring block, base-path resolution) and the six skills missing the base-path sentence.
- [x] Wire this repository's `.claude/settings.json`; refresh dogfood installs; run the full suite.
- [x] Verify live: send a prompt, confirm the checkpoint appears, retain the transcript extract.
- [ ] `CHANGELOG.md`; `/ad-review`, `/ad-audit`, `/ad-commit`, `/ad-pr`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-09

Task created from the workflow-readiness audit (`.context/audit-ad-workflow-readiness.md`). Precedent to follow: `handoff-nudge.mjs` and ADR-0055 for shape, tests, and the verified-contract habit.

Ground record `doc/research/0009-ground-user-prompt-submit-hook.md` validated; live evidence of the mechanism came from this very session, where the SLIM plugin's `UserPromptSubmit` hook delivered a context block on the first prompt. Red: five contract tests failed on a missing module. Green: `workflow-checkpoint.mjs` (697-character static checkpoint, exit 0 always, kill switch), byte-identical in both trees. The checkpoint text follows the owner's described practice: risk analysis or sharpening, ground, TDD, review per slice, audit per block, commit, and a three-line summary plus checklist roadmap at the start of a session without reciting the rules; `/ad-handoff` for a chip or fresh-session prompt at the end. The `ad-hooks` tier documents both members and resolves script paths from the skill's installed directory; six skills gained the base-path sentence on both hosts. This repository's `.claude/settings.json` wires the hook against the in-tree script. Live verification did not need a fresh session: Claude Code 2.1.257 applied the edited project `.claude/settings.json` within the running session, and the next prompt (14:07:50Z, 63 seconds after the edit) arrived with the checkpoint injected as `UserPromptSubmit` context. The transcript records eight such injections through 14:24Z, across a host restart; the extract is kept at `.agentic/reviews/evidence/task-0066-live-injection.jsonl` and cited as C5 in the ground record. The red run is kept at `.agentic/reviews/evidence/task-0066-red-run.log` (C6).

Fresh-context review (two axes) found one Standards blocker, now fixed: the base-path sentence in the Codex `ad-guidelines` body had landed after the colon that introduces the detection list; it now closes the preceding sentence. The acceptance criterion text was synced to the shipped size and command list, and the CHANGELOG names `/ad-handoff` instead of a bare "handoff". The audit fan-out was interrupted by a host restart and re-dispatched on the corrected tree. `/ad-audit` (six groups plus two cross-model runs on the critical claims group; trail at `.agentic/reviews/2026-09-09T14-18-34Z-audit-*.md`): the three claims runs converged on one blocker, the live-verification claim without a retained artifact, closed by extracting the transcript records (C5) and the red run (C6) into `.agentic/reviews/evidence/`. Also applied: the contract test asserts all nine commands plus the summary and roadmap lines; GUIDELINES §11 now lists `doc/research/` among the dated-artifact exemptions. Rejected with evidence: the silent `readStdin` catch is the host's never-crash hook contract and the established `handoff-nudge.mjs` idiom; the branch-name prefix is inherited from the workspace tool, not this change.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
