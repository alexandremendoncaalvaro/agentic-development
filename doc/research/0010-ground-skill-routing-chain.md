# GROUND-0010: Close the skill routing chain in each skill body

**Status:** recorded
**Decision:** Treat each skill body's routing language as a directed workflow graph, add the missing named successor edges at the producing skill, and protect the complete edge set with one table-driven source test run against both host trees.
**Decision ref:** doc/tasks/0067-close-skill-routing-chain.md
**Confidence:** Strong

## Decision and confidence

The happy path is to make each hand-off explicit where its producing skill already tells the user what comes next, using the canonical chain in `WORKFLOW-FLOWS.md` and the wording of existing `## Next` sections. A single table-driven test should read each canonical source `SKILL.md` for Claude Code and Codex and assert its required successor names. This keeps the behavior local to the public skill body, preserves host parity, and turns ADR-0016's maintenance obligation into a deterministic gate. Axis-2 verdict: Strong; the change is documentation-only, reversible, fixed by repository definitions, consistent with both host skill formats, and directly testable.

## Evidence

### E1 — Workflow hand-offs belong in the skill body and may be expressed as named next-step commands

**Strength:** High
**Provenance:** A1, A2, B1, C2

Both hosts define a skill as a `SKILL.md` instruction package, while the public Spec Kit command reference ends an assessment workflow by naming the exact next command. The repository already applies that pattern through final `## Next` sections, so the missing routes should extend those bodies rather than introduce a separate routing artifact.

### E2 — The canonical implementation chain and the missing edges are already defined in repository artifacts

**Strength:** High
**Provenance:** C1, C2, C3, D1

`WORKFLOW-FLOWS.md` fixes the middle and late chain from task through grounding, TDD or TDG, review, commit, PR, and merge. The current skill bodies expose only part of that graph, and task 0067 enumerates the required missing edges. Git history shows that ADR-0016 originally established per-skill breadcrumbs and symmetric host copies, but no later commit completed this edge set.

### E3 — One table-driven test across both source trees is the smallest durable parity gate

**Strength:** High
**Provenance:** C2, C3, D1

The repository already centralizes static skill-contract checks in `test/skills.test.js` and treats `src/skills/<host>/` as canonical. A table of producer skill and required successor names directly specifies the routing contract without parsing prose structure or duplicating a test per host.

## Source register

- **A1:** Anthropic, "Extend Claude with skills", https://code.claude.com/docs/en/skills, `SKILL.md` instruction-package contract (accessed 2026-09-09 via Web open and HTTPS fetch)
- **A2:** OpenAI, "Build skills", https://developers.openai.com/codex/build-skills, open Agent Skills `SKILL.md` contract (accessed 2026-09-09 via Web open and HTTPS fetch)
- **B1:** `github/spec-kit:extensions/bug/commands/speckit.bug.assess.md:162-166`, reports the exact next suggested `speckit.bug.fix` command (accessed 2026-09-09 via GitHub Contents API)
- **C1:** `WORKFLOW-FLOWS.md:94-98`, canonical task to ground to implementation to review to ship chain (accessed 2026-09-09 via `rg -n`)
- **C2:** `src/skills/claude-code/*/SKILL.md` and `src/skills/codex/*/SKILL.md`, existing final `## Next` wording and current routing gaps (accessed 2026-09-09 via `rg -n -A12 '^## Next$'`)
- **C3:** `doc/tasks/0067-close-skill-routing-chain.md`, required edge list and table-driven dual-host test contract (accessed 2026-09-09 via `sed`)
- **D1:** `git log --all --oneline -- WORKFLOW-FLOWS.md src/skills/claude-code src/skills/codex test/skills.test.js`; commits `f244b7b` and `04bb877` introduced and materialized per-skill `Next` breadcrumbs, while no prior commit closes task 0067's edge set (accessed 2026-09-09 via git log and git show)

## Limitations and reversal

This receipt proves the intended static routing graph, not that users always follow a suggested successor or that every future skill belongs in the same chain. A future accepted workflow decision that changes `WORKFLOW-FLOWS.md`, or host documentation that stops treating the skill body as the instruction surface, would require revising the edge table and the affected breadcrumbs together.

## Audit path

Run `node .agents/skills/ad-ground/scripts/validate-record.mjs doc/research/0010-ground-skill-routing-chain.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
