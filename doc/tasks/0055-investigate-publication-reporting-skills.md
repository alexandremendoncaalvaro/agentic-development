# Task `0055`: Investigate publication and reporting skills

**Status:** done
**Created:** 2026-08-13
**Scope ref:** doc/product/PRD.md — Later tier: Example-grounded publication and reporting
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:** doc/specs/0005-compose-publication-reporting.md
**Evidence ref:** doc/research/0005-publication-template-system.md
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

- [x] An evidence-graded research artifact compares relevant existing skills,
      tools, and implementation references for example-grounded publication and
      report generation, including what can be reused instead of rebuilt.
- [x] A feature specification defines `ad-publish` and `ad-report` as separate
      user-facing capabilities and identifies the minimum shared core, including
      exemplar discovery, curation, provenance, and same-or-better evaluation.
- [x] The specification defines the boundary with `ad-voice`, `ad-ground`,
      `ad-research`, `ad-pr`, and artifact-generation skills without duplicating
      their responsibilities.
- [x] Privacy, source authorization, unavailable-connector behavior, and explicit
      approval before any outward publication or export are specified.
- [x] The specification defines durable per-type publication templates (for
      example: GitHub proposal issue, standalone report) distilled from the
      owner's best past publications and the team's reference patterns — each
      template encoding the recurring rules the owner re-states today (lead with
      the most relevant information, match audience and channel conventions) —
      and defines how `ad-publish` and `ad-report` consume them.
- [x] Implementation work is decomposed only after the owner accepts the research
      conclusion and feature specification.

## Plan

- [x] Recover the useful requirements from the historical publication and report
      proposals in Git history and reconcile them with the personal voice layer.
- [x] Use `ad-research` to study existing personalized publication, report, style,
      and exemplar-curation skills or tools from primary sources where available.
- [x] Use `ad-grill-me` only for unresolved product judgments exposed by the
      research, preserving the two-skill boundary already chosen by the owner.
- [x] Draft one shared feature specification with separate `ad-publish` and
      `ad-report` workflows and record any binding architecture decision in an ADR.
- [x] Create implementation tasks with disjoint scope after explicit owner
      acceptance of the specification.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-13

Registered as future work at the owner's request. Earlier proposals captured the
same two-skill split but were removed because they lacked a repository-local
product anchor. This task is anchored in the PRD and intentionally stops before
research or implementation.

### 2026-08-21

Owner refinement: beyond exemplar discovery at generation time, the solution
should produce durable templates per publication type (GitHub proposal issues,
reports, other recurring publication kinds), built by harvesting the best of
the owner's past publications and the team's patterns, studying the relevant
methodology, and encoding the recurring rules (most relevant information
first, audience/channel fit) so the skills apply them without re-instruction.
Added as an acceptance criterion. Distinct from the voice profile
(`ad-voice`), which governs identity/register — templates govern structure and
rules per artifact type.

Research 0005 concluded after explicit owner approval. It selected durable,
type-specific templates plus bounded retrieval of authorized matching examples,
with ordinary drafting kept read-only and template changes placed behind a shared
human-gated curation operation. Spec 0005 was drafted for owner review. It makes
skill composition explicit: publication and reporting workflows reuse existing
voice, research, pull-request, and artifact-rendering capabilities where their
contracts apply instead of duplicating them.

The owner accepted Spec 0005. ADR 0071 now proposes the remaining architecture:
three template layers, visible precedence, a deterministic Markdown contract, and
`ad-template-tune` as the only runtime writer. Implementation decomposition waits
for that proposed decision to be reviewed.

The owner accepted ADR 0071. No `ad-grill-me` session was needed because the
research, two artifact approvals, and existing kit patterns resolved the remaining
product judgments. Tasks 0059, 0060, and 0061 now separate template curation,
publication, and reporting ownership. The full 656-test suite passed after the
research artifact was added; subsequent changes were documentation-only and
passed link, required-section, status, and whitespace checks. The owner reviewed
and approved the research conclusion, specification, and architecture decision.
No implementation began under this investigation task.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
