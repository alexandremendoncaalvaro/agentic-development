# Task `0074`: Refine Prism method routing

**Status:** done
**Created:** `2026-09-14`
**Scope ref:** doc/adr/0077-adopt-generic-prism-evaluations.md
**Evidence ref:** doc/research/0016-ground-prism-method-routing.md
**Owner:** `Alexandre Alvaro`
**Execution:** `AFK`
**Spec ref:**
**Board ref:**

## Context

`ad-prism` currently presents technical verification, human smoke testing,
exploratory comparison, confirmatory study, and field validation as a numbered
set of assurance levels. The surrounding text makes progression optional, but
the shape can still imply that local, staging, pilot, production, and A/B
contexts form a mandatory maturity ladder. Evaluation setting, claim type,
study design, evidence source, and assurance rigor must remain independent so a
bounded local or staging evaluation can be complete on its own. Methodological
recommendations also need claim-level source provenance, and the skill needs
behavioral evidence that its LLM judgment and deterministic gates complement
rather than substitute for each other.

## Acceptance Criteria

- [x] Both hosts route evaluation setting, claim type, study design, evidence source, and assurance rigor as independent choices, and explicitly allow a bounded evaluation to stop in its requested context.
- [x] A durable methodological recommendation records each load-bearing method source, its contribution, its adaptation to the current context, and its retained limits; deterministic validation rejects an incomplete provenance record without claiming to validate source truth.
- [x] The skill assigns contextual method selection and fit-for-purpose judgment to the model while assigning repeatable structure, arithmetic, integrity, and provenance checks to deterministic scripts.
- [x] Cross-domain behavioral cases cover a local-only evaluation, an environment-versus-rigor distinction, source traceability, and a close negative that must not grow into an unnecessary multi-stage program.
- [x] A reproducible comparison protocol evaluates the private Prism, generic `ad-prism`, and `ad-prism` with a minimal domain adapter without leaking private product context into the public kit.
- [x] Both host source trees and dogfood installs remain byte-identical, focused Prism tests pass, and the full suite passes.

## Plan

- [x] Append and retire a proportional risk register using `ad-derisk`; persist the four-source implementation evidence with `ad-ground` and link it in `Evidence ref`.
- [x] Add one failing public-contract or script test for the smallest local-only evaluation and confirm the expected RED result.
- [x] Refactor the dual-host `ad-prism` routing and progressive-disclosure references around orthogonal evaluation dimensions and a stop-capable disposition.
- [x] Add claim-linked methodological provenance to the durable evaluation template and extend its deterministic validator one behavior at a time.
- [x] Expand the behavioral corpus and define the frozen three-arm comparison protocol using natural prompts and outcome-shaped criteria.
- [x] Refresh project dogfood with `node bin/agentic.js update --scope project --agent both --yes`, verify host parity, run focused tests, and run `npm test`.
- [x] Run `ad-review` against the task and binding ADR, resolve confirmed findings, and commit the verified change with `ad-commit`.

## Notes

### 2026-09-14

Pre-construction risk register:

- **R1 — False progression (high impact, high uncertainty):** the numbered
  assurance list can make evidence settings look like mandatory stages. Retire
  by grounding method selection in experimental objective and separating
  setting, claim, design, evidence source, and assurance rigor.
- **R2 — False deterministic assurance (high impact, medium uncertainty):** a
  validator can prove structure and provenance fields but not that a source is
  true or applicable. Retire by defining the exact model-versus-script boundary
  and testing both acceptance and rejection behavior.
- **R3 — Self-confirming skill evaluation (high impact, high uncertainty):**
  static text assertions and same-session examples cannot prove that Prism
  improves decisions. Retire with natural, outcome-shaped cases and a frozen
  baseline-versus-candidate comparison protocol.
- **R4 — Private-domain leakage (high impact, low uncertainty):** comparison
  with the private Prism could copy company vocabulary or evidence into the
  public kit. Retire by keeping private fixtures outside the repository and
  persisting only sanitized prompts, criteria, aggregate findings, and source
  locators.

Resolved register after `GROUND-0016`:

- **R1 — Strong:** official experimental-design and assurance guidance supports
  independent method dimensions and a stop-capable evaluation boundary.
- **R2 — Strong:** the model owns applicability and fit-for-purpose judgment;
  scripts own mechanically verifiable completeness, arithmetic, and integrity.
- **R3 — Conditional:** this task adds discriminating cases and a frozen
  comparison protocol; Task 0048 remains the mitigation and canonical owner for
  a reusable execution harness.
- **R4 — Conditional:** comparison inputs with private product context remain
  outside the kit; only sanitized protocol, criteria, aggregate findings, and
  locators may enter the repository, with leak guard and review as the
  mitigation.

Stop verdict: proceed. Every critical risk is Strong or Conditional with a
named mitigation, and further pre-construction research would add less value
than the first behavioral RED test.

Implementation receipt:

- Each public behavior was observed RED before its minimum GREEN change:
  bounded local evaluation, method-source completeness, model-versus-script
  responsibility, environment-versus-rigor, source traceability, and the
  three-arm comparison protocol.
- Focused Prism and skill-contract suites passed 535 tests.
- Project dogfood was refreshed for both hosts. Shared Prism artifacts match
  across source hosts and each installed copy matches its canonical source.
- `npm pack --dry-run` includes the new comparison protocol in both host trees.
- The full `npm test` gate passed 931 tests. `git diff --check`, ground-record
  validation, and the new-line orphan `TODO` / `FIXME` scan also passed.
- The first two-axis review found an ambiguous duplicate-method identifier path
  and missing claim-level sources in the comparison protocol. Both findings
  were reproduced with failing tests, corrected, and cleared by the second
  review. The final focused suite passed 536 tests and the full suite passed 932.

### 2026-09-15

A frozen forward comparison ran the private/reference Prism, generic
`ad-prism`, and generic `ad-prism` with a minimal adapter across five natural
cases and two fresh-context trials per arm. Two blind graders assessed 30
responses. The generic arm passed every case-trial with no hard failure and no
material decision-support loss against the reference arm. The adapter arm
echoed irrelevant project-domain vocabulary in one cross-domain trial.

That failure was reproduced as a new public-contract test before correction.
Both hosts now apply an adapter only when the current evaluation matches its
declared scope, ignore it outside that scope without echoing its context, and
ship a close behavior case for the boundary. The focused test was observed RED
against the prior contract and GREEN after the minimum scope gate. The final
focused Prism and skill-contract suites passed 540 tests, the full `npm test`
gate passed 936 tests, `npm pack --dry-run` included the corrected artifacts,
dogfood parity passed, and `ad-next` reported no active or orphan tasks.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
