# GROUND-0021: Ground a provider-neutral skill trajectory evaluation contract

**Status:** recorded
**Decision:** Define the harness around versioned repository fixtures, frozen host and skill inputs, replayable trajectories, outcome-first grading, and an optional live runner seam; keep framework selection and universal thresholds out of the contract.
**Decision ref:** doc/tasks/0048-build-skill-evaluation-harness.md
**Confidence:** Strong

## Decision and confidence

The happy path is a provider-neutral contract with two evidence lanes. A
credential-free replay lane runs deterministic validators and graders over
sanitized, versioned trajectories in local gates and CI. A separately authorized
HITL lane generates fresh trajectories through a declared host runner, freezes
the skill, model, host, tools, permissions, context, fixture, and grader inputs,
and then feeds the same grading contract. The initial corpus is stratified by
the repository's accepted skill axes rather than by the navigation guide alone:
spec-driven versus workflow-operational behavior, model-invocable versus
user-invocable policy, and representative risk and host-mechanics strata.

The evidence is Strong for taking this contract into specification. Official
guidance, public implementations, repository precedent, and Git history agree
on representative natural cases, repeated trials, outcome-first grading,
trajectory retention, deterministic checks wherever possible, and calibrated
human or model judgment where context is irreducible. The live-versus-replay
gate split remains a product decision for the owner because a genuinely live
model run necessarily depends on an authorized provider or host session. No
framework, sample count, quality threshold, or comparison margin is selected by
this record.

There is one deliberate deviation from public baseline-versus-skill examples:
user-invocable-only skills do not receive the same implicit-activation
comparison as model-invocable skills. Their contract instead tests explicit
invocation, required authorization stops, side-effect boundaries, and implicit
dormancy. Comparing two model-facing arms when the skill is unavailable to both
would manufacture evidence from identical treatments.

## Evidence

### E1 — A trajectory harness must preserve both outcome and path evidence

**Strength:** High
**Provenance:** A1, A2, C1, C2, D1

OpenAI and Anthropic both treat agent evaluation as task-specific evidence that
may include tool choice, arguments, handoffs, traces, and outcomes rather than a
single final response. `WORKFLOW.md` makes trajectory observability and the
prompt-plus-scaffold-plus-model release unit binding here. The accepted Prism
comparison protocol already freezes those inputs and inspects trajectories so a
polished answer cannot hide a bad route or unsupported intermediate decision.

### E2 — Deterministic gates and contextual judgment need separate owners

**Strength:** High
**Provenance:** A1, A2, B1, B2, C2, C3, D1

The sources converge on exact or programmatic checks for structure, tools,
files, forbidden actions, and artifact integrity, while reserving open-ended
fitness and usefulness for a calibrated judge or human. The harness should
therefore report hard deterministic failures separately from rubric judgments.
A validator pass proves execution integrity, not methodological validity or
fitness for use, and an aggregate score may not erase a critical failure.

### E3 — The corpus must use natural positive, boundary, and dormancy cases

**Strength:** High
**Provenance:** A1, A2, A3, B1, B2, C3, C4, D2

Official guidance calls for representative distributions, edge cases,
ambiguous requests, and should-not-trigger cases. The .NET implementation adds
natural prompts that do not name the skill and explicit dormancy guards. This
repository's Prism cases already model positive routes and close negatives, and
the out-of-scope adapter regression demonstrates why a plausible final answer
is insufficient when irrelevant context leaks into the route.

### E4 — Coverage needs a matrix, not one ambiguous category list

**Strength:** High
**Provenance:** A3, C5, C6, D3

The repository has two binding classification axes: artifact-producing versus
workflow-operational skills, and model-invocable versus user-invocable skills.
Risk and host mechanics add evaluation strata without redefining those accepted
categories. The initial corpus should cover every populated intersection, then
add read-only, repository-writing, approval-bound, and host-divergent cases.
This is more defensible than treating the user-facing guide's navigation groups
as the sole meaning of “skill category.”

### E5 — Invocation policy changes the valid comparison arm

**Strength:** High
**Provenance:** B1, C6, D3

ADR-0073 removes user-invocable-only descriptions from implicit model routing.
The .NET reference independently warns that a direct model-facing comparison
for a disabled skill produces identical arms. Model-invocable skills can use an
unskilled-versus-skilled activation comparison; user-invocable skills instead
need explicit-invocation and authorization-boundary cases plus separate
implicit-dormancy evidence.

### E6 — Live generation and credential-free reproducibility are different claims

**Strength:** High
**Provenance:** A1, A2, B2, C1, C2

A live agent trial requires a model and therefore an authorized provider or
host session. A credential-free gate can replay, validate, and grade a frozen
trajectory but cannot regenerate that model behavior. The honest contract keeps
those lanes distinct: CI verifies harness mechanics and current replay receipts;
HITL generation validates current behavior and refreshes a receipt when its
frozen skill or environment digest is stale.

### E7 — The current repository cases are inputs, not behavioral results

**Strength:** High
**Provenance:** C3, D1, D2

`evals/evals.json` carries useful natural prompts, expected routes, and expected
outcomes, and `test/skills.test.js` checks that those records exist and have the
required shape. Those tests do not launch either host or record a trajectory.
Task 0048 should extend this proven fixture vocabulary rather than relabeling
static contract assertions as live evaluation evidence.

### E8 — Thresholds and trial counts belong after a pilot, not in the ground record

**Strength:** High
**Provenance:** A1, A2, B2, C2

Agent behavior is stochastic and model judges are instruments that need human
calibration. The accepted Prism protocol already requires a small pilot and an
owner-approved decision rule before candidate results are inspected. Therefore
the contract may define measures and hard vetoes now, but the specification
must not copy an external sample size, margin, or pass threshold without a
mapping to this corpus, variance, grouping, and error trade-offs.

## Source register

- **A1:** OpenAI, Evaluation best practices, task-specific datasets, edge cases, agent trace evaluation, automation, and human calibration: https://developers.openai.com/api/docs/guides/evaluation-best-practices (accessed 2026-09-16 via official web documentation).
- **A2:** Anthropic, Demystifying evals for AI agents, definitions of task, trial, grader, transcript/trace, outcome, and harness plus repeated trials and mixed graders: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents (accessed 2026-09-16 via official web documentation).
- **A3:** Anthropic, Skills for enterprise, skill triggering, isolation, coexistence, instruction-following, output-quality, and representative trigger/non-trigger/ambiguous queries: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/enterprise (accessed 2026-09-16 via official web documentation).
- **B1:** `dotnet/skills:.agents/skills/create-skill-test/SKILL.md:54-60,125-126,212-218,265-284`, a public implementation that distinguishes disabled implicit invocation, natural prompts, outcome rubrics, and dormancy; short excerpt: “Test outcomes, not methods” (accessed 2026-09-16 via fetched GitHub source).
- **B2:** `arjunprabhulal/agent-skills:skills/agent-lifecycle/agent-evaluation/SKILL.md:42-72,118-121`, a public implementation that chooses the cheapest valid grader, repeats stochastic cases, records variance and baselines, and requires explicit non-coverage; short excerpt: “Grade with the cheapest method that works” (accessed 2026-09-16 via fetched GitHub source).
- **B3:** `Arize-ai/arize-skills:skills/arize-evaluator/SKILL.md`, a public implementation separating deterministic code evaluators from model judges and distinguishing span, trace, and session grading units (accessed 2026-09-16 via fetched GitHub source).
- **C1:** `WORKFLOW.md:264-272`, the binding trajectory-over-output, observability, mixed-judge, and release-unit contract (accessed 2026-09-16 via repository read).
- **C2:** `src/skills/codex/ad-prism/references/skill-comparison.md:19-63`, the existing frozen comparison, natural-case, blinded-grading, hard-failure, pilot, and receipt protocol (accessed 2026-09-16 via repository read and graph extraction).
- **C3:** `src/skills/codex/ad-prism/evals/evals.json` and `test/skills.test.js:372-498,676-693`, the current static routing corpus and shape assertions, with no host execution (accessed 2026-09-16 via repository read).
- **C4:** `src/skills/codex/ad-prism/references/domain-adapter.md` and `test/skills.test.js:372-397`, the irrelevant-context containment contract and its static regression case (accessed 2026-09-16 via repository read).
- **C5:** `doc/adr/0007-workflow-operational-skills.md:21-40`, the accepted spec-driven versus workflow-operational classification (accessed 2026-09-16 via repository read).
- **C6:** `doc/adr/0073-skill-invocation-policy-and-listing-budget.md:18-29`, the accepted user-invocable-only versus model-invocable policy and blast-radius boundary (accessed 2026-09-16 via repository read).
- **C7:** local `codex-cli 0.147.0` and Claude Code `2.1.227` help output, confirming non-interactive structured-output surfaces (`codex exec --json`, `--output-schema`, `--ephemeral`, `--ignore-user-config`; `claude -p`, JSON/stream-JSON output, JSON schema, tool controls, and no-session-persistence) without selecting either command shape as the harness API (accessed 2026-09-16 via local command execution).
- **D1:** `git show 8b1043a -- src/skills/codex/ad-prism test` and `git show c4204c7 -- src/skills/codex/ad-prism test`; the generic evaluation skill introduced static cases and later added frozen multi-arm comparison and assurance (accessed 2026-09-16 via git history).
- **D2:** `git show 4a264be -- src/skills/codex/ad-prism test/skills.test.js`; an out-of-scope adapter regression required a new behavioral contract and fixture (accessed 2026-09-16 via git history).
- **D3:** `git show 1efd695 -- doc/adr/0073-skill-invocation-policy-and-listing-budget.md src/skills test/skills.test.js`; invocation class became a tested dual-host contract (accessed 2026-09-16 via git history).
- **D4:** `git log origin/main --oneline -- doc/tasks/0048-build-skill-evaluation-harness.md`; commits `acdb634` and `2c74488` introduced and anchored the pending task, with no harness implementation on `origin/main` or surveyed sibling branches (accessed 2026-09-16 via git history and branch sweep).

## Limitations and reversal

This record does not establish that a chosen corpus represents production use,
that a model judge agrees with the owner, that one host's trajectory schema maps
losslessly to the other, or that replay evidence validates current live model
behavior. A pilot must retire those gaps before a behavioral release claim. New
host APIs, a credential-free local model accepted as the target population, or
evidence that replay receipts routinely conceal regressions would reopen the
recommended gate split. Repeated need for framework-specific semantics would
justify an adapter decision after the contract is specified; it does not justify
selecting a framework first.

## Audit path

Run `node .agents/skills/ad-ground/scripts/validate-record.mjs doc/research/0021-ground-skill-trajectory-evaluation-harness.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
