# Task `0078`: Land the routed candidates from the harness audits

**Status:** done
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

- [x] The changelog gate watches `package.json`: `scripts/changelog-gate.js` adds it to the watched set, `test/commit-gates.test.js` pins the behavior, and a new ADR declares `Amends: ADR-0048` with the matching `Amended by:` line added to ADR-0048, because ADR-0048's Decision enumerates the watched set from `package.json#files`.
- [x] `ad-review` on both hosts persists the reviewers' outputs at review time beside the handoffs it already writes (one `<ISO>-<scope>-verdicts.md`), so a "review found X" claim has a contemporaneous artifact; the skill's output contract and the reviewer-brief tests name the file.
- [x] `ad-prism` on both hosts writes any record it places under `doc/research/` from a template that carries the layer header (numbered title, `Status`) and dated sources, mirroring `ad-research/references/research-template.md`; `ad-ground`'s validator stays genre-locked.
- [x] `ad-ground`'s record template notes, in the source register guidance, that a measurement on a locally installed third-party artifact names the artifact's public release identity and version and a reproduction command that runs on the CI platforms' shells, so the evidence does not live only on the author's machine.

## Plan

- [x] Ground the changelog-gate change against ADR-0048 and write the amendment ADR first, in its own commit, then the script and test.
- [x] Change `src/skills/claude-code/ad-review/SKILL.md` and `src/skills/codex/ad-review/SKILL.md` together; sync the dogfood copies with `agentic update --agent both --yes`; keep the description within the ADR-0073 budget.
- [x] Add the `ad-prism` record template on both hosts and the `ad-ground` template note; run `npm test` for the host-parity and listing-budget guards.
- [x] Add the changelog entry, run the local gate, run the fresh-context review, then `/ad-audit` so CV.7 and the changed gate are exercised once.

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

### 2026-09-18 — Delivery, review, audit, and closure

Landed on `feat/land-routed-audit-candidates` over `4b98c71`: ADR-0081 in its
own commit first (`b1612cd`, with the `Amended by` line on ADR-0048), then the
gate change with its test (`8b9401c`), then the skill changes on both hosts
with the dogfood copies, the guard tests, and the changelog (`561258f`). The
fresh-context review ran on the working tree (handoffs and verbatim verdicts
under `.agentic/reviews/20260918T201427Z-task0078-*`): Spec ship as-is;
Standards one concern, the changelog entries citing only this task, fixed by
naming the governing ADRs. The maximum-gate audit then ran fourteen reviewers
(four binding documents, ADR-0007, 0008, 0048, 0070, 0073, 0077, HK, and the
critical claims group with two cross-model passes; trail
`.agentic/reviews/20260918T202254Z-audit78-*`); every anchor matched.

Audit dispositions, all remediated in the closing commit unless noted:

- CV.5, critical: the new `ad-review` text called the verdicts file "durable
  evidence" while `.agentic/reviews/` is gitignored by design (ADR-0009 D9).
  Real. The text on both hosts now calls it a contemporaneous artifact on the
  reviewing machine and says a claim that must outlive the machine is quoted
  into the tracked record or labelled an open question; `CONTEXT.md` gains a
  "Review verdicts" entry saying the same, and the Two-axis review
  relationship names it.
- CV.6, major: the audit handoff said the gate had passed "before the last two
  commits at 1017 tests"; the run happened on the working tree with those
  changes present, so 1017 was the after count (the base is 1013 and the block
  adds four tests). An orchestration wording error, corrected in the audit
  trail; no repository claim carried it.
- CV.5 and ADR-0070, minor: ADR-0081 stated npm's behavior without a citation
  or a reproduction command; both added (docs.npmjs.com, accessed 2026-09-18,
  and `npm pack --dry-run`).
- ADR-0048, major: the gate implements an amendment whose record is still
  proposed, and the `Amended by` line precedes acceptance where ADR-0063 and
  ADR-0078 were paired at acceptance. Real by sequence; the verdict flips
  when the owner accepts ADR-0081, which is the owner's action and is
  requested in the same round as the pull request.
- GUIDELINES §9.5, minor: the gate test is a fixed-bug test and now carries the
  `regression:` prefix.
- ARCHITECTURE.md test layout, minor: names the new guard tests.
- ADR-0077, minor judgement: `validate-plan.mjs` does not enforce the new
  header. Accepted as-is with reason: the criterion asks for the template, and
  a validator rule would fail the existing Prism eval fixtures that carry no
  header; revisit when a second `PRISM-NNNN` record lands.
- ADR-0077 process note: `561258f` bundles the three skill changes in one
  commit. Accepted as-is; the three criteria share one changelog section and
  one dogfood sync, and the history is not rewritten.

Local gate green at 1017 tests before this entry's commit; the changelog gate
now reminds on `package.json`. The pull request and the acceptance of ADR-0081
(with its `PROJECTION.md` row on ADR-0048) are owner actions.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
