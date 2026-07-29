# Task `0013`: Recommitment mode on explicit `ad-philosophy` invocation

**Status:** in-progress
**Created:** 2026-07-29
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:** [ADR-0044](../adr/0044-explicit-invocation-recommitment-mode.md)
**Board ref:**

## Context

`ad-philosophy` has one mode today: it loads and the agent is expected to comply. That mode fails observably for *Decide When Grounded* — three violations the maintainer recorded during this repository's own program, each with the rule verifiably in context (see [ADR-0044](../adr/0044-explicit-invocation-recommitment-mode.md) on where that record lives). The failure is application at decision time, not retrieval at read time, so more text is not the fix. [ADR-0044](../adr/0044-explicit-invocation-recommitment-mode.md) gives explicit invocation a second mode: the agent must bind each of the eight behaviors to the current task, out loud, before continuing. Auto-load is unchanged.

## Acceptance Criteria

- [x] Both host `ad-philosophy` SKILL.md files carry the recommitment section, triggered only by explicit invocation and explicitly exempting the auto-load path.
- [x] The section requires all eight behaviors enumerated in order, `n/a` entries carrying a reason, concrete next-action bindings, and a correction when a binding contradicts the current plan.
- [x] The managed `Skills installed by agentic` table advertises `/ad-philosophy` alongside the implicit load, with a regression test covering the generator.
- [x] Dogfood install regenerated so the installed copies stay byte-identical to source.
- [x] `npm test` green.
- [x] Two-axis fresh-context review (WORKFLOW §10) run; findings resolved or rejected with evidence.

## Plan

- [x] Draft ADR-0044 (fold-vs-new argued against ADR-0034; kit-ships-no-host-hook argued against ADR-0041).
- [x] Edit `src/skills/claude-code/ad-philosophy/SKILL.md` and `src/skills/codex/ad-philosophy/SKILL.md`.
- [x] Fix the `_(implicit)_` hardcode in `src/lib/rootdoc.js` and cover it in `test/lib.test.js`.
- [x] `node bin/agentic.js update --yes --force`; `npm test`.
- [x] Fresh-context review, both axes.
- [ ] PR opened.
- [ ] Merged on CI green.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-07-29

Frontmatter `description` and `summary` left unchanged: the trigger set is unaffected (the mode fires on an invocation the user already makes) and both fields are already at their useful density. The section is placed immediately after the intro, before the behaviors it enumerates, so the protocol is read before its subject matter.

Documentation Discipline is not one of the eight behaviors and is bound only when the task writes or edits a document — matching how the skill already separates the two blocks.

Correcting the entry above: `summary` **was** changed on both hosts, and the "left unchanged" note no longer holds. The Spec-axis reviewer found that `src/lib/rootdoc.js` hardcoded `_(implicit)_` as this skill's Invoke cell — accurate while auto-load was the only mode, and the exact opposite of what a user needs once an explicit invocation carries a protocol. Fixing the cell made the summary stale too, since the summary is the Notes cell the same table renders. Both now describe the two modes.

Review findings, both axes, with disposition. Accepted and fixed: the `rootdoc.js` contradiction plus its missing regression test; a dropped "read the behaviors" clause on the Codex side (the program's recurring cross-host compression failure); `applied-binding statement` vs `binding statement` terminology drift between ADR and skills; "named it in their message" not distinguishing an invocation from an incidental mention; concreteness carried by a single example rather than a structural test, which let a rule-restatement pass as a binding; and a closing line that could nullify the whole statement. Rejected with evidence: the Standards reviewer read the violation count as unsupported because the record lives in the maintainer's session notes outside this repository — the count stands, and the ADR now attributes it rather than implying a repo-checkable citation. Partially rejected: the Spec reviewer graded "advisory text cannot fix a decision-time reflex" a blocker; the limitation is real and the ADR states it, but the deterministic layer is deliberately outside the kit's dual-host scope, so it is a recorded trade-off, not an unmet requirement. The wording gaps that same finding surfaced were accepted and fixed above.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
