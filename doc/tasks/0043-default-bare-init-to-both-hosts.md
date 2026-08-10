# Task `0043`: Default bare init to both hosts

**Status:** done
**Created:** 2026-08-10
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

A bare non-interactive `agentic init` can silently install only Claude Code skills when the target is empty or already has `.claude/`. This leaves a Codex user without the kit even though its Codex source tree and documented `.agents/skills` destination are present. The task realizes [ADR-0062](../adr/0062-default-bare-init-to-both-hosts.md) by making the omitted agent choice unambiguously dual-host while preserving explicit single-host installs.

## Acceptance Criteria

- [x] A bare non-interactive `init` in an empty target installs `ad-bootstrap` for both `.claude/skills/` and `.agents/skills/`.
- [x] A bare non-interactive `init` in a `.claude/`-only target also installs the Codex skill tree.
- [x] Explicit `--agent claude-code`, `--agent codex`, and `--agent both` retain their existing target layouts.
- [x] The full test suite passes and a fresh-context review finds no unresolved issue in the change.

## Plan

- [x] Add failing integration regressions in `test/init.test.js` for empty and `.claude/`-only targets.
- [x] Update the non-interactive agent-resolution path in `src/commands/init.js` to implement ADR-0062.
- [x] Verify the explicit agent flags and the installed Codex path through the existing integration coverage.
- [x] Run the local gate and a fresh-context review before the change is committed.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-10

ADR-0062 was accepted to correct the non-interactive default and update local repositories that already use an agent surface.

The regression tests failed before the code change because the Codex `SKILL.md` was absent. The minimal resolver change made them pass; the full suite passed 531 tests. A fresh-context reviewer found no Standards or Spec issue in the working-tree diff.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
