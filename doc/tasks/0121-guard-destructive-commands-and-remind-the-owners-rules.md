# Task `0121`: Guard destructive commands and remind the owner's rules

**Status:** proposed
**Created:** 2026-10-15
**Scope ref:** doc/adr/0083-bound-the-runtime-layer-to-feedback-gates.md (decision 1 amended by a new ADR)
**Evidence ref:** the owner's /insights reports of 2026-10-15
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

Both /insights reports show agents killing processes by name (a reviewer killed every python process) and a commit chained after a check with `;` passing a failed check; and drift from the owner's language and no-estimate rules. A hook can deny a command before it runs; no hook can stop assistant prose before it is shown.

## Acceptance Criteria

- [ ] A command guard in the `ad-hooks` tier (both hosts, byte-identical) denies kill-by-name and a commit chained after `;` or a newline, allows quoted text, heredoc bodies, `kill <pid>` and `&&`-chained commits, fails open, and `AD_COMMAND_GUARD=0` silences it (tests through `verdict` and stdin).
- [ ] Wiring documented and tested for Claude Code (`Bash|PowerShell`) and Codex (`Bash`).
- [ ] A replay over the owner's recorded shell commands shows zero false denials before the guard is documented as ready.
- [ ] The workflow checkpoint appends one reminder line naming the owner's conversation language and the no-estimate rule when a voice profile defines it (tests with and without).
- [ ] A shadow `Stop` detector logs replies outside the conversation language and never blocks.
- [ ] A new ADR names ADR-0047, ADR-0055 and ADR-0074 and amends ADR-0083 decision 1 for this closed list.

## Plan

- [ ] `ad-hooks/scripts/command-guard.mjs` and its tests; replay; wiring; checkpoint line; detector; ADR; one PR, audited (enforcement tooling).

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-15 — planned

Planned from the kit audit of 2026-10-15 after a read-only verification of
its claims against the code. The owner approved doing every remaining
package on 2026-10-15. Language and estimates get a reminder and a shadow detector, not a forced rewrite (ADR-0074 rejects coercion for heuristic content).
