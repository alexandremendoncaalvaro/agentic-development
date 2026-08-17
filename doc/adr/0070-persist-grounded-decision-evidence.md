# ADR-0070: Persist evidence for grounded decisions

**Status:** accepted
**Date:** 2026-08-12
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0060

## Context

The kit tells the agent to decide rather than ask when a four-source grounding
settles the path. It grades evidence in `WORKFLOW.md` §17 and asks `ad-ground`
to cite sources, but its result is a chat message. That message is easy to
lose, cannot reliably be linked from the changed work, and leaves an auditor
unable to distinguish an observed source from a plausible hallucination.

The owner requires the autonomy rule to retain a durable audit path: a decision
may proceed without a question when evidence is sufficient, but the evidence
it relied on must be inspectable later. The ground record for this decision is
[GROUND-0002](../research/0002-ground-durable-evidence.md). It finds that
provenance needs a decision-to-source activity map, structural validation can
make omissions visible, and this repository already owns durable evidence in
`doc/research/` while ADRs retain concise binding decisions.

ADR-0060 deliberately kept `ad-ground` artifact-free so it would not become a
research-to-conclusion skill. The owner requirement changes that constraint:
a small receipt for an implementation path is required, while the two skills'
questions and stopping criteria remain distinct.

## Decision

We will make a material grounded decision auditable before it directs
repository work.

1. **`ad-ground` writes a durable receipt.** For a non-trivial implementation
   decision, it writes `doc/research/NNNN-ground-<slug>.md` before repository
   work. The record contains the selected path, its confidence, one evidence
   section per load-bearing claim, a source register covering Sources A through
   D, access date and method, limitations, reversal evidence, and an audit
   command. Quick mode remains proportionate in depth, not ephemeral in
   provenance.
2. **The receipt is linked to what it governs.** A task receives `Evidence ref`
   when it has a record; a spec or ADR references it in the decision it
   supports. The receipt names that decision in `Decision ref`. Existing
   historical tasks are not rewritten: their evidence stays where it was
   recorded, and the rule applies to new grounded implementation work.
3. **`ad-research` stays separate.** An evidence-graded study remains the
   durable record for an open question and does not create a second ground
   receipt during its Acquire phase. `ad-ground` records how to implement a
   path already decided; `ad-research` concludes what is true or which option
   to choose.
4. **Validate the map, then audit the source.** A bundled offline validator
   checks the record path, required metadata and sections, source coverage, and
   each claim's references. It reports content-read failures in `unreadable`.
   It cannot establish an external source's substance; `ad-review` or
   `ad-audit` reopens the cited sources. `valid: true` is a structural gate,
   not an evidence-truth claim.
5. **The universal rule is explicit.** `WORKFLOW.md` §17 now requires a
   versioned claim-to-source record for a material grounded decision, and
   `ad-philosophy` refuses to treat chat-only citations as sufficient grounding.

## Consequences

Positive:

- Autonomy stays fast: an agent decides on Strong evidence without escalating a
  settled fork, while the owner can audit exactly why later.
- A reviewer starts from one durable record rather than reconstructing the
  source trail from an expired conversation or a confident summary.
- The deterministic checker catches a missing source group, claim mapping, or
  unreadable record before implementation proceeds.
- Reusing `doc/research/` keeps evidence in the layer that already owns
  provenance and avoids a competing agent-only log.

Negative / trade-offs:

- Every material ground writes one more versioned file. Accepted: recording a
  small receipt is less costly than losing the basis of an autonomous decision;
  trivial one-sentence changes still skip `ad-ground`.
- The checker cannot verify remote truth. Accepted: it states the limit and
  moves substantive verification to review, where the source is reopened.
- `ad-ground` now writes an artifact, partially amending ADR-0060's absolute
  artifact-free boundary. Its purpose remains implementation-path grounding,
  not open-question research.

## Alternatives Considered

- **Keep citations only in the chat or final report** — rejected. Those vanish
  with the session and cannot be reliably linked to the work they justified.
- **Add a new Agent Decision Record directory and skill** — rejected. It would
  duplicate the repository's existing ADR, task, and research ownership model.
- **Put the full evidence trail inside every ADR** — rejected. ADR-0060 already
  establishes that the ADR owns the decision while `doc/research/` owns the
  reproducible evidence.
- **Require a full research study for every implementation path** — rejected.
  It blurs `ad-ground` with `ad-research` and turns a small reversible change
  into ceremony; the concise ground receipt preserves proportionality.
