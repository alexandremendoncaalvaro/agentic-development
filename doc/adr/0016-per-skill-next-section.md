# ADR-0016: Each skill body ships a `Next` section with prescriptive next-action breadcrumbs

**Status:** accepted
**Date:** 2026-05-09
**Deciders:** Alexandre Alvaro

## Context

The kit ships three navigation surfaces today:

- **README "Recommended daily sequence"** ([added in v0.6](../tasks/0010-v0.3-review-followups.md)) — static prescriptive prose listing the happy path for three flows (greenfield, brownfield quick fix, research-only).
- **`agentic-next`** ([ADR-0015](0015-agentic-next-skill.md), v0.10) — reactive state survey + 3–5 prioritized recommendations modeled on `flutter doctor`.
- **`agentic init` slashLine** — post-install enumeration of installed slash commands; lists capabilities, not flow.

The user surfaced a coherence test in v0.10.1 conversation: *"se eu fizer o step 0 e ficar fazendo agentic-next vou ter o mesmo fluxo?"* The honest answer was ~70–80% — `agentic-next` chains setup correctly (bootstrap → architecture) and catches in-flight gaps (branch ahead without review, hooks not wired) but misses three patterns:

1. **Initiating a feature** — when setup is done and there is no in-progress work, `agentic-next` has no signal to suggest "start a feature with `/agentic-spec`."
2. **Sequencing within a session** — after `/agentic-spec`, the user has to know `/agentic-ground` is next; `agentic-next` only flags it after spec is `accepted` and tasks land.
3. **Implementation phase** — between user and code; `agentic-next` cannot derive "you just finished implementing, run `/agentic-review` next" without state signal.

Industry research surfaced three complementary patterns:

| Pattern | Examples | Strength | Cost |
|---|---|---|---|
| **Per-command next-step output** | rails / gh / heroku / vue / cookiecutter / yeoman / Spec Kit | Discovery without explicit invocation; lightweight; profile-aware | Outputs grow; maintenance per-skill |
| **Linear wizard mode** | vue create / gradle init / stripe init / amplify init | Hand-holds newcomers | New command; rigid; duplicates README |
| **Reactive doctor / status** | flutter doctor / cdk doctor / npm doctor / nx affected | State-aware; safe anytime; catches drift | Doesn't anticipate next phase |

The kit has the reactive surface (`agentic-next`) and the prescriptive doc (README). The middle layer — per-command breadcrumbs — is the gap.

A linear wizard was considered and rejected: it duplicates the README sequence in code, conflicts with [ADR-0013](0013-project-maturity-profiles.md) ("kit serves project, project doesn't serve kit"), and Spec Kit already exists for users who want rigid linear flow. Per-command breadcrumbs honor the kit's flexibility principle while closing the discovery gap.

## Decision

Each skill body ships a final `Next` section with 1–2 prescriptive next-action breadcrumbs based on the skill's natural output. Profile-aware where it matters. Documentation-only change at the source layer; no new skill, no new command, no schema change.

1. **`Next` section in every skill body** that has a natural successor. Format: `## Next` heading (claude-code variants use Markdown headings) or appended `## Next` block after `</output_contract>` (codex variants). 1–4 bullet items. Each bullet names a slash command and one-line reason.

2. **Skills covered (13 of 13 universal+conditional with non-trivial output):**
   - `agentic-bootstrap` — points at `agentic-architecture` (team/mature) and `agentic-spec` (any profile starting feature work).
   - `agentic-philosophy` — points at `agentic-next` (when uncertain) and `agentic-ground` (before non-trivial code).
   - `agentic-architecture` — points at `agentic-spec` (feature work) and `agentic-adr` (binding decisions).
   - `agentic-adr` — points at continuing the work the ADR was scoped to support; `agentic-audit` periodically.
   - `agentic-spec` — points at `agentic-ground` (research before code), `agentic-task` (work-unit decomposition), `agentic-adr` (if scoping surfaced a binding decision).
   - `agentic-task` — points at implementation, `agentic-review` before merge, status flip on completion.
   - `agentic-ground` — points at implementation per the synthesized happy path, `agentic-review` before merge.
   - `agentic-audit` — points at addressing each finding (change spec / change code / discuss); `agentic-next` for workflow drift, `agentic update` for kit drift.
   - `agentic-review` — points at addressing Blockers, filing Concerns as follow-up tasks via `agentic-task`, re-running review on the fix, merge once Blockers clear.
   - `agentic-design` — points at `agentic-spec` for features touching the visual contract, `agentic-audit` when tokens drift.
   - `agentic-subagent` — points at testing the new subagent in the workflow it serves, documenting in AGENTS.md if project-wide.
   - `agentic-skill` — points at testing the new skill's description triggers, considering profile catalog impact.
   - `agentic-hooks` — points at running the bootstrap command (cited in step 5), verifying a deliberately-failing edit gets blocked, adding redundant CI gates.

3. **`agentic-next` itself does NOT ship a `Next` section.** Recursive (the skill's whole purpose is to point at next actions). The output contract already prescribes "3–5 concrete invocations" — that IS the Next.

4. **Profile-aware inline notes** where relevant. Format: parenthetical `(skip in poc / solo)` or conditional `In team / mature: <action>; otherwise <alt>.` Mirrors the README's profile-aware language.

5. **Codex parity is symmetric.** Both agent variants of every covered skill ship the same `Next` content adapted to their respective body shapes (Markdown for Claude Code, plain Markdown appended after `</output_contract>` for Codex).

6. **Maintenance contract.** Every future ADR that adds a new skill, removes a skill, or changes a skill's output type must update `Next` sections in skills that name it. Surfacing this as an explicit obligation in this ADR so it does not drift; future ADRs add a one-line "updates `Next` in: [list]" item.

## Consequences

Positive:

- Closes the per-command navigation gap that `agentic-next` (reactive) and the README sequence (static) leave open. Users invoking a skill discover the natural next action without needing to invoke `agentic-next` afterward.
- The three navigation surfaces become complementary instead of overlapping:
  - **Per-command `Next`** answers *"after this skill, what's next?"* (linear hop)
  - **`agentic-next`** answers *"where am I globally, what's stuck?"* (snapshot)
  - **README sequence** answers *"what's the canonical happy path?"* (reference)
- Profile-aware breadcrumbs match the principle from ADR-0013 — `poc` users do not get nagged about `agentic-architecture` after `agentic-bootstrap`.
- Documentation-only change. No new skill / command / schema. Lift is small; risk is correspondingly low.
- Pattern aligns with mature CLIs (rails, gh, heroku, yeoman, vue create) — established UX with years of polish behind it.

Negative / trade-offs:

- **Skill body length grows** by 3–6 lines per skill. Mitigation: the `Next` section is always at the end; readers who only need the operational steps can ignore it. SKILL.md description (the trigger surface) is unchanged.
- **Maintenance burden across releases.** Adding a new skill or renaming an existing one means updating every `Next` section that names it. Mitigation: this ADR makes the obligation explicit; future ADRs that touch the skill set list the `Next` updates as part of their rollout.
- **Risk of breadcrumb staleness.** A `Next` section that points at a skill with a different name in a future kit version becomes wrong silently. Mitigation: the existing `lib.test.js` `SKILL_DESCRIPTIONS coverage` test catches missing skills; we could extend it to verify `Next` references resolve, but that adds parser complexity. Defer; rely on review discipline.
- **Could blur with `agentic-next`'s scope.** Per-command breadcrumbs give linear hops; `agentic-next` gives a survey. Mitigation: ADR explicitly distinguishes the two roles in §1; skill bodies cross-reference where it matters (e.g., `agentic-audit Next` says "for workflow drift: `/agentic-next`").

## Alternatives Considered

- **Linear wizard mode (`agentic guide` or `agentic wizard`).** Rejected. Duplicates README sequence in code; conflicts with the kit's flexibility principle (ADR-0013); rigid linear contradicts the "discipline scales with maturity" framing in TL;DR #16. Spec Kit already serves users who want rigid linear; nothing to add by replicating the pattern.
- **Drop `agentic-next` and ship per-command breadcrumbs only.** Rejected. The two surfaces answer different questions: per-command is a linear hop ("after spec, what?"); `agentic-next` is a survey ("where am I globally?"). Drift / orphan / stale-state findings require state inspection that no per-command output can deliver.
- **Profile-specific skill bodies (poc variant of `agentic-bootstrap` with a different `Next`).** Rejected. Skill source is canonical per [ADR-0001](0001-skills-mode-for-claude-and-codex.md) — splitting per profile would multiply maintenance N times. Inline parenthetical notes in a single body cover the variation cheaply.
- **Auto-generate `Next` from a central catalog.** Rejected. Each skill's natural successor depends on what the skill produces and the user's intent; central catalog cannot capture the conditional logic ("if scoping surfaced a binding decision: `/agentic-adr`"). Per-skill body is the right scope.
- **Defer this work to v0.12 alongside richer features.** Rejected. The lift is small (mechanical edit across 13 × 2 = 26 files); the user-facing impact is large (closes the navigation discovery gap surfaced in real use). Ship it as v0.11.0.
