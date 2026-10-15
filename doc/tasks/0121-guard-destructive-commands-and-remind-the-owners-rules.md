# Task `0121`: Guard destructive commands and remind the owner's rules

**Status:** in-progress
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

- [x] A command guard in the `ad-hooks` tier (both hosts, byte-identical) denies kill-by-name in command position and a commit joined by `;` or a newline to an earlier check, allows quoted text, heredoc bodies, `kill <pid>` and `&&`-chained commits, fails open, and `AD_COMMAND_GUARD=0` silences it (tests through `verdict` and stdin).
- [x] Wiring documented and tested for Claude Code (`Bash|PowerShell`) and Codex (`Bash`).
- [x] A replay over the owner's recorded shell commands shows zero false denials before the guard is documented as ready.
- [x] The workflow checkpoint appends one reminder line naming the owner's conversation language and the no-estimate rule when a voice profile defines it (tests with and without).
- [x] A shadow `Stop` detector logs replies outside the conversation language and never blocks.
- [x] A new ADR names ADR-0047, ADR-0055 and ADR-0074 and amends ADR-0083 decision 1 for this closed list.

## Plan

- [x] `ad-hooks/scripts/command-guard.mjs` and its tests; replay; wiring; checkpoint line; detector; ADR; one PR, audited (enforcement tooling).

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-15 — planned

Planned from the kit audit of 2026-10-15 after a read-only verification of
its claims against the code. The owner approved doing every remaining
package on 2026-10-15. Language and estimates get a reminder and a shadow detector, not a forced rewrite (ADR-0074 rejects coercion for heuristic content).

### 2026-10-15 — built

Twenty-two guard tests went red (module missing), then green. A replay of
65,199 recorded shell calls from the owner's sessions first denied 162
distinct commands: 92 kill-by-name, every one a real instance of the
forbidden pattern, and 70 `;`-chained commits that were fixture set-ups
(`git init; git add f; git commit`) or `git status; git commit`, which check
nothing. The commit rule was narrowed, test first, to commits after a check;
the replay then denied 92, all kill-by-name, with no false block. Wiring tests
cover both hosts (Codex: the guard runs second in the `Bash` entry, after the
sequence gate). The checkpoint line and the shadow `Stop` detector were built
test first; the checkpoint tests now pin `AGENTIC_VOICE_DIR` so the owner's
own profile never changes what the suite sees. ADR-0094 amends ADR-0083
decision 1 and ADR-0074.

### 2026-10-15 — review of 4b9c31c

Both review axes found real gaps, each reproduced as a failing test first:
an apostrophe inside double quotes hid a later `pkill` (quotes are now
removed in one pass); `man pkill`, `which killall`, `grep pkill` and
`echo pkill` were denied (matching is now by command position, after
`sudo`, `env`, `xargs` and assignments); `Stop-Process -ProcessName`, `spps`
and `Get-Process ... | Stop-Process` escaped; `npm test || echo fail; git
commit` and `npm run verify; git add -A; git commit` escaped (a commit now
counts any earlier check in the line). The replay moved to
`scripts/replay-command-guard.mjs`; over 65,269 calls it denies 110: 92
kill-by-name and 18 check-then-commit lines, several of them this session's
own `verify; ...; git commit` commands, all real instances, no false block.
The detector no longer logs drift for a conversation language it cannot tell
apart (its fix and test landed together). Codex's `Stop` payload carries
`last_assistant_message` (learn.chatgpt.com/docs/hooks, read 2026-10-15).

### 2026-10-15 — delta review of 01bf454

Each evasion and false block the delta review reproduced became a failing
test first, then passed: commands after a single `&`, inside `if`/`for`/
`while` and `{ }`, behind `sudo -u`, `nice`, `timeout`, `mise exec ... --` or
a full path; options of each wrapper read by wrapper; a commit after git
global options or inside a block; a check that is only echoed or commented
out no longer counts. The replay then showed four false blocks of its own —
`check && { ...; git commit; }`, where the group runs only after the check
passes — fixed and pinned by a test. Final replay: 65,301 calls, 126 denied
(93 kill-by-name, 33 check-then-commit), all real instances. `bash -c`,
`eval` and substitution inside double quotes stay out of scope, documented
in ADR-0094.
