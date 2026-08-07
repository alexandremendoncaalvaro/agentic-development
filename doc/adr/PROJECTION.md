# ADR state projection

Without this file, learning which architectural decisions still bind costs one pass over every record in this directory. The `Status:` field answers that question per *document*, and in practice supersession here has been per *stanza* — one consequence retired, one alternative reversed, one decision's realization replaced — so a record can read `accepted` while a named part of it is dead. This page is where that difference is visible in one screen. It carries state and the identity of the corrector, never the rationale: the rationale stays in the record, which is the only place it is safe to read it from.

**The rule that keeps it true:** a change to what binds touches this file in the same commit as the record — accepting an ADR, or superseding/deprecating one. Merely *proposing* an ADR is not such a change: a `proposed` record binds nothing, so it stays out of this projection until it is accepted (the commit that accepts it is the one that adds it here). `/ad-drift` reports an amendment relation whose two sides disagree; it cannot report a projection nobody updated, so the same-commit habit is the actual guarantee. Sanctioned by `WORKFLOW.md` §2 rule 10, which permits exactly one state projection per append-only layer, inside that layer's own directory.

## Default

All 28 accepted ADRs bind in full, except the four below, which bind except for the named part.

No ADR in this directory has been deprecated or superseded as a whole document. A `proposed` ADR is not counted here and does not appear until it is accepted — it binds nothing until then, and its acceptance is the change to what binds that adds it (see *The rule that keeps it true*).

## Binding with a part retired

| ADR | Retired | Still binding | Retired by |
|---|---|---|---|
| [0007](0007-workflow-operational-skills.md) | The Codex `/clear` + handoff choreography for fresh-context review, and its "feature parity is imperfect" consequence | The workflow-operational skill category itself, and every other item of the decision. The Claude Code path was never affected | Its own addendum, after Codex shipped a subagent primitive |
| [0035](0035-rules-location-convention.md) | The rejection of a per-repo `.agentic/rules/` layer, for project scope only | The machine store and its resolution order, unchanged | [ADR-0043](0043-per-project-rules-layer.md) |
| [0030](0030-single-responsibility-per-document.md) | The absolute reading of directory-as-index, for a layer's *own* directory only | The single-responsibility-per-document principle, and the ban on any *other* document digesting a layer's index | [ADR-0049](0049-append-only-layers-own-a-state-projection.md) — the decision that created this page |
| [0047](0047-absorb-team-practices-determinism-reaudit.md) | Decision 1's *realization* as inline shell copied into two skill files — not Decision 1 itself | The deterministic resolution probe as a requirement, and Decisions 2 through 4 | Its own addendum, after task-0031 shipped the probe as a skill script |

Two shapes appear above and they are checked differently. A **cross-record** amendment (0035) declares itself as a header-field pair — `Amends:` on one side, `Amended by:` on the other — which makes it verifiable without reading prose. A **self**-amendment (0007, 0047) has no second record to pair with: the record corrects itself in a dated addendum, marks the dead stanza in place, and this page is what makes it discoverable from the directory rather than only from inside the file.

## Verifying this page

A keyword sweep is not the way in, and re-deriving why wastes the same hour twice. Scoped to numbered records — the unscoped form also matches this page — it reports eight:

```sh
grep -ilE "supersed|replaces ADR|amends|revises ADR" [0-9]*.md
```

Six of the eight are the records named in the table above plus their correctors. The other two are false positives: **0002** supersedes a pre-ADR CLI implementation rather than an ADR, and **0008** discusses the Nygard supersession vocabulary as a concept.

The reliable check reads the header fields and compares **relations, not filenames** — the two file lists are disjoint by design, because the halves of one relation live in different records:

```sh
grep -H "^\*\*Amends:\*\*" [0-9]*.md      # each A→B here
grep -H "^\*\*Amended by:\*\*" [0-9]*.md  # needs its B→A there
```
