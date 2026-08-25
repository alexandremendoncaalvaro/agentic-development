# Task `0060`: Implement publication workflow

**Status:** in-progress
**Created:** 2026-08-21
**Scope ref:** doc/specs/0005-compose-publication-reporting.md
**Evidence ref:** doc/research/0005-publication-template-system.md
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:** doc/specs/0005-compose-publication-reporting.md
**Board ref:**

## Context

The owner repeatedly drafts GitHub proposal issues by restating the same editorial
rules and searching historical examples. `ad-publish` must make that workflow
repeatable without taking ownership of personal voice, research, pull-request
creation, template mutation, or the final outward action.

This task owns `src/skills/{claude-code,codex}/ad-publish/`, its GitHub proposal
baseline, publication fixtures, and publication-specific tests. It consumes the
template contract from Task 0059 and does not modify the `ad-template-tune` or
`ad-report` skill directories.

## Acceptance Criteria

- [x] `ad-publish` ships for Claude Code and Codex and supports drafting or
      reviewing a GitHub proposal issue from either a brief or an existing draft.
- [x] The bundled proposal template encodes every applicable element in Spec 0005
      R15 and cites the approved owner-authored CorridorKey exemplars that grounded
      its structural strengths.
- [x] The workflow resolves destination, audience, purpose, language, action, and
      hard constraints; applies the durable template plus the smallest useful set
      of authorized matching examples; and degrades honestly when history or a
      connector is unavailable.
- [x] The workflow composes `ad-voice`, `ad-ground`, `ad-research`, `ad-pr`, and
      `ad-template-tune` only through their public contracts and preserves every
      callee authorization, limitation, and verification gate.
- [x] Every applicable template rule and exemplar strength receives an internal
      satisfied, improved, not-applicable, or higher-priority-override verdict,
      with unresolved material gaps disclosed outside the usable draft.
- [x] The normal result is one usable publication, while any outward publication
      requires a receipt naming the final text, exact destination, selected
      template, limitations, and requested action followed by explicit approval.
- [ ] Three held-out proposal fixtures preserve every marked fact and satisfy the
      structural and composition criteria; owner comparison rates every result no
      worse than the untemplated baseline and strictly prefers at least one.
- [x] Dogfood installation, managed skill metadata, full tests, and
      `npm pack --dry-run` include every canonical publication file.

## Plan

- [x] Implement the dual-host `ad-publish` workflow and progressive references
      under its owned skill directories.
- [x] Encode the GitHub proposal baseline from Research 0005 without retaining raw
      exemplar bodies.
- [x] Integrate the Task 0059 resolver and document composition boundaries for
      voice, research, pull requests, and explicit curation.
- [x] Add synthetic draft, review, missing-source, permission-refusal, factual
      preservation, approval-gate, and composition tests under `test/`.
- [ ] Run the held-out owner comparison and record aggregate results without
      private content.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-24

Implementation started after Task 0059 completed. `ad-publish` will remain an
editorial, read-only template consumer: it may compose `ad-voice`, research,
`ad-pr`, and explicit `ad-template-tune` through their public contracts, but it
will not duplicate their state or outward-action gates. Synthetic held-out briefs
will carry explicit invariant ledgers; the owner's comparative rating remains a
separate human gate.

### 2026-08-24

The dual-host workflow, approved proposal baseline, layered resolver, composition
contracts, synthetic fixtures, dogfood copies, and package coverage are in place.
The implementation review found and closed the final-title and verified-account
gaps. Focused tests and the full local suite pass; only the owner's held-out
comparison against an untemplated baseline remains before this task can close.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
