# ADR-0077: Adopt generic Prism evaluations

**Status:** accepted
**Date:** 2026-09-10
**Deciders:** Alexandre Alvaro

## Context

Agentic Development can research an open question, spike an uncertain implementation technique, audit repository rules, render a report, and prepare an outward publication. It does not own the methodological work between those capabilities: reconstructing the decision an evaluation must support, deriving claims and evidence, choosing a proportionate design, interpreting results without overclaiming, and auditing whether the method is fit for purpose.

A private local Prism demonstrates that this operation is useful, but most of that package is coupled to one organization and product domain. Copying it would publish private vocabulary and paths while preserving hidden assumptions about roles, evidence surfaces, privacy boundaries, measures, and scenarios. Merely renaming those terms would not make the method generic.

The public capability must remain useful without private context, fit the kit's Node.js ESM runtime, preserve the boundaries of adjacent skills, and give projects a deliberate place for domain facts that must not become universal guidance. Material evaluations also need a stronger evidence boundary than ordinary collaboration text: their settled artifacts should be frozen and methodologically audited before any claims are prepared for publication.

Grounding is recorded in `doc/research/0014-adopt-generic-prism.md`.

## Decision

We will add `ad-prism` as a dual-host, model-invocable workflow skill for decision-focused evaluation design, interpretation, refinement, and methodological audit.

The bundled skill will be domain agnostic. Its core will own:

1. reconstructing the decision, objective, evaluation question, claim, required evidence, evidence-producing task, measure, data source, decision rule, and next gate;
2. choosing the smallest adequate assurance level and study design;
3. separating independent units from repeated observations and identifying variables, controls, blocks, guardrails, stop rules, and prespecified analyses;
4. grading evidence separately from confidence to proceed;
5. distinguishing technical verification from fit-for-purpose validation;
6. checking traceability, arithmetic, methodological limits, and whether conclusions are supported;
7. explaining results and limitations in plain language.

Projects may add one optional domain adapter at `.agentic/prism/domain.md`. The adapter may define the product and evaluation scope, canonical roles and decision owners, evidence surfaces, authorization and retention constraints, domain measures and guardrails, scenario vocabulary, required sources, and rollout controls. It must distinguish observed facts from defaults and must contain no secrets or personal data. Its absence is valid and will be disclosed rather than treated as an error. Live inspected evidence takes precedence over adapter defaults; conflicts are surfaced instead of silently resolved.

The public baseline will ship dependency-free ESM validators for evaluation plans and reports plus a deterministic artifact-freeze script. The freeze receipt will hash the settled file or directory package and record the included paths; it will not claim to retain immutable copies of external sources. A generic observation-manifest schema will not ship until cross-domain fixtures establish a stable minimum contract.

Composition will be one-way and preserve specialist ownership:

- `ad-prism` may use `ad-ground` or `ad-research` to acquire evidence, then regains control for evaluation design and interpretation.
- It may use `ad-spike` only when an implementation technique is uncertain; a normal evaluation design is not a spike.
- `ad-audit` remains the exhaustive repository-rule audit and does not substitute for Prism's methodological audit.
- `ad-report` remains the owner of standalone rendered analytical reports.
- For a material evaluation, `ad-prism` freezes the settled artifact, performs a skeptical methodology pass, verifies each finding, corrects the artifact, freezes the final version, and records separate verification and fit-for-purpose verdicts. It then passes only settled claims, evidence limits, and approved source references to `ad-publish`.
- `ad-publish` retains privacy, audience, personal voice, language adaptation, exact-text approval, and outward authorization. Ordinary comments, replies, and threads continue directly through `ad-publish`; they do not require a Prism audit merely because they cite facts.

The skill will include generic evaluation-brief and audit-receipt templates and progressive-disclosure references for the methodology, adapter contract, assurance protocol, and source provenance. It will contain no organization-specific baseline, vocabulary, path, source body, or product example.

Tests will cover host parity, packaging, invocation metadata, composition boundaries, validators, deterministic freezing, and close routing cases. Before the skill is claimed useful, dogfood will exercise realistic positive scenarios from at least three unrelated domains and nearby negative scenarios that should route to research, spikes, repository audit, or ordinary tests.

## Consequences

Positive:

- Agentic Development gains a coherent evaluation-methodology owner without turning research, spikes, audits, reports, or publishing into one oversized skill.
- Projects can supply domain knowledge through one explicit, optional contract while the public package stays portable and safe to publish.
- Material evaluation claims gain a reproducible artifact receipt and an adversarial methodology check before entering the publication workflow.
- The implementation matches the kit's existing ESM runtime, parity tests, installer, and model-invocation policy.

Negative / trade-offs:

- The kit gains another model-invocable skill and spends part of the constrained host listing budget.
- A Markdown adapter is intentionally human-readable and flexible, so it cannot mechanically prove that every fact is current or that no sensitive information was entered. Inspection and the existing leak guard remain necessary.
- Hashing proves which local artifact package was reviewed, not that external web pages were immutable or complete.
- Methodological usefulness cannot be established by static contract tests alone; cross-domain dogfood and later behavioral evaluation remain part of the quality gate.
- The absence of a generic observation manifest leaves some study-data structure project-specific until evidence supports a shared schema.

## Alternatives Considered

- **Copy the private Prism unchanged.** Rejected. It would publish private context and preserve domain-specific assumptions throughout the supposedly generic workflow.
- **Rename private terms and keep the current structure.** Rejected. Vocabulary substitution does not remove coupling in roles, evidence sources, privacy constraints, measures, scenarios, and validators.
- **Distribute the behavior across existing skills.** Rejected. No existing skill owns the complete decision-to-evidence chain or fit-for-purpose methodology audit, and duplicating fragments would make routing and assurance inconsistent.
- **Make the domain adapter mandatory or machine-global.** Rejected. Generic evaluations must work without local company context, and project facts should be visible and versionable at project scope rather than silently inherited across repositories.
- **Ship a universal observation manifest now.** Rejected. The existing manifest is domain-bound, and a bag of optional fields would create a shallow contract before unrelated fixtures establish stable common structure.
- **Make every publication pass through Prism.** Rejected. Routine collaboration already has privacy, voice, language, approval, and authorization gates in `ad-publish`; full evaluation assurance would add ceremony without improving ordinary replies.
