# ADR-0094: Deny a closed list of destructive shell patterns

**Status:** accepted
**Date:** 2026-10-15
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0083 — decision 1's "never blocks a tool call", for the command guard only: it denies a closed list of shell patterns before they run. Every other decision binds it unchanged.
**Amends:** ADR-0074 — the checkpoint gains one line, naming the owner's conversation language and the no-estimate rule, read from a confirmed voice profile; its exit-0, kill-switch and no-coercion decisions are unchanged.
**Related:** ADR-0047, ADR-0055 (the decisions ADR-0083 says a blocking guard qualifies)

## Context

The owner's /insights reports of 2026-10-15 recorded a review subagent that killed every python process on the machine, putting a scheduled measurement at risk, and a commit chained after a failed check with `;` that landed anyway. The owner's standing rules forbid both, but rules in prose did not stop them. The same reports show replies drifting out of the owner's conversation language and date estimates despite standing rules. A `PreToolUse` hook can deny a shell command before it runs on both hosts; no hook can stop assistant prose before it is shown.

ADR-0083 decision 1 requires a blocking guard to carry its own ADR, name ADR-0047, ADR-0055 and ADR-0074, and bring a measured false-block rate. ADR-0047 introduced the opt-in commit gate, ADR-0055 the session-lifecycle tier, and ADR-0074 the checkpoint that rejected blocking as coercion for heuristic content; this guard qualifies all three by denying only deterministic, closed patterns.

## Decision

1. `ad-hooks` ships `scripts/command-guard.mjs`, a `PreToolUse` hook on shell tools (`Bash|PowerShell` on Claude Code, `Bash` on Codex). It denies kill-by-name in command position (`pkill`, `killall`, `taskkill /IM`, `Stop-Process -Name` or `-ProcessName`, `spps`, `Get-Process ... | Stop-Process`, a kill fed by `pgrep`) and a `git commit` joined by `;` or a newline to an earlier check (tests, lint, type check, build, verify) in the same command line, staging steps in between included. Backslash line continuations are joined; heredoc bodies, then quoted strings and comments, are removed in one pass before matching, so a word that only appears as an argument, in text or in a comment passes. Leading assignments, shell keywords and wrappers that run the next word (`sudo`, `env`, `timeout`, `xargs`, `mise exec ... --`, `rtk` and `rtk proxy`, among others) are skipped to find the command; `command -v` is a lookup. A check guards what it precedes through `&&`, `if check; then`, `while check; do` and `check || exit`; groups `{ }` and `( )` are read innermost first. `pkill -P <literal PID>` is scoped to a known parent and passes. The deny reason names the fix: kill the PID you started; chain with `&&`.
2. The list is closed. A new pattern needs a change to this ADR's decision 1 and a fresh replay.
3. The guard fails open on malformed input or an internal error, and `AD_COMMAND_GUARD=0` turns it off. It is opt-in through `ad-hooks`, as ADR-0083 decision 6 requires; this repository wires it for dogfood.
4. Measured false-block rate, exploratory: on 2026-10-15, `scripts/replay-command-guard.mjs` over the owner's local Claude Code transcripts (65,432 shell calls; a growing corpus that is not retained, so a rerun gives other counts) denied 135 distinct commands — 92 kill-by-name and 43 commits after a check. Each was read: 134 are real instances of their pattern, and one is the conservative block in the Negative consequences (a `pkill -P` over a PID held in a variable that came from `pgrep -P`). No Codex transcript was replayed. The corpus also tuned the rule (a first commit rule that ignored checks denied 70 fixture set-ups such as `git init; git add f; git commit`), so the figure is not a held-out estimate.
5. The workflow checkpoint appends "Reply to the owner in <language>; give no date, duration or deadline estimates." when a confirmed voice profile names the conversation language. A `Stop` hook logs, in shadow, a reply whose detected language differs; it never blocks and stores no reply text.

## Consequences

Positive:

- The two incidents the owner reported are denied in the forms they took and in the forms the replay found, through a wired session on either host; forms outside decision 1 remain possible (below).
- The language rule reaches the model on every prompt instead of living only in memory and prose.
- The shadow detector gives a drift rate to decide on later, without blocking anything now.

Negative:

- A legitimate kill by name now needs a PID lookup first.
- Out of scope by design, the guard being a guardrail and not a sandbox: commands inside `bash -c` or `eval` strings, command substitution inside double quotes, commands built at run time, wrappers not in the list, and Codex `write_stdin`. A check and a commit in different repositories on one line count as one chain, and `pkill -P` over a PID held in a variable stays blocked because the PID may come from a name lookup; both are conservative blocks.
- The language heuristic tells only Portuguese, English and Spanish apart.

## Alternatives Considered

- **A `Stop` block that forces a rewrite in the owner's language.** Rejected: the owner would see the reply twice, and ADR-0074 rejects coercion for heuristic content.
- **Prose rules only.** Rejected: both incidents happened with the rules already written.
- **Deny every `;` before a commit.** Rejected by the replay: it blocked fixture set-ups that check nothing.
