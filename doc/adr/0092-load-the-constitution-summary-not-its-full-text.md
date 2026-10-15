# ADR-0092: Load the Constitution's summary, not its full text

**Status:** proposed
**Date:** 2026-10-15
**Deciders:** Alexandre Alvaro
**Related:** ADR-0069 (the global kit under `~/.agentic/kit/`)
**Evidence ref:** doc/research/0044-ground-review-economy-and-context-budget.md

## Context

The installer writes a managed block into each host's global rules file that imports the whole `WORKFLOW.md` (55,072 bytes). Claude Code loads an imported file at launch at the same context cost as inline text, and targets under 200 lines per instruction file. Codex expands no import at all and caps combined instructions at 32 KiB, so its sessions receive the literal import line and none of the Constitution. On the owner's machine the always-loaded stack measured about 104 KB per session, more than half of it this one file.

## Decision

1. The managed block carries the Constitution's TL;DR inline, read from the kit's `WORKFLOW.md` at install time, followed by one line naming the full text's path for on-demand reading. The same block is written for both hosts.
2. The block opens with a digest line of its own content. The installer replaces a block whose content matches its digest, or that is the earlier import-only form; any other block was edited by hand and is reported as skipped, as before.
3. The full `WORKFLOW.md` stays installed under `~/.agentic/kit/`; skills that cite its sections keep resolving them there.

## Consequences

Positive:

- About 49 KB less instruction text in every session on both hosts.
- Codex sessions receive the Constitution's rules for the first time.
- A kit update refreshes the summary without touching user-owned text.

Negative:

- Rules that live only in the body of `WORKFLOW.md` reach a session only when a skill or the agent reads it.
- A hand-edited block stops receiving updates until the owner removes it.

## Alternatives Considered

- **Keep the import for Claude Code and inline only for Codex.** Rejected: the import costs the same context, so the two hosts would diverge for no gain.
- **Inline the full text for Codex.** Rejected: 55 KB alone exceeds the 32 KiB default budget.
- **Ship a separate summary file.** Rejected: the TL;DR already exists in `WORKFLOW.md`; a second file would drift from it.
