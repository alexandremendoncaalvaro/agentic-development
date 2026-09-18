# PRISM-0022: Skill trajectory evaluation contract

**Status:** recorded
**Decision ref:** doc/specs/0007-evaluate-skill-trajectories.md; doc/tasks/0048-build-skill-evaluation-harness.md
**Evidence ref:** doc/research/0021-ground-skill-trajectory-evaluation-harness.md

## Decision

Decide whether Task 0048 should specify a hybrid evaluation gate: deterministic,
credential-free replay in the normal local/CI gate, plus explicitly authorized
live dual-host trials at a human-controlled gate. This decision must precede
framework selection and implementation.

## Objective

Define a reproducible, provider-neutral contract that can detect when a shipped
skill improves, misroutes, or harms an end-to-end agent trajectory on sanitized
representative repositories. The target context is the dual-host Agentic
Development kit; the first release must remain compatible with its offline CLI,
HITL task classification, and no-credential CI posture.

## Evaluation question

Can one frozen case format and grading contract distinguish a conforming skill
trajectory from an intentionally broken trajectory, report the failure at an
actionable level, and preserve honest limits across invocation classes and hosts
without requiring model credentials in the normal CI gate?

## Claim

If the contract passes its pilot, it may support the claim that the harness can
reproducibly verify stored trajectory receipts and can evaluate newly generated
skill behavior when an authorized live runner is supplied. It may support only
the represented skill categories, hosts, models, fixtures, and failure modes. It
does not establish universal skill quality or production effectiveness.

## Evidence

Each case freezes:

- a stable case identifier, category and risk strata, natural user request, and
  sanitized fixture digest;
- expected route or explicit invocation, expected outcome, allowed and forbidden
  side effects, required approval stops, and known exclusions;
- skill content digest, host and version, model and version, scaffold, available
  tools, permissions, context policy, run parameters, grader versions, and trial
  count;
- a structured event stream, final response, filesystem diff or artifact
  manifest, exit state, timing metadata, and a provenance-bearing receipt.

Ground truth is layered. Exact route, files, schema, commands, permissions, and
forbidden effects are deterministic assertions. Contextual usefulness,
constraint adherence, decision quality, and redirection quality use anchored
pass/partial/fail rubrics calibrated against blind human labels. Hard failures
remain visible outside any aggregate.

## Tasks

The initial corpus uses sanitized synthetic micro-repositories with healthy and
intentionally broken variants. It covers every populated intersection of the
two accepted category axes:

1. spec-driven and model-invocable;
2. spec-driven and user-invocable-only;
3. workflow-operational and model-invocable;
4. workflow-operational and user-invocable-only.

Selection also covers read-only, reversible repository-writing,
approval-bound/outward, and host-divergent behavior. Each representative skill
gets a natural positive case, a close-negative or dormancy case, and an ambiguous
or coexistence case. Model-invocable cases compare an unskilled arm with the
target-skill arm and may add a full-kit coexistence arm. User-invocable-only
cases exercise explicit invocation and approval boundaries; their implicit lane
tests dormancy and must not pretend that two model-facing identical arms are a
comparison.

The independent unit is the frozen case. Repeated stochastic trials remain
grouped within that case. A pilot first runs a known-good trajectory and an
intentionally broken trajectory through the same graders. Live arm order is
randomized where comparison permits, and human or model graders are blind to arm
identity. Trajectories are inspected for routing and safety, while outcomes own
the open-ended quality judgment.

## Measures

Primary evidence is a per-case disposition with no single universal quality
score:

- deterministic assertion result and named failing assertion;
- expected versus observed route, activation, or dormancy;
- expected versus observed outcome and artifact/diff locator;
- hard-failure flags for wrong routing, unauthorized effects, missing approval,
  unsupported claims, private-context leakage, or fixture corruption;
- anchored rubric judgments for usefulness, constraint adherence, and correct
  redirection where applicable;
- repeated-trial distribution and instability by case;
- human-versus-model grader agreement on the calibration sample.

Every failure record names the case, trial, frozen configuration and digests,
expected result, observed result, grader, evidence locator, deterministic versus
judgment classification, and reproduction command. Capability-level results are
reported separately so aggregate movement cannot hide a critical regression.

## Data sources

The contract is grounded in
`doc/research/0021-ground-skill-trajectory-evaluation-harness.md`. Case seeds come
from the shipped `evals/evals.json` records, task acceptance criteria, accepted
ADRs, prior regression cases, and sanitized synthetic fixtures. No private
conversation, private repository content, credentials, telemetry, or hidden
local state may enter the public corpus or receipts.

The replay lane reads only tracked fixtures and sanitized receipts. A live lane
accepts a runner command through an explicit adapter boundary and records the
host's structured output; it never discovers or reads credentials. The current
Codex and Claude Code CLI surfaces demonstrate that structured non-interactive
adapters are feasible, but their flags are observations rather than the stable
harness API. A stale skill, fixture, grader, or environment digest invalidates a
receipt for a current-release behavioral claim.

## Decision rule

Recommended owner decision: adopt the hybrid gate.

- **Proceed to `ad-spec`** when the owner accepts credential-free replay as the
  normal CI claim and authorized live trials as the separate behavioral claim.
- **Revise before specification** if the owner requires live model generation to
  block normal CI; that choice must explicitly accept provider credentials,
  variable cost, stochastic failures, and a departure from the offline gate.
- **Revise the harness contract** if the pilot cannot make the known-good and
  intentionally broken trajectories diverge, if graders cannot be calibrated,
  or if either host cannot emit enough evidence for the required failure record.
- **Stop a release claim** on any hard failure, fixture invalidity, stale frozen
  input, or missing provenance. No aggregate score can override that stop.

The pilot sets an owner-approved rubric tolerance and trial policy before any
candidate result is inspected. This plan intentionally declares no universal
threshold, margin, or sample count.

## Limits

Replay verifies a recorded trajectory and the current graders; it does not prove
that the current model would reproduce the path. A live bench trial does not
represent production frequency or every repository. Synthetic fixtures can be
auditable while still missing real failure modes. Model-judge agreement on a
pilot does not remove the need for human review on consequential or ambiguous
cases. Category coverage is not per-skill coverage, and dual-host feasibility is
not semantic equivalence between hosts.

The first contract will not select a framework, require a hosted evaluation
service, publish private evidence, define production monitoring, or start Task
0047. Those are separate decisions and scopes.

## Sources

### M1 — Goal/Question/Metric decision chain
- Source: https://ntrs.nasa.gov/api/citations/19920010178/downloads/19920010178.pdf (reachability confirmed 2026-09-17 via HTTP HEAD, 200 application/pdf; content read in the 2026-09-16 drafting session)
- Supports: deriving answerable evaluation questions and measures from the explicit harness decision and objective.
- Contribution: prevents the implementation mechanism or an available metric from becoming the evaluation goal.
- Adaptation: maps the Task 0048 gate decision to one question, layered evidence, and named measures.
- Retained limit: does not choose a corpus, threshold, trial count, or host adapter.

### M2 — Evidence-Centered Design
- Source: https://www.ets.org/Media/Research/pdf/TC-10-07.pdf (reachability confirmed 2026-09-17 via HTTP HEAD, 200 application/pdf; content read in the 2026-09-16 drafting session)
- Supports: linking claims to the evidence and tasks capable of producing that evidence.
- Contribution: keeps fixture tasks, trajectory evidence, and permitted claims traceable instead of treating a score as self-explanatory.
- Adaptation: uses frozen cases as evidence-producing tasks and separates deterministic evidence from judgment evidence.
- Retained limit: the assessment framework does not validate this repository's case representativeness or graders.

### M3 — Agent task/trial/grader/trace/outcome model
- Source: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents (accessed 2026-09-16 via official web documentation, GROUND-0021 A2; reachability reconfirmed 2026-09-17)
- Supports: representative tasks, repeated trials, mixed graders, isolated environments, outcomes, and trajectory inspection.
- Contribution: supplies the operational vocabulary and preserves path evidence for nondeterministic agents.
- Adaptation: groups trials by frozen case, makes outcomes primary, and retains routes and effects for diagnosis and hard gates.
- Retained limit: does not provide Task 0048's categories, acceptance threshold, or credential policy.

### M4 — Task-specific evaluation and calibrated judgment
- Source: https://developers.openai.com/api/docs/guides/evaluation-best-practices (accessed 2026-09-16 via official web documentation, GROUND-0021 A1; reachability reconfirmed 2026-09-17)
- Supports: representative task-specific datasets, edge and adversarial cases, automation, classification-style grading, and human calibration.
- Contribution: supports natural cases and the split between exact checks and calibrated contextual judgment.
- Adaptation: uses deterministic assertions first and anchored pass/partial/fail rubrics only for irreducible quality questions.
- Retained limit: does not make the OpenAI Evals product or API the selected harness framework.

### M5 — Public skill baseline and dormancy pattern
- Source: https://github.com/dotnet/skills/blob/main/.agents/skills/create-skill-test/SKILL.md (accessed 2026-09-16 via fetched GitHub source, GROUND-0021 B1; reopened 2026-09-17 by an audit reviewer)
- Supports: natural prompts, baseline-versus-skill arms, outcome rubrics, fixture integrity, and dormancy guards.
- Contribution: supplies a real implementation pattern and exposes the identical-arm error for disabled implicit invocation.
- Adaptation: keeps comparative arms for model-invocable skills and uses explicit invocation plus dormancy for user-invocable-only skills.
- Retained limit: its repository-specific schema, sample floors, and statistical gate are not transferred.

## Audit path

Run `node .claude/skills/ad-prism/scripts/validate-plan.mjs doc/research/0022-skill-trajectory-evaluation-contract.md`, then reopen every method source. Structural validity proves the sections and method records, not the source content. This plan was not frozen with `freeze-artifact.mjs`: it produced Spec 0007 and no claim from it was prepared for publication, which is the condition ADR-0077 sets for the freeze-and-audit ceremony. The reachability notes on M1 and M2 record one observation each (HTTP 200 on 2026-09-17 in the drafting session's orchestrator); a re-audit reviewer observed HTTP 503 from the NASA server later the same day, so a reachability note is a dated observation, not a guarantee, and the content claim rests on the drafting-session read.
