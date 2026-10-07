# GROUND-0034: Remind the model to offer the resume chip when a handoff file is written

**Status:** recorded
**Decision:** A zero-dependency Node script in the `ad-hooks` session tier, wired as a `PostToolUse` hook on file writes on both hosts, recovers the written path with the artifact gate's own `recoverPaths`, and, when the path is a Markdown file under an `agentic-handoffs` directory, prints `hookSpecificOutput.additionalContext` on exit 0 telling the model to offer the resume chip where the host has one and the path plus a fresh-session prompt where it does not.
**Decision ref:** doc/adr/0087-remind-the-resume-chip-on-handoff-writes.md
**Confidence:** Strong

## Decision and confidence

The measured failure is a handoff written without `/ad-handoff`, so the reminder must key on the effect, a handoff file being written, not on the skill being invoked. Both hosts expose a `PostToolUse` event after a file write, and both document the same JSON field, `hookSpecificOutput.additionalContext`, as text placed in the model's context on exit 0, while plain stdout is ignored for that event. One byte-identical script therefore serves both hosts, which is the ADR-0083 shape for a session-tier member. The kit already recovers written paths from both hosts' tool input in `artifact-gate.mjs`, so the new script reuses that function instead of a second parser. Axis-2: Strong; the change is opt-in, reversible by removing one settings block, and every load-bearing claim rests on primary documentation plus a validated reference or an in-repo precedent.

## Evidence

### E1 — Handoffs written outside the skill are the only observed chip miss

**Strength:** High
**Provenance:** C1

On the owner's transcripts, six of six desktop sessions that invoked `/ad-handoff` offered the chip; the one desktop handoff without a chip was written directly to the handoff directory without the skill while the chip tool was available (C1). A trigger on the skill cannot reach that case; a trigger on the write can.

### E2 — Both hosts deliver `hookSpecificOutput.additionalContext` from a `PostToolUse` hook to the model on exit 0

**Strength:** High
**Provenance:** A1, A2, B1

Claude Code documents the JSON shape with `hookEventName: "PostToolUse"` and `additionalContext` placed next to the tool result, and states that plain stdout reaches the model only for a few other events (A1). Codex documents the same shape as extra developer context and says plain text is ignored for `PostToolUse`; its file edits arrive as `tool_name: "apply_patch"`, matchable as `Edit` or `Write` (A2). An independent diagnostic harness exercises exactly this output on both hosts and checks that the model reports the injected marker (B1).

### E3 — The kit already recovers written paths from both hosts and already ships static, exit-0 session hooks

**Strength:** High
**Provenance:** C2, C3, C4, D1

`recoverPaths` in `artifact-gate.mjs` returns absolute paths from Claude Code `tool_input.file_path` and from Codex `apply_patch` headers (C2). `workflow-checkpoint.mjs` is the precedent for a static, exit-0, kill-switch hook that silences on malformed input (C3). The handoff directory is `${TMPDIR:-/tmp}/agentic-handoffs/<ISO>-<slug>.md` (C4). The chip instruction entered `/ad-handoff` in 0bd4eae and no hook has ever carried it (D1).

## Source register

- **A1:** Claude Code hooks reference, PostToolUse decision control and exit-code table, https://code.claude.com/docs/en/hooks (accessed 2026-10-06 via WebFetch)
- **A2:** Codex hooks documentation, PostToolUse output and apply_patch matchers, https://learn.chatgpt.com/docs/hooks (accessed 2026-10-06 via WebFetch)
- **B1:** griddynamics/rosetta `docs/hooks/claude-logs.txt` and `docs/hooks/codex-logs.txt` at 5441232a454cc252f382b9cbec3a4277e5fc98bb, a hook tester emitting `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"Diagnostic secret ..."}}` and asking the model to report it, https://github.com/griddynamics/rosetta/tree/5441232a454cc252f382b9cbec3a4277e5fc98bb/docs/hooks (accessed 2026-10-06 via gh api)
- **C1:** `doc/research/0033-host-native-enforcement-layer.md`, E1, the chip-adherence measurement over the owner's transcripts (accessed 2026-10-06 via Read)
- **C2:** `src/skills/claude-code/ad-hooks/scripts/artifact-gate.mjs:77-94`, `recoverPaths` for both hosts' tool input (accessed 2026-10-06 via Read)
- **C3:** `src/skills/claude-code/ad-hooks/scripts/workflow-checkpoint.mjs:40-86`, kill switch, object-only stdin, exit 0 always (accessed 2026-10-06 via Read)
- **C4:** `src/skills/claude-code/ad-handoff/SKILL.md:85-86,154`, the handoff directory and file name (accessed 2026-10-06 via grep)
- **D1:** `git log --oneline -S'spawn_task' -- src/skills` returns only 0bd4eae, the commit that added the chip paragraph to `/ad-handoff`; no hook script mentions it (accessed 2026-10-06 via Bash)

## Limitations and reversal

The chip measurement is small (seven desktop handoffs on one machine, no Codex sessions). Whether the model acts on the reminder is not established by these sources; the task's live check on Claude Code is the first observation. A host that stops honouring `additionalContext` on `PostToolUse`, or a measured rise in false reminders, would reverse the decision.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs <this-path>`, then reopen every source in the register. Structural validity proves the map, not the source content.
