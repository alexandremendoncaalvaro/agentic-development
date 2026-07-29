# ADR-0039: `ad-handoff` offers a background-task chip on chip-capable hosts

**Status:** accepted
**Date:** 2026-07-28
**Deciders:** Alexandre Alvaro

## Context

`ad-handoff` compacts a session into a markdown file in the OS temp dir and ends by printing the path for the user to paste into the next session. That manual step — copy the path, open a fresh session, paste — is the resume friction the skill cannot remove with a file alone.

Some Claude Code surfaces expose a **background-task chip** primitive: a tool the agent calls with a title and a self-contained prompt, which the host renders as a clickable chip; one click spawns a fresh session seeded with that prompt (the Claude Code desktop app exposes this as `spawn_task` today). A handoff is the natural payload for such a chip — the chip's contract demands a stand-alone prompt, and a stand-alone context packet is exactly what `ad-handoff` produces.

The primitive is host-specific and undocumented: no public API reference, no surface enumeration in the official docs, and no way for a skill to detect its surface by name (host environment variables are visible to subprocesses, not to the agent's own context). The kit already has a settled convention for exactly this situation — host-aware structured prompts ([WORKFLOW.md](../../WORKFLOW.md) §3): skills reference `AskUserQuestion` by capability ("when the host exposes...") and fall back gracefully on hosts without it.

## Decision

`ad-handoff` (Claude Code host file) gains a **capability-gated chip offer** in its hand-off step:

- **Gate by capability, not host name.** The trigger is "the host exposes a background-task chip primitive" — detected by the tool's presence in the agent's toolset — with `spawn_task` on the Claude Code desktop app named as the current example, not as a contract. No surface-name detection is attempted.
- **The chip complements the file; it never replaces it.** The handoff file remains the durable, portable artifact. The chip is a one-click resume affordance for hosts that render it.
- **The chip's prompt is a stand-alone packet:** the absolute handoff path with the instruction to read it first, the single recommended first action, and the instruction to ground in the repo's binding docs before acting.
- **Graceful degradation.** On hosts without the primitive (terminal CLI, IDE extensions, Codex), the behavior is unchanged: the printed path is the handoff. The Codex host file is untouched — it has no such primitive, and its existing flow already covers the hand-off.

## Consequences

Positive:

- One-click resume on chip-capable hosts; the copy-path-and-paste friction disappears where the host can remove it.
- Consistent with the kit's host-aware-primitive convention — same shape as the `AskUserQuestion` references, so readers meet a familiar pattern.
- Capability-framing insulates the kit from the primitive's instability: if the tool is renamed, the example ages but the instruction ("offer a chip when the host exposes one") stays correct.

Negative / trade-offs:

- The kit now references an undocumented, app-specific affordance (as an example). If the desktop app removes the primitive, the paragraph becomes dead weight until pruned — contained to one skill section.
- Capability detection by toolset presence is heuristic; a host could expose a similarly-shaped tool with different semantics. The instruction describes the expected semantics (chip → one click → fresh session) so the agent can recognize a mismatch.

Revisit trigger: the chip primitive becomes a documented public API (tighten the reference), or is removed from the desktop app (prune the section).

## Alternatives Considered

- **Name the exact tool as the contract** (`spawn_task`, namespaced) — rejected. Binds a public generic kit to an undocumented, app-specific namespace that can change without notice; capability-framing with the tool as an example gets the same actionability without the coupling.
- **Detect the host by name ("on Claude Desktop, do X")** — rejected. Skills cannot detect their surface by name (host env vars are subprocess-visible only, per the official env-vars reference); the kit's own `AskUserQuestion` convention already solved this with capability-gating.
- **Mirror the section into the Codex host file** — rejected. Codex has no chip primitive; a "you don't have this" paragraph is dead weight (the same reason Codex skills omit `AskUserQuestion` sections except where the flow needs an explicit textual alternative).
- **A separate skill for chip-based resume** — rejected. The chip is an increment to the hand-off responsibility `ad-handoff` already owns, not a distinct operation ([ADR-0034](0034-audit-tier-skills-over-fold.md) fold-vs-new principle).
- **Do nothing** — rejected. It leaves a real host affordance unused on the host where the kit's own dogfood development happens.
