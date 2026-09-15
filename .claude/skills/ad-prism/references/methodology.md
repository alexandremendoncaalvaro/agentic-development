# Evaluation methodology

Use this method for design, explanation, refinement, interpretation, and
methodological audit. Scale the depth to the decision's stakes and
reversibility.

## Start from the decision

Reconstruct the chain before proposing sessions, datasets, raters, metrics, or
forms:

> decision -> objective -> evaluation question -> claim -> evidence -> task ->
> measure -> data source -> decision rule -> next gate

Keep each link explicit enough that a reviewer can ask whether the task can
produce the evidence, whether the measure represents the claim, and whether the
decision rule follows from the result. Separate observed facts, inferences,
choices, and open gaps. Do not infer baseline, candidate, winner, or intended
replacement from ordering or names.

## Choose evaluation dimensions independently

Select each dimension from the decision and available evidence:

- **Setting** — where evidence can be produced: local, bench, replay, staging,
  shadow, pilot, production, or another declared context.
- **Claim type** — what the result may support: technical operation, diagnosis,
  exploration, candidate selection, estimation, superiority, parity,
  equivalence, non-inferiority, causality, or fit for use.
- **Study design** — how the question will be answered: deterministic check,
  observational study, paired comparison, randomized or blocked comparison,
  factorial design, human evaluation, or another justified method.
- **Evidence source** — what can support the claim: tests, replay, telemetry,
  corpora, scenarios, human observations, field outcomes, or authorized
  adjudication material.
- **Assurance rigor** — how much scrutiny is proportionate to stakes,
  reversibility, uncertainty, complexity, and the cost of a wrong decision.

These dimensions are not a maturity ladder or required sequence. A bounded
evaluation may start and stop in the requested setting when it answers the
decision. A local or bench study may be confirmatory; a production observation
may remain exploratory. Environment alone establishes neither rigor nor claim
strength.

Use multiple settings or gates only when each retires a different uncertainty.
The disposition may be proceed, revise, stop, escalate, or collect one named
missing piece of evidence. Do not turn a small reversible choice into a research
program or under-assure a consequential decision.

## Divide judgment from deterministic gates

The model owns contextual method fit, source applicability, and fit-for-purpose
judgment. A qualified human remains the final authority where domain expertise,
taste, ethics, policy, or consequential trade-offs determine adequacy.

Deterministic scripts own repeatable checks of structure, provenance
completeness, arithmetic, identifier consistency, and artifact integrity. Use
them before interpretation so mechanical defects do not consume judgment. A
script or validator pass does not establish source truth, source applicability,
methodological validity, or fitness for the intended decision.

## Design what answers the question

Declare the factor of interest, independent unit, target population, grouping,
controls, blocks, order, scenarios, responses, guardrails, deviations,
missingness, exclusions, and analysis before collection. Repeated calls,
ratings, turns, or events from one independent unit remain grouped; they are not
additional independent units.

Prefer existing tests, replay, telemetry, corpora, and prior artifacts before
requesting new human collection. Keep evidence sources in their proper roles:
human reports support experience claims, telemetry supports runtime claims,
versioned scenario keys support expected-content claims, and recordings support
adjudication only when permission and retention are settled.

Never invent sample sizes, thresholds, margins, weights, costs, variance, event
rates, error rates, power, or statistical claims. A superiority, parity,
equivalence, or non-inferiority claim needs an explicit estimand, a justified
margin or minimum relevant effect, assumptions, grouping treatment, missingness
policy, and error choices before collection.

## Interpret without overclaiming

First verify that the artifact and data match the declared plan. Then judge
whether the plan is fit for the intended decision. Keep those verdicts separate:
a correctly executed study may not support its intended claim, and a suitable
method may remain unverifiable when execution evidence is missing.

Grade each load-bearing claim by evidence strength and provenance. State
confidence to proceed separately. Trace every conclusion to its evidence,
measure, decision rule, population, and tested conditions. Name what the result
cannot establish and the next gate that retires the remaining uncertainty.
