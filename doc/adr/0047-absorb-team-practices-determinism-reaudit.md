# ADR-0047: Absorb four team practices — deterministic resolution probe, re-audit mode, opt-in commit gate, PR-history harvest

**Status:** accepted
**Date:** 2026-08-05
**Deciders:** Alexandre Alvaro

## Context

A team practice-sharing session (2026-08-05; sources deliberately unnamed — employer-internal, so their characterization is recorded testimony rather than a checkable reference) surfaced a set of working practices from colleagues who run agent-driven review daily. An extraction pass over the transcript yielded twenty-five distinct ideas; most were already present in the kit (grounding, adversarial-finding validation, audit-plus-curation loop — independently converged on by several practitioners, which is evidence the kit's shape is sound), out of kit scope (org-wide PR tiering, shared team inventories), or contrary to standing decisions (output-compression disciplines conflict with the practitioner's communication contract; review-until-zero-findings loops were reported non-converging on the current frontier model by the practitioner who invented them).

Four survived as genuinely absorbable, none adding adversarial pressure (ADR-0045 compatibility — all four are determinism, reporting, or process wiring):

1. **Deterministic scripts inside skills** — "deterministic values in a non-deterministic flow": ship preflight probes the agent must run, rather than prose it may follow. Named by its practitioner as the highest-leverage under-adopted practice; independently, this kit's own leak-guard (code + tests, ADR-0033) already validates the pattern. The motivating incident is local and recent: `ad-audit`'s layer resolution ran for weeks against half the intended rules because a rules layer existed where no layer-resolution step looked — a silent failure a probe would have surfaced mechanically.
2. **Re-audit against persisted findings** — a reviewer that cannot see its own prior findings loses the thread on follow-up rounds; the practitioner persists review context past worktree deletion so a re-review verifies resolution of what was actually raised.
3. **Pre-commit review gate** — a committee pass over staged work before commit, blocking on confirmed findings; front-loads fixing. Contested in the session (a frequent committer called it a bottleneck), which is itself signal: the trade-off is real and user-owned.
4. **PR-history harvest as a rule-candidate source** — periodically scan merged PRs for defects reviewers missed and comments that repeat; feed the recurring gaps to rule curation. Skills decay; this is the feedback loop that keeps them honest, converged on by three practitioners in different forms (monthly batch, per-PR, end-of-effort config harvest).

## Decision

1. **`ad-audit` Step 1 gains a deterministic resolution probe** (both hosts): a verbatim shell block that enumerates the machine store, the project layer, and the binding docs, with output pasted into the audit trail. Layer resolution is read from observed output, never from memory. This is the *minimal* realization of practice 1 — an embedded snippet, no installer changes; the full skill-`scripts/` infrastructure (install routing, parity tests, packaging) is deferred to task-0031 as its own piece of work.
2. **`ad-audit` gains a re-audit mode** (both hosts): when `.agentic/reviews/` holds a prior trail for the same target, every prior finding is carried into aggregation with a mandatory disposition — resolved (evidence) · refuted (evidence) · still-open. A prior finding that silently disappears invalidates the re-audit.
3. **`ad-hooks` gains an opt-in third tier** (both hosts): a pre-commit review gate wiring `/ad-review` (or `/ad-audit` for team-bound work) over staged work, offered with the bottleneck trade-off stated and never scaffolded unasked or as a default.
4. **`ad-level-up` Step 1 names the PR-history harvest as a first-class candidate source** (both hosts), with cadence guidance (monthly-ish or after a dense review round). Harvest is a source, not a bypass — harvested candidates clear every existing gate.

## Consequences

Positive:

- The audit's layer resolution — the step whose failure mode is silent and was hit in practice — becomes mechanically observable.
- Follow-up audits verify resolution of prior findings instead of re-discovering (or losing) them; `.agentic/reviews/` trails become load-bearing rather than write-only.
- The kit gains the two feedback loops it lacked: work→gate (optional commit gate) and history→rules (harvest).

Negative / trade-offs:

- An embedded shell probe is copy-maintained in two SKILL.md files until task-0031 lands a real scripts mechanism; drift between the copies is possible (mitigated: identical text, and the dogfood parity check catches divergence between src and installed copies, though not between hosts).
- Re-audit adds trail-reading cost to every repeat audit of the same target; proportionate, since the alternative is losing the thread.
- The commit gate, if a user enables it despite the stated trade-off, can slow a frequent-commit workflow — deliberately left opt-in for exactly that reason.

## Alternatives Considered

- **Full skill-`scripts/` infrastructure now** — rejected for this change; it touches the installer, packaging (`package.json#files`), and parity tests, and deserves its own task (task-0031) rather than riding an absorption commit.
- **Absorbing the session's remaining practices** — rejected each on its own ground: output-compression/controlled-language disciplines (conflict with the practitioner's standing communication contract); review-to-zero-findings loops (reported non-converging on the current frontier model by their own author; ADR-0045's posture already prefers verification over iteration pressure); pedagogical file ordering for reviewers (built for a sequential single-reviewer walk; this kit's reviewers are parallel-isolated per group, where ordering has no equivalent leverage); org-wide tiering and shared inventories (team infrastructure, not kit scope).
- **A new standalone skill for the commit gate** — rejected; `ad-hooks` already owns deterministic gate scaffolding, and a third tier is a smaller, more discoverable change than a new skill name.
