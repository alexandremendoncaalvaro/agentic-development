# Task `0096`: Remind the resume chip on handoff writes

**Status:** done
**Created:** 2026-10-06
**Scope ref:** src/skills/claude-code/ad-hooks/SKILL.md (session-lifecycle tier); src/skills/claude-code/ad-handoff/SKILL.md (report); doc/adr/0087-remind-the-resume-chip-on-handoff-writes.md
**Evidence ref:** doc/research/0034-ground-handoff-chip-hook.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The owner asked for the resume chip to be the default at handoff on Claude
Code. `/ad-handoff` already asks for it, and RESEARCH-0033 measured that
the skill is followed whenever it runs; the only miss was a handoff written
without the skill. ADR-0087 (proposed) adds a third reminder to the
`ad-hooks` session tier that fires on the write itself, so the chip reaches
the model whether or not the skill ran.

## Acceptance Criteria

- [x] `scripts/handoff-chip.mjs` exists byte-identical under both `ad-hooks` trees, zero dependencies, and recovers the written path with the artifact gate's `recoverPaths`.
- [x] Given a `PostToolUse` event whose written path is a Markdown file under an `agentic-handoffs` directory, on either host's tool input, the script exits 0 and prints `hookSpecificOutput` with `hookEventName: "PostToolUse"` and an `additionalContext` that names the path, the chip, the fresh-session fallback, and `/ad-handoff`.
- [x] Any other path, an event without a path, and empty, malformed or non-object input exit 0 with no output.
- [x] `AD_HANDOFF_CHIP=0` silences every case.
- [x] `ad-hooks/SKILL.md` on both hosts documents the reminder as a tier member with its wiring, and `/ad-handoff` on Claude Code makes the chip a numbered report step (the Codex body names no chip, because Codex has no chip primitive).
- [x] This repository's `.claude/settings.json` and `.codex/hooks.json` wire it, and a wiring test locks both.
- [x] One handoff write on Claude Code with the hook wired shows the reminder reaching the model.
- [x] The dogfood installs are refreshed, `npm run verify` passes, and `CHANGELOG.md` records the change.

## Plan

- [x] Red: contract tests in `test/skill-scripts.test.js` beside the checkpoint tests; wiring test in `test/agent-hooks-wiring.test.js`.
- [x] Green: the script; both `ad-hooks` and `ad-handoff` bodies; dogfood wiring; refresh the install.
- [x] Live check on Claude Code; `CHANGELOG.md`; `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-06

Opened from RESEARCH-0033, step 1; the owner approved the backlog in chat.
Ground record GROUND-0034; decision ADR-0087, proposed until the owner
accepts it.

Red, then green: seven new tests (five contract, two wiring) failed before
the script and the wiring existed and pass after; `npm run verify` passed
with 1151 tests and no audit finding.

Live check on Claude Code 2.1.227: a `claude -p` session in this worktree,
with the hook wired, wrote a file under `$TMPDIR/agentic-handoffs/`; the
model quoted the reminder verbatim as "PostToolUse:Write hook additional
context". Stream kept private; SHA-256 prefix `62d0be499004471b`. The
test file was deleted afterwards.

Fresh-context review on both axes (persisted under
`.agentic/reviews/20261007T021556Z-working-tree-*`): no Blocker. Standards
Concern 1, a handoff written through `Bash` does not fire the hook:
checked against the measured miss, session `b4e59e4a`, which wrote its
handoff with `Write`, so the hook covers the observed case; the gap is now
a stated trade-off in ADR-0087. Standards Concern 2, a duplicate offer when
`/ad-handoff` writes the file: the reminder now asks for the chip once and
names the skill's report step as that offer. Spec Concern, two items of
RESEARCH-0033 step 1 are outside this slice: routing the nudge and the
checkpoint through `/ad-handoff` is already true of the checkpoint (item 7)
and ADR-0087 records why the `Stop` nudge stays as it is; the stale
"Codex has no AskUserQuestion primitive" lines in the Codex tree are a
separate correction, left for its own task. ADR-0087 stays proposed until
the owner accepts it.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
