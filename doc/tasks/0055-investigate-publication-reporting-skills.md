# Task `0055`: Investigate publication and reporting skills

**Status:** proposed
**Created:** 2026-08-13
**Scope ref:** doc/product/PRD.md — Later tier: Example-grounded publication and reporting
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

The owner repeatedly prepares two related but distinct kinds of communication:
shorter outward-facing publications in collaboration surfaces, and standalone
reports of studies, analyses, or initiatives. Both currently require repeated
instructions to find strong examples, lead with what matters, adapt to the
audience, and produce something at least as useful as the best reference found.

Before implementation, the product needs evidence that existing skills or tools
cannot already provide the required behavior and a grounded design for how these
capabilities should complement `ad-voice`. The intended identity remains the
owner's; channel, audience, language, team conventions, and artifact format are
contextual adaptations rather than replacement voices.

## Acceptance Criteria

- [ ] An evidence-graded research artifact compares relevant existing skills,
      tools, and implementation references for example-grounded publication and
      report generation, including what can be reused instead of rebuilt.
- [ ] A feature specification defines `ad-publish` and `ad-report` as separate
      user-facing capabilities and identifies the minimum shared core, including
      exemplar discovery, curation, provenance, and same-or-better evaluation.
- [ ] The specification defines the boundary with `ad-voice`, `ad-ground`,
      `ad-research`, `ad-pr`, and artifact-generation skills without duplicating
      their responsibilities.
- [ ] Privacy, source authorization, unavailable-connector behavior, and explicit
      approval before any outward publication or export are specified.
- [ ] Implementation work is decomposed only after the owner accepts the research
      conclusion and feature specification.

## Plan

- [ ] Recover the useful requirements from the historical publication and report
      proposals in Git history and reconcile them with the personal voice layer.
- [ ] Use `ad-research` to study existing personalized publication, report, style,
      and exemplar-curation skills or tools from primary sources where available.
- [ ] Use `ad-grill-me` only for unresolved product judgments exposed by the
      research, preserving the two-skill boundary already chosen by the owner.
- [ ] Draft one shared feature specification with separate `ad-publish` and
      `ad-report` workflows and record any binding architecture decision in an ADR.
- [ ] Create implementation tasks with disjoint scope after explicit owner
      acceptance of the specification.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-13

Registered as future work at the owner's request. Earlier proposals captured the
same two-skill split but were removed because they lacked a repository-local
product anchor. This task is anchored in the PRD and intentionally stops before
research or implementation.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
