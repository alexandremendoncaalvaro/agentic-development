# Comparing evaluation skills

Use this protocol to decide whether one evaluation skill can replace another.
The comparison measures decision support, not stylistic similarity.

## Three arms

Run the same cases through all three arms:

1. **Private or reference Prism** — the current comparator, not ground truth and
   not automatically correct.
2. **Generic `ad-prism`** — no project adapter.
3. **Generic `ad-prism` plus a minimal domain adapter** — only the project facts
   needed to test whether explicit context closes a material gap.

The reference arm may expose capabilities worth preserving and defects worth
rejecting. Grade every arm against the same decision-focused criteria.

## Freeze before execution

Before any candidate comparison, freeze:

- case identifiers and exact inputs;
- skill version or content digest for every arm;
- model and version, host and available tools, permissions, and context policy;
- grader prompt or deterministic checks, trial count, and run parameters;
- the decision rule and known exclusions.

Keep private fixtures outside the repository. A public receipt may contain only
sanitized neutral cases, aggregate findings, source locators, and non-sensitive
limitations. Never copy private prompts, outputs, telemetry, vocabulary, or
adapter content into the public kit.

## Cases and grading

Use representative positive cases, edge cases, and close negatives. Natural prompts
must not name the skill, route, expected framework, or internal file.
Write outcome-shaped criteria rather than matching vocabulary or an execution
path. Include hard failures for unsupported claims, invented values, private
context leakage, wrong routing, and needless scope expansion.

Randomize arm order within each case, run multiple trials, and blind human or
model graders to the arm identity. Use deterministic checks for exact facts and
structure; use calibrated human or model judgment for methodological fit.
Inspect trajectories when available so a polished final answer cannot hide a
bad route or unsupported intermediate decision.

## Decision rule

Run a small pilot to calibrate the grader and set the owner-approved tolerance
and decision rule before the full comparison or any candidate result is seen.
Do not invent a universal margin. Report capability-level wins, losses, and
hard failures separately; an aggregate score must not erase a critical failure.

Conclude **replace**, **replace with adapter**, **retain**, or **insufficient
evidence**. State which evidence would reverse the conclusion.

## Reproducibility receipt

Record the frozen digests, environment, trials, graders, per-capability results,
hard failures, exclusions, and final rule application. If private evidence was
used, retain the detailed receipt only in its authorized location and publish a
sanitized aggregate receipt that cannot reconstruct the private material.

## Method sources

### M1 — Agent evaluation construction
- Source: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Supports: representative tasks, repeated trials, outcome graders, and trajectory inspection.
- Contribution: makes variation and hidden routing failures visible instead of grading one polished answer.
- Adaptation: applies the same frozen cases and blinded graders to three skill arms.
- Retained limit: does not determine which Prism is adequate or supply a project decision margin.

### M2 — Skill baseline comparison
- Source: https://github.com/dotnet/skills/blob/main/.agents/skills/create-skill-test/SKILL.md
- Supports: natural prompts, baseline-versus-skill comparison, outcome rubrics, and dormancy cases.
- Contribution: prevents prompts and graders from rewarding copied skill vocabulary or unnecessary invocation.
- Adaptation: adds a third adapter arm and explicit private-fixture containment to the public comparison.
- Retained limit: is an implementation reference, not empirical proof that its protocol fits every skill or domain.

### M3 — Evaluation best practices
- Source: https://developers.openai.com/api/docs/guides/evaluation-best-practices
- Supports: task-specific cases, representative distributions, edge cases, automation, and human calibration.
- Contribution: anchors the case mix and the pilot calibration before candidate results are inspected.
- Adaptation: keeps exact checks deterministic while reserving methodological fit for calibrated judgment.
- Retained limit: does not provide universal thresholds, trial counts, or replacement tolerances.
