# ADR-0074: `ad-hooks` gains a `UserPromptSubmit` workflow-checkpoint hook

**Status:** accepted
**Date:** 2026-09-09
**Deciders:** Alexandre Alvaro

## Context

The kit's pipeline (sharpen a fuzzy ask, ground before code, drive code with tests, review or audit before landing, commit with sign-off) reaches the model through three advisory layers: the globally imported `WORKFLOW.md`, the repository's `AGENTS.md`, and the skill descriptions. Anthropic states that skills and CLAUDE.md are advisory and that a guarantee requires a hook or a permission (claude.com/blog, 2026-06-18; code.claude.com/docs/en/features-overview). The kit ships no session hook that puts the pipeline in front of the model at prompt time; its only session-lifecycle hook is the `Stop` handoff nudge of ADR-0055. In practice the owner repeats "follow the workflow, ground, TDD, review" at the start of each task, which is the missing deterministic layer supplied by hand.

The `UserPromptSubmit` event fires on every user prompt; plain-text stdout from its hook is added to the conversation as context the model can act on, and exit code 2 blocks the prompt (code.claude.com/docs/en/hooks). A practitioner measurement (Spence, 2025-11-06, 20 fresh sessions) found roughly 50% auto-activation of a skill without a hook and reliable activation with a `UserPromptSubmit` hook emitting an imperative instruction; polite reminders were ignored. The SLIM plugin installed on the author's machine already uses the same event for a skill nudge, and `ad-hooks` already owns the session-lifecycle tier.

`ad-hooks` currently bakes the path `${CLAUDE_PROJECT_DIR}/.claude/skills/ad-hooks/scripts/handoff-nudge.mjs` into the scaffolded `.claude/settings.json`. Since the installer defaults to the global scope, that path does not exist for a default install.

## Decision

We will add a second member to the `ad-hooks` session-lifecycle tier: a **workflow-checkpoint `UserPromptSubmit` hook**.

- **Mechanism.** A zero-dependency Node script, `scripts/workflow-checkpoint.mjs`, shipped beside `ad-hooks/SKILL.md` in both host trees (byte-parity, as `handoff-nudge.mjs`). On each prompt it reads the event JSON from stdin and prints a short, imperative checkpoint to stdout, then exits 0. It never exits 2 and never blocks a prompt.
- **Content.** The checkpoint is static, at most about 600 characters, and names the chain by slash command: a fuzzy ask goes to `/ad-grill-me`; non-trivial code runs `/ad-ground` then `/ad-tdd` (or `/ad-tdg` when the strategy is the unknown); before landing, `/ad-review`, or `/ad-audit` for team-bound work; commits go through `/ad-commit`. Trivial requests are told to skip. Imperative wording, per the measured failure of polite reminders.
- **Kill switch.** `AD_WORKFLOW_CHECKPOINT=0` in the environment silences the hook; a malformed or empty stdin also yields silence and exit 0.
- **Scaffolding.** The `ad-hooks` tier documents the wiring and merges a `UserPromptSubmit` block into `.claude/settings.json` without clobbering existing hooks. The script path is resolved at scaffold time from the directory the skill was loaded from, for both this hook and the existing `Stop` hook, replacing the hard-coded project path.
- **Verification before code.** The `UserPromptSubmit` stdout-as-context contract is confirmed against the live host and recorded as the task's ground record before the script is written, the way ADR-0055 verified `Stop`.
- **Scope.** Claude Code only. Codex prompt-time context injection is not documented; the Codex `ad-hooks` body states the tier is Claude-Code-scoped, as ADR-0055 did.
- **Dogfood.** This repository wires the hook in `.claude/settings.json`; the owner's machine receives it through `agentic update` and the `ad-hooks` scaffold.

## Consequences

Positive:

- The pipeline reaches the model deterministically at every prompt, replacing the owner's spoken reminder; the model still decides how to apply it, which is the correct split between deterministic delivery and advisory execution.
- The chain is named by command, so it works even when a skill's description has been dropped from the listing.
- Small, testable, and reversible: the script is contract-tested by mock stdin, and removing one settings block turns it off.

Negative / trade-offs:

- About 150 tokens are added to every prompt. Accepted: this is far below the three advisory copies already in context, and the kill switch exists.
- A static checkpoint cannot tell a trivial prompt from a task; it relies on the "skip when trivial" line. Accepted for the first version; a keyword-matched variant is the revisit path.
- Codex gets the script as dead weight in its tree, as with ADR-0055. Accepted under the byte-parity rule.

Revisit trigger: Claude Code documents a way to inject context once per task instead of per prompt, or Codex documents prompt-time context injection.

## Alternatives Considered

- **`SessionStart` hook only** — rejected as the sole mechanism. It fires once; the instruction decays as the session grows, which is exactly the "long session" case Anthropic names as where advisory rules fail. May be added later as a complement.
- **Keyword-matched nudge, as the SLIM plugin does** — rejected for the first version. More machinery and a false-negative surface; a static checkpoint has no misses. Revisit if the static text proves noisy.
- **`hooks` declared in a skill's frontmatter** — rejected. Such hooks register only when the skill is invoked, which is the very step this hook exists to trigger.
- **Blocking with exit 2 until the pipeline is acknowledged** — rejected. It fights the user, and the kit's posture (ADR-0047, ADR-0055) is deterministic delivery, not coercion.
- **More text in `AGENTS.md` or `WORKFLOW.md`** — rejected. The same rules are already in context three times; a fourth advisory copy does not change the mechanism that fails.
- **Do nothing** — rejected. It keeps the owner as the deterministic layer, which is the cost this decision removes.

## Addendum 2026-09-09

Before implementation the owner described the flow they run by hand: risk analysis first, then ground, then TDD with a review after each slice and an audit after each large block, a three-line summary plus a checklist roadmap (done / remaining) at the start of every session without reciting the rules, and a resume chip (or a fresh-session prompt where chips are unavailable) at the end. The checkpoint carries exactly that sequence, so its size is about 700 characters rather than the 600 estimated above; the test caps it at 900. The static, exit-0, kill-switch, and Claude-Code-only decisions are unchanged.

