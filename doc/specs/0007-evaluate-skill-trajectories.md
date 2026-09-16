# Spec `0007`: Evaluate skill trajectories

**Status:** accepted
**Created:** 2026-09-16
**Owner:** Alexandre Alvaro

## Context

The kit tests skill packaging, metadata, host parity, deterministic helpers, and
selected static behavior contracts. Those checks can prove that a skill is
present and structurally coherent, but they do not prove that the skill guides
an agent through a useful end-to-end trajectory on a representative repository.
A skill may route incorrectly, use an unsafe intermediate step, ignore a required
approval, or produce an attractive final answer that conceals a broken path.

The PRD therefore places a skill evaluation harness in the Later tier, and
`WORKFLOW.md` §13 requires trajectory evidence for autonomous decisions. The
feature must add that evidence without turning the offline CLI into a hosted
service, putting provider credentials into normal CI, treating static fixtures
as live behavior, or optimizing skills against one hand-picked example.

The approved product boundary is a hybrid gate. Local verification and CI replay
sanitized, frozen trajectories without credentials. Fresh model behavior is
generated separately through an explicitly authorized HITL runner and then
graded through the same contract. These lanes make different claims and must
remain distinguishable in every result.

## User Scenarios

- **Scenario 1: Replay a trajectory in CI**
  - Given a tracked fixture, frozen trajectory receipt, and declared graders
  - When the normal local or CI gate evaluates the case
  - Then it verifies the receipt and reports the deterministic and judgment
    results without a provider credential or hidden machine state.

- **Scenario 2: Generate fresh behavioral evidence**
  - Given an authorized host runner and a frozen case definition
  - When a maintainer starts a live HITL evaluation
  - Then the harness records the structured trajectory, outcome, environment,
    input digests, and grader evidence without discovering or storing the
    runner's credentials.

- **Scenario 3: Detect an intentionally broken trajectory**
  - Given a healthy fixture and a controlled broken counterpart
  - When both are evaluated by the same grading contract
  - Then the healthy case satisfies its declared expectations and the broken
    case fails for the intended reason with an actionable failure record.

- **Scenario 4: Evaluate a model-invocable skill**
  - Given a natural request that should or should not activate the target skill
  - When comparable unskilled, target-skill, or full-kit arms run as declared
  - Then routing, dormancy, outcome quality, and side effects are evaluated
    without naming the skill or rewarding its vocabulary in the prompt.

- **Scenario 5: Evaluate a user-invocable-only skill**
  - Given an explicit invocation case and a separate ordinary user request
  - When the skill is evaluated
  - Then the explicit case tests its outcome and approval boundaries while the
    ordinary request proves implicit dormancy, without comparing identical
    model-facing arms.

- **Scenario 6: Diagnose a failed case**
  - Given a trajectory violates a deterministic assertion or misses a judgment
    criterion
  - When the result is rendered
  - Then it names the case, trial, expected and observed result, evidence
    locator, grader kind, frozen inputs, and reproduction command.

## Requirements

### Functional

- R1: The harness consumes a versioned case format containing a stable case
  identifier, natural request, sanitized repository fixture, skill-category and
  risk strata, expected route or explicit invocation, expected outcome, allowed
  and forbidden effects, required approval stops, graders, and exclusions.
- R2: The initial corpus covers every populated intersection of the accepted
  spec-driven versus workflow-operational and model-invocable versus
  user-invocable-only axes. Selection also covers read-only, reversible
  repository-writing, approval-bound, and host-divergent behavior.
- R3: Each representative skill has a positive case, a close-negative or
  dormancy case, and an ambiguous or coexistence case. Prompts do not name the
  target skill, expected route, internal framework, or skill-specific vocabulary.
- R4: Fixtures are tracked, sanitized synthetic micro-repositories. A healthy
  fixture satisfies its prerequisites; an intentionally broken fixture fails
  for the exact declared reason and no unrelated setup defect.
- R5: Every evaluation freezes the case and fixture digests, skill content
  digest, host and version, model and version, scaffold, available tools,
  permissions, context policy, run parameters, grader versions, and trial count.
- R6: The replay lane reads only tracked fixtures and sanitized receipts. It
  executes without provider credentials, user configuration, or hidden local
  state and is the lane eligible for the normal local and CI gate.
- R7: The live lane accepts an explicitly supplied runner through a stable
  adapter boundary, captures structured host events and final outcomes, and
  never discovers, reads, stores, or publishes the runner's credentials.
- R8: A live receipt whose frozen skill, fixture, grader, host, model, scaffold,
  or policy input no longer matches the claimed evaluation is reported as stale
  and cannot support a current-release behavioral claim.
- R9: Model-invocable cases may compare unskilled, target-skill, and full-kit
  coexistence arms. Trials remain grouped under their case, and graders are
  blind to arm identity when the study design permits.
- R10: User-invocable-only cases evaluate explicit invocation, required
  authorization stops, side-effect boundaries, and implicit dormancy. The
  harness does not report a direct preference comparison when the target skill
  is unavailable to both model-facing arms.
- R11: Exact routes, activation or dormancy, files, schemas, commands,
  permissions, exit states, and forbidden effects use deterministic assertions.
  Contextual usefulness, constraint adherence, decision quality, and redirection
  quality use anchored rubrics calibrated against blind human labels.
- R12: Hard failures include wrong routing, unauthorized effects, bypassed
  approval, unsupported claims, private-context leakage, corrupted fixtures, and
  missing provenance. They are reported separately and cannot be overridden by
  an aggregate score.
- R13: Each result distinguishes verification of receipt integrity from
  validation of behavioral fitness and distinguishes replayed evidence from
  newly generated evidence.
- R14: Every failure record contains the case and trial identifiers, frozen
  configuration and digests, expected and observed result, grader, evidence
  locator, deterministic-versus-judgment classification, and reproduction
  command.
- R15: Results report capability-level dispositions, repeated-trial variation,
  explicit non-coverage, and human-versus-model grader agreement where a model
  judge is used. One aggregate score cannot conceal a capability regression or
  hard failure.
- R16: The same case and result contract supports Claude Code and Codex. Host
  adapters may differ internally, but host-specific data is normalized without
  erasing information required to diagnose the original trajectory.

### Non-functional

- Normal local and CI execution is offline, deterministic, credential-free, and
  compatible with the supported Node.js and operating-system matrix.
- Public fixtures, receipts, examples, and reports contain no credentials,
  personal data, private prompts, private repository content, telemetry, hidden
  local state, or organization-specific vocabulary.
- Repository paths, timestamps, and nondeterministic identifiers are normalized
  where they do not carry evaluation meaning; load-bearing provenance and input
  digests remain intact.
- A grader or validator failure is explicit and cannot be converted into a pass
  or silently omitted from a result.
- The case schema, receipts, deterministic graders, and result renderer are
  documented and covered through public interfaces.
- Canonical skill sources, installed dogfood copies, and any host-specific
  evaluation assets remain equivalent where the installer contract requires it.

## Success Criteria

- A credential-free local/CI run validates and grades a sanitized known-good
  replay, and rejects an intentionally broken replay for its declared failure.
- The initial corpus contains at least one representative skill from every
  populated category-axis intersection, with positive, boundary/dormancy, and
  ambiguous/coexistence coverage for each representative.
- A model-invocable fixture demonstrates observable routing and outcome
  differences between its declared arms without skill names or copied skill
  vocabulary in the prompt or rubric.
- A user-invocable-only fixture demonstrates successful explicit invocation,
  the required approval or side-effect boundary, and implicit dormancy without
  presenting identical arms as comparative evidence.
- Fake runner adapters for Claude Code and Codex prove that equivalent cases
  produce the common receipt and result contract while retaining host-specific
  diagnostic events.
- One authorized live pilot on each relevant host records all frozen inputs,
  repeated trials, outcomes, trajectories, and limitations without placing
  credentials or private session state in a tracked artifact.
- Changing a frozen skill, fixture, grader, or environment input makes the
  corresponding live receipt stale and prevents it from supporting the current
  behavioral claim while leaving historical replay auditable.
- Deterministic assertions identify exact mechanical failures, and calibrated
  judgment identifies the intended known-good versus intentionally broken
  quality difference on the pilot cases.
- Every failing result names the fixture, expected outcome, observed outcome,
  evidence locator, and deterministic or judgment-based classification.
- The pilot records human labels and model-judge agreement before the owner sets
  the trial policy and acceptance tolerance; no candidate result is used to tune
  that rule.
- The complete local gate, dual-host parity checks, dogfood refresh where
  applicable, fresh-context review, and package dry-run pass with the harness
  included.

## Edge Cases

- A case identifier is duplicated, a fixture is untracked, or a declared file is
  missing.
- A healthy fixture is invalid or an intentionally broken fixture fails for an
  unrelated reason.
- A trajectory stream is truncated, malformed, empty, reordered, or lacks a
  final outcome.
- The runner exits unsuccessfully before producing a receipt or emits events the
  adapter does not recognize.
- The host invokes the wrong skill, invokes no skill, or invokes an additional
  skill that changes the result.
- A user-invocable-only skill appears in an implicit model-facing arm despite its
  policy.
- The agent requests an external action for which approval is absent, denied, or
  revoked during the trial.
- A trial modifies files outside its isolated fixture or leaves state that could
  affect a later trial.
- Deterministic graders disagree, a model judge returns an invalid label, or
  human and model judgments fall outside the pilot's approved agreement rule.
- One host exposes richer trajectory events than the other.
- A receipt is structurally valid but stale against the current skill or
  environment digest.
- All trials pass while the corpus lacks a declared category, close negative, or
  known failure mode.

## Out of Scope

Selecting or adopting an evaluation framework, hosted evaluation services,
provider account management, credentials in CI, production telemetry, automatic
scheduled model runs, a universal quality score, production-frequency claims,
full per-skill coverage in the first corpus, private evidence publication, and
Task 0047 publication work are not part of this feature contract.

## Open Questions

- **Implementation mechanism:** Framework or bespoke-runner selection is deferred
  to Task 0048 implementation planning after this spec is accepted. The choice
  must preserve the provider-neutral case, receipt, adapter, and grading
  contracts and justify any new dependency.
- **Pilot decision values:** The number of repeated trials, model-judge agreement
  rule, and acceptance tolerance will be proposed from the known-good versus
  intentionally broken pilot and approved by the owner before any candidate
  result is inspected. No external threshold is adopted by analogy.

## Related

- Product scope: `doc/product/PRD.md` — Later tier: Skill eval harness
- ADRs: `doc/adr/0007-workflow-operational-skills.md`,
  `doc/adr/0073-skill-invocation-policy-and-listing-budget.md`,
  `doc/adr/0077-adopt-generic-prism-evaluations.md`
- Evidence: `doc/research/0021-ground-skill-trajectory-evaluation-harness.md`,
  `doc/research/0022-skill-trajectory-evaluation-contract.md`
- Tasks: `doc/tasks/0048-build-skill-evaluation-harness.md`
- Depends on: none
