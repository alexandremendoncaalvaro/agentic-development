# ADR-0049: Append-only layers own a state projection in their own directory

**Status:** accepted
**Date:** 2026-08-06
**Deciders:** Alexandre Alvaro
**Amends:** [ADR-0030](0030-single-responsibility-per-document.md) — retires the absolute reading of its directory-as-index decision for a layer's *own* directory. The no-digest rule is otherwise unchanged, and every other decision in that ADR still binds.

## Context

Reading a decision layer to find out what still binds costs a full pass over every record in it. Measured in this repo on 2026-08-06:

```sh
grep -ihoE "^\*\*Status:\*\* *[a-z ]+" doc/adr/*.md | sed 's/\*\*//g' | sort | uniq -c
grep -ilE "supersed|replaces ADR|amends|revises ADR" doc/adr/*.md
```

All 24 ADRs read `Status: accepted`. The keyword sweep flags seven files, but three are false positives — ADR-0002 supersedes a pre-ADR CLI implementation rather than an ADR, ADR-0008 discusses the Nygard supersession vocabulary, and ADR-0030 states it "augments rather than supersedes". The real relations are three, across four files: ADR-0043 amends ADR-0035, and ADR-0007 and ADR-0047 each retire one stanza of their own decision by dated addendum.

Two facts follow, and they point away from the obvious diagnosis:

- **`Status: accepted` is correct in all three cases.** No ADR here was superseded as a *document*. What died was one consequence stanza, one decision's realization, and one rejected alternative. Supersession in practice is sub-document; the `Status:` field is whole-document. The template offers no vocabulary for the gap, so each case invented its own: a `**Amended by:**` header field (ADR-0035), a dated `## Addendum` section with inline markers (ADR-0007, ADR-0047), and a prose sentence in the Decision body (ADR-0043). Three notations, none in [`templates/adr.md`](../../templates/adr.md), none tested. The fourth case will invent a fourth.
- **A header scan of all 24 files surfaces one of the three relations.** Only ADR-0035 puts its amendment in the header block. The other two are visible only by reading bodies, so answering "which of these still bind?" means opening the directory one file at a time — the cost this layer exists to avoid.

The mechanism is a rule of our own. [`WORKFLOW.md`](../../WORKFLOW.md) §2 rule 10 gives each layer its directory as the canonical index and forbids other documents from listing, digesting, or re-stating it; `ad-philosophy` states the corollary as "filesystem listing is the index". A filesystem listing carries names, not state. Rule 10 as written therefore leaves a state projection with no legal home anywhere, and no index file exists in `doc/adr/`, `doc/tasks/`, `doc/specs/`, or `doc/product/`.

The projection appeared regardless, in the worst available place: `AGENTS.md` claims "Binding ADRs: see `doc/adr/` (all accepted)" — a hand-maintained digest of another layer's index, inside a definition document, which is precisely what rule 10 forbids. It is true today, becomes false at the first deprecation, and nothing checks it. Rule 10's purpose is to stop the same content living in five places; a single projection owned by its own layer serves that purpose rather than violating it.

## Decision

1. **Rule 10 gains a projection carve-out.** A layer whose artifacts are append-only — decision records, whose immutability after acceptance is rule 9's contract — may own **one** state projection **inside its own directory**. The no-digest prohibition is unchanged for every document outside that layer: the carve-out is about who may hold the projection, not about relaxing anti-duplication. A projection that lists records without saying what still binds is a duplicate index and stays forbidden.

2. **`templates/adr.md` carries both directions of an amendment**, as optional header fields following the notation ADR-0035 already uses: `**Amends:**` on the amending ADR and `**Amended by:**` on the amended one. Both are needed, and the pair — not either field alone — is what makes the relation checkable without reading prose. Full supersession keeps the existing `Status:` vocabulary; these fields are for the partial case the status field cannot express.

   Writing the second half means editing an already-accepted record, which ADR-0038 otherwise forbids ("accepted ADRs are not swept"). That prohibition targets mechanical rewrites of a record's *substance*; adding a header field that records a *new* relation is the append-only act itself, and the body stays untouched. `ad-adr` may therefore write that one line into the amended record, on explicit confirmation only, and never anything else — the narrowest latitude that lets the pair exist. Declining is valid; `ad-drift` then reports the unpaired relation.

   A record that retires part of *itself* by dated addendum (ADR-0007, ADR-0047) has no second record to pair with, so it gets no field: it already marks the dead stanza in place, and the projection is what makes it discoverable from the directory instead of only from inside the file. The field pair covers the cross-record case, which is the one a reader cannot see without opening both.

3. **`doc/adr/PROJECTION.md` is the kit's first projection**, and `AGENTS.md`'s "(all accepted)" claim is deleted rather than corrected. The name is deliberate: "index" is already rule 10's word for the filesystem listing, and "state" is already taken in this kit by the install state files (`agentic-state.json`), so both would collide. Maintained by hand, in the same commit as any decision that changes what binds; correctness is enforced by the `ad-drift` cross-reference check, not by a generator.

4. **Permitted, not required, and shipped with a revisit trigger.** No project owes a projection. `ad-drift` reports an amendment relation one side does not reflect (a contradiction between two live records); it does not report a missing projection. Requiring one would mean inventing an unmeasured record-count threshold, and this kit has already recorded that a signal firing everywhere stops informing. Revisit trigger: once a projection has survived at least one full quarter across more than one repository, re-decide whether absence becomes a finding, with the threshold read from those repositories rather than chosen.

5. **`WORKFLOW.md` §1 gains a read contract, and `ad-philosophy` delivers it on both hosts.** Three rungs: every definition-role document always; an area's decision records only when the change touches that area, entering through the layer's projection when it has one; the evidence behind a decision only when the decision looks wrong. The projection is what makes rung 2 land in one read instead of N, so the two halves are one decision — a projection nobody is directed to is as good as absent, and a read contract whose middle rung has no entry point sends the agent back to the whole directory.

6. **`init` and `update` write `WORKFLOW.md` and `WORKFLOW-FLOWS.md` to the target root, and never overwrite a diverged copy silently.** Twenty-one installed skills cite the constitution by section and the installer's own completion hints print those numbers, against a file no target had — the read contract added the twenty-first, which is what forced this. Kit-owned settles who *authors* the content; it does not license deleting a user's edits. A target that diverged is reported and skipped; only `--force` replaces it, matching the default `installSkills` already holds. Recorded as its own decision because this repo treats an install-target change as ADR-worthy (ADR-0048 rejected "task alone" for the same reason).

No profile gate on any of the above. The comparators that scope by profile (`ad-deepen`, `ad-audit`) do so because they impose work; a permission imposes none, so gating it would be ceremony with nothing behind it.

## Consequences

Positive:

- Answering "what still binds in this layer?" becomes one file instead of N, which is the complaint that opened this work.
- The three ad-hoc partial-supersession notations converge on one templated pair, so the next case has a shape to follow instead of one to invent.
- Because both directions are declared as fields, the drift check is cross-reference integrity — deterministic, no semantic judgment per case. This removes the failure mode the originating proposal named as its own kill signal for the check.
- An unmaintainable hand digest leaves `AGENTS.md`, and the anti-duplication rule stops being the reason the projection had nowhere to live.

Negative / trade-offs:

- A hand-maintained projection can go stale between the decision and the check that catches it. Accepted: the alternative is a generator, which is more machinery than a layer of this size earns, and the drift check bounds the staleness window.
- The projection restates each record's status by construction. Bounded deliberately: it carries state and the corrector's identity, never the rationale, which stays in the record.
- Rule 10 grows an exception, and exceptions cost more to remember than flat rules. The alternative was leaving the projection illegal while it existed anyway in four places, which costs more.
- The practice ships unmeasured beyond this repository. Named as such above with an explicit revisit trigger rather than presented as validated.

## Alternatives Considered

- **Archive superseded decisions, keeping only the live set visible.** Rejected. A stage is genuinely superseded — a plan replaces a design and nobody needs the design to execute. A decision is not: a reader who sees only "include by default" loses that it was once "exclude" and why it changed, which is exactly what stops someone reverting it for the reason it was already tried. Mark state; do not hide.
- **One file per decision entry instead of a projection over them.** Rejected as a misframing. The correction chains are the most instructive part of a decision layer, and reading them in sequence shows the reasoning correcting itself. The real axis is a layer with a projection versus one without, not one file versus many.
- **Generate the projection from the records.** Rejected for now under simplicity: a new script, install routing, and tests to replace an edit that the drift check already verifies. Reconsider if a layer outgrows hand maintenance.
- **Extend the `Status:` vocabulary with a partially-superseded value instead of adding fields.** Rejected: it puts sub-document information in a whole-document field, so a reader still has to open the file to learn which part died, and it breaks the Nygard vocabulary that `ad-archive` and `ad-drift` both read.
- **Keep the digest in `AGENTS.md` and fix it by hand.** Rejected: it is the rule-10 violation that motivated this ADR, it sits in a definition document that must describe the present, and nothing was checking it.
- **Require a projection once a layer passes a record count.** Rejected for this ADR, with the revisit trigger in Decision 4. The threshold would be a guess, and this kit's own experience is that a check firing everywhere trains bypassing.
