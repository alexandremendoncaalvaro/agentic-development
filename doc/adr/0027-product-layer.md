# ADR-0027: Product layer (`PRD.md`) as Layer 3 of the artifact stack and `ad-prd` skill

**Status:** accepted
**Date:** 2026-05-10
**Deciders:** Alexandre Alvaro

## Context

`WORKFLOW.md` §1 (post-[ADR-0019](0019-domain-language-layer.md)) defined a five-layer artifact stack: Constitution (`AGENTS.md` + `WORKFLOW.md`), Domain (`CONTEXT.md`), Spec (`doc/specs/`), Plan/Decisions (`ARCHITECTURE.md` + ADRs + tasks), Code. Layer 3 — Spec — was framed as feature-level: *one feature, one spec*.

This kit's `ad-spec` description treats the **PRD** (Product Requirements Document) as a synonym for the feature spec — accepting "feature spec, PRD, product requirements, feature brief, user stories" as the same artifact. This conflates two industry-standard concepts:

- **PRD** is product-level. It scopes a product (or a product line): the target user, the problem, the multi-feature roadmap, the success metrics that bind *across* features, the explicit non-goals at product scope, the market or business constraints.
- **Feature spec** is feature-level. It scopes one feature inside the product: user scenarios, functional / non-functional requirements, the success criteria for *this* feature.

The consequence of conflation is that product-level *why* has no home in the kit. Today it leaks into either:

- **`§Context` of every feature spec.** The product motivation gets restated in each spec, drifts across them, and the canonical product framing exists nowhere.
- **`AGENTS.md`.** Operational-guide bloat — violates [ADR-0008](0008-documentation-discipline.md) rule #4 (business context first applies to artifacts, but business context *as its own artifact* has no layer) and rule #5 (one scope per document).

The pattern that closes the gap is the standard PRD — see [Atlassian's PRD guide](https://www.atlassian.com/agile/product-management/requirements) and [Aha! PRD template](https://www.aha.io/roadmapping/guide/requirements-management/product-requirements-document) for canonical shapes. A PRD is a short, opinionated document that names the product, its target user, the problem it addresses, the success metrics at product scope, and the multi-feature roadmap; feature specs reference back to it for cross-feature coherence.

The placement question — *where in the layered stack does PRD go?* — has the same shape as ADR-0019's Domain placement question:

- **Fold into Constitution (`AGENTS.md` section).** Rejected: Constitution answers *how the project is built*; PRD answers *what the product is and why*. Same conflation that motivated separating Domain out per ADR-0019. Bloats `AGENTS.md`.
- **Fold into Spec (one `PRD.md` inside `doc/specs/`).** Rejected: PRD scope (multi-feature, product-level) and Spec scope (one feature) violate "one scope per document"; a PRD is not a spec because no individual feature implements it.
- **New layer between Domain and Spec.** Product comes after vocabulary (Domain) and before feature requirements (Spec), because Spec inherits product-level scope, success metrics, and target user from PRD. **Accepted.**

## Decision

Add a sixth layer to the stack: **Layer 3 — Product (`PRD.md`)**, between Domain (Layer 2) and Spec (now Layer 4). Downstream layers renumber: Spec → 4 (was 3), Plan/Decisions → 5 (was 4), Code → 6 (was 5).

1. **File location.** Single-product repos: `doc/product/PRD.md`. Multi-product repos: `doc/product/<product-slug>.md` files. The `doc/product/` directory mirrors `doc/specs/` placement. (Root placement was considered but rejected: `PRD.md` at root crowds the operational docs already there per [ADR-0006](0006-architecture-md-at-repo-root.md), and `doc/product/` keeps product documents grouped.)

2. **Content shape.** Markdown sections — Product, Target User, Problem, Goals, Non-goals, Success Metrics (product-scope), Roadmap (multi-feature scope), Constraints (regulatory / business / technical that bind across features), Related (feature specs that implement parts of the PRD, ADRs touched). The template ships under `templates/prd.md`. Status lifecycle: `draft` → `accepted` → `superseded by <slug>`; no `shipped` status (PRDs do not ship — features do).

3. **Lazy creation.** The file does not exist until the product is being scoped. Mirrors `CONTEXT.md` lazy lifecycle per [ADR-0019](0019-domain-language-layer.md) §3. Empty `PRD.md` invites speculation and is worse than no `PRD.md`.

4. **Profile coverage.** PRD is `spec-driven` category (produces an artifact) per [ADR-0007](0007-workflow-operational-skills.md). Installs in **solo / team / mature** profiles; **excluded from poc** because a spike or experiment by definition has not scoped a product yet — adding a PRD to a 200-line throwaway is ceremony that does not change agent behavior. Same profile posture as `ad-spec`.

5. **Authority.** `PRD.md` is **canonical** per [WORKFLOW.md §1's three context types](../../WORKFLOW.md): feature specs must reference it for product-scope inheritance (target user, multi-feature success metrics, product constraints). A feature spec that contradicts the PRD is a drift signal that `ad-audit` will flag.

6. **Reciprocity rules with adjacent artifacts.**
   - **Spec → Product.** Specs inherit target user and product-level success metrics from the PRD. A feature spec whose target user or success metric contradicts the PRD must be resolved — either the PRD updates or the spec updates.
   - **PRD → Domain.** PRD uses the glossary (`CONTEXT.md`) for canonical nouns. PRD does **not** define vocabulary; that belongs to Layer 2.
   - **PRD → ADR.** Architectural decisions driven by product constraints reference the PRD in the ADR's `Context` section. ADRs that name product-strategic constraints belong here; ADRs that name engineering trade-offs stay engineering-scoped.

7. **No grill-coupling.** The `ad-grill` skill (interview-before-research per [ADR-0022](0022-agentic-grill-skill.md)) plays a role in resolving PRD fields when the user's product framing is fuzzy, but `ad-prd` is **not** a sub-mode of `ad-grill`. Grill stays general-purpose; the PRD skill is the file lifecycle owner. Cross-routing happens at session boundaries, not inside either skill.

8. **No renumbering of older ADRs or existing tasks** per [ADR-0019](0019-domain-language-layer.md) §7's precedent. Only WORKFLOW §1 layer indices shift forward. Live skills referencing the old numbering (`ad-spec`, `ad-bootstrap`, `ad-next`) update forward so the active surface matches; older ADRs stay frozen.

9. **Coupling.** The WORKFLOW §1 layer renumber, the `ad-prd` skill, the `templates/prd.md` template, the `profiles.js` registration, and the README / AGENTS skill-table updates land together. The kit must never reference Layer 3 without the skill that owns the layer.

## Consequences

**Positive.**
- Closes the PRD-vs-feature-spec conflation. Product-level *why* gets a home; feature specs inherit from it instead of restating it.
- Anchors product success metrics across multiple feature specs. Drift between specs and product framing becomes auditable.
- Pairs naturally with `ad-grill` for fuzzy product scoping and with `ad-spec` for feature-level decomposition. The artifact stack now reads top-down: vocabulary → product → features → plan → code.

**Negative.**
- Renumbers `WORKFLOW.md` §1 layer indices (Spec was Layer 3, now Layer 4; Plan/Decisions was Layer 4, now Layer 5; Code was Layer 5, now Layer 6). Live skills update forward; older ADRs stay frozen per [ADR-0019](0019-domain-language-layer.md) §7.
- Adds one more authoritative document for solo+ profiles. Mitigated by lazy creation and the explicit poc exclusion — PoC users see no new ceremony.
- The `ad-spec` skill description must drop "PRD" from its synonym list to stop conflating layers. Same update removes a small amount of trigger-keyword breadth from `ad-spec` (intentional — PRD invocations should route to `ad-prd`).

**Neutral.**
- The `doc/product/` directory pattern mirrors `doc/specs/` and `doc/adr/` shapes; no new convention.

## Alternatives considered

- **Stay at 5 layers; expand Spec to host both PRD-scope and feature-scope artifacts.** Rejected: violates one-scope-per-document ([ADR-0008](0008-documentation-discipline.md)). A PRD is not a spec because no single feature implements it; treating them as siblings inside one layer corrupts both.

- **Stay at 5 layers; treat PRD as ephemeral context fed into `ad-spec`, not a separate artifact.** Rejected: the resolution evaporates with the session unless captured durably (same logic that motivated `CONTEXT.md` in [ADR-0019](0019-domain-language-layer.md)). Without a file, product-level success metrics drift across specs.

- **Fold PRD into `ad-grill`.** Rejected: grill is a process scaffold (interview-before-research), PRD is a file artifact. Coupling them forces grill to know file lifecycles, which violates [ADR-0007](0007-workflow-operational-skills.md)'s separation of `workflow-operational` vs `spec-driven` categories.

- **Place `PRD.md` at the repo root alongside `AGENTS.md` / `ARCHITECTURE.md`.** Rejected: ADR-0006 limits root to operational/engineering documents; product documents group under `doc/product/`.

## References

- [Atlassian PRD guide](https://www.atlassian.com/agile/product-management/requirements) — canonical industry shape for product requirements.
- [Aha! PRD template](https://www.aha.io/roadmapping/guide/requirements-management/product-requirements-document) — section-by-section reference for the kit template.
- [ADR-0007](0007-workflow-operational-skills.md) — spec-driven vs workflow-operational skill categories.
- [ADR-0008](0008-documentation-discipline.md) — one-scope-per-document rule motivating PRD-vs-Spec separation.
- [ADR-0013](0013-project-maturity-profiles.md) — profile catalog for the solo / team / mature placement.
- [ADR-0019](0019-domain-language-layer.md) — Domain layer; layer-renumbering precedent.
- [ADR-0022](0022-agentic-grill-skill.md) — grill's general-purpose posture; no PRD coupling.
- [`WORKFLOW.md`](../../WORKFLOW.md) §1 — six-layer artifact stack updated by this ADR.
