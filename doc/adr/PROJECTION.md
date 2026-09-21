# ADR state projection

Without this file, learning which architectural decisions still bind costs one pass over every record in this directory. The `Status:` field answers that question per *document*, and in practice supersession here has been per *stanza* — one consequence retired, one alternative reversed, one decision's realization replaced — so a record can read `accepted` while a named part of it is dead. This page is where that difference is visible in one screen. It carries state and the identity of the corrector, never the rationale: the rationale stays in the record, which is the only place it is safe to read it from.

**The rule that keeps it true:** a change to what binds touches this file in the same commit as the record — accepting an ADR, or superseding/deprecating one. Merely *proposing* an ADR is not such a change: a `proposed` record binds nothing, so it stays out of this projection until it is accepted (the commit that accepts it is the one that adds it here). `/ad-drift` reports an amendment relation whose two sides disagree; it cannot report a projection nobody updated, so the same-commit habit is the actual guarantee. Sanctioned by `WORKFLOW.md` §2 rule 10, which permits exactly one state projection per append-only layer, inside that layer's own directory.

## Default

All 57 accepted ADRs bind in full, except the seventeen below, which bind except for the named part.

No ADR in this directory has been deprecated or superseded as a whole document. A `proposed` ADR is not counted here and does not appear until it is accepted — it binds nothing until then, and its acceptance is the change to what binds that adds it (see *The rule that keeps it true*).

## Binding with a part retired

| ADR | Retired | Still binding | Retired by |
|---|---|---|---|
| [0007](0007-workflow-operational-skills.md) | The Codex `/clear` + handoff choreography for fresh-context review, and its "feature parity is imperfect" consequence; decision item 7's always-installed universal set, which presupposed a universal-versus-optional split | The workflow-operational skill category itself, and every other item of the decision. The Claude Code path was never affected, and the skill is still installed for every host | Its own addendum, after Codex shipped a subagent primitive; [ADR-0064](0064-install-all-skills-with-contextual-guidance.md), declared as a header pair and reasoned in this record's 2026-09-21 addendum |
| [0035](0035-rules-location-convention.md) | The rejection of a per-repo `.agentic/rules/` layer, for project scope only | The machine store and its resolution order, unchanged | [ADR-0043](0043-per-project-rules-layer.md) |
| [0030](0030-single-responsibility-per-document.md) | The absolute reading of directory-as-index, for a layer's *own* directory only | The single-responsibility-per-document principle, and the ban on any *other* document digesting a layer's index | [ADR-0049](0049-append-only-layers-own-a-state-projection.md) — the decision that created this page |
| [0047](0047-absorb-team-practices-determinism-reaudit.md) | Decision 1's *realization* as inline shell copied into two skill files — not Decision 1 itself | The deterministic resolution probe as a requirement, and Decisions 2 through 4 | Its own addendum, after task-0031 shipped the probe as a skill script |
| [0048](0048-kit-release-discipline-gates.md) | Decision 2's manually performed post-local-release tail steps; the beta-only version calculation; the test-only prepublish/pre-push/CI gate; the watched set derived only from `package.json#files` | The configured release script as the sole local mutation path, changelog discipline, commit-time checks, and branch protection | [ADR-0063](0063-orchestrate-external-npm-release-steps.md); [ADR-0078](0078-set-the-one-point-zero-quality-boundary.md); [ADR-0081](0081-watch-package-json-in-the-changelog-gate.md) |
| [0063](0063-orchestrate-external-npm-release-steps.md) | Five mandatory direct confirmations and independently gated release PR handoffs | The checked release sequence, exact-tag publication, merge-commit preservation, and state-aware recovery contract | [ADR-0072](0072-bind-one-approval-to-the-release-plan.md) |
| [0020](0020-deep-modules-vocabulary.md) | Profile-based installation scope for `ad-deepen` | The architectural vocabulary, regime, and process | [ADR-0064](0064-install-all-skills-with-contextual-guidance.md) |
| [0021](0021-diagnose-discipline.md) | The four-profile framing of `ad-diagnose` registration, and only the framing: registration was already universal across all four profiles, so no installation outcome changed here | The diagnosis discipline, its dual-host behavior, and the skill's presence on every install | [ADR-0064](0064-install-all-skills-with-contextual-guidance.md) |
| [0036](0036-ad-audit-maximum-gate.md) | Profile-based installation scope for `ad-audit` | The maximum-gate audit process and evidence requirements | [ADR-0064](0064-install-all-skills-with-contextual-guidance.md) |
| [0053](0053-ad-roadmap-progress-rollup.md) | Profile-based installation scope; the absolute frontmatter-only read; percentage-first presentation; ownership of the shared thirty-second decision-maker presentation; the absolute PRD-or-local-task-only plan source | The read-only roadmap rollup, calculation and classification rules, with project-default and explicit task scopes, a narrow active-task read, nested task-and-subtask checklists, and configured evidence reconciled through the same ownership boundary | [ADR-0064](0064-install-all-skills-with-contextual-guidance.md); its own 2026-09-09 addendum; [ADR-0076](0076-compose-a-canonical-decision-maker-brief.md); [ADR-0079](0079-compose-configurable-project-evidence.md) |
| [0054](0054-ad-question-me-value-first-questioner.md) | Profile-based installation scope for `ad-question-me` | The value-first questioner behavior | [ADR-0064](0064-install-all-skills-with-contextual-guidance.md) |
| [0060](0060-ad-research-evidence-graded-studies.md) | Profile-based installation scope for `ad-research`, and the absolute artifact-free boundary for `ad-ground` | The evidence-graded study process, distinct from `ad-ground`'s implementation receipt | [ADR-0064](0064-install-all-skills-with-contextual-guidance.md); [ADR-0070](0070-persist-grounded-decision-evidence.md) |
| [0061](0061-ad-derisk-orchestrator.md) | Profile-based installation scope for `ad-derisk` | The uncertainty-retirement orchestrator | [ADR-0064](0064-install-all-skills-with-contextual-guidance.md) |
| [0032](0032-ci-failure-is-local-gate-gap.md) | The Linux + macOS CI example and realized runner set | The local-gate parity rule and every other decision in the record | [ADR-0065](0065-run-ci-on-windows.md) |
| [0065](0065-run-ci-on-windows.md) | The realized Node version pair, Node 20 and Node 22 | The two-operating-system matrix, the four-check `protect-main` requirement, and the unchanged local pre-push gate | [ADR-0078](0078-set-the-one-point-zero-quality-boundary.md) — CI now runs Node 22.13 and Node 24 |
| [0080](0080-build-a-bespoke-skill-evaluation-harness.md) | Item 10's promise that the pilot's captured streams replace the synthetic samples as tracked artifacts, and its `skill_invoked` rule for Claude Code, which the first pilot showed is incomplete | Every other part of item 10 and every other item of the decision; the synthetic samples stay, and the receipt freezes each capture's digest instead | Its own 2026-09-21 addendum, after the first live pilot; the capture decision is [ADR-0082](0082-capture-live-trials-through-a-supplied-runner.md) and the adapter correction is task-0082 |
| [0073](0073-skill-invocation-policy-and-listing-budget.md) | `ad-rules` membership in the user-invocable-only class | The blast-radius classification rule, every other named class member, and all listing budgets | [ADR-0076](0076-compose-a-canonical-decision-maker-brief.md) |

Two shapes appear above and they are checked differently. A **cross-record** amendment (0035, 0065) declares itself as a header-field pair — `Amends:` on one side, `Amended by:` on the other — which makes it verifiable without reading prose. A **self**-amendment (0007, 0047) has no second record to pair with: the record corrects itself in a dated addendum, marks the dead stanza in place, and this page is what makes it discoverable from the directory rather than only from inside the file. One record (0007) carries one of each, one per retired part, which is why the corrector column and not the row is the unit to read.

## Verifying this page

A keyword sweep is not the way in, and re-deriving why wastes the same hour twice. Scoped to numbered records — the unscoped form also matches this page — it over-reports, and by a margin that grows with every amendment, which is why no count is pinned here:

```sh
grep -ilE "supersed|replaces ADR|amends|revises ADR" [0-9]*.md
```

It fails in both directions at once, which is what makes it untrustworthy rather than merely noisy. It matches records that only *discuss* supersession — **0002** supersedes a pre-ADR CLI implementation rather than an ADR, and **0008** discusses the Nygard vocabulary as a concept. And it misses records whose relation is declared only as `**Amended by:**`, because the pattern spells the verb `amends`: **0032**, **0048**, and **0073** all sit in the table above and never appear in the sweep's output.

The reliable check reads the header fields and compares **relations, not filenames** — a record can appear in both lists, once as a corrector and once as corrected (0063 and 0065 both do), so the unit to match is the relation:

```sh
grep -H "^\*\*Amends:\*\*" [0-9]*.md      # each A→B here
grep -H "^\*\*Amended by:\*\*" [0-9]*.md  # needs its B→A there
```

This check covers cross-record amendments only. One class of retirement in the table above declares itself elsewhere and will not appear: a **self**-amendment, which lives in the record's own dated addendum and has no second record to pair with. Every other row is header-declared on both sides, so an unpaired relation in the two lists above is a defect, not an expected gap.
