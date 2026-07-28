# Task `0007`: `ad-handoff` background-task chip on chip-capable hosts

**Status:** in-progress
**Created:** 2026-07-28
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

[ADR-0039](../adr/0039-ad-handoff-background-task-chip.md) adds a capability-gated background-task chip offer to `ad-handoff`'s hand-off step: on hosts that expose a chip primitive (e.g. `spawn_task` in the Claude Code desktop app), the skill also offers the handoff as a one-click chip whose prompt is a stand-alone packet. The file remains the durable artifact; hosts without the primitive keep the current behavior. Follows the kit's host-aware-primitive convention ([WORKFLOW.md](../../WORKFLOW.md) §3, the `AskUserQuestion` pattern).

## Acceptance Criteria

- [x] `src/skills/claude-code/ad-handoff/SKILL.md` Step 5 offers the chip capability-gated ("when the host exposes a background-task chip primitive"), naming `spawn_task` / the Claude Code desktop app as the current example, not a contract.
- [x] The chip's prompt contract is specified: absolute handoff path + read-it-first instruction, the single recommended first action, and the instruction to ground in the repo's binding docs before acting; short imperative title.
- [x] The chip is framed as complementing the file (file = durable artifact; chip = one-click resume); hosts without the primitive are explicitly unchanged.
- [x] Output contract reflects the chip offer (Next section unchanged — kept minimal).
- [x] `summary:` frontmatter updated (≤320 chars) so the managed AGENTS.md table row mentions the chip; Codex host file untouched.
- [x] Dogfood install regenerated (`update --yes --force`); managed table shows the updated row; state re-keyed.
- [x] `npm test` green (CI confirms Node 20 / 22).

## Plan

- [x] Branch `feat/ad-handoff-chip` off `main`.
- [x] Edit the Claude Code `ad-handoff` SKILL.md (Step 5 + output contract + Next + `summary:`).
- [x] `node bin/agentic.js update --yes --force`; verify byte-identity + table row.
- [x] `npm test`; fresh-context §10 review; PR on explicit go.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-07-28

Grounded before writing: the chip primitive is real but undocumented and app-specific (`spawn_task`, Claude Code desktop app; observed contract: title / self-contained prompt / tldr / cwd → one-click chip → fresh session), and a skill cannot detect its surface by name (host env vars are subprocess-visible only). Adopted the kit's existing host-aware-primitive convention (`AskUserQuestion` pattern, WORKFLOW §3): capability-gated wording with `spawn_task` named as the current example, graceful degradation elsewhere. Kept deliberately small per review of scope: one paragraph in Step 5, one output-contract line, `summary:` refresh; Codex host file untouched (no primitive). `npm test` green.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
