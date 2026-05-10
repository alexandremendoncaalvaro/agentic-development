# ADR-0019: Domain layer (`CONTEXT.md`) as Layer 2 of the artifact stack

**Status:** accepted
**Date:** 2026-05-10
**Deciders:** Alexandre Alvaro

## Context

[`WORKFLOW.md` §1](../../WORKFLOW.md) defined a four-layer artifact stack: Constitution (`AGENTS.md` + `WORKFLOW.md`), Spec (`doc/specs/`), Plan/Decisions (`ARCHITECTURE.md` + ADRs + tasks), Code. Each layer answers a different question about the project, and each scales differently across the kit's four maturity profiles (`poc`, `solo`, `team`, `mature`) per [ADR-0013](0013-project-maturity-profiles.md).

A holistic comparison against [`mattpocock/skills`](https://github.com/mattpocock/skills) — performed on 2026-05-10 against branch `cli` — surfaced one principled gap: there is no artifact in this kit that captures the project's **ubiquitous language**. The agent re-derives domain nouns from code and conversation each session. Symptoms of the gap:

- **Verbosity.** The agent uses many words where one project-specific noun would do, because it does not know the noun. Pocock's README cites the example "the materialization cascade" vs. "there's a problem when a lesson inside a section of a course is made 'real'."
- **Naming drift.** Variables, functions, and files end up using different aliases for the same concept across sessions, because there is no canonical term to anchor on.
- **Re-litigation.** Decisions about what to call a thing get re-opened in every grilling/spec session, because the resolution does not survive the conversation that produced it.

The pattern that closes the gap is Eric Evans's **ubiquitous language** ([*Domain-Driven Design: Tackling Complexity in the Heart of Software*, 2003, ch. 2](https://www.dddcommunity.org/book/evans_2003/)): a glossary of canonical project-specific nouns, the aliases to avoid, the relationships between them, and the ambiguities that have been resolved. The artifact lives at the repo root (single-context repo) or under `CONTEXT-MAP.md` plus per-context files (multi-context repo). Pocock dogfoods it in his own kit's [`CONTEXT.md`](https://github.com/mattpocock/skills/blob/main/CONTEXT.md) — Issue tracker / Issue / Triage role, with explicit `_Avoid_:` aliases and a "Flagged ambiguities" block — proving the discipline ships in 1-2 KB of prose.

The placement question — *where in the four-layer stack does it go?* — has two candidates:

- **Fold into Constitution.** Add `CONTEXT.md` as a second mandatory file alongside `AGENTS.md` + `WORKFLOW.md`. Single layer, no renumbering. **Rejected:** Constitution answers *how* the project is built (operational guide + engineering philosophy); Domain answers *how the team talks about what it builds*. Conflating the two dilutes both — `AGENTS.md` would either grow a glossary section (bloat per §1's anti-bloat rule) or `CONTEXT.md` would inherit Constitution's "read every session" loading even when no domain term is in play.
- **New Layer 2 between Constitution and Spec.** Domain comes after the operational/philosophical baseline but before feature-level requirements, because Spec depends on canonical vocabulary to be unambiguous. **Accepted.**

## Decision

Add a fifth layer to the stack: **Layer 2 — Domain (`CONTEXT.md`)**, between Constitution (Layer 1) and Spec (Layer 3, formerly Layer 2). The numbering renumbers downstream layers (Spec → 3, Plan/Decisions → 4, Code → 5).

1. **File location.** Single-context repos: `CONTEXT.md` at the repo root. Multi-context repos: `CONTEXT-MAP.md` at the root listing the contexts plus per-context `CONTEXT.md` files at the relevant subtree roots.

2. **Content shape (per Pocock's CONTEXT-FORMAT, adapted).** Markdown sections — Language (term definitions with `_Avoid_:` alias lines), Relationships (bold-name cardinality statements), and Flagged ambiguities (resolved conflicts). Optional Example dialogue when it clarifies term boundaries. Strict rules: be opinionated (one canonical name, others as aliases); flag conflicts explicitly; one-sentence definitions; only project-specific terms (no general programming vocabulary).

3. **Lazy creation.** The file does not exist until the first term is resolved. Generators (the planned `agentic-domain` skill, plus integration points in `agentic-grill`, `agentic-spec`, `agentic-architecture`) create it on demand. Empty `CONTEXT.md` is worse than no `CONTEXT.md` — invites speculation.

4. **Profile coverage.** Domain ships in **all four profiles**, including `poc`. Vocabulary drift starts on day one, so even a 200-line spike benefits from naming the two or three nouns that will keep getting re-said. The skill is universal per the same logic that universalizes `agentic-philosophy` ([ADR-0005](0005-universal-agent-behavior-as-skill.md)) and `agentic-ground` ([ADR-0010](0010-agentic-ground-skill.md)).

5. **Authority.** `CONTEXT.md` is **canonical** in the sense of [WORKFLOW.md §1's three context types](../../WORKFLOW.md): the agent must use the canonical noun and avoid the listed aliases. Variables, functions, files, tests, ADRs, specs, tasks, and PR descriptions all draw from the glossary.

6. **Reciprocity rules with adjacent artifacts.**
   - **Spec → Domain.** Specs use the glossary. A spec introducing a new noun without resolving it through `CONTEXT.md` is a drift signal that `agentic-audit` flags.
   - **ADR → Domain.** ADRs use the glossary. ADRs that name new architectural concepts ("Module" / "Seam" / "Adapter" per [ADR-0020](0020-deep-modules-vocabulary.md)) belong to the architectural vocabulary, not the domain glossary — the two are distinct and `CONTEXT.md` excludes generic-programming nouns.
   - **Code → Domain.** Code uses the glossary names. The grilling skills (`agentic-grill` and the codebase-aware variants) detect drift between the glossary and the code and surface it for resolution.

7. **No renumbering of ADRs or task files.** Only the WORKFLOW §1 layer numbering shifts. ADR cross-references that mention "Layer 2" before this ADR ships continue to mean the old Layer 2 (Spec) until each ADR is independently revisited; new and amended ADRs use the new numbering.

8. **Phased rollout.** This ADR ships in v0.14.0-beta.1 alongside the WORKFLOW edit. The implementing skill `agentic-domain` and the integrations in `agentic-grill`, `agentic-spec`, `agentic-architecture`, `agentic-bootstrap` (insert `CONTEXT.md` pointer in `AGENTS.md`), and `agentic-audit` (drift detection) are deferred to subsequent minor versions, tracked under [task-0020](../tasks/0020-mattpocock-absorptions.md).

## Consequences

**Positive.**
- Closes the largest single coverage gap surfaced by the cross-pollination pass.
- Reduces token verbosity per session — the agent uses one canonical noun where it previously used a multi-word paraphrase.
- Anchors naming across code, tests, and prose so refactors do not invalidate vocabulary.
- Pairs naturally with the planned `agentic-grill` skill (interview-before-research) — grilling sessions are the natural moment to resolve a term and update `CONTEXT.md` inline.
- Universal-profile install matches the kit's existing posture for foundational practices and avoids profile-specific behavior the user has to remember.

**Negative.**
- Adds one more authoritative document the agent must consult. Mitigated by lazy creation (file only exists when there is something to write) and by Layer-1 Constitution loading the file via `@CONTEXT.md` import once it exists.
- Renumbers `WORKFLOW.md` §1 layer indices (Spec was Layer 2, now Layer 3). Downstream prose references in this kit's docs need a one-time scan; downstream user docs of the kit (none yet) are unaffected because v0.14 is the first release where Layer 2 = Domain.
- Introduces a separation question between the **domain glossary** (this layer) and the **architectural vocabulary** (Module / Interface / Seam / Adapter per [ADR-0020](0020-deep-modules-vocabulary.md)). Resolution: domain glossary holds project-specific nouns (Customer, Order, Triage role); architectural vocabulary holds generic engineering nouns. Each skill that writes one of the two checks the other before writing.

**Neutral.**
- Pocock's `CONTEXT-MAP.md` multi-context pattern is adopted verbatim because it is a clean published convention; no need to invent a kit-specific equivalent.

## Alternatives considered

- **Fold into Constitution (`AGENTS.md` glossary section).** Rejected per the Context section above — conflates *how the project is built* with *how the team talks about what it builds*; bloats `AGENTS.md`; loads vocabulary on every session even when no domain term is in play.

- **Fold into Spec (one glossary block per spec file).** Rejected: vocabulary survives across features (Customer means the same thing in the onboarding spec and the billing spec), so anchoring it per-spec causes drift between specs; the asymmetry also breaks one of the spec layer's principal rules (one scope per document — [ADR-0008](0008-documentation-discipline.md)).

- **Fold into ADRs (one ADR per term).** Rejected: ADRs are for *decisions* — a glossary entry is a *definition*. Blurring the two corrupts the ADR ledger and makes term-lookup expensive (read N ADRs to find one definition).

- **No artifact, rely on grilling skill alone to track terms ephemerally.** Rejected: grilling sessions resolve terms but the resolution evaporates with the session unless captured in a durable artifact. The Pocock comparison surfaced this gap precisely because his `/grill-with-docs` writes to `CONTEXT.md` inline; the artifact is what makes the resolution survive.

## References

- Eric Evans, *Domain-Driven Design: Tackling Complexity in the Heart of Software* (2003), ch. 2 (Ubiquitous Language).
- [`mattpocock/skills` `CONTEXT.md`](https://github.com/mattpocock/skills/blob/main/CONTEXT.md) — dogfood example of the artifact.
- [`mattpocock/skills` `grill-with-docs/CONTEXT-FORMAT.md`](https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/CONTEXT-FORMAT.md) — the format we adopt with attribution.
- [ADR-0005](0005-universal-agent-behavior-as-skill.md) — universal-profile install pattern for foundational practices.
- [ADR-0008](0008-documentation-discipline.md) — one-scope-per-document rule that motivates a separate Domain layer.
- [ADR-0013](0013-project-maturity-profiles.md) — profile catalog the new universal skill will join.
- [ADR-0020](0020-deep-modules-vocabulary.md) — architectural vocabulary, deliberately separate from domain glossary.
- [`WORKFLOW.md`](../../WORKFLOW.md) §1 — five-layer artifact stack updated by this ADR.
- [task-0020](../tasks/0020-mattpocock-absorptions.md) — implementation rollout tracking.
