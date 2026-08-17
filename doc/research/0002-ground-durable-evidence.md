# GROUND-0002: Durable evidence for grounded decisions

**Status:** recorded
**Decision:** Persist a claim-to-source ground record in `doc/research/` before a material implementation decision directs repository work.
**Decision ref:** doc/tasks/0056-persist-grounded-decision-evidence.md
**Confidence:** Strong

## Decision and confidence

Keep the existing evidence directory and decision artifacts rather than add an
agent-specific decision-log layer. `/ad-ground` writes one concise `GROUND`
record for an already-defined implementation path; the record links claims to
the four research sources and the governing task, spec, or ADR. The existing
`ad-research` study remains the record for an open question, so it does not
also generate a ground receipt. Confidence is Strong: provenance records make
the origin and process behind an output inspectable, a practical agent-decision
implementation demonstrates a small structured record plus mechanical
validation, and this repository already separates evidence studies from ADR
decisions.

## Evidence

### E1 — An auditor needs a durable map from a decision to its sources and the activity that used them.

**Strength:** High
**Provenance:** A1, B1

The W3C provenance model describes records in terms of entities, activities,
and responsible agents so a later reader can assess trust and reproduce how an
output was generated. The implementation reference applies the same practical
shape to coding agents: versioned Markdown beside the governed code, required
decision fields, and structural validation. Neither source proves this kit's
exact layout, but together they establish the auditability requirement and a
small repository-native realization.

### E2 — `doc/research/` is the existing home for evidence, while an ADR remains the concise binding decision.

**Strength:** High
**Provenance:** C1, C2

ADR-0060 explicitly separates a provenance-carrying study from an ADR and
places durable evidence under `doc/research/`; WORKFLOW §17 already requires
claim provenance, confidence, and a reversal condition. Reusing that owner
keeps the new receipt from becoming a parallel seventh documentation layer.

### E3 — A structural checker can make missing provenance visible but cannot verify a source's substantive claim.

**Strength:** Medium
**Provenance:** B1, C3, D1

The implementation reference validates record shape and links, while the
repository's prior evidence work added deterministic probes specifically where
machine-checkable facts were being inferred from prose. The same limit remains:
a local checker can validate the claim-to-source map; review must reopen the
sources rather than accept the agent's summary as proof.

## Source register

- **A1:** [W3C PROV Model Primer](https://www.w3.org/TR/prov-primer/), §§1–2.4 — provenance records describe entities, activities, and responsible agents for trust and reproducibility (accessed 2026-08-12 via WebFetch).
- **B1:** [Agent Decision Records](https://github.com/me2resh/agent-decision-record), record shape and validation sections — a repository-local decision record with required fields and a validator (accessed 2026-08-12 via WebFetch).
- **C1:** [ADR-0060](../adr/0060-ad-research-evidence-graded-studies.md) — `doc/research/` owns the evidence trail while ADRs own the decision (accessed 2026-08-12 via Read).
- **C2:** [WORKFLOW.md](../../WORKFLOW.md) §17 — provenance, confidence, and reversal conditions are already canonical (accessed 2026-08-12 via Read).
- **C3:** [ADR-0047](../adr/0047-absorb-team-practices-determinism-reaudit.md) — deterministic probes validate observable facts, not an agent's unverified narrative (accessed 2026-08-12 via Read).
- **D1:** `git log --all --oneline -- WORKFLOW.md src/skills/claude-code/ad-ground src/skills/codex/ad-ground` — `6808744` introduced evidence grading and `2c74488` added deterministic scope admission, establishing the repository pattern of pairing a skill contract with a tested probe (accessed 2026-08-12 via Bash).

## Limitations and reversal

This record cannot establish that a remote page will remain available or that
an agent faithfully summarized it. An auditor must reopen sources, and a
failed or contradicted source changes the decision from Strong to Conditional
or Insufficient. The decision should be revisited if a routine low-risk change
shows that its receipt costs more attention than the work it protects, or if a
review finds the record template permits an unsupported conclusion.

## Audit path

Run `node .agents/skills/ad-ground/scripts/validate-record.mjs doc/research/0002-ground-durable-evidence.md`, then reopen A1 through D1. The script confirms the evidence map; source inspection confirms the claims.
