# Task `0078`: Land the routed candidates from the harness audits

**Status:** proposed
**Created:** 2026-09-18
**Scope ref:** doc/tasks/0077-curate-audit-rule-candidates-from-the-harness-block.md — Notes entry dated 2026-09-18; doc/adr/0048-kit-release-discipline-gates.md; doc/adr/0008-documentation-discipline.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The `ad-level-up` session of Task 0077 found that three of its candidates are
not rule lines: each is a gap in a deterministic gate or a skill contract
whose governing rule already exists. They touch shipped kit content on both
hosts, so they land after the harness pull request merges, in their own
change with a changelog entry, rather than inside a twenty-commit harness
branch. This task carries them so the deferral references a work item.

## Acceptance Criteria

- [ ] The changelog gate watches `package.json`: `scripts/changelog-gate.js` adds it to the watched set, `test/commit-gates.test.js` pins the behavior, and a new ADR declares `Amends: ADR-0048` with the matching `Amended by:` line added to ADR-0048, because ADR-0048's Decision enumerates the watched set from `package.json#files`.
- [ ] `ad-review` on both hosts persists the reviewers' outputs at review time beside the handoffs it already writes (one `<ISO>-<scope>-verdicts.md`), so a "review found X" claim has a contemporaneous artifact; the skill's output contract and the reviewer-brief tests name the file.
- [ ] `ad-prism` on both hosts writes any record it places under `doc/research/` from a template that carries the layer header (numbered title, `Status`) and dated sources, mirroring `ad-research/references/research-template.md`; `ad-ground`'s validator stays genre-locked.
- [ ] `ad-ground`'s record template notes, in the source register guidance, that a measurement on a locally installed third-party artifact names the artifact's public release identity and version and a reproduction command that runs on the CI platforms' shells, so the evidence does not live only on the author's machine.

## Plan

- [ ] Ground the changelog-gate change against ADR-0048 and write the amendment ADR first, in its own commit, then the script and test.
- [ ] Change `src/skills/claude-code/ad-review/SKILL.md` and `src/skills/codex/ad-review/SKILL.md` together; sync the dogfood copies with `agentic update --agent both --yes`; keep the description within the ADR-0073 budget.
- [ ] Add the `ad-prism` record template on both hosts and the `ad-ground` template note; run `npm test` for the host-parity and listing-budget guards.
- [ ] Add the changelog entry, run the local gate, run the fresh-context review, then `/ad-audit` so CV.7 and the changed gate are exercised once.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-18

Registered from the Task 0077 curation session. The three-lens adversarial
review (verdicts persisted in `.agentic/reviews/20260918T151616Z-levelup-
task0077-verdicts.md`) agreed that these items are gate and skill-contract
work, not rule lines: CV.5 already obligates durable evidence for review
claims, and WORKFLOW.md §2 rule 2 with ADR-0008 already binds dated sources
for every `doc/research/` record. The fourth criterion carries the remedy
shape of the rejected fifth Task 0077 candidate as template guidance, because
CV.5 as written already caught the defect and lengthening it failed the cost
gate.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
