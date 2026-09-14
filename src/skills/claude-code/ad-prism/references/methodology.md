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

## Choose proportionate assurance

Start with the smallest level that can support the intended decision:

1. **Technical verification** checks that the system and evidence pipeline work
   as declared.
2. **Human smoke test** finds obvious usability or workflow failures with a
   deliberately limited claim.
3. **Exploratory comparison** discovers patterns and estimates uncertainty; it
   does not silently become confirmatory evidence.
4. **Confirmatory study** tests a prespecified claim and decision rule with
   justified design assumptions.
5. **Limited field validation** checks fit in the target context under explicit
   rollout and stop conditions.

Use multiple gates only when each retires a different uncertainty. Do not turn a
small reversible choice into a research program or under-assure a consequential
decision.

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
