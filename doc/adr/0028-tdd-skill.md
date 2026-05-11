# ADR-0028: Test-Driven Development as LLM guardrail (`ad-tdd` skill) and WORKFLOW §16

**Status:** accepted
**Date:** 2026-05-10
**Deciders:** Alexandre Alvaro

## Context

`WORKFLOW.md` §9 (Outcome-Based Prompting / TDG) included a Test Dependency Map bullet that read:

> **Test Dependency Map, not procedural TDD.** Don't tell the agent "do TDD" — tell it *which* tests cover the file.

The framing conflates two distinct concerns and reads as a blanket rejection of TDD:

- **TDD-the-practice** (Beck, *Test-Driven Development: By Example*, 2002): write a failing test → write minimum code to pass → refactor while green. Red-green-refactor is a **deterministic gate** — the test outcome is pass/fail, unambiguous. As an LLM guardrail this is powerful: the model cannot drift past a failing test, and "almost right" (the [WORKFLOW §12](../../WORKFLOW.md) failure mode) is caught before it lands.
- **Test Dependency Map (TDM)**: a **pre-flight check** that lists which tests cover the file before editing. Orthogonal to TDD; it tells the agent *where* the verification surface lives. Pairs with TDD (use the discovered tests as the red baseline) or TDG (use them as the verification gate in the outcome-based loop).

The bullet read as "reject TDD". The intent was "reject cargo-cult TDD ceremony in favor of TDM as pre-flight". The collateral damage: the kit has no named home for test-first development as an LLM guardrail, even though it is the cleanest deterministic discipline available when the change has a well-shaped behavior to express as a test.

[`mattpocock/skills` engineering/tdd](https://github.com/mattpocock/skills/blob/main/skills/engineering/tdd/SKILL.md) formalizes TDD with two ingredients the kit lacks:

1. **Behavior-not-implementation rule.** Tests verify behavior through public interfaces; tests coupled to implementation break on refactor without underlying behavior change. A good test reads like a specification.
2. **Anti-pattern: horizontal slicing.** Writing all tests first then all implementation produces "crap tests" — tests for *imagined* behavior, insensitive to real changes. The correct shape is vertical tracer bullets: one test → one implementation → repeat. Each test responds to what the previous cycle taught.

These are not Pocock's invention — they codify Beck's original TDD discipline and the broader testing literature (Feathers, [*Working Effectively with Legacy Code*](https://www.amazon.com/Working-Effectively-Legacy-Michael-Feathers/dp/0131177052), 2004, on seams as test surfaces; [Khorikov, *Unit Testing Principles, Practices, and Patterns*](https://www.manning.com/books/unit-testing), 2020, on behavior-vs-implementation tests). Pocock's framing ("RED → GREEN per behavior, never bulk-write tests") is sharp enough to borrow with attribution.

The kit's current regime catalog covers:

- **§9 TDG** — technique known, implementation strategy uncertain. Outcome-based: ground-truth pair + TDM + three approaches + criterion selection. **Directional** — gives finish line, picks path.
- **§14 Spikes** — technique itself uncertain. Staged pipeline + golden fixtures + per-stage debug. **Discovery**.
- **§15 Diagnose** — bug or regression. Feedback loop + ranked falsifiable hypotheses + one variable at a time. **Investigation**.
- **§10 Reviewer + §11 Quality Gates** — post-implementation discrimination. **Verification**.

**The gap:** when the change has a clear behavior to express as a test up front (a new API capability, a bug-driven test that locks the failure mode out, a refactor whose contract is known), TDD's red-green-refactor is the cleanest deterministic guardrail. The kit collapsed it into "don't do TDD, do TDM", which conflated two different things.

## Decision

1. **Add WORKFLOW §16 — Test-Driven Development (TDD).** Sibling section to §9 (TDG). §9 stays as the outcome-based-prompting regime (no internal renumbering — see [ADR-0019](0019-domain-language-layer.md) §7 precedent for not breaking older cross-refs). §16 is appended after §15 (Diagnose) to avoid renumbering existing §10–§15 cross-references that propagate through ADRs and skills.

2. **Reframe the TDM bullet in §9** to clarify TDM as a pre-flight discipline that pairs with either TDD or TDG, not as TDD's replacement. Drops the blanket-reject reading; preserves the TDM-not-cargo-cult intent.

3. **Add `ad-tdd` skill** at `.claude/skills/ad-tdd/SKILL.md` and `.agents/skills/ad-tdd/SKILL.md` (canonical source under `src/skills/<agent>/ad-tdd/`). Category: `workflow-operational` per [ADR-0007](0007-workflow-operational-skills.md) (executes a process from `WORKFLOW.md`, no primary file output — the verified implementation is the artifact, lands via normal commits).

4. **Skill shape (Pocock-adapted, kit-aligned).** Five phases:
   - **Step 0 — Confirm regime.** TDD is for *behavior-known, test-expressible* changes. Route to TDG when implementation strategy is the uncertain axis; to Spike when technique is uncertain; to Diagnose when the work is bug investigation.
   - **Step 1 — Plan vertically.** Confirm the public interface; pick the first behavior to test; identify deep-module opportunities (per [ADR-0020](0020-deep-modules-vocabulary.md)). User approves the plan before any test or code is written.
   - **Step 2 — Tracer bullet.** Write ONE test for ONE behavior. Confirm red. Write minimum code to pass. Confirm green. End-to-end path proven.
   - **Step 3 — Incremental loop.** For each remaining behavior: one test → red → minimum code → green. Never bulk-write tests (the horizontal-slicing anti-pattern).
   - **Step 4 — Refactor.** Once all tests pass, look for duplication, depth opportunities, and SOLID-natural extractions. Run tests after each refactor step. **Never refactor while red** — get to green first.

5. **Behavior-not-implementation rule (binding).** Tests verify behavior through public interfaces. The skill rejects writing tests that break on internal renames without behavior change. When a test would couple to implementation (mock internal collaborators, assert on private state), the skill surfaces it and prompts for either a public-surface rewrite or an explicit acceptance with rationale in the task notes.

6. **Horizontal-slicing rejection (binding).** The skill blocks bulk test creation. "Write tests for all five behaviors, then implement all five" is the named anti-pattern; the skill enforces one-test-one-cycle ordering. User can override per-session with explicit acknowledgment; default is enforced.

7. **TDM integration.** Step 1 includes a Test Dependency Map pass: list tests covering the surface the change touches (same mechanism as `ad-tdg` Step 2). When modifying existing code, TDM establishes the red baseline before any new test or change. New-code changes skip the existing-tests TDM and write the first test fresh.

8. **Profile coverage.** Universal across **all four profiles** (`poc` / `solo` / `team` / `mature`). Rationale: TDD's value is highest when the test runner exists, but the skill includes a Step 0 routing rule — if no test runner is wired, route to `/ad-hooks` first (same pattern as `ad-tdg`). PoC inclusion costs no install bloat (workflow-operational, text-only) and supports PoC users who genuinely run tests. Matches `ad-tdg` and `ad-diagnose` profile posture.

9. **Distinction from `ad-tdg`** (documented explicitly in both skills' descriptions):
   - **`ad-tdd`**: behavior is known and test-expressible up front; red-green-refactor as deterministic guardrail; tests drive code; rejection of bulk-test horizontal slicing.
   - **`ad-tdg`**: outcome (ground-truth pair) is known but the *path* between input and output has multiple plausible implementations; three-approaches + criterion selection; tests verify the chosen implementation.

   When both apply (behavior is test-expressible AND multiple implementation strategies are plausible), use `ad-tdd` as the outer loop and `ad-tdg` as the strategy-selection step inside the loop's GREEN phase. Documented in both skills' `Next` sections.

10. **No commented-out tests, no skipped tests as deferred work.** Per [ADR-0008](0008-documentation-discipline.md) rule #7 (no orphan TODO/FIXME). Failing tests stay red until fixed or removed with rationale in a tracked task.

## Consequences

**Positive.**
- Names the deterministic LLM guardrail that the kit had implicitly rejected via the prior §9 TDM framing. Closes the "almost-right output" gap surfaced by [WORKFLOW §12](../../WORKFLOW.md) for cases where a test can express the behavior up front.
- Separates TDD from TDM in the kit's vocabulary. TDM stays valuable as a pre-flight discipline; TDD becomes a named regime with its own routing.
- Mirrors `ad-tdg` / `ad-diagnose` / `ad-spike` shape: workflow-operational, no primary file output, structured conversation with regime routing at Step 0.

**Negative.**
- Adds one more skill to the universal install set. Mitigated by workflow-operational category (text-only, no artifact lifecycle), Step 0 routing (skill exits cleanly when TDD does not fit), and explicit profile-by-profile rationale.
- TDD and TDG distinction must be carried in both skill descriptions to prevent re-conflation. Frontmatter budgets bind (`description` ≤1536 chars, `summary` ≤320 chars).

**Neutral.**
- Pocock's framing of behavior-not-implementation and horizontal-slicing-rejection is adopted with attribution; the underlying discipline is Beck/Feathers literature, not Pocock-original.

## Alternatives considered

- **Reframe §9 only; do not add a TDD skill.** Rejected: the kit's pattern is that named regimes get named skills (§14 Spikes → `ad-spike`, §15 Diagnose → `ad-diagnose`, §9 TDG → `ad-tdg`). TDD without a skill stays advisory text the agent can forget — exactly what [WORKFLOW §11](../../WORKFLOW.md) warns against.

- **Fold TDD into `ad-tdg` (one skill, two modes).** Rejected: the shapes are different. TDG is outcome-first (ground-truth pair → three approaches → pick one → implement). TDD is test-first (one test → red → minimum code → green → repeat). Same skill with two modes forces a regime decision *inside* the skill, when the kit's pattern is regime decision at the routing layer (Step 0 in every workflow-operational skill).

- **Rename §9 to "Test-Direction Discipline" and host both TDG and TDD inside.** Rejected: forces a §9 cross-reference rewrite across many skills and ADRs. The §10–§15 cross-reference inventory is too large to break for a structural rename that adds no behavior. Appending §16 is the lower-cost shape.

- **Add TDD only at `team` / `mature` profiles.** Rejected: TDD's value is independent of project maturity — a solo developer building a real product benefits as much as a regulated-product team. Profile boundary would be artificial and inconsistent with `ad-tdg` / `ad-diagnose` universal placement.

## References

- Kent Beck, *Test-Driven Development: By Example* (2002) — canonical red-green-refactor framing.
- Michael Feathers, *Working Effectively with Legacy Code* (2004) — seams and behavior-as-test-surface.
- Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns* (2020) — behavior-vs-implementation test classification.
- [`mattpocock/skills` engineering/tdd](https://github.com/mattpocock/skills/blob/main/skills/engineering/tdd/SKILL.md) — vertical-tracer-bullet framing adopted with attribution.
- [ADR-0007](0007-workflow-operational-skills.md) — workflow-operational skill category.
- [ADR-0008](0008-documentation-discipline.md) — no orphan TODO/FIXME rule that binds skipped-tests handling.
- [ADR-0014](0014-host-aware-structured-prompts.md) — structured-prompt primitives the skill uses at confirmation gates.
- [ADR-0019](0019-domain-language-layer.md) §7 — precedent for not renumbering existing cross-refs when extending the §-section catalog.
- [ADR-0020](0020-deep-modules-vocabulary.md) — Module/Interface/Depth vocabulary the TDD skill uses in Step 1 planning.
- [`WORKFLOW.md`](../../WORKFLOW.md) §9 — TDG sibling regime; TDM bullet reframed by this ADR.
- [`WORKFLOW.md`](../../WORKFLOW.md) §16 — TDD section added by this ADR.
