# Skill reference

Every skill below installs for each selected host. Installation is not a mandate to use it: choose the smallest skill that resolves the current uncertainty or protects the current change.

## Orient and understand

| Skill | Use it when | Outcome |
| --- | --- | --- |
| `/ad-next` | You do not know the next useful action. | State survey and prioritized recommendations. |
| `/ad-philosophy` | Work is non-trivial or needs an explicit engineering posture. | Grounded, decisive, verifiable working rules. |
| `/ad-ground` | You are about to implement a non-trivial change. | Evidence-backed happy path and a versioned audit record before code. |
| `/ad-grill-me` | The ask is fuzzy. | The minimum owner decisions and sharper vocabulary. |
| `/ad-question-me` | You want only genuine owner decisions challenged. | Ranked questions without re-asking groundable facts. |
| `/ad-domain` | A project term needs a stable meaning. | `CONTEXT.md` or a context map. |
| `/ad-rules` | You need the active host and project rules loaded. | Read-only rule references. |
| `/ad-drift` | Docs may no longer match code. | Read-only documentation-drift report. |

## Frame the work

| Skill | Use it when | Outcome |
| --- | --- | --- |
| `/ad-prd` | A product needs a durable scope and roadmap. | Product contract under `doc/product/`. |
| `/ad-spec` | One feature needs requirements and acceptance criteria. | Feature specification under `doc/specs/`. |
| `/ad-task` | A scoped work unit needs tracked acceptance criteria. | Task under `doc/tasks/`. |
| `/ad-adr` | A decision is consequential, hard to reverse, and has a real trade-off. | Binding ADR under `doc/adr/`. |
| `/ad-bootstrap` | The operational guide is missing or stale. | Generated or audited `AGENTS.md`. |
| `/ad-guidelines` | Engineering standards need a full reference. | `GUIDELINES.md`. |
| `/ad-architecture` | System patterns and boundaries need a shared model. | `ARCHITECTURE.md`. |
| `/ad-design` | A UI needs a durable visual contract. | `DESIGN.md`. |

## De-risk and build

| Skill | Use it when | Outcome |
| --- | --- | --- |
| `/ad-derisk` | A defined task has several unknowns. | Risk register and the right uncertainty-reduction path. |
| `/ad-research` | A question needs an evidence-graded durable study. | Research record under `doc/research/`. |
| `/ad-spike` | The technique is uncertain. | Staged experiment against golden fixtures. |
| `/ad-tdg` | Several implementation strategies are plausible. | Ground-truth pair and selected strategy. |
| `/ad-tdd` | Behavior can be expressed in a test before implementation. | Red-green-refactor loop. |
| `/ad-diagnose` | A bug or performance regression is hard to explain. | Reproduction, falsifiable hypotheses, fix, and regression test. |
| `/ad-deepen` | Real design friction exposes a shallow or unstable seam. | Candidate architectural deepening options. |

## Review and govern quality

| Skill | Use it when | Outcome |
| --- | --- | --- |
| `/ad-review` | A diff needs normal fresh-context review. | Separate Standards and Spec findings. |
| `/ad-audit` | A high-consequence work product needs the maximum rules gate. | Exhaustive evidence-gated rule verdicts. |
| `/ad-level-up` | An audit found a genuine rule gap. | Human-gated rule-set curation. |
| `/ad-hooks` | The project needs executable local quality gates. | Proposed hook and CI wiring. |

## Write in a personal voice

| Skill | Use it when | Outcome |
| --- | --- | --- |
| `/ad-voice` | A draft, rewrite, or translation should sound like you in its destination context. | One fact-preserving draft from the confirmed local profile. |
| `/ad-voice-tune` | Your private voice profile needs creation or one evidence-backed correction. | One human-approved profile delta, with identity and community evidence kept separate. |

## Ship and maintain

| Skill | Use it when | Outcome |
| --- | --- | --- |
| `/ad-commit` | Changes are ready to become atomic commits. | Conventional Commit with DCO sign-off. |
| `/ad-pr` | A branch is ready for a pull request. | GitHub PR with a uniform body. |
| `/ad-merge` | A PR is ready for merge evaluation. | CI-aware merge decision and merge. |
| `/ad-release` | A supported npm package is ready to release. | Confirmed release, publish, and GitHub Release workflow. |
| `/ad-update` | You want to inspect or apply the current kit update from the agent session. | Safe project-local update plan, then an explicit apply when requested. |
| `/ad-handoff` | A session must continue with fresh context. | Compact handoff in the OS temp directory. |
| `/ad-roadmap` | You need a product-roadmap completion rollup. | Tiered done / in-progress / remaining report. |
| `/ad-archive` | Completed planning artifacts have been absorbed. | Safe deletion into Git history. |

## Extend the kit

| Skill | Use it when | Outcome |
| --- | --- | --- |
| `/ad-subagent` | A bounded delegated task needs a reusable custom agent. | Claude Code and Codex subagent definitions. |
| `/ad-skill` | A repeatable workflow deserves a kit skill. | Dual-host skill design and implementation path. |

See [workflows](workflows.md) for routes by situation and [WORKFLOW.md](../../WORKFLOW.md) for the principles each skill follows.
