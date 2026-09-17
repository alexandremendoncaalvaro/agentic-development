# Task `0048`: Build a skill trajectory evaluation harness

**Status:** in-progress
**Created:** 2026-08-11
**Scope ref:** doc/product/PRD.md — Later tier: Skill eval harness
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:** doc/specs/0007-evaluate-skill-trajectories.md
**Evidence ref:** doc/research/0021-ground-skill-trajectory-evaluation-harness.md; doc/research/0022-skill-trajectory-evaluation-contract.md; doc/research/0023-ground-skill-evaluation-harness-mechanism.md
**Board ref:**

## Context

The kit has structural and deterministic-script tests, but it does not yet
measure whether a skill guides an agent through a useful end-to-end trajectory
on representative repositories. The accepted PRD's Later tier calls for an
evaluation harness aligned with `WORKFLOW.md` §13 and a fixture corpus. The
evaluation contract must distinguish deterministic assertions from model
judgment and must not optimize a skill against a single hand-picked example.

## Acceptance Criteria

- [x] A feature specification defines the fixture corpus, evaluation inputs, ground-truth outcomes, scoring, and what can run deterministically in CI.
- [ ] The harness evaluates at least one representative trajectory for every shipped skill category without requiring credentials or hidden local state.
- [ ] Results make failures actionable by naming the fixture, expected outcome, observed outcome, and whether the gap is deterministic or judgment-based.
- [ ] The harness is documented, tested, dual-host-aware where relevant, and passes the local gate plus fresh-context review.

## Plan

- [x] Use `/ad-grill-me`, `/ad-ground`, and `/ad-spec` to define a measurable evaluation contract before selecting a framework.
- [ ] Build a small, versioned fixture corpus and prove the harness distinguishes a passing trajectory from an intentionally broken one.
- [ ] Extend coverage incrementally by skill category, avoiding scores that cannot be reproduced from declared inputs.
- [ ] Run the local gate and fresh-context review.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-11

Registered from the accepted PRD's Later-tier roadmap. The feature remains
HITL because the evaluation measure itself is a product and quality decision.

### 2026-09-16

Reconciled the task against the clean `origin/main` baseline and completed the
pre-spec `ad-grill-me`, four-source `ad-ground`, and `ad-prism` pass. The evidence
supports a provider-neutral contract with frozen fixtures and inputs,
outcome-first grading, retained trajectories, invocation-class-specific arms,
and separate deterministic versus judgment evidence. One owner decision remains
before `ad-spec`: accept credential-free replay in local/CI gates plus authorized
live dual-host trials at the HITL gate, or require live model generation in CI
and explicitly accept credentials, cost, and stochastic gate behavior. No
harness implementation or Task 0047 work started.

### 2026-09-16 — Owner decision

The owner accepted the recommended hybrid gate: credential-free deterministic
replay in normal local/CI verification, with newly generated dual-host behavior
evaluated through an explicitly authorized HITL runner. Drafted
`doc/specs/0007-evaluate-skill-trajectories.md` from that boundary. Framework
selection, pilot decision values, implementation, and Task 0047 remain unstarted.

### 2026-09-16 — Spec accepted

The owner accepted `doc/specs/0007-evaluate-skill-trajectories.md`. The next
session should de-risk the implementation mechanism before code: confirm whether
the framework question requires a staged spike, then build through test-first
vertical slices. No implementation or Task 0047 work started in this session.

### 2026-09-17 — De-risk register

Ran `ad-derisk` before any code. The register is ordered by impact times
uncertainty and graded per `WORKFLOW.md` §17 Axis 2. Retirement evidence lives
in `doc/research/0023-ground-skill-evaluation-harness-mechanism.md` (GROUND-0023).

| # | Unknown | Impact if wrong | Retired by | Grade |
|---|---|---|---|---|
| R1 | Implementation mechanism: evaluation framework versus bespoke in-stack runner | Provider coupling, credentials in CI, or a large dependency tree for a repository-only gate | GROUND-0023, four sources | Strong: bespoke, dependency-free ESM on Node built-ins, repository-only, runner-adapter seam; no framework |
| R2 | Both host event streams (`claude -p --output-format stream-json`, `codex exec --json`) carry every Spec 0007 failure-record field | Failure records incomplete on one host; R14 and R16 unmet | GROUND-0023 E2 names the documented events; the authorized live pilot is the measurement | Conditional: adapter seam plus fake runner adapters fed with captured sample streams; pilot measures |
| R3 | Fixture and receipt digests stable across the Ubuntu and Windows CI legs | Replay lane red on one leg only | GROUND-0023 E6: `.gitattributes` LF normalization and the `ad-prism` freeze scheme | Strong: reuse the freeze scheme unchanged |
| R4 | Harness placement and shipping boundary | npm package, installer contract, or skill parity tests disturbed | GROUND-0023 E5 | Strong: repository-only top-level `eval/` outside `package.json#files`; fixture roots added to the ESLint ignore list |
| R5 | Corpus representatives for the four category-axis intersections | A populated intersection left uncovered (Spec 0007 R2) | ADR-0007 and ADR-0073 class lists | Strong: candidate map below; final pick at slice planning |
| R6 | Judgment graders inside the credential-free replay lane | Replay lane silently needs a model | Spec 0007 R6, R11, R13 | Strong: replay re-applies deterministic assertions and reports recorded judgment labels as replayed evidence; it never regenerates them |
| R7 | Live-lane credential hygiene | Credentials or private session state reach a tracked artifact | Spec 0007 R7 and non-functional requirements state the contract; `GUIDELINES.md` §12.6 names GitHub secret scanning and push protection as the remote boundary; no in-repo mechanism covers credentials locally (ADR-0033 leak-guard is scoped to house IP) | Conditional: the adapter passes the environment through untouched and never reads it, by design; a sanitizer test rejects any receipt carrying a known credential variable value before it is tracked; the live pilot confirms |
| R8 | Repository gates meeting micro-repo fixtures (ESLint, Prettier, changelog-gate, leak-guard) | Fixture content turns `npm run verify` red or raises false leak alarms | GROUND-0023 C5; `lefthook.yml` | Conditional: ESLint ignore for fixture roots, Prettier globs already exclude them; verify with the full local gate on the first slice |
| R9 | Pilot decision values: trial count, model-judge agreement rule, acceptance tolerance | Rule tuned on candidate results | Not retirable before the pilot; owner decision by design (Spec 0007 Open Questions) | Accepted and sequenced: one owner approval round after the known-good versus intentionally broken pilot and before any candidate result |
| R10 | Live-trial isolation: a host CLI writes outside its fixture or leaves state for a later trial | Cross-trial contamination; Spec 0007 edge case unhandled | `test/prism-scripts.test.js:62` pattern (`mkdtempSync` copy per run); host sandbox flags documented in GROUND-0023 A2 and A3 (`codex exec --sandbox`, `-C`; `claude -p --allowedTools`, `--permission-mode`) | Conditional: every trial runs in a fresh temporary copy of the fixture with the host confined to that directory; the post-trial filesystem digest against the fixture digest reports any outside write or leftover state; the pilot measures |
| R11 | Staleness digest: what is hashed and whether canonical and dogfood skill copies agree | False stale or false current receipts (Spec 0007 R8) | `AGENTS.md:104`, installed copies must stay byte-identical to `src/skills/`; GROUND-0023 C1 freeze scheme | Strong: hash the canonical `src/skills/<host>/<skill>/` directory with the freeze scheme; the installer contract guarantees the dogfood copy yields the same digest; staleness compares the receipt digest to the current one |

Regime: R1 is Strong, so framework versus bespoke runner is not a technique
uncertainty and `ad-spike` is not warranted. Strategy choices inside the bespoke
runner, such as the event normalization shape or the receipt validation
approach, route to `ad-tdg` within `ad-tdd` slices.

Stop criterion: met. The residual technical risk (R2, R7, R8, and R10, each
Conditional with a named mitigation and a pilot measurement) is below the
non-technical risks (R9 owner values and corpus representativeness).
Implementation may proceed through test-first vertical slices.

Fresh-context review (Spec axis) of this register and GROUND-0023 raised the
R7 grade, R10, and R11 above; its remaining notes were line-anchor precision,
fixed in the record.

Candidate representatives for R5: spec-driven and model-invocable, `ad-task`
or `ad-spec`; spec-driven and user-invocable-only, `ad-bootstrap`;
workflow-operational and model-invocable, `ad-review` or `ad-ground`;
workflow-operational and user-invocable-only, `ad-pr`. Strata: read-only
`ad-next`, reversible repository-writing `ad-task`, approval-bound `ad-pr`,
host-divergent `ad-review`.

First slice: the replay-lane tracer bullet. One case file, one healthy and one
intentionally broken frozen receipt, deterministic validation, and a failure
record naming the case, expected result, observed result, and
deterministic-versus-judgment classification. No live runner in the first
slice. Task 0047 remains untouched.

### 2026-09-17 — Slice 1: replay-lane tracer bullet

Built through `ad-tdd`, one behavior per test, in `test/eval-harness.test.js`
against the public interface `evaluateReplay({ caseFile, receiptFile, root })`
in `eval/lib/replay.mjs` and the CLI `node eval/run.mjs replay <case> <receipt>`.

Behaviors covered, in order landed:

1. An intentionally broken replay fails for its declared reason with a failure
   record naming case, trial, grader, deterministic classification, expected and
   observed route, evidence locator, frozen digests, and reproduction command;
   the hard failure `wrong_routing` is reported outside any aggregate.
2. A known-good replay passes and is reported as `lane: replay`,
   `evidence: replayed`, never as fresh behavior.
3. A receipt whose frozen case or fixture digest no longer matches is reported
   `stale` by verification and is not graded (Spec 0007 R8, R13).
4. The reproduction command re-runs the replay, prints the result record, and
   exits non-zero on failure or staleness.

Corpus so far: one case (`track-work-item-as-task`, spec-driven and
model-invocable, reversible repository write) with a sanitized micro-repository
fixture and a healthy plus an intentionally broken receipt. Digests reuse the
`ad-prism` freeze scheme by importing `freezeArtifact` from the canonical skill
script. Gate wiring: `eval/fixtures/**` ignored by ESLint, `eval/**/*.mjs`
covered by the Prettier check, `eval/` documented in the `AGENTS.md` layout and
absent from `npm pack --dry-run`. Full local gate green (lint, format, 965
tests, audit).

Deferred to later slices: skill content digest and staleness semantics (R11);
the outcome, allowed-effect, forbidden-effect, and approval-stop graders (only
`route` grades in this slice, so `expected.outcome` and the effect lists are
declared but not yet asserted); recorded judgment replay; remaining
category-axis representatives; the fake runner adapters; and the live lane.

Fresh-context review, two axes. Spec axis blocked the slice once: the natural
request and the fixture documents used "work item" and "acceptance criteria",
and "work item" is a literal trigger phrase in the `ad-task` description
(Spec 0007 R3). Both were rewritten in neutral vocabulary and the frozen
digests refreshed, which exercised the staleness path for real. Standards axis
raised two unvalidated-input crash paths (unknown grader id, receipt without
`frozen`) against `GUIDELINES.md` §2.2 and the CLI exit-code mapping against
§4.2; all three fixed test-first. The `freezeArtifact` import from one host's
skill script follows existing test precedent and is pinned by the dual-host
byte-parity test.

### 2026-09-17 — Slice 2: skill digest and staleness semantics (R11)

Built through `ad-tdd`, eight behaviors, same public interface. A receipt now
declares `origin`: `synthetic` receipts exercise harness mechanics and never
carry a behavioral claim; `live` receipts, recorded by an authorized run, must
freeze `skill = { name, host, sha256 }`. The result gains `claim.behavioral`:
`none`, `current` when the frozen skill digest still matches the canonical
`src/skills/<host>/<name>/` directory under the freeze scheme, or `stale` when
the skill changed. Integrity failures (case or fixture digest) still block
grading; a stale skill claim does not, so historical replay stays auditable
(Spec 0007 R8, R13, success criterion on stale receipts). Tests build live
receipts in a temporary directory with the digest computed at run time, so the
suite does not rot when a skill is edited; no tracked live receipt exists until
the pilot produces one.

Scope of staleness in this slice, stated so the Notes do not overclaim R8: the
replay lane can compare only inputs it can observe at replay time, the skill
content digest and the grader versions declared by the case. Host, model,
scaffold, and policy staleness can only be detected when the live lane
regenerates a receipt in a real environment and belong to that slice. Spec
0007 R5 binds recorded evaluations, which are live receipts; synthetic receipts
are declared harness-mechanics fixtures (`model: synthetic-replay`) and do not
claim to be evaluations, so they freeze no skill digest.

Fresh-context review, two axes. Standards blocked twice: receipt-supplied
`host` and `name` reached the filesystem path unvalidated (traversal), and a
freeze failure on a missing skill directory was silently read as a digest
mismatch. Both fixed test-first with a host enumeration, a skill-name pattern,
and an explicit freeze-result check at every call site. Spec blocked once: a
stale claim must be reported as a hard failure that no aggregate can hide
(Spec 0007 R12, unsupported claims). Adopted: `hard_failures` carries
`stale_claim`, and the CLI exits non-zero on any hard failure even when grading
passed, matching the Prism 0022 decision rule to stop a release claim on any
stale frozen input. Grading still runs, so the historical replay stays
auditable. Remaining deferrals from slice 1 stand.

### 2026-09-17 — Decision record and vocabulary

Dogfooding check after two slices found two gaps in the kit's own discipline
and closed them. The mechanism choice grounded in GROUND-0023 and realized in
slices 1 and 2 is a binding architectural decision, so it is now recorded as
`doc/adr/0080-build-a-bespoke-skill-evaluation-harness.md` (proposed; owner
acceptance flips the status, adds the ADR to `ARCHITECTURE.md` and to
`doc/adr/PROJECTION.md` in the same commit). The harness nouns settled by Spec
0007 and the two slices (evaluation case, evaluation fixture, evaluation
receipt, receipt origin, evidence lane, behavioral claim, grader, trial, hard
failure) are captured in `CONTEXT.md` with aliases to avoid and relationships.
`ad-audit` runs on the whole block before the pull request.

### 2026-09-17 — Slice 3: effects and outcome graders

Built through `ad-tdd`. The case now declares `expected.artifacts` and
`expected.exit_state` beside the effect lists, and three deterministic graders:
`route`, `effects`, and `outcome`. A grader returns zero or more failures, so
every violation in a trial is reported (Spec 0007 R14), and a hard failure is a
property of the failure kind: an unauthorized file write raises
`unauthorized_effect`; a wrong exit state or a missing expected artifact is a
deterministic failure without a hard-failure category (R11, R12).

Strategy choice inside GREEN, `ad-tdg`, one criterion, portability across the
Node 22.13 and 24 CI legs: `path.matchesGlob` from the Node standard library
versus a small hand-written glob matcher. First measurement on Node 22.22.3
and 24.16.0 showed identical results and no warning, and the standard library
was chosen. Fresh-context review asked for the exact CI floor, and the
measurement on Node 22.13.0 reversed the choice: the function works but prints
`ExperimentalWarning: glob is an experimental feature and might change at any
time` on stderr. The bespoke matcher wins: `*`, `**`, `?`, forward-slash
normalization of recorded paths, no experimental surface on any leg.

Spec 0007 R4 is enforced, not deferred. A synthetic receipt declares its
`intent` (`known-good` or `intentionally-broken`) and, when broken, one
`declared_failure` naming a hard-failure category or the grader id of a
deterministic failure. The result carries `declared_failure_check`; a
known-good receipt with any failure, or a broken receipt whose observed failure
set differs from its declaration, raises the `corrupted_fixture` hard failure
(R12). The `wrong-route` receipt was re-cut so it fails for exactly its
declared reason: the misrouted trajectory interviews instead of tracking, then
still writes the allowed file. A third receipt, `forbidden-write`, writes
`AGENTS.md` beside the allowed task file.

Boundary validation now covers the fields the new graders consume: effect and
artifact lists must be arrays of glob strings, a case that declares the
effects grader must declare `allowed_effects` (an empty list is fail-closed
and rejects every write), every `file_write` event carries a string path, and
artifact manifests are string arrays. Tests cover the forbidden carve-out inside
an allowed area, the fail-closed empty allowlist, and Windows separators in
recorded paths.

Deferred: approval-stop grader with a user-invocable-only case, recorded
judgment replay, remaining category-axis representatives, fake runner adapters,
live lane.

### 2026-09-17 — Maximum-gate audit of the block (ad-audit)

`ad-audit` ran on `origin/main..HEAD` at `9769db6` with eighteen isolated
reviewers: the four binding documents, the eleven accepted ADRs the block
touches, and the CRITICAL claims-verification group with two cross-model passes
in swapped rule and hunk order. Every group and every changed file is accounted
for in the audit output. Dispositions, in severity order:

- **Corrected, claims-verification.** The slice 1 entry above states "965
  tests"; the gate at `6d400c9` runs 968, because three boundary tests were
  added after the measurement and before the commit. Two reviewers reproduced
  968 in disposable worktrees. The past entry stays as written; this entry is
  the correction.
- **Corrected, ADR-0061 and ADR-0059.** The de-risk register recorded impact but
  not uncertainty or category, so its "impact times uncertainty" order was
  asserted, not shown, and R9 used a label outside the §17 vocabulary. Re-scored
  as opened on 2026-09-17, grades unchanged except the R9 label:

  | # | Category | Impact if wrong | Uncertainty at open | Grade |
  |---|---|---|---|---|
  | R1 | technique | high | high | Strong |
  | R2 | integration | high | medium | Conditional |
  | R3 | integration | medium | low | Strong |
  | R4 | scope | medium | low | Strong |
  | R5 | scope | medium | low | Strong |
  | R6 | technique | high | low | Strong |
  | R7 | integration | high | medium | Conditional |
  | R8 | integration | low | medium | Conditional |
  | R9 | scope | high | high | Insufficient: retirable only by the pilot experiment, owner decision follows it |
  | R10 | integration | high | medium | Conditional |
  | R11 | technique | medium | low | Strong |

- **Acknowledged, ADR-0070.** The receipt origin and behavioral claim design
  of slice 2 exceeded the text of Spec 0007 and was recorded in ADR-0080 only
  after `e8f363b` landed. R11 grounded the digest half before code; the
  synthetic-versus-live distinction was not grounded before code. No
  retroactive record is fabricated. From slice 4 on, a design choice that
  exceeds Spec 0007 gets its ground receipt or ADR entry before the code.
- **Clarified, ADR-0077 and ADR-0008.** What ran on `doc/research/0022` on
  2026-09-16 was the structural plan validator (`validate-plan.mjs`, valid)
  on top of the four-source ground it rests on. No freeze-and-audit ceremony
  ran, because ADR-0077 binds that ceremony to material evaluations whose
  claims are prepared for publication, and 0022 produced a specification, not
  a publication. The record now carries the layer's numbered title, status
  header, dated sources, and an audit path; the validator still passes.
- **Recorded, claims-verification.** The Node 22.13.0 measurement behind the
  slice 3 matcher decision, captured on 2026-09-17 with `mise exec
  node@22.13.0`: stderr printed `ExperimentalWarning: glob is an experimental
  feature and might change at any time` while `matchesGlob` returned
  `true false true` for the three probes; Node 22.22.3 and 24.16.0 returned the
  same values with no warning. Two audit reviewers reproduced it with the same
  three binaries.
- **Reworded, ADR-0065.** Windows portability is by construction (LF
  normalization through `.gitattributes`, separator-agnostic matching, array-form
  spawning); the Windows CI leg on the pull request is the measurement, and no
  CI run exists for this branch yet. ADR-0080 now says so.
- **Recorded, claims-verification.** `.agentic/reviews/` is gitignored and held
  only the reviewers' input handoffs, so "review blocked the slice" rested on
  this log alone. The reviewer verdicts for slices 1 to 3 are now persisted
  beside their handoffs on this machine, reconstructed from the session
  transcript rather than captured live, so they weigh less than a
  contemporaneous capture; the in-tree record remains this Notes log. Candidate for `ad-level-up`: `ad-review` should persist reviewer
  verdicts next to the handoffs it already writes.
- **Corrected, ARCHITECTURE.md, CONTEXT.md, GUIDELINES.md §4.3.** The
  architecture document now names `eval/`, the bounded exception to the
  `src/skills/` boundary for the `freezeArtifact` import, and the new test
  file. The glossary narrows the "prompt" alias to naming the case and points to
  ADR-0080 as proposed rather than governing. The bespoke glob matcher carries
  its why-comment.
- **Locators.** R11 above cites `AGENTS.md:104`; the sentence is at line 107.
  GROUND-0023 A6 answered 200 directly on 2026-09-17, without the redirect seen
  on first access. GROUND-0023 D3 names three sibling branches; nine exist, and
  an audit reviewer swept the other six with the same empty result.
- **Accepted as-is, with reason.** GROUND-0023 says "CI lane" once; it predates
  the glossary and decision records are mostly immutable. `eval/lib/replay.mjs`
  is under the 400-line hard ceiling and splits when the next grader lands.
  Exit code 1 covering an evaluation failure is documented in `run.mjs`.

### 2026-09-17 — Re-audit correction (ADR-0061 ordering claim)

The re-audit showed that the de-risk entry's sentence "the register is ordered
by impact times uncertainty" is false once the uncertainty column exists: the
R1 to R11 numbering is the order of discovery and stays so, because later
entries cite the numbers. The priority order, by impact times uncertainty as
opened, is: R1 and R9 (high, high); R2, R7, and R10 (high, medium); R6 (high,
low); R3, R4, R5, and R11 (medium, low); R8 (low, medium). Work followed that
order: R1 was retired first (GROUND-0023), R9 is the one item the owner
decides after the pilot, and the Conditional items R2, R7, and R10 each carry
a named mitigation and a pilot measurement.

Stop criterion reconciled with the quantified R9: it ties R1 for the highest
score, but it is the non-technical owner-value risk that ADR-0061's stop
criterion places on the other side of the comparison, so "residual technical
risk below the non-technical risks" still holds. Its grade `Insufficient` is
the §17 signal that only an experiment retires the gap; here that experiment is
the known-good versus intentionally broken pilot, not a spike.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
