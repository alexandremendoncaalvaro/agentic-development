# ADR-0014: Skills prefer structured-prompt tools (`AskUserQuestion`, Plan Mode) when the host supports them

**Status:** accepted
**Date:** 2026-05-09
**Deciders:** Alexandre Alvaro

## Context

Skill-driven flows currently surface confirmations and multi-choice questions as plain text in the agent's response. The Phase 2 holistic coherence review surfaced this as user-visible friction:

> Sinto falta do claude e o codex abrindo aquelas caixinhas pra sugerir algo ou confirmar algo, ao invés de mostrar no texto cru da resposta.

`@clack/prompts` already powers the kit's CLI commands (`init`, `update`, `profile`) — those run in the user's terminal and render structured panels (`p.intro`, `p.note`, `p.confirm`, `p.select`, `p.multiselect`). Skills, however, run inside the agent's host (Claude Code, Codex). Their output is whatever the agent renders. To get structured UI inside skill output, the skill must instruct the agent to invoke a host-native structured-prompt tool.

The host capabilities differ:

- **Claude Code** ships `AskUserQuestion` (multi-choice card with options + escape), Plan Mode (`ExitPlanMode` for plan-approval cards), and Slash Commands (separate primitive from Skills). Skills auto-invoke from description triggers; once running, the agent has access to whatever tools are listed in the session.
- **Codex** has no equivalent of `AskUserQuestion` or Plan Mode. The Codex variant of every skill already documents this asymmetry and falls back to numbered text options.

WORKFLOW.md §3 frames the principle: *"Format helps, but does not save bad thinking. Markdown, XML, YAML, and JSON only reduce ambiguity. They don't replace clarity."* Cards are format reducing ambiguity at confirmation gates; the cost is paid where they matter (multi-choice, conflict resolution, plan approval) and avoided where they don't (one-line acknowledgements).

The kit's existing skills carry interview steps and confirmation gates that benefit from structured prompts:

- **Interview-heavy skills** — `agentic-spec` (User Scenarios + Requirements + Success Criteria + Edge Cases), `agentic-task` (Acceptance Criteria + Plan + Spec ref), `agentic-adr` (Context + Decision + Consequences + Alternatives).
- **Confirmation-heavy skills** — `agentic-review` (scope confirmation: branch vs PR vs commit vs working tree), `agentic-ground` (confidence checkpoint: A/B/C/D consulted? happy path declared? deviations justified?).
- **Heavy-output skills** — `agentic-bootstrap`, `agentic-architecture` write large artifacts; Plan Mode would let the user review before write.

The skill mechanism does not let the kit force the agent to use `AskUserQuestion` — only the host decides which tools are available, and the agent decides which tool to call. The skill body can prescribe: "When the host exposes `AskUserQuestion`, use it for multi-choice prompts."

## Decision

We will instruct skills to prefer structured-prompt tools when the host supports them, falling back to numbered text options otherwise. The instruction is documentation in skill bodies; no kit infrastructure changes. Codex variants retain their existing numbered-text posture.

1. **Update interview-heavy skills first.** `agentic-spec`, `agentic-task`, and `agentic-adr` carry numbered interview steps that are the highest-value targets for `AskUserQuestion`. Each Claude Code variant gains a one-line instruction: *"When the host exposes `AskUserQuestion`, use it for multi-choice prompts (e.g., 'Status: draft / accepted / shipped / superseded') and for confirmation gates with non-trivial branching."*

2. **Update confirmation-heavy skills.** `agentic-review`'s scope-confirmation step and `agentic-ground`'s confidence checkpoint already render as multi-step text questions; they are direct fits for `AskUserQuestion`. Same one-line instruction added to the Claude Code variants.

3. **Heavy-output generators (Plan Mode) opt-in.** `agentic-bootstrap` and `agentic-architecture` produce large artifacts that the user typically wants to review before write. The Claude Code variants gain an optional Plan Mode reference: *"For large outputs (full AGENTS.md / ARCHITECTURE.md generation), the agent may use Plan Mode to render the proposed file for user approval before writing. Skip Plan Mode for small or interactive write paths."* Plan Mode is opt-in per skill, not universal — small edits don't benefit from it.

4. **Codex variants are not changed.** Codex has no equivalent of `AskUserQuestion` or Plan Mode. The asymmetry is documented in every skill's body since ADR-0007 / ADR-0010 / ADR-0011 — no new doc needed. Codex users keep numbered text questions.

5. **The instruction is a soft preference, not a hard contract.** The skill body says "use it when available"; the agent decides at runtime based on the tools the session exposes. This matches the kit's overall posture (default-skip on conflicts, soft confidence gates) — surface the better option without enforcing it.

6. **No new tool listing in skill frontmatter `allowed-tools`.** `AskUserQuestion` is host-provided; skills don't declare it explicitly — the agent picks it up from its session toolkit. The frontmatter `allowed-tools` continues to list only filesystem / shell / web tools the skill needs.

## Consequences

Positive:

- Confirmation gates and multi-choice interview steps surface as structured cards in Claude Code instead of crude text. The user reads "Status: draft / accepted / shipped / superseded" as a selectable list, not as an inline sentence.
- The instruction is monotone-additive — agents that don't expose `AskUserQuestion` (Codex, future hosts that lack the primitive) gracefully degrade to numbered text. No skill becomes broken on hosts without the tool.
- Plan Mode for `agentic-bootstrap` and `agentic-architecture` gives users a "review before write" gate on the kit's largest outputs, matching how Claude Code already prompts plan approval before destructive operations elsewhere.
- The change is documentation-only — no kit infrastructure changes, no schema changes, no version bump beyond the standard minor for skill-body updates. Risk is correspondingly low.

Negative / trade-offs:

- **Soft preference is best-effort.** An agent may still inline a question as text instead of invoking `AskUserQuestion` even when the tool is available; the skill body's instruction is advisory. Mitigation: word the instruction prescriptively ("use it when available") rather than permissively ("you may use it").
- **The change is invisible on Codex.** Users running Codex see no UX difference. Mitigation: this matches the existing asymmetry posture (ADR-0007 / ADR-0010 / ADR-0011); the asymmetry is documented per skill.
- **Future host changes.** If Claude Code renames or removes `AskUserQuestion`, every skill body that names the tool needs to be updated. Mitigation: the instruction is one line per skill; future migrations are mechanical.
- **The kit cannot validate runtime adoption.** No way to assert "the agent invoked `AskUserQuestion` for this gate" — skill body instructions are unenforceable. Mitigation: the `agentic-review` flow (the kit's own §10 mechanism) can audit skill outputs after the fact and flag inline-text questions where structured prompts would have helped; that audit lives outside this ADR.

## Alternatives Considered

- **Build a kit-side runtime that intercepts skill output and renders cards.** Rejected. Would require a host-specific shim that sits between the agent and the user; brittle, hard to install, and conflicts with the two-phase architecture (ADR-0002 — kit does filesystem only, agent does content). The skill body is the right surface.
- **Force `AskUserQuestion` use via skill frontmatter.** Rejected. `AskUserQuestion` is host-provided; the kit can't list it in `allowed-tools` without coupling skill source to a Claude Code-specific tool name that breaks Codex parity at the source level. Per-host variants already handle the asymmetry; the prescriptive instruction in the body is sufficient.
- **Slash Commands (`.claude/commands/`) instead of Skills for the interactive flows.** Rejected. Slash Commands are a separate Claude Code primitive that doesn't exist in Codex; adopting them as the canonical interactive surface would either break Codex parity or ship double-implementations. The Skill mechanism with `AskUserQuestion` opt-in delivers the same UX uplift without the duplication.
- **Defer the change.** Rejected. The user articulated the friction directly; the lift is small (per-skill body edit); the principle (§3 format reduces ambiguity) is already in WORKFLOW.md. No reason to wait.
