# ADR-0020: Adopt Ousterhout/Feathers architectural vocabulary in `WORKFLOW.md` §8

**Status:** accepted
**Date:** 2026-05-10
**Deciders:** Alexandre Alvaro

## Context

[`WORKFLOW.md` §8 (Architectural Boundaries)](../../WORKFLOW.md) was four lines of prose: lock load-bearing decisions in `AGENTS.md`, apply Clean Architecture, small units, modular and testable. The principle is correct but the vocabulary is generic. When `agentic-architecture` writes `ARCHITECTURE.md`, when `agentic-adr` writes a new decision, or when `agentic-audit` flags drift, each skill picks its own words for the architectural shapes that matter — "service," "boundary," "component," "module," "layer," "API." Different shapes get the same name across artifacts; different artifacts use different names for the same shape. The agent and the human spend time disambiguating instead of deciding.

The cross-pollination pass against [`mattpocock/skills`](https://github.com/mattpocock/skills) on 2026-05-10 surfaced his [`improve-codebase-architecture/LANGUAGE.md`](https://github.com/mattpocock/skills/blob/main/skills/engineering/improve-codebase-architecture/LANGUAGE.md), which adopts a deliberate canonical vocabulary drawn from two well-established sources:

- **John Ousterhout, *A Philosophy of Software Design* (2018).** Source for **Module / Interface / Implementation / Depth** and the deep-vs-shallow distinction (a deep module hides a lot of behavior behind a small interface; a shallow one is interface-as-complex-as-implementation).
- **Michael Feathers, *Working Effectively with Legacy Code* (2004).** Source for **Seam** (a place where behavior can be altered without editing in place) and the testability framing it implies.

The two vocabularies compose cleanly. Pocock pairs them with **Adapter** (a concrete thing satisfying an interface at a seam — *role*, not *substance*), **Leverage** (what callers get from depth), and **Locality** (what maintainers get from depth). Three operational principles fall out:

- **Deletion test.** Imagine deleting the module. Complexity vanishes ⇒ pass-through, delete it. Complexity reappears across N callers ⇒ it was earning its keep.
- **Interface is the test surface.** Callers and tests cross the same seam; if you want to test past the interface, the module is probably the wrong shape.
- **One adapter is hypothetical, two are real.** Don't introduce a seam unless something actually varies across it.

Pocock also explicitly rejects Ousterhout's depth-as-implementation-to-interface line ratio framing — it rewards padding the implementation, which inverts the principle. The kit adopts that rejection.

The kit currently has no architectural vocabulary discipline. ADRs ship with whatever words their author reaches for; `agentic-architecture` documents whatever pattern names are in the code; `agentic-audit` cannot flag inconsistency between artifacts because there is no canonical reference to compare against.

## Decision

Adopt the Ousterhout/Feathers vocabulary verbatim in `WORKFLOW.md` §8 (the "Architectural vocabulary" subsection added in v0.14.0-beta.1) and use it as the **canonical architectural language** across all kit-shipped skills that touch architecture.

1. **Canonical terms.** Module, Interface, Implementation, Depth (deep / shallow), Seam, Adapter, Leverage, Locality. Definitions follow Ousterhout (Module / Interface / Implementation / Depth) and Feathers (Seam) verbatim where possible; Pocock's framing is borrowed for Adapter / Leverage / Locality with attribution because his composition is cleaner than the originals' for kit purposes.

2. **Three principles ship alongside the vocabulary.** Deletion test, interface-is-test-surface, two-adapters-make-it-real. These are mechanical heuristics agents can apply; ungrounded "is this a good module?" is replaced with checks that produce yes/no answers.

3. **Rejected framings are documented.** The depth-as-line-ratio framing is explicitly rejected with one-line rationale (rewards padding). Future skill authors who reach for it will see the rejection in `WORKFLOW.md` §8.

4. **Skills touching architecture must use the vocabulary verbatim.**
   - **Already shipped** — `agentic-architecture`, `agentic-adr`, `agentic-audit`, `agentic-review` (when reviewing architectural-decision diffs): bodies updated to use Module/Interface/Depth/Seam/Adapter and to apply the deletion test.
   - **Planned** — `agentic-deepen` (an `improve-codebase-architecture`-equivalent surfacing deepening opportunities). Universal across `team` and `mature` profiles per the same logic that universalizes architectural skills today; absent from `poc` because architectural deepening is premature for ≤200-line experiments.

5. **Domain glossary stays separate from architectural vocabulary.** Per [ADR-0019](0019-domain-language-layer.md), `CONTEXT.md` holds project-specific nouns (Customer, Order, Triage role); the architectural vocabulary holds generic engineering nouns (Module, Seam, Adapter). Skills that write either check the other before writing — a glossary entry that names "Module" or "Seam" is misplaced (belongs to architecture vocabulary, not domain), and an architecture term that names "Customer" or "Order" is misplaced (belongs to domain glossary).

6. **No `LANGUAGE.md` file in this kit.** Pocock ships the vocabulary in a per-skill reference file. The kit ships it inline in `WORKFLOW.md` §8 because (a) WORKFLOW is universal and read by every skill, (b) introducing a new top-level reference file fragments the constitutional layer (Constitution + WORKFLOW + the future Domain layer is already three files), (c) the planned `agentic-deepen` skill can reference WORKFLOW §8 directly.

## Consequences

**Positive.**
- Cross-artifact consistency. ADRs, architecture docs, deepening proposals, and review comments all use the same words for the same shapes.
- Two of the three principles (deletion test, two-adapters rule) give the agent a yes/no test for design decisions that were previously vibe-driven.
- The vocabulary is established outside the kit (Ousterhout 2018, Feathers 2004 — both widely cited), so adopting it does not lock anyone into kit-specific jargon.
- §8 of WORKFLOW grows from 4 lines of generic prose to ~25 lines of canonical vocabulary plus principles — a real density gain, not bloat, because the prior version was so thin that downstream skills were forced to invent their own framings.

**Negative.**
- ADRs and architecture docs written before v0.14 use whatever vocabulary they originally chose. Mass-rewriting historic ADRs would violate [ADR-0008](0008-documentation-discipline.md)'s "definitions and decisions only — no speculation about the past" rule. Resolution: new and amended artifacts use the canonical vocabulary; old ones are not retconned.
- Two vocabularies live in the kit (domain glossary in `CONTEXT.md`, architectural vocabulary in `WORKFLOW.md` §8). The separation is principled (domain vs. architecture) but adds one more "where does this term go?" decision for skills that write either.
- The "Boundary" word — overloaded between Feathers's seams and DDD's bounded contexts — is now banned in favor of "Seam" or "Interface." Pocock's rejection rationale ships with the vocabulary, so the ban is justified inline rather than appearing arbitrary.

**Neutral.**
- Ousterhout's depth-as-line-ratio framing is rejected explicitly. This is a deliberate divergence from the source author and worth noting; the rejection is one line of WORKFLOW, not a hidden departure.

## Alternatives considered

- **Keep §8 generic ("Clean Architecture, small units, modular and testable").** Rejected: this is what we had. The cross-pollination pass surfaced the lack of canonical vocabulary as a real gap; sticking with generic prose preserves the gap.

- **Adopt only Ousterhout (skip Feathers's Seam).** Rejected: the seam concept is what makes the testability principle actionable. "Interface is the test surface" requires a name for *the location* of the interface, and "boundary" is overloaded. Without Seam the vocabulary is incomplete.

- **Ship the vocabulary in a top-level `ARCHITECTURE-LANGUAGE.md` reference file (Pocock-style).** Rejected per Decision §6 — fragments the constitutional layer, adds a third top-level file alongside `AGENTS.md` and `WORKFLOW.md` (and the v0.14 `CONTEXT.md`).

- **Define our own architectural vocabulary instead of borrowing.** Rejected: Ousterhout's terms are widely understood, citable, and defensible; reinventing them would gain nothing and lose external groundedness.

## References

- John Ousterhout, *A Philosophy of Software Design* (2018) — Module / Interface / Implementation / Depth definitions.
- Michael Feathers, *Working Effectively with Legacy Code* (2004) — Seam definition.
- [`mattpocock/skills` `improve-codebase-architecture/LANGUAGE.md`](https://github.com/mattpocock/skills/blob/main/skills/engineering/improve-codebase-architecture/LANGUAGE.md) — the composition we borrow with attribution; source of the rejected-framings discipline.
- [`mattpocock/skills` `improve-codebase-architecture/SKILL.md`](https://github.com/mattpocock/skills/blob/main/skills/engineering/improve-codebase-architecture/SKILL.md) — the operational counterpart to the vocabulary; the planned `agentic-deepen` skill draws from it.
- [ADR-0006](0006-architecture-md-at-repo-root.md) — top-level `ARCHITECTURE.md` decision the new vocabulary updates.
- [ADR-0008](0008-documentation-discipline.md) — definitions-and-decisions-only rule that constrains how the vocabulary lands in old ADRs.
- [ADR-0019](0019-domain-language-layer.md) — domain glossary, kept separate from architectural vocabulary.
- [`WORKFLOW.md`](../../WORKFLOW.md) §8 — the section this ADR ships into.
- [task-0020](../tasks/0020-mattpocock-absorptions.md) — rollout into existing architecture-touching skills + new `agentic-deepen` skill.
