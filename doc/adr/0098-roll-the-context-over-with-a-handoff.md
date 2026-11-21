# ADR-0098: Roll the context over with a handoff instead of a compaction

**Status:** accepted
**Date:** 2026-11-21
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0088 — item 4's "changes no prompt" and the 2026-10-13 addendum's "off by default" clear: the plugin gains an automatic rollover, on by default, that submits its own prompts, adds a note to a running turn and adds one system-prompt section; every other item binds unchanged.
**Related:** ADR-0055 (the Stop handoff nudge stays the portable fallback), ADR-0085 (skills gate their own effects)

## Context

When a session nears its limit the host compacts it: a summary replaces the conversation, and what a long task needs (the request in the owner's words, what is done, what was approved, what is running) survives only by luck. The kit's answer has been the session handoff, a curated file a fresh context reads. Until now it needed a person: the band's button, and an opt-in box to clear afterwards (ADR-0088 addenda, task 0115). That does nothing in a headless run, and its file lookup assumes POSIX paths.

On 2026-11-21 the owner asked that the handoff, the clear and the resume happen by themselves where the automatic compaction happens today, in the same session, headless too. GROUND-0047 records the published practice that points the same way and eleven measurements on Claude Code 2.1.327 that fix the shape.

## Decision

The `agentic-session` plugin runs an **automatic context rollover**, a handoff in place of a compaction.

1. **On by default, one switch.** The plugin option `autoHandoff` (default true) or the environment variable `AGENTIC_AUTO_HANDOFF` (`off`, `false`, `no` or `0`) turns it off; `autoHandoffAt` or `AGENTIC_AUTO_HANDOFF=<1-99>` moves the start point, 80 percent of the way to the auto-compact point by default. The environment wins, because a headless run has no settings screen.
2. **Three tiers.** From the start point: write the handoff at the next good moment, or answer "handoff deferred" with a reason. From half of the way left: in this turn. From three quarters: now. Each tier asks once.
3. **Asked at a turn's end and inside a long turn.** At a turn's end the plugin submits the request as a prompt. During a turn it adds the same request beside the tool results, because a long turn, and a headless run is often one turn, reaches the compaction before any turn end (GROUND-0047 E5).
4. **A named file under the home directory.** The request names the exact path, `<home>/.agentic/handoffs/<UTC stamp>-auto-<session>.md`: no POSIX `/tmp`, no search for a file, the same on every system. A home path with a quote, a control or an invisible format character is refused.
5. **Clear only on a whole handoff.** Whole means the end marker `<!-- ad-handoff:end -->` as the last line, the required headings and a minimum length. When the write tool is refused, a whole handoff given as the answer is written by the plugin. Anything less clears nothing and the session goes on.
6. **Clear and resume inside the turn-end hook.** The plugin runs `/clear` and submits the resume prompt before the hook returns, so the cycle also completes in `claude -p`, where the process exits after the last turn (E4).
7. **The system prompt vouches for the request.** While the cycle is on, the plugin adds one section saying the owner turned the rollover on, that a message with the `[ad-handoff auto]` label is genuine, and that it only ever asks for one handoff file under that directory. Without it a careful model refuses the mid-turn request as an injection (E7); with it a tool result that imitates the label cannot ask for anything else.
8. **Compaction is the safety net.** The cycle does not turn compaction off. A compaction that happens all the same is given instructions on what to keep, and a main-loop compaction drops the pending handoff, so a file written for the context that is gone never clears the one that replaced it.
9. **No loop.** A session that is already past the start point on its first reading after a resume rests for ten minutes instead of handing off again; one resumed below it is asked again when it gets there.
10. **`ad-handoff` documents the mode.** `/ad-handoff --auto [path]` on both hosts: no question, no deletion, the compact template, the end marker, a one-line answer. The skill itself still never runs `/clear`; the plugin does, after the whole file exists. Where no plugin exists (Codex, Claude Code without it) the mode writes the same file and the owner or an orchestrator starts the fresh session.

Nothing blocks: the plugin still intercepts no tool call and rewrites no prompt the person typed.

## Consequences

Positive:

- A long session, interactive or headless, continues from a curated file instead of a summary, with no keypress.
- Windows works: the path no longer depends on a POSIX temp directory.
- The headless net is real: one measured run rolled over three times with no compaction (E8).

Negative / trade-offs:

- The plugin now speaks to the model on the owner's behalf and adds to the system prompt. Accepted: the label is bounded to one action, the switch is the owner's, and the section is added only while the cycle is on.
- Each rollover costs a handoff turn and a fresh read of the instructions. Accepted: cheaper than work lost to a summary, and the rest rule stops it from repeating with no work in between.
- A stream of a headless run carries one result per turn, the `handoff written` turns included. A caller must read the last result.
- The model may still refuse or defer; then the compaction happens as before. The cycle fails safe, not closed.
- The plugin interface is early access (ADR-0088); a host release can break the cycle until the plugin is updated.
- The manual button's file lookup stays POSIX-only (task 0115); the automatic cycle does not use it.

## Alternatives Considered

- **Settings hooks (`PreCompact`, `SessionStart` reinjection)** — the community shape (GROUND-0047 E2). Rejected as the main path: a settings hook cannot run `/clear` or submit a prompt, so it needs a person and does nothing headless. It remains what a host without the plugin can do.
- **Turn compaction off and rely on the cycle alone** — rejected: when the model refuses or the write fails, the session would hit the hard limit. Compaction stays as the net.
- **Ask only at a turn's end** — rejected by measurement: a long headless turn compacts three times and dies before any turn end (E5).
- **Keep it opt-in** — rejected by the owner, who wants it automatic with a way to turn it off.
- **Let the plugin write the handoff from a model call of its own** — rejected: the session's own model holds the context; a side call would summarize a transcript, which is the compaction again.
