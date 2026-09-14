---
name: ad-prism
description: Design, interpret, refine, and audit decision-focused evaluations. Use when asking how to evaluate a change, define measures or decision rules, test fit for purpose, interpret results, or audit evaluation claims. Routes open research, uncertain techniques, repository-rule audits, reports, and publications to their specialist skills.
summary: Decision-focused evaluation design, interpretation, refinement, and methodology audit with an optional project domain adapter.
---

# /ad-prism

<background_information>
Owns the methodology between a decision and the evidence needed to support it.
Use it to design an evaluation, interpret its results, refine a weak design, or
audit whether its claims are supported and fit for purpose. It does not replace
research, implementation spikes, repository-rule audits, report rendering, or
publication approval. Governed by ADR-0077.
</background_information>

<instructions>
Determine the route silently: design a new evaluation, explain a method or
result, answer a bounded methodology question, refine only the requested part
of an existing design, or audit a settled material artifact. Do not ask the user
to select a route when the request establishes it.

Start from the decision the evaluation must support. State the objective,
evaluation question, claim, required evidence, evidence-producing task, measure,
data source, decision rule, and disposition. Select the evaluation setting,
claim type, study design, evidence source, and assurance rigor independently for
that decision. Separate technical verification from fit-for-purpose validation
and evidence strength from confidence to proceed.
Read [methodology.md](references/methodology.md) when designing, explaining,
refining, interpreting, or auditing an evaluation. Use
[evaluation-brief.md](assets/evaluation-brief.md) when a durable plan is needed,
then run `node <skill-dir>/scripts/validate-plan.mjs <evaluation-plan.md>`.
Read [skill-comparison.md](references/skill-comparison.md) when you compare
evaluation skills or decide whether one can replace another.

Read the optional project domain adapter at `.agentic/prism/domain.md` when it
exists. Its absence is valid and not an error: continue with the generic method
and disclose which domain assumptions remain unknown. Treat adapter values as
project context, not unquestionable truth. Live inspected evidence outranks
adapter defaults; surface conflicts instead of silently choosing one. Never ask
for or place secrets or personal data in the adapter.
Read [domain-adapter.md](references/domain-adapter.md) when the adapter exists,
when proposing one, or when adapter precedence or safety affects the answer.

Keep the evaluation bounded to the requested decision. Explain the design,
result, limitations, and next gate in plain language. Do not claim that an
evaluation establishes more than its evidence supports.

Read [sources.md](references/sources.md) whenever making a methodological
recommendation. Cite one to three essential sources beside the claims they
support and explain each contribution. In a durable evaluation plan, record the
method or framework, source locator, supported choice or claim, contribution,
adaptation to the current context, and retained limit. The validator checks that
this map is complete; it does not establish that a source is true or applicable.
Do not transfer sample sizes, thresholds, margins, rubrics, or power claims from
another study without a justified mapping to the current decision and
population.

For a material evaluation, read
[assurance.md](references/assurance.md) and use
[audit.md](assets/audit.md). Settle and validate the candidate, freeze it with
`node <skill-dir>/scripts/freeze-artifact.mjs <artifact>`, run a skeptical
methodology pass, then verify every finding against the frozen artifact and
sources. Correct confirmed findings, rerun
`node <skill-dir>/scripts/validate-report.mjs <report.md>` when applicable,
and freeze the final artifact. Record separate verification and fit-for-purpose
validation verdicts. Hashing the local package does not preserve external
sources.

Compose other capabilities through their public contracts. Pass an open
knowledge question to `ad-research`, a bounded implementation fact gap to
`ad-ground`, an uncertain implementation technique to `ad-spike`, repository
rule coverage to `ad-audit`, and settled analytical content to `ad-report`.
When a callee returns, regain control over the evaluation method and preserve
its evidence and limits.

When outward text is requested, produce a publication packet containing only
settled claims, material limits, and approved source references. Return control
to the requesting skill or user; do not invoke the caller or treat the packet as
publication approval. `ad-publish` remains responsible for private-context
separation, voice, language adaptation, exact-text approval, target approval,
and the outward action.
</instructions>

<output_contract>
- A decision-linked evaluation design, interpretation, refinement, or audit.
- Claims remain traceable to evidence, measures, decision rules, and limits.
- Missing domain context is disclosed without making the adapter mandatory.
- No outward action is authorized by this skill.
</output_contract>

## Next

- Use `ad-ground` or `ad-research` when evidence must be acquired.
- Use `ad-spike` only when the implementation technique is uncertain.
- Use `ad-audit` for exhaustive repository-rule coverage.
- Use `ad-report` to render a standalone analytical report.
- Hand the publication packet to `/ad-publish` for outward text and approval.
