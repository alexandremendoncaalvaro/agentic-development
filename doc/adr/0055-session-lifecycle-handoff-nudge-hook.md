# ADR-0055: `ad-hooks` gains a session-lifecycle tier — a `Stop` hook that nudges `/ad-handoff` when context runs low

**Status:** accepted
**Date:** 2026-08-07
**Deciders:** Alexandre Alvaro

## Context

A long agent session degrades as the context window fills: Claude Code auto-compacts near the window limit, and compaction is lossy. `ad-handoff` already exists to compress a session into a durable, resumable packet (and, on chip-capable hosts, offer a one-click resume chip — ADR-0039), but it is user-initiated. The gap: nothing prompts the user to run it *before* context is compacted or lost. Relying on the agent's own awareness that context is running low is unreliable — the agent cannot measure its own remaining window.

The kit already ships deterministic *git* hooks via `ad-hooks` (pre-commit, pre-push, and the opt-in review gate — ADR-0047). It does not yet touch the agent's own *session-lifecycle* hooks (`.claude/settings.json` `Stop` / `PreToolUse` / … — the current `ad-hooks` output contract explicitly defers that surface). A handoff nudge is exactly that surface.

**Verified runtime finding (the load-bearing detail).** Two Claude Code session events are candidates. `PreCompact` fires just before compaction — but per the official hooks contract it can only *allow or block* compaction; it cannot inject a message or context. `Stop` fires when Claude finishes a turn and *can* influence the next turn. So the nudge has to hang off `Stop`, not `PreCompact`.

Within `Stop`, the exact output mechanism matters, because the wrong one loops or disrupts. The verified contract (source: https://code.claude.com/docs/en/hooks.md, fetched 2026-08-07):

- A `Stop` hook receives JSON on stdin: `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `stop_hook_active`, `last_assistant_message`, and more.
- `decision: "block"` + `reason`, and `hookSpecificOutput.additionalContext`, both **continue the conversation** (Claude keeps going) — so both are loop-prone and disruptive; they require the `stop_hook_active` re-entrancy guard and fight a user who is trying to stop.
- `systemMessage` is a universal output field, "warning message shown to the user." A `Stop` hook that returns `{"systemMessage": "…"}` on **exit 0 with no `decision` field lets the session stop normally** — it does not continue the turn. This is the only mechanism that surfaces a message without continuing, so it is inherently non-looping.
- `stop_hook_active` is the re-entrancy flag; a hook that forces continuation must honor it to avoid an infinite loop.

Because `systemMessage` cannot loop by construction, and because the handoff decision belongs to the user (who then runs `/ad-handoff`, which owns the chip offer per ADR-0039), `systemMessage` is the right surface: the hook nudges the human, the human invokes the skill.

**Scope.** This is a Claude Code session hook. Codex exposes compact-related hooks, but context-injection parity for a one-time non-looping nudge is undocumented; inventing Codex behavior would violate the "ground, don't guess" rule. Codex is therefore out of scope / deferred here — the same posture ADR-0039's chip took (Claude-Code-only). The hook *script* still ships in both host trees to satisfy the kit's byte-parity discipline for skill scripts (task-0031); only the *wiring* is CC-scoped.

## Decision

We will add a **session-lifecycle-hooks tier** to `ad-hooks` (both host SKILL.md files describe the tier; the Codex body states it is Claude-Code-scoped), whose first member is a **handoff-nudge `Stop` hook**:

- **Mechanism: a `Stop` hook** that, on each turn end, reads the event JSON from stdin and emits `{"systemMessage": …}` on exit 0 — **never** `decision`/`additionalContext` — so the session stops normally and the nudge cannot loop.
- **Size-gated.** It estimates context fullness from the transcript file's byte size (`statSync` on `transcript_path`) and stays silent below a threshold. Byte size is a deliberate heuristic proxy, not a token count: the transcript JSON-Lines schema is undocumented and app-versioned, so on-disk size is the robust, cross-platform, schema-proof signal (the same posture `resolve-rules.mjs` takes toward the filesystem).
- **Once-per-session.** A flag file in the OS temp dir, keyed on `session_id`, guarantees at most one nudge per session — so it never nags every turn. A defensive `stop_hook_active` early-exit is also honored.
- **Default threshold = 750000 bytes (~0.72 MB), env-overridable** via `AD_HANDOFF_NUDGE_THRESHOLD_BYTES`. Chosen by measurement, not guess: across 2129 real transcripts on the author's machine the median session is ~0.19 MB, p90 ~0.55 MB, and p95 ~0.88 MB, so the default sits at ≈p93 — silent on routine sessions, firing only on the long tail a handoff actually helps. It also approximates a full ~200K-token window of JSON-Lines, so it tends to fire as a session nears its first compaction. `AD_HANDOFF_NUDGE_STATE_DIR` overrides the flag directory (used by the contract tests).
- **Delivery: a shipped skill script** — `scripts/handoff-nudge.mjs` beside each host's `ad-hooks/SKILL.md`, Node-only and zero-dependency (ADR-0047 addendum / task-0031 precedent), byte-identical across hosts, installed by the existing whole-tree walk so `agentic update` distributes it. The SKILL.md tier documents the `.claude/settings.json` `hooks` block that wires it.
- **Dogfood.** This repo wires the hook in `.claude/settings.json` pointing at the in-tree script, so the behavior is live for the owner here.

## Consequences

Positive:

- The user gets a timely, one-time, non-disruptive prompt to preserve a long session before it is compacted — closing the "handoff exists but nothing prompts it" gap.
- Non-looping by construction (`systemMessage`, no `decision`), so it cannot trap the session or nag every turn; the size gate + once-per-session flag make it quiet on routine work.
- `ad-hooks` now owns both hook surfaces it should — deterministic git hooks and agent session-lifecycle hooks — under one discoverable skill, rather than a new skill name.
- Zero-dependency Node script, byte-parity-tested across hosts and contract-tested by mock-stdin invocation, so it fits the kit's existing quality gates without new machinery.

Negative / trade-offs:

- Transcript byte size is a cumulative heuristic (it does not reset on compaction) and only approximates token fullness. Mitigated: the once-per-session guard means an imperfect threshold only shifts the single nudge slightly earlier/later, never makes it spammy; and the threshold is env-tunable against measured sessions.
- The kit references a Claude-Code-specific settings surface (`.claude/settings.json` `Stop`). Contained to one SKILL.md tier; the script itself is host-agnostic.
- The script ships into the Codex tree (byte-parity discipline) though Codex does not wire it — dead weight there until/unless Codex context-injection parity is documented. Accepted as the cost of the single-source byte-parity rule.

Revisit trigger: Claude Code documents a `Stop`/compaction mechanism better suited to a one-time nudge, or Codex documents context-injection parity for compact hooks (then extend the tier to Codex).

## Alternatives Considered

- **`PreCompact` hook with a message** — rejected. The verified contract says `PreCompact` can only allow or block compaction; it cannot inject a message. A block-with-message would also be disruptive (it fights the compaction the user/host wants). It cannot deliver the nudge at all.
- **Two-hook combo (`PreCompact` to block + `Stop` to message)** — rejected. Dominated by the single `Stop` hook: it adds a blocking, disruptive component for no capability the `Stop` `systemMessage` path lacks.
- **`Stop` hook using `decision: "block"` + `reason` or `hookSpecificOutput.additionalContext`** — rejected. Both continue the conversation (loop-prone, need the re-entrancy guard, and hijack a user trying to stop). `systemMessage` surfaces the nudge without continuing the turn — the non-looping choice — and the handoff decision rightly stays with the user.
- **A proactive AGENTS.md instruction ("run /ad-handoff when context is low")** — rejected. Relies on the agent's unreliable self-awareness of remaining context; a deterministic size-gated hook is the "deterministic value in a non-deterministic flow" the kit prefers (ADR-0047).
- **Parse the transcript for an exact token count** — rejected (for now). The JSON-Lines schema is undocumented and app-versioned; parsing it is fragile. On-disk byte size is a robust proxy, and the once-per-session guard tolerates its imprecision.
- **A separate new skill** — rejected. The nudge is a hooks concern; `ad-hooks` already owns hook scaffolding, and a new tier is a smaller, more discoverable change than a new skill (ADR-0034 fold-vs-new principle).
- **Do nothing** — rejected. It leaves the handoff friction the kit built `ad-handoff` to reduce, and wastes a real host affordance on the host where the kit dogfoods itself.
