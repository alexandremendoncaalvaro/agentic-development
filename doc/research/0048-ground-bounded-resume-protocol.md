# GROUND-0048: Resume from the handoff alone, delegate reconciliation, and size handoffs against working space

**Status:** recorded
**Decision:** The `ad-handoff` resume protocol reads only the handoff in full, runs a fixed set of bounded probes inline, delegates every other reconciliation to one subagent that returns a short digest, and keeps the resume turn within a stated budget. The handoff threshold and the `agentic-session` band measure against working space (auto-compact point minus the fixed floor), not total tokens.
**Decision ref:** doc/tasks/0127-bounded-resume-protocol.md
**Stakes:** medium × reversible
**Confidence:** Strong

## Decision and confidence

RESEARCH-0047 measured a resume turn that grew 29k tokens past the handoff read because the template calls every referenced artifact a "reading obligation" and asks for inline reconciliation of the live branch, working tree, diff and verification (C1, C2). Anthropic's documentation and engineering posts converge on the opposite pattern: lightweight identifiers loaded just in time, high-volume reads isolated in subagents that return only a summary, and fresh sessions resumed from a progress file plus the git log (A1, B1, B2). The happy path is therefore to keep references as pointers, bound every inline output, and delegate the rest. No deviation is needed.

## Evidence

### E1 — The template makes every reference a mandatory inline read

**Tier:** Primary
**Strength:** High
**Upgrade:** the claim is the file text itself, read directly and pinned to its introducing commit
**Provenance:** C1, D1

`references/handoff-template.md` (both hosts), `## Resume protocol` step 2: "every task, spec, ADR, research record, or other artifact referenced by this handoff. References are reading obligations, not decoration." Step 4 reconciles "the live branch, working tree, diff, and recent verification" with no output bound and no delegation.

### E2 — Just-in-time identifiers plus subagent isolation is the documented pattern

**Tier:** Primary
**Strength:** High
**Upgrade:** primary docs and two Anthropic engineering references converge, and RESEARCH-0047 E1 measures the failure they predict
**Provenance:** A1, B1, B2

See RESEARCH-0047 E2 and E3. The subagent's summary is the only part that enters the main window; the main agent keeps paths and loads them when a step needs them.

### E3 — The band can measure working space from data it already receives

**Tier:** Primary
**Strength:** High
**Upgrade:** the shape is read from the generated host types and register.mjs already calls the API it describes
**Provenance:** A2, C3

`register.mjs` already calls `$.session.usage({ breakdown: 'summary' })`. The plugin types (`SessionContextBreakdown`) give `categories[]` of `{ name, tokens, kind }` with `kind` one of `used`, `free`, `buffer`, `deferred`, in both `summary` and `full` detail, plus `autoCompactThreshold` and `isAutoCompactEnabled`. The `Messages` row is reconciled to API usage. Working space is the threshold minus the used rows other than `Messages`; the conversation's share of it is `Messages / working space`. When no `Messages` row is present the band keeps its current total-tokens basis.

### E4 — A total-token handoff threshold is incoherent with a large floor

**Tier:** Measurement
**Strength:** High
**Provenance:** C2

With a 104k floor and a 168k auto-compact point, a 120k total threshold leaves 16k of working space, less than one unbounded resume turn (RESEARCH-0047 E1).

## Source register

- **A1:** code.claude.com/docs/en/sub-agents, /context-window, /env-vars (accessed 2026-11-17 via WebFetch)
- **A2:** plugin-authoring types claude-code.d.ts of Claude Code 2.1.321, SessionContextBreakdown and ContextCategory (accessed 2026-11-17 via local read)
- **B1:** anthropic.com/engineering/effective-context-engineering-for-ai-agents (accessed 2026-11-17 via WebFetch)
- **B2:** anthropic.com/engineering/effective-harnesses-for-long-running-agents (accessed 2026-11-17 via WebFetch)
- **C1:** src/skills/{claude-code,codex}/ad-handoff/references/handoff-template.md (accessed 2026-11-17 via local read)
- **C2:** doc/research/0047-lean-resume-context-budget.md (accessed 2026-11-17 via local read)
- **C3:** plugins/agentic-session/hooks/band.mjs and register.mjs (accessed 2026-11-17 via local read)
- **D1:** commit cce7ed9 (2026-08-19) "feat(ad-handoff): add concise resume brief" introduced the reading-obligations step (accessed 2026-11-17 via git log -S)

## Limitations and reversal

The resume budget is an instruction, not a hard host limit; the host gives no per-turn cap. If a re-measured resume still exceeds the budget, add a deterministic gate (a hook that refuses unbounded commands during the resume turn). The `Messages` category name is the one name the types spell out; if a host renames it, the band falls back to the old basis rather than mis-reporting.

## Audit path

Re-run `eval/resume-cost.mjs` on a transcript that resumes from a handoff written by the new template, and compare the resume-turn growth with RESEARCH-0047 E1.
