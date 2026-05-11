# Task `0015`: Adopt structured prompts in skills (v0.9.0-beta.1)

**Status:** done
**Created:** 2026-05-09
**Owner:** Alexandre Alvaro
**Spec ref:**
**Board ref:**

## Context

The Phase 2 holistic coherence review identified that skill confirmation gates and multi-choice interview steps render as plain text instead of structured cards in the host's UI. The user articulated the friction explicitly: "sinto falta do claude e o codex abrindo aquelas caixinhas pra sugerir algo ou confirmar algo." ADR-0014 accepts a documentation-only change — Claude Code skill bodies prescribe `AskUserQuestion` and Plan Mode when the host exposes them, falling back to numbered text otherwise. Codex variants are unchanged (no equivalent primitive).

## Acceptance Criteria

- [x] [`doc/adr/0014-structured-prompts-when-host-supports-them.md`](../adr/0014-structured-prompts-when-host-supports-them.md) exists, status `accepted`, with the soft-preference posture and the host-asymmetry documentation.
- [x] Interview-heavy Claude Code skills updated with the `AskUserQuestion` instruction: [`agentic-spec`](../../src/skills/claude-code/agentic-spec/SKILL.md), [`agentic-task`](../../src/skills/claude-code/agentic-task/SKILL.md), [`agentic-adr`](../../src/skills/claude-code/agentic-adr/SKILL.md).
- [x] Confirmation-heavy Claude Code skills updated: [`agentic-review`](../../src/skills/claude-code/agentic-review/SKILL.md) (scope-confirmation step), [`agentic-ground`](../../src/skills/claude-code/agentic-ground/SKILL.md) (confidence checkpoint).
- [x] Heavy-output generators gain optional Plan Mode reference: [`agentic-bootstrap`](../../src/skills/claude-code/agentic-bootstrap/SKILL.md), [`agentic-architecture`](../../src/skills/claude-code/agentic-architecture/SKILL.md).
- [x] Codex variants untouched (no equivalent primitive; existing asymmetry documentation suffices).
- [x] Dogfood install in this repo refreshed via `node bin/agentic.js update --yes`.
- [x] [`package.json`](../../package.json) bumped to `0.9.0-beta.1`.
- [x] `npm test` passes.

## Plan

- [x] Branch `feat/v0.9.0-structured-ux` cut from `cli`.
- [x] Write [`doc/adr/0014-structured-prompts-when-host-supports-them.md`](../adr/0014-structured-prompts-when-host-supports-them.md) in status `accepted`.
- [x] Write this task file.
- [x] Add `AskUserQuestion` instruction block to interview-heavy skills (spec, task, adr).
- [x] Add `AskUserQuestion` instruction block to confirmation-heavy skills (review, ground).
- [x] Add Plan Mode opt-in note to heavy-output skills (bootstrap, architecture).
- [x] Run `node bin/agentic.js update --yes` to refresh dogfood install.
- [x] Bump version in [`package.json`](../../package.json).
- [x] Run `npm test`. Fix anything that drifted.
- [x] Atomic commits + PR + merge to `cli`; tag `v0.9.0-beta.1`; `npm publish --tag beta`; smoke verify.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-05-09

Decision sequence with the user (U1–U4):

- U1: ADR-0014 creates the standard "skills use AskUserQuestion when available."
- U2: Interview-heavy first (spec, task, adr); then confirmation-heavy (review, ground).
- U3: Plan Mode opt-in for spec-driven generators (bootstrap, architecture); not universal — small interactive writes don't benefit.
- U4: Codex parity asymmetric, documented per skill. No Codex changes.

### 2026-05-09 — close-out (v0.9.0-beta.1)

Shipped in v0.9.0-beta.1. Close-out flipped retroactively after `/agentic-next` surfaced this task as in-progress despite the v0.9.0 release. ADR-0014 + Task 0015 + interview-heavy skills updated (spec, task, adr) + confirmation-heavy skills updated (review, ground) + Plan Mode opt-in note in heavy-output generators (bootstrap, architecture) all landed; Codex variants unchanged per the documented host asymmetry. 126/126 tests green at the time of release.

The instruction is a soft preference. The skill body words it prescriptively ("use it when available") so the agent picks the structured tool by default, but the actual rendering is the agent's call at runtime.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
