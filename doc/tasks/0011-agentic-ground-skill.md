# Task `0011`: Ship `agentic-ground` workflow-operational skill (v0.4.0-beta.1)

**Status:** in-progress
**Created:** 2026-05-09
**Owner:** Alexandre Alvaro
**Board ref:**

## Context

User's real-engineering practice on non-trivial changes runs a four-source research pass before writing code: official docs (1), validated open-source examples (2), in-repo examples (3), and git history / sibling branches (4). The four are joined by AND, not OR; after the levantamento the user states a happy path and accepts deviations only with an irrefutable justification. The kit covers Sources 1 and 3 partially via [WORKFLOW.md §4-§5](../../WORKFLOW.md) and [agentic-philosophy "Ground Before Coding"](../../src/skills/claude-code/agentic-philosophy/SKILL.md), leaves Sources 2 and 4 entirely uncovered, and frames the deviation gate as descriptive rather than prescriptive. ADR-0007 §6 deferred `agentic-happy-path` (§4) and `agentic-ground` (§5) as separate v0.3 candidates; [ADR-0010](../adr/0010-agentic-ground-skill.md) consolidates them into one workflow-operational skill, expands the source set, and tightens the gates.

## Acceptance Criteria

- [ ] [`doc/adr/0010-agentic-ground-skill.md`](../adr/0010-agentic-ground-skill.md) exists, status `accepted`, with the four-source matrix, the deviation gate spec, and the ADR-0007 §6 reconciliation.
- [ ] [`src/skills/claude-code/agentic-ground/SKILL.md`](../../src/skills/claude-code/agentic-ground/SKILL.md) exists with frontmatter `name: agentic-ground`, `allowed-tools: Read, Glob, Grep, Bash, WebFetch, WebSearch`, and a description carrying the auto-trigger keywords. Body covers Step 0 scope, Step 1 four-source levantamento, Step 2 happy-path synthesis, Step 3 deviation gate, Step 4 confidence checkpoint, Output contract.
- [ ] [`src/skills/codex/agentic-ground/SKILL.md`](../../src/skills/codex/agentic-ground/SKILL.md) exists with the matching content shaped to the Codex `<background_information>` / `<instructions>` / `<output_contract>` template plus an `agents/openai.yaml`. Body documents the auto-trigger asymmetry per ADR-0010 §6.
- [ ] `agentic-ground` is added to `REQUIRED_SKILLS` in [`src/commands/init.js`](../../src/commands/init.js); [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) `SKILL_DESCRIPTIONS` carries an entry for it.
- [ ] [`README.md`](../../README.md) skill table lists `agentic-ground` alongside the other universal workflow-operational skill (`agentic-review`); the workflows-by-scenario section mentions when the skill auto-invokes.
- [ ] [`WORKFLOW.md`](../../WORKFLOW.md) §4 ("Find the Happy Path") and §5 ("Ground in Real Patterns") cross-reference `agentic-ground` as the workflow-operational implementation; they keep the philosophy as posture but point at the skill for the full four-source flow.
- [ ] Tests cover: `agentic-ground` is in `UNIVERSAL_SKILLS` in [`test/init.test.js`](../../test/init.test.js); end-to-end `init --agent both --yes` lands `.claude/skills/agentic-ground/SKILL.md` and `.agents/skills/agentic-ground/SKILL.md` + `agents/openai.yaml`; `SKILL_DESCRIPTIONS` covers `agentic-ground` (already enforced by the existing `lib.test.js` assertion for every `REQUIRED_SKILLS` member).
- [ ] Dogfood install in this repo refreshed via `node bin/agentic.js update --yes`. The new skill lands at `.claude/skills/agentic-ground/SKILL.md` and `.agents/skills/agentic-ground/SKILL.md`; state files updated; AGENTS.md managed-skills section regenerates with the new entry.
- [ ] [`package.json`](../../package.json) bumped to `0.4.0-beta.1` (skill set expansion is a minor bump per semver-style convention used by the kit).
- [ ] `npm test` passes.

## Plan

- [x] Branch `feat/0011-agentic-ground` cut from `cli`.
- [x] Write [`doc/adr/0010-agentic-ground-skill.md`](../adr/0010-agentic-ground-skill.md) in status `accepted`.
- [x] Write this task file.
- [ ] Implement [`src/skills/claude-code/agentic-ground/SKILL.md`](../../src/skills/claude-code/agentic-ground/SKILL.md).
- [ ] Implement [`src/skills/codex/agentic-ground/SKILL.md`](../../src/skills/codex/agentic-ground/SKILL.md) and [`src/skills/codex/agentic-ground/agents/openai.yaml`](../../src/skills/codex/agentic-ground/agents/openai.yaml).
- [ ] Wire `agentic-ground` into [`src/commands/init.js`](../../src/commands/init.js) `REQUIRED_SKILLS`; add description in [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) `SKILL_DESCRIPTIONS`.
- [ ] Update [`README.md`](../../README.md) skill table.
- [ ] Update [`WORKFLOW.md`](../../WORKFLOW.md) §4 and §5 cross-references.
- [ ] Update tests: `UNIVERSAL_SKILLS` constant + any related counts.
- [ ] Run `node bin/agentic.js update --yes` to refresh the dogfood install.
- [ ] Bump version in [`package.json`](../../package.json).
- [ ] Run `npm test`. Fix anything that drifted.
- [ ] Commit on the feature branch with Conventional Commits, one logical change per commit; PR back to `cli`; merge.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-05-09

Decision sequence with the user (E1–E6):

- E1: One skill `agentic-ground`, not two — flow indivisible.
- E2: Universal install. Workflow-operational essential for non-trivial work.
- E3: Agent searches for OSS examples (WebFetch / WebSearch); falls back to user-supplied reference. Cite-and-fetch required to mitigate hallucination.
- E4: Source D scoped to current repo only (`git log --all`, sibling branches). No submodules.
- E5: Confidence gate is soft — surfaces gaps, asks before proceeding; does not hard-block.
- E6: Codex auto-trigger is best-effort, asymmetry documented in skill body. Same posture as ADR-0007 on `agentic-review`.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
