# Task `0013`: Ship `agentic-hooks` skill (v0.7.0-beta.1)

**Status:** done
**Created:** 2026-05-09
**Owner:** Alexandre Alvaro
**Spec ref:**
**Board ref:**

## Context

The Phase 2 holistic coherence review (handoff at `.agentic/reviews/2026-05-09T21-39-48Z-v0.5-coherence-review.md`) identified `WORKFLOW.md` §11 (Quality Gates) as the largest vibe-coding escape hatch in the kit: §11 names deterministic gates as the highest-priority practice, but the kit ships zero hooks. [ADR-0012](../adr/0012-agentic-hooks-skill.md) accepts a new conditional workflow-operational skill `agentic-hooks` that detects the project's stack, recommends a hook runner (Husky / lefthook / pre-commit / native), and scaffolds the lint+format+secret-scan / build+unit+integration gates §11 names. Opt-in (not auto-installed). Pairs with the upcoming v0.8 profiles work — `team` and `mature` profiles will recommend invoking the skill.

## Acceptance Criteria

- [x] [`doc/adr/0012-agentic-hooks-skill.md`](../adr/0012-agentic-hooks-skill.md) exists, status `accepted`, with the §11 alignment, the runner-detection logic, the scope boundary against settings.json hooks, and the opt-in vs profile-recommended posture.
- [x] [`src/skills/claude-code/agentic-hooks/SKILL.md`](../../src/skills/claude-code/agentic-hooks/SKILL.md) exists with frontmatter `name: agentic-hooks`, `allowed-tools: Read, Write, Glob, Bash`, and a description carrying "hook", "pre-commit", "pre-push", "lint", "format", "secret scan", "quality gate", "WORKFLOW §11" trigger keywords.
- [x] [`src/skills/codex/agentic-hooks/SKILL.md`](../../src/skills/codex/agentic-hooks/SKILL.md) exists with the matching content shaped to the Codex `<background_information>` / `<instructions>` / `<output_contract>` template, plus an `agents/openai.yaml`.
- [x] `agentic-hooks` added to `CONDITIONAL_SKILLS` in [`src/commands/init.js`](../../src/commands/init.js) with `autoIf: () => false` (opt-in only); [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) `SKILL_DESCRIPTIONS` carries an entry; the post-install slashLine summary lists `/agentic-hooks` only when opted in.
- [x] [`README.md`](../../README.md) skill table lists `agentic-hooks` as opt-in; "Recommended daily sequence" mentions it under the team/mature path.
- [x] Tests cover: end-to-end install with `--agent both --yes` does NOT install agentic-hooks (opt-in only); when explicitly opted in, both agent paths land it; `SKILL_DESCRIPTIONS` covers the new skill (already enforced).
- [x] Dogfood install in this repo refreshed via `node bin/agentic.js update --yes` (the kit itself opts in to dogfood the skill against its own pre-commit / pre-push setup; if the kit's repo has no hooks runner today, the skill scaffolds one).
- [x] [`package.json`](../../package.json) bumped to `0.7.0-beta.1`.
- [x] `npm test` passes.

## Plan

- [x] Branch `feat/v0.7.0-hooks` cut from `cli`.
- [x] Write [`doc/adr/0012-agentic-hooks-skill.md`](../adr/0012-agentic-hooks-skill.md) in status `accepted`.
- [x] Write this task file.
- [x] Implement [`src/skills/claude-code/agentic-hooks/SKILL.md`](../../src/skills/claude-code/agentic-hooks/SKILL.md).
- [x] Implement [`src/skills/codex/agentic-hooks/{SKILL.md,agents/openai.yaml}`](../../src/skills/codex/agentic-hooks/).
- [x] Wire `agentic-hooks` into [`src/commands/init.js`](../../src/commands/init.js) `CONDITIONAL_SKILLS` (autoIf: false, agents: both); add description in [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) `SKILL_DESCRIPTIONS`.
- [x] Update [`README.md`](../../README.md) skill table + "Recommended daily sequence" team/mature note.
- [x] Run `node bin/agentic.js update --yes` to refresh dogfood install (opt-in this skill for the kit's own repo).
- [x] Bump version in [`package.json`](../../package.json).
- [x] Run `npm test`. Fix anything that drifted.
- [x] Atomic commits + PR + merge to `cli`; tag `v0.7.0-beta.1`; `npm publish --tag beta`; smoke verify.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-05-09

ADR-0012 closes ADR-0007 §6's deferral of `agentic-hooks`. The opt-in posture matches the principle the user articulated: "kit serves the project, not the other way around." A solo PoC user is not coerced into hooks; a team product invokes the skill explicitly when wiring CI.

The runner-recommendation logic prefers existing signals (an existing `.husky/` directory means the user has already chosen Husky; the skill confirms before scaffolding into a different runner). Multiple-runner-conflict path surfaces the conflict and asks; never silently picks.

### 2026-05-09 — close-out (v0.7.0-beta.1)

Shipped in v0.7.0-beta.1. Close-out flipped retroactively after `/agentic-next` surfaced this task as in-progress despite the v0.7.0 release. ADR-0012 + Task 0013 + skill bodies (claude+codex) + `init.js CONDITIONAL_SKILLS` wiring + `rootdoc.js SKILL_DESCRIPTIONS` + README updates all landed; 111/111 tests green at the time of release.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
