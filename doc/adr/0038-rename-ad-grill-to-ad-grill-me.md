# ADR-0038: Rename `ad-grill` to `ad-grill-me`

**Status:** proposed
**Date:** 2026-07-28
**Deciders:** Alexandre Alvaro

## Context

The interview-before-research skill is invoked primarily by the natural-language trigger "grill me" (alongside "interview me", "stress test the plan", and the slash command). Its identifier is `ad-grill` — a bare verb that omits the object the skill actually acts on. The skill grills *the user*: it challenges the user's fuzzy ask, sharpens the user's vocabulary, scenario-tests the user's assumptions.

Every other operational skill in the kit reads as an imperative on a stated object — `ad-review` (a diff), `ad-ground` (a question), `ad-commit` (staged changes), `ad-diagnose` (a bug). `ad-grill` alone drops the object, and the drop makes the slash command diverge from the very phrase that triggers it: a user who types "grill me" gets a skill named `/ad-grill`.

## Decision

Rename the skill identifier **`ad-grill` → `ad-grill-me`** across both host source trees (`src/skills/claude-code/`, `src/skills/codex/`), the cross-referencing skills, the CLI and profiles, the tests, the narrative docs, and the regenerated dogfood install plus the managed AGENTS.md skills table.

This is a **pure identifier change** — the skill's interview-before-research behavior is unchanged. The `/ad-grill-me` slash command now matches the primary "grill me" trigger phrase and names its object, consistent with the imperative-on-an-object convention the other operational skills already follow.

**Accepted ADRs are not swept.** [ADR-0031](0031-decide-when-grounded-posture.md) references the skill by its then-current name (`/ad-grill`) in an escalation-routing example, and [ADR-0021](0021-diagnose-discipline.md) §Step 0 references it as the planned `agentic-grill`; both are left intact as historical records of decisions made when those names were current. This honors decision-record immutability ([WORKFLOW.md](../../WORKFLOW.md) Documentation Discipline rule 9) and matches the kit's own convention from the `agentic-`→`ad-` prefix rename, where accepted ADRs retained the pre-rename identifiers as intentional historical records (see [AGENTS.md](../../AGENTS.md) Gotchas — Historical naming). The live source of the escalation rule is `ad-philosophy`, which *is* swept; a reader wanting the current skill name reads the skill, a reader wanting the decision's history reads the ADR.

Out of scope for this rename (kept separate for atomic-commit discipline, [GUIDELINES.md](../../GUIDELINES.md) §10.2):

- The "design tree" → "decision tree" vocabulary refinement (deferred to the Matt Pocock adoption pass; it also touches `ad-deepen` and `ad-domain`, which the rename does not otherwise change).
- The pre-existing dangling `ADR-0022` reference in the skill body and `test/profile.test.js` (the planned `agentic-grill` ADR was never created — see [ADR-0021](0021-diagnose-discipline.md) §Step 0; a separate drift-fix, not a naming concern).

## Consequences

Positive:

- The slash command matches the natural trigger phrase ("grill me" → `/ad-grill-me`).
- Naming is consistent with the imperative-on-an-object convention of the other operational skills.

Negative / trade-offs:

- Breaking change to a public skill identifier (`refactor!`): anyone who typed `/ad-grill` must relearn `/ad-grill-me`. Pre-1.0 dogfood — low blast radius.
- Wide reference sweep (both host trees, cross-referencing skills, narrative docs, the managed table, dogfood install). Mechanical and verified by the suite, but a large diff — the same shape as the `ad-audit` → `ad-drift` rename ([ADR-0034](0034-audit-tier-skills-over-fold.md)).

Revisit trigger: none anticipated. A further naming pass would land as its own ADR.

## Alternatives Considered

- **Keep `ad-grill`** — rejected. It diverges from the "grill me" trigger and omits the object every other operational skill names.
- **`ad-interview`** — rejected. "Interview" loses the adversarial connotation the skill's discipline depends on (challenge, sharpen, scenario-test); "grill" carries it.
- **Bundle the "design tree" → "decision tree" wording into this rename** — rejected here. It mixes a vocabulary change into an identifier rename and touches skills the rename does not; atomic-commit discipline keeps them separate. Deferred to the Matt Pocock adoption pass.
- **Do nothing** — rejected. The identifier stays misaligned with its own trigger phrase.
