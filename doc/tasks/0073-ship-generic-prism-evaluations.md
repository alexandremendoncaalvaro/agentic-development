# Task `0073`: Ship generic Prism evaluations

**Status:** `done`
**Created:** `2026-09-11`
**Scope ref:** doc/adr/0077-adopt-generic-prism-evaluations.md
**Evidence ref:** doc/research/0014-adopt-generic-prism.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

Agentic Development can gather evidence, test uncertain techniques, audit repository rules, render reports, and prepare publications, but it has no owner for evaluation methodology itself. The new `ad-prism` must turn a decision into an evidence-producing evaluation, expose honest limits, and audit material results without copying private product assumptions or duplicating adjacent skills. Projects need an optional, visible place for domain context while the public skill remains useful on its own.

## Acceptance Criteria

- [x] Both canonical hosts ship a model-invocable `ad-prism` with concise discovery metadata, progressive-disclosure references, generic evaluation and audit templates, and no organization-specific baseline, path, vocabulary, source body, or product example.
- [x] The skill reconstructs the decision-to-evidence chain, selects proportionate assurance, distinguishes verification from fit-for-purpose validation, and reports claims, evidence limits, decision rules, and next gates in plain language.
- [x] `.agentic/prism/domain.md` is documented as an optional project adapter with explicit scope, precedence, privacy, provenance, and absence behavior; generic operation does not depend on it.
- [x] Dependency-free ESM public interfaces validate evaluation plans and reports and deterministically freeze a settled file or directory package, with edge-first tests for valid, invalid, and unsafe inputs.
- [x] Composition preserves the boundaries of `ad-ground`, `ad-research`, `ad-spike`, `ad-audit`, `ad-report`, `ad-publish`, and `ad-voice`; ordinary publications stay on the light path while material evaluation claims carry a frozen and audited evidence packet.
- [x] Realistic dogfood covers positive evaluation requests in at least three unrelated domains and close negative requests that route to research, spikes, repository audit, or ordinary tests, with observed outcomes recorded here.
- [x] Project dogfood is refreshed for both hosts; canonical and installed copies remain byte-identical; package contents, invocation budgets, workflow routing, and the full local test gate pass.

## Plan

- [x] Record the accepted decision and implementation risks, then establish the focused green baseline for the existing skill surface.
- [x] RED: add one public-contract test for the smallest end-to-end `ad-prism` slice and observe the expected failure.
- [x] GREEN: add the minimum dual-host skill entrypoint and adapter boundary that satisfy the tracer, then refactor only while green.
- [x] Repeat red-green-refactor one behavior at a time for plan validation, report validation, deterministic artifact freezing, composition, and packaging.
- [x] Add only the references, templates, and routing documentation required by observed behavior; keep specialist policy with its current owner.
- [x] Refresh dogfood with `node bin/agentic.js update --scope project --agent both --yes` and verify source/install parity.
- [x] Exercise cross-domain positive and close-negative requests against the installed skill and record what actually happened.
- [x] Run the full local gate, `ad-review`, any rules audit required for team-bound work, and `ad-commit`; stop before `/ad-pr`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-11

The owner accepted ADR-0077 and approved the vertical TDD plan with autonomous continuation through the remaining workflow gates.

The `ad-derisk` register reached the build stop condition:

- **R1 — Private-domain leakage (high impact, medium uncertainty): Strong.** Research 0014 inspected the private package without publishing its vocabulary, paths, or source bodies; ADR-0077 requires extraction rather than copying, and the repository leak guard remains the commit gate.
- **R2 — Overlap with adjacent skills (high impact, medium uncertainty): Strong.** Research 0014 and ADR-0077 assign evaluation methodology to `ad-prism` and preserve one-way ownership for evidence acquisition, technique spikes, repository audit, report rendering, and publication.
- **R3 — Adapter location and precedence (high impact, medium uncertainty): Strong.** ADR-0077 fixes the optional project contract at `.agentic/prism/domain.md`, makes absence valid, gives live evidence precedence over defaults, and forbids secrets and personal data.
- **R4 — Validator-port fidelity (medium impact, medium uncertainty): Conditional.** Port only the generic observable behavior to dependency-free ESM and retire uncertainty one public-interface test at a time; do not port the domain-bound manifest validator.
- **R5 — Behavioral usefulness and routing (medium impact, high uncertainty): Conditional.** Exercise at least three unrelated positive domains and close negative requests against the installed skill before claiming usefulness; record observed limits rather than treating static text checks as behavioral proof.
- **R6 — Freeze semantics (high impact, low uncertainty): Strong.** Freeze only the settled local file or directory package, make the receipt deterministic, reject unsafe inputs, and explicitly avoid claiming that external sources were preserved.
- **R7 — Installation, package, and listing parity (medium impact, low uncertainty): Strong.** Existing installer, package, description-budget, and byte-parity gates cover the new surface once the skill is present on both canonical hosts and dogfood is refreshed.

Every critical unknown is Strong or Conditional with a concrete TDD or dogfood mitigation. Residual technical risk is now lower than the risk of building the wrong abstraction, so implementation proceeds under `ad-tdd`.

The existing skill-contract baseline passed 489 of 489 tests before the first implementation change. The approved tracer exercises the installed public surface rather than internal helpers: both hosts must expose a model-invocable `ad-prism` that works without private configuration and recognizes the optional project adapter.

The tracer failed because Claude Code had no `ad-prism` directory, then passed after the minimum dual-host entrypoint and Codex invocation metadata were added. Subsequent isolated red-green cycles produced dependency-free ESM plan validation, report validation, and artifact freezing. The focused script suite now passes 15 of 15 behaviors covering structural sections, duplicate sections, unresolved placeholders, fenced examples, visible-heading hygiene, packaged and remote images, directory escapes, exact file hashes, expected hashes, self-referential directory receipts, root symlinks, and stale embedded receipts. Shared fenced-Markdown parsing was extracted only after both callers were green.

Installed-skill dogfood ran with no `.agentic/prism/domain.md`, confirming that generic mode is operational rather than a documented fallback only. The checkout-routing case produced a complete decision-linked rollout plan: checkout journey was the independent unit, completion and routing errors remained guardrails, the proceed/stop rule had to be prespecified, no threshold was invented, and `validate-plan.mjs` accepted all eleven required sections. The invoice-extraction case selected Prism and treated documents rather than fields as independent units, required representative layout coverage, separated exploratory comparison from a later readiness claim, and refused to invent a sample size or margin. The support-triage case also selected Prism, kept agent ratings in the experience-evidence role and routing telemetry in the runtime-evidence role, grouped repeated observations by their originating case, disclosed attribution gaps, and limited generalization beyond the pilot.

The material public-claim case exercised the installed report validator and directory freeze. A candidate package was frozen as `49acefd7d1db0b9fffb3287a48350486d797e549fc93dc43ce9904ccd17a249a`; the skeptical pass confirmed that observations, analysis, form versions, population, exclusions, and a prespecified rule were absent. The corrected final package froze and re-verified as `16de106d91155f0afe1f03aebd7b97ce44d4ff27e66556223e10729a3e987127`. Verification was `conditional`, fit-for-purpose validation was `fail`, and the proposed improvement claim was blocked. Only the insufficiency finding was safe to pass onward. The dogfood also exposed that a natural Markdown code-wrapped receipt failed validation; a new failing test reproduced it before both host scripts learned to accept either raw or code-wrapped hashes.

Close-negative prompts stayed outside Prism: the open vector-database adoption question routed to `ad-research`; uncertain OCR-library technique routed to `ad-spike`; exhaustive repository-rule conformance routed to `ad-audit`; and a malformed-decimal unit behavior stayed on ordinary `ad-tdd` without an evaluation brief or assurance receipt. These are same-session routing observations, not an independent model evaluation; the limitation is explicit and the durable cross-domain corpus remains available under each host's `ad-prism/evals/evals.json` for future forward tests.

Workflow dogfood caught a second unsafe shortcut: the first Mermaid contract allowed a material methodology audit to hand a packet onward without correction, revalidation, and final freezing. A focused assertion failed on that bypass before the edge was removed. The first full `npm test` then failed only because the changed `WORKFLOW-FLOWS.md` was not yet an approved exact legacy-migration fingerprint; the known current hash was added and the migration regression returned green. The refreshed source and installed `ad-prism` directories compare byte-identically on both hosts, and `npm pack --dry-run --json` includes all 25 Prism source files in the 333-file package.

The first `ad-review` pass found two core contract gaps. The plan validator accepted the template's unfilled `<evaluation title>`, and the freeze receipt returned a file count without the ADR-0077-required included paths. Each finding received a failing test before the fix; the validator now rejects that title placeholder, and file and directory receipts now return sorted relative `included_paths`. The corrected review pass reports no remaining Standards or Spec findings.

All same-session dogfood observations above are exploratory workflow evidence, not decision evidence. Their transient `.context/prism-dogfood/` artifacts are intentionally local and are not an established team evidence system. The committed eval prompts, public validators, and deterministic contract tests preserve the repeatable method; a future claim about comparative model performance or a particular forward run still requires the project's established per-observation evidence channel.

The final local gate passed 918 of 918 tests. The corrected `ad-review` reported no Standards or Spec findings. `ad-audit` accounted for 14 rule groups and all 101 physical changed files with no violations, open questions, judgement calls, or rule gaps; its critical claims-verification group passed with the exploratory-evidence limitation above. The staged leak guard and whitespace check both passed. The change is one causal feature concern and is ready for the signed commit that closes this task; no push or pull request is authorized in this workflow.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
