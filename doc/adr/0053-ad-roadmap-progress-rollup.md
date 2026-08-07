# ADR-0053: `ad-roadmap` — read-only progress rollup for a decision-maker

**Status:** accepted
**Date:** 2026-08-07
**Deciders:** Alexandre Alvaro

## Context

A decision-maker (the boss, not the practitioner) asks a recurring question the kit has no skill for: *how much of the plan is done, how much is left, are we on track?* Answering it today means reading the PRD roadmap, then hand-reconciling it against `doc/specs/` and `doc/tasks/` frontmatter — the exact per-session, error-prone reconciliation the kit exists to remove. The artifacts to answer it already exist (PRD roadmap tiers as the plan, specs and tasks as the implementation ledger); nothing rolls them up.

`ad-next` looks adjacent but answers a **different question**. It is a `flutter doctor` for the practitioner — "what should I do next", a forward-looking, prioritized action list — and it is deliberately shallow and layer-ordered. A completion rollup is backward-looking and audience-different: it reconciles the roadmap spine to shipped-vs-pending and reports a percentage for someone who will not read a diff. Bending `ad-next` to also emit a percentage rollup would give one skill two responsibilities and two audiences, blurring the one-question clarity that makes each useful. `ad-prd` is also distinct: it *authors* the roadmap; `ad-roadmap` only *reads* it.

Kit convention (ADR-0007 §6 skill-surface scrutiny; PRD Constraints) is that no skill ships without an accepted ADR — so this record must justify both the skill and the boundary before it lands.

## Decision

We will ship `ad-roadmap` as a read-only, workflow-operational skill that answers one question for a decision-maker: how much of the plan is done, how much is left, and whether the project is on track.

Its contract:

1. **The roadmap is the spine.** Read `doc/product/PRD.md` `Status:` and its `## Roadmap` tiers (MVP / Next / Later). Each roadmap line is one feature to classify.
2. **Reconcile from the implementation ledger, frontmatter only.** Tie each line to implementing `doc/specs/` and `doc/tasks/` via feature name and `Spec ref`; classify `done` / `in progress` / `blocked` / `remaining`. Surface `proposed` ADRs as line blockers. Read only frontmatter and the roadmap section — never full bodies.
3. **One rollup, not a menu.** Headline percentage is `done / total` roadmap lines; in-progress, blocked, and remaining reported as counts; `at-risk` when an MVP line is blocked/remaining while later tiers progress, or a proposed ADR / blocked task gates a line.
4. **Read-only.** `allowed-tools` omits Write; the skill writes no file and mutates no state.
5. **Degrade gracefully.** PRD, `doc/specs/`, and `doc/tasks/` may each be absent; a missing directory is reported, never an error. No PRD falls back to a task-based rollup and recommends `/ad-prd`.
6. **Route out, do not absorb.** Cross-reference `ad-next` (next actions — a different question) and `ad-prd` (roadmap authoring); reimplement neither.

Profile-scoped to `solo`, `team`, and `mature` (added to each `universal` set). Excluded from `poc`, which has no plan-artifact stack to measure. Dual-host (Claude Code + Codex), output words-only per the emoji ban (ADR-0008).

## Consequences

Positive:

- The decision-maker's recurring question gets a deterministic, self-contained answer without a diff read or a manual reconciliation.
- The `ad-next` / `ad-roadmap` split keeps each skill to one question and one audience, which is what makes both scannable.
- Reuses the existing artifact stack as-is; introduces no new tracking surface (no board, no status file) — the PRD roadmap and the task ledger remain the single sources of truth.

Negative / trade-offs:

- One more skill on the surface. The ADR-0007 §6 scrutiny is met by this record and task-0038.
- Reconciliation is best-effort: a roadmap line with no implementing artifact is reported `remaining (untracked)` rather than guessed. This is honest but can under-report features that shipped without a task; the skill flags the gap and routes to `/ad-task` rather than silently upgrading the line.
- The rollup is only as current as the frontmatter it reads; stale task `Status:` fields skew the percentage. This is the same freshness dependency every read-only kit skill carries and is mitigated by `ad-drift`.

## Alternatives Considered

* **Add a `--rollup` mode to `ad-next`** — rejected. It fuses two questions (next-action vs completion) and two audiences (practitioner vs decision-maker) into one skill, eroding the single-question clarity that is `ad-next`'s whole value; the two also differ in direction (forward vs backward) and depth.
* **Fold the rollup into `ad-prd`** — rejected. `ad-prd` authors and mutates the roadmap; a progress report is read-only and would put a reporting responsibility inside an authoring skill.
* **Fold it into `ad-drift`** — rejected. `ad-drift` reports doc-vs-code inconsistency, not plan completion; "how much is left" is not a drift finding.
* **Do nothing (leave it to manual reconciliation)** — rejected. The manual roadmap-to-ledger reconciliation is exactly the per-session, drift-prone work the kit removes elsewhere.
