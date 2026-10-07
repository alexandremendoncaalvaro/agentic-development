# ADR-0087: `ad-hooks` reminds the model to offer the resume chip when a handoff is written

**Status:** proposed
**Date:** 2026-10-06
**Deciders:** Alexandre Alvaro
**Related:** ADR-0055, ADR-0074 (same reminder class); ADR-0083 (not amended: this reminder is outside its gate rules)

## Context

`/ad-handoff` tells the agent to offer a one-click resume chip on hosts that have one (the Claude Code desktop `spawn_task` tool). An exploratory measurement in RESEARCH-0033 over the owner's private transcripts found: every desktop session that invoked the skill offered the chip, and the only miss was a handoff written directly to the handoff directory without the skill. Text inside the skill cannot reach a handoff that bypasses the skill, and a hook declared in the skill's frontmatter registers only when the skill runs (ADR-0074, Alternatives).

Both hosts fire `PostToolUse` after a file write and place `hookSpecificOutput.additionalContext` in the model's context on exit 0 (GROUND-0034 E2); this was observed on Claude Code and is documented, not yet observed, on Codex. The kit's session tier already has two static reminders (ADR-0055, ADR-0074) and one validator gate (ADR-0083). This reminder runs no validator, so it is not a gate under ADR-0083 Decision 3, and ADR-0083 Decision 7's one-gate-at-a-time rule does not apply to it; it is a nudge in the class of ADR-0055 and ADR-0074.

## Decision

We will add a third reminder to the `ad-hooks` session-lifecycle tier: a **handoff-chip `PostToolUse` hook**.

- **Trigger.** A file write on either host (`Edit|Write` matcher; Codex reports `apply_patch`) whose written path is a Markdown file under a directory named `agentic-handoffs`. Paths are recovered with the artifact gate's `recoverPaths`, so both hosts share one parser.
- **Output.** On a match, exit 0 with `hookSpecificOutput.additionalContext` naming the path and telling the model to offer the resume chip where the host has a background-task chip tool, to give the path and a fresh-session prompt where it does not, and to check a handoff written outside `/ad-handoff` against that skill's template. No match, malformed or non-object input: silent exit 0.
- **Never blocks.** Exit 0 always; no decision object; no exit 2.
- **Kill switch.** `AD_HANDOFF_CHIP=0` (or `false`, `off`) silences it.
- **One script, both hosts.** `scripts/handoff-chip.mjs`, byte-identical in both `ad-hooks` trees, zero dependencies; host wording stays neutral because the script cannot tell which host runs it.
- **No evidence file.** It is a reminder, not a gate; ADR-0083 Decision 4 does not apply.
- **Opt-in through `ad-hooks`.** The installer writes no hook. This repository wires it in `.claude/settings.json` and `.codex/hooks.json` for dogfood.
- **Skill text.** `/ad-handoff` makes the chip a numbered step of its report, so it is not an afterthought when the skill does run.

## Consequences

Positive:

- The chip reaches the model on the path the measurement shows is missed, without depending on the skill being invoked.
- Small and reversible: one script, contract-tested by mock stdin, removed by deleting one settings block.

Negative / trade-offs:

- It fires on every write to a handoff file, including an edit to an existing one. Accepted: handoffs are written once in practice; a once-per-path guard is the revisit path if it proves noisy.
- On a host without a chip tool the reminder only restates what the skill already prints. Accepted for one line of context.
- A handoff written by a shell command (a heredoc through `Bash`) never fires it; only file-tool writes do. Accepted: the measured miss was a `Write` (RESEARCH-0033's transcript), and the kit's skills write handoffs with `Write`. A shell-write matcher is the revisit path if a miss through `Bash` is observed.
- When `/ad-handoff` itself writes the file, the reminder arrives before the skill's report. The text asks for the chip once and names the skill's report step as that offer, so the two do not stack.

Revisit trigger: a measured false-reminder rate that annoys the owner, or a host that exposes a chip primitive a hook can call directly.

## Alternatives Considered

- **More text in `/ad-handoff`** — rejected as the fix. The miss happens when the skill does not run; the skill's text never reaches that case. The numbered step is kept as a complement.
- **`hooks` in the skill's frontmatter** — rejected, as in ADR-0074: they register only after the skill is invoked.
- **A Claude Code mod that calls `spawn_task` itself** — deferred to the RESEARCH-0033 spike: Claude-Code-only, early-access API, and unverified reach to the desktop tool.
- **Exit 2 with the text on stderr** — rejected. Both hosts treat exit 2 as an error or block signal; a reminder is not a failure.
- **Reword the `Stop` nudge** — not needed. Its `systemMessage` is addressed to the user, who runs `/ad-handoff`; the measured miss is on the model's side.
