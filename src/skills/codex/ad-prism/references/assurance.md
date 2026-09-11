# Assurance for material evaluations

Use this protocol when an evaluation will support a rollout, a consequential or
hard-to-reverse decision, a durable analytical artifact, or a public material
claim. A bounded methodology answer, ordinary code test, or routine
collaboration reply does not require this ceremony.

## Freeze and review

1. Settle the candidate evaluation artifact and its declared source set.
2. Run the plan or report validator that matches the artifact.
3. Freeze the candidate file or directory package with
   `freeze-artifact.mjs`.
4. Run a skeptical methodology pass against the frozen candidate, the intended
   decision, requirements, and accessible sources.
5. Independently verify every finding. If independent context is unavailable,
   use a separate verification pass and disclose that limitation.
6. Give every finding one disposition: **confirmed**, **rejected with
   evidence**, or **reserved for owner judgment**.
7. Correct confirmed findings, rerun the applicable validators, and freeze the
   final artifact.
8. Record the final receipt, access gaps, verdicts, finding dispositions, and
   publication-safe claims and limits in the audit template.

A finding is a claim to test, not a decision. Do not change a settled artifact
merely because a skeptical pass asserted a problem.

## What to verify

Check that:

- the decision, objective, question, claim, evidence, task, measure, data source,
  decision rule, and next gate remain traceable;
- factors are not mixed accidentally with controls;
- the independent unit is explicit and repeated observations remain grouped;
- data integrity and attribution are adequate before interpretation;
- calculations match the declared source data;
- identifiers, versions, exclusions, and deviations are traceable;
- the decision rule was not inferred after results were seen;
- recommendations distinguish evidence from judgment;
- no conclusion extends beyond the tested population and conditions.

## Two verdicts

Always emit both:

- **Verification verdict:** whether the artifact, data, calculations, and
  execution match the declared plan and can be traced.
- **Fit-for-purpose validation verdict:** whether that plan and evidence are
  adequate for the intended decision in the target context.

Use `pass`, `conditional`, or `fail` with a short evidence-backed reason for
each. Never collapse the pair into one generic “valid” label.

## Receipt boundary

The freeze command hashes the settled local file or directory package. It does
not preserve an external source page, prove that an external source was
complete, or make a remote source immutable. Record source locators, access
dates when lifecycle evidence requires them, versions or content anchors when
available, and every access gap. Pass only verified claims, source references,
and material limits onward.
