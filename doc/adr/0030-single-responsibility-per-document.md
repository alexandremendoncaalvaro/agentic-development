# ADR-0030: Single-Responsibility-per-Document principle and directory-as-index rule

**Status:** accepted
**Date:** 2026-05-11
**Deciders:** Alexandre Alvaro

## Context

A cross-reference-density audit surfaced widespread responsibility-leak across the kit's documents. Concrete evidence:

- **`ARCHITECTURE.md`** carried a `## Active ADRs` section that duplicated the `doc/adr/` directory listing — 26 ADR links inside a document whose stated scope is system patterns and dependency rules. Stale by construction (ADRs 0027/0028/0029 had landed without the section being updated).
- **`AGENTS.md`** `## Architectural Principles` section restated 10 ADR decisions as bullets — an ADR digest inside the session-load operational guide. Each bullet duplicated content that the linked ADR already owned canonically.
- **`WORKFLOW.md`** — kit-shipped universal philosophy doc — cross-referenced kit-specific ADR numbers (0019, 0020, 0021, 0027, 0028, 0029) in `§1` Layer descriptions and `§8` / `§15` / `§16` content. Downstream projects receiving `WORKFLOW.md` via the npm package do not have the kit's `doc/adr/` and would see dead links.
- **`doc/product/PRD.md`** and **`GUIDELINES.md`** (kit dogfood) used checkbox UI in Goals / Success Metrics / Object-Calisthenics-tier sections — tracking semantics injected into definition-layer documents.
- **Spec layer** (`ad-spec` skill) toggled Success-Criteria checkboxes "as the feature lands incrementally" — contract + tracking responsibility mixed inside one artifact.

WORKFLOW §2 already states eight documentation rules, but the existing wording does not operationalize the principle the audit exposed:

- **Rule 1** ("Definitions and decisions only. No speculation, history, or unfounded plans.") forbids speculation; a checkbox toggling tracking status is not speculation. The rule passes a doc that mixes definition with per-item tracking UI.
- **Rule 5** ("One scope per document. No duplication.") is the closest, but "scope" is ambiguous between *topic* and *responsibility role* — a doc can be on-topic about its layer (passing Rule 5 by topic) while taking on adjacent layers' responsibilities (failing the spirit of Rule 5 by role).

The result: every document accumulates cross-references and tracking UI over time. Maintenance cost grows with the size of the ADR ledger because every digest needs syncing. Readers face duplicated information sources and cannot tell which is canonical.

## Decision

Adopt five operational rules. WORKFLOW §2 carries the principle; this ADR carries the rationale and concrete enforcement.

### 1. Single responsibility per document

Each document has **one role**, named by its layer:

- **Definition** documents (Layer 1 trinity — `WORKFLOW.md` / `AGENTS.md` / `GUIDELINES.md`; Layer 2 `CONTEXT.md`; Layer 3 `doc/product/PRD.md`; the `ARCHITECTURE.md` portion of Layer 5) — **pillar; read-mostly after defined.** No per-item tracking UI. Updates are conceptually rare; when they happen they are append-only or single-line edits.
- **Decision-record** documents (Layer 5 ADRs in `doc/adr/`; Layer 4 specs in `doc/specs/`) — lifecycle status (`proposed` → `accepted` → `shipped` / `superseded`) but mostly immutable after acceptance. Status field, not granular checkbox tracking.
- **Tracking** documents (Layer 5 tasks in `doc/tasks/`) — full tracking UI is their job. Checkbox toggles + append-only Notes are correct.

A document that takes on adjacent layers' responsibilities (definition doc with tracking checkboxes; decision-record with full tracking UI) violates this rule.

### 2. Directory-as-index — each layer owns its own index

`doc/adr/`, `doc/tasks/`, `doc/specs/`, `doc/product/` are the **canonical indices** of their respective layers. Filesystem listing serves the index function. Other documents **do not duplicate these indices**.

Concrete prohibitions:

- `ARCHITECTURE.md` does not list ADRs. The `## Active ADRs` pattern is removed.
- `AGENTS.md` does not digest ADRs. The `## Architectural Principles` 10-bullet pattern is replaced with a one-line pointer to `doc/adr/`.
- `WORKFLOW.md` (universal) does not cite kit-specific ADR numbers.
- Cross-references to a layer's content go *into* the layer's directory, not through a digest document.

### 3. Cross-references must be load-bearing

Test: if the reference is deleted, does the surrounding statement still stand?

- **Yes** → the reference is decoration. Drop it.
- **No** → the reference is load-bearing. Keep it.

Example. *"The kit's `ad-prd` skill produces `doc/product/PRD.md` per ADR-0027"* — the ADR reference adds nothing the sentence doesn't already say (the skill produces the artifact). Drop the cite. The ADR exists in `doc/adr/` and is discoverable through normal browsing.

Counter-example. *"The Domain layer adopts ubiquitous-language discipline from Evans (2003, DDD ch. 2)"* — the literature citation IS load-bearing because the principle's authority comes from the cited source. Keep the cite.

### 4. Universal-vs-kit-state separation in `WORKFLOW.md`

`WORKFLOW.md` ships to downstream projects via the npm package's `files` field. Downstream projects do **not** have the kit's `doc/adr/`. Any kit-specific ADR number cited in `WORKFLOW.md` is a dead link downstream.

`WORKFLOW.md` carries **universal principles**. The kit's adoption of those principles is recorded in `doc/adr/` (kit-internal). The two responsibilities are decoupled. Concretely:

- `WORKFLOW §1` describes the six-layer artifact stack as a universal principle. It does **not** name `ADR-0019` / `ADR-0027` / `ADR-0029` as the records of the kit's adoption.
- `WORKFLOW §8` describes the Module / Interface / Depth / Seam vocabulary as universal. It does not cite `ADR-0020`.
- `WORKFLOW §15` describes the diagnose discipline as universal. It does not cite `ADR-0021`.
- `WORKFLOW §16` describes TDD as a universal regime. It does not cite `ADR-0028`.

The literature citations (Evans, Ousterhout, Feathers, Beck, Kernighan & Pike, Hunt & Thomas) stay — those are universal load-bearing references.

### 5. Definition / decision-record / tracking role distinction

Documented in [WORKFLOW §2](../../WORKFLOW.md). Operational consequences:

- Definition docs forbid checkbox UI for tracking.
- Decision-record docs have a single `Status:` field; no granular per-item tracking.
- Tasks are the only documents allowed full tracking UI.
- The `Spec` layer (currently contract + tracking hybrid) becomes **pure contract** — Spec Success Criteria are stated, not checked. Per-spec tasks own implementation tracking. Spec `Status:` flips when all related tasks complete.

## Consequences

**Positive.**
- Each document has clear, single responsibility. Maintenance burden shrinks because docs no longer duplicate adjacent indices.
- `WORKFLOW.md` becomes truly universal — downstream projects receive it cleanly without dead kit-specific ADR links.
- Definition layers stay immutable / read-mostly. Tracking concentrates in tasks where it belongs.
- Reader navigation simpler: one canonical source per concern.

**Negative.**
- Multiple existing documents need migration: `ARCHITECTURE.md`, `AGENTS.md`, `WORKFLOW.md`, `GUIDELINES.md`, `doc/product/PRD.md`, plus the `ad-spec` skill behavior.
- Some load-bearing-vs-decoration calls are judgment. The rule's enforcement requires reading the surrounding statement, not just grep counting ADR refs.

**Neutral.**
- The Spec layer change is concept-only; zero feature specs exist in the kit's `doc/specs/` today.

## Alternatives considered

- **Status quo (each document carries its own digest of adjacent layers).** Rejected per audit findings — cross-doc maintenance grows linearly with the ADR / task / spec count. Already producing stale digests (`ARCHITECTURE.md ## Active ADRs` was 26 ADRs while the ledger had 29).

- **Forbid all cross-references.** Rejected: load-bearing references *are* useful (they link to the canonical source). The rule is "load-bearing only", not "none".

- **Keep `WORKFLOW.md` cross-coupled to kit-state ADRs**, accept dead links in downstream installs as cost of kit-internal coherence. Rejected: WORKFLOW's value proposition is universal applicability; dead links degrade that.

## References

- [WORKFLOW.md §2](../../WORKFLOW.md) — eight rules extended by this ADR with the single-responsibility principle.
- [ADR-0008](0008-documentation-discipline.md) — canonical Documentation Discipline ADR; this ADR augments rather than supersedes.
- Cross-reference-density audit baseline: `ARCHITECTURE.md` = 35 ADR refs; `AGENTS.md` = 18; `GUIDELINES.md` = 13; `WORKFLOW.md` = 11; `README.md` = 9; `PRD.md` = 11. Pillar docs (`AGENTS.md`, `WORKFLOW.md`, `ARCHITECTURE.md`) at 0 checkbox UI; pillar dogfood docs (`GUIDELINES.md`, `PRD.md`) at 10 / 11 checkbox UI — the divergence motivated this ADR.
