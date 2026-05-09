# ADR-0015: Workflow-operational skill `agentic-next` for state-aware navigation guidance

**Status:** accepted
**Date:** 2026-05-09
**Deciders:** Alexandre Alvaro

## Context

The kit ships twelve skills across four artifact layers and four maturity profiles. The README's "Recommended daily sequence" section, added in v0.6, prescribes happy-path invocation orders for three flows (greenfield, brownfield quick fix, research-only). That section is static prose — it does not know whether the project already has `AGENTS.md`, whether there are accepted specs without implementing tasks, whether there are proposed ADRs that need a decision, whether the current branch is ahead of `main` and lacks a fresh-context review, or whether the profile is `team` but `agentic-hooks` was never invoked.

The user surfaced the gap directly: *"durante o desenvolvimento seria muito bom pensarmos em facilidades de usabilidade para quem está desenvolvendo. Por exemplo, qual a próxima skill que faz sentido?"*

The kit has primitives for **drift detection** (`agentic-audit` — read-only, compares spec / docs against code) and **content generation** (every spec-driven skill produces an artifact). It has no primitive for **state-aware navigation** — answering "given my current project state, what should I invoke next?" The user has to know.

Industry has converged on a small handful of patterns for this exact problem:

- **`flutter doctor`** — surveys each subsystem (SDK, IDE plugins, devices, licenses) with green/yellow/red status and per-finding fix suggestions. Best fit for the kit's multi-layer artifact stack.
- **`gh pr status` / `gh pr checks`** — state-aware status of the active surface (PRs, CI). Narrow scope, useful pattern.
- **`cdk doctor` / `cdk diff`** — configuration checks plus pending changes.
- **`nx affected --graph`** — visualize what changed and what depends on it. Overkill for the kit's flat skill set.
- **`npm outdated`** — narrow to dependency staleness.
- **`cookiecutter` / `rails new`** — print "next steps" once after scaffold; passive, one-shot.
- **GitHub Spec Kit** — prescribes a rigid linear flow `/specify → /plan → /tasks`. Less flexible than state-aware suggestions; works only when the user is at the start.

The `flutter doctor` model fits the kit's shape: multi-layer survey, status per layer, prioritized actionable fixes per finding. It complements (does not replace) the static README sequence — the README teaches the canonical happy path; the skill answers "where am I right now?"

`agentic-audit` is adjacent but scoped differently: audit detects drift between artifact and code; next answers a workflow question. Both ship; both cross-reference.

## Decision

We will introduce a new workflow-operational skill, **`agentic-next`**, that surveys the project's state across the four-layer artifact stack and recommends prioritized concrete next actions. Universal install across every profile (the navigation aid is broadly valuable; profile selects which layers it surveys).

1. **Skill name `agentic-next`.** Workflow-operational per [ADR-0007](0007-workflow-operational-skills.md). Auto-installed alongside the universal skill set in every profile (`poc`, `solo`, `team`, `mature`). Description triggers include "what's next", "next step", "where am I", "project status", "doctor", "what should I do", "audit my workflow" — multiple mental models for the same intent.

2. **Five-step survey, prioritized output.** The skill body walks five steps:
   - **Step 0: read state.** State files (which agents installed, which profile, which kit version), filesystem signals (presence of `AGENTS.md`, `ARCHITECTURE.md`, `DESIGN.md`, `doc/specs/`, `doc/adr/`, `doc/tasks/`).
   - **Step 1: layer-by-layer status.** Constitution (Layer 1), Specs (Layer 2), Plans / Decisions (Layer 3), Code (Layer 4). Per layer, what is present, what is in flight, what is missing or stale.
   - **Step 2: cross-cut signals.** Branch state (ahead of `main`), tests / hooks wired, pending fresh-context review, spec ↔ task reciprocity.
   - **Step 3: prioritize next actions.** Rank by leverage; return 3–5 concrete invocations.
   - **Step 4: profile-aware filtering.** Suppress suggestions for layers blocked by the profile (`poc` ignores Layer 2 / Layer 3 noise; `solo` does not nag for ADRs).

3. **Output is structured Markdown**, not JSON. The same body works in Claude Code (renders as Markdown in the assistant message) and in Codex (numbered text fallback). No host-specific UI primitive required, though the skill body prescribes `AskUserQuestion` for any follow-up confirmation per [ADR-0014](0014-structured-prompts-when-host-supports-them.md).

4. **Profile-aware survey logic.** The same skill body covers all profiles; runtime branching follows the profile catalog. Concretely:
   - `poc` — only Layer 1 and Layer 4 sections render. Layer 2 / Layer 3 absence is not flagged. The recommendation set focuses on `agentic-ground` for research and `agentic-audit` for drift.
   - `solo` — Layer 2 and Layer 3 render but ADR / architecture absence is informational, not a "needs action" finding (ADRs are opt-in at this profile).
   - `team` — full survey. ADR proposed → flagged. Spec accepted with no tasks → flagged. Branch ahead with no review → flagged.
   - `mature` — additionally flags hooks-not-wired louder (ADR-0012 / WORKFLOW §11 binding for this profile).

5. **Read-only.** The skill does not write files, does not mutate state, does not invoke other skills. Output is recommendations the user copies into the next conversation turn or the next CLI invocation. Mirrors `agentic-audit`'s read-only posture.

6. **Codex parity is asymmetric.** Same posture as ADR-0007 / ADR-0010 / ADR-0011. Auto-trigger on Codex is best-effort; the skill body advises manual invocation when description-trigger does not fire. Output format is identical across hosts.

7. **CLI command `agentic next` is deferred.** A shell-side equivalent (`npx @alexandrealvaro/agentic@beta next`) would let users survey state without opening their agent session. Real demand exists but the skill ships first as MVP. CLI follow-up gets its own ADR + task when proposed.

## Consequences

Positive:

- Closes the navigation gap that v0.6's README sequence section partially addressed. Static prose becomes state-aware action.
- Complements `agentic-audit` (drift detection) without duplicating it — the two answer different questions and the skill bodies cross-reference.
- Universal install across all profiles means the navigation aid is available from day one; profile-aware filtering means `poc` users do not see noise about layers they intentionally skip.
- Aligns with `flutter doctor` industry pattern, which has years of polish behind its UX. The kit lifts the shape, not the implementation.
- Pairs cleanly with the four-layer stack from ADR-0011 and the profile system from ADR-0013 — every existing primitive becomes inspectable from one skill.
- Read-only posture (mirrors `agentic-audit`) keeps the skill safe to invoke at any time without surprise.

Negative / trade-offs:

- **One more universal skill.** Description-load on session start grows by one. Mitigation: description stays under the 1,536-character cap; body lazy-loads. Same monotone cost the kit has accepted for every previous workflow-operational addition.
- **Risk of suggestion drift.** As the kit's primitive set grows, the `agentic-next` body needs to know about every new layer / signal / failure mode. New skills landing without updates here produce stale advice. Mitigation: the skill body lists the layers it surveys explicitly; future ADRs that introduce new artifacts (per-profile templates, evals, spike) update the survey checklist as part of their own rollout.
- **Profile-aware branching adds complexity to the skill body.** The same body handles four profile shapes. Mitigation: branching is small (Step 4 alone), and each profile's expectation is documented inline — no hidden state.
- **CLI `agentic next` deferred.** Users wanting a shell-side survey before opening their agent need to wait. Mitigation: real demand will surface from real use; ship the skill first, follow up if the demand materializes.
- **Recommendations are advisory, not enforced.** The skill prints "do X next" but the user decides. Same posture as the rest of the kit's soft-gate approach (default-skip on conflicts, default-keep on orphans).

## Alternatives Considered

- **`agentic-doctor` name (`flutter doctor` industry alignment).** Rejected per N2. The user's term `agentic-next` is action-oriented and matches the question users actually ask ("what's next?"). Description triggers include "doctor" so the alternative mental model still lands the same skill.
- **`agentic-status` name (git pattern).** Rejected per N2. "Status" is read-only descriptive ("here is what is true"); "next" is read-only prescriptive ("here is what to do"). The kit's primary value is prescriptive; name reflects that.
- **Conditional skill, opt-in only.** Rejected per N3. Navigation aid is broadly valuable across maturity; opt-in would reproduce the discovery gap that motivated the skill.
- **Same recommendations across all profiles.** Rejected per N4. A `poc` user seeing "you have no specs" as a finding is noise — the profile blocks `agentic-spec`. Profile-aware filtering matches the principle in ADR-0013 (kit serves the project, project doesn't serve the kit).
- **Fold the navigation logic into `agentic-audit`.** Rejected per N7. Audit's job is drift detection (artifact vs code); navigation's job is workflow guidance. Same skill would conflate two failure modes (drift vs misordered work) and dilute both. They cross-reference instead.
- **Ship CLI `agentic next` first, skill second.** Rejected per N1. The "what's next?" question arises mid-conversation more often than mid-shell-session. Skill goes where the question lives. CLI deferred.
- **JSON output for machine consumption.** Rejected per N5. Markdown renders cleanly in both hosts; users read it directly; future tooling that wants machine-readable output gets a dedicated flag in the deferred CLI command, not a skill output mode.
