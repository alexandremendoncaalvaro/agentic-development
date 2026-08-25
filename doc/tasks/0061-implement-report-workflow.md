# Task `0061`: Implement report workflow

**Status:** done
**Created:** 2026-08-21
**Scope ref:** doc/specs/0005-compose-publication-reporting.md
**Evidence ref:** doc/research/0005-publication-template-system.md
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:** doc/specs/0005-compose-publication-reporting.md
**Board ref:**

## Context

The owner repeatedly produces standalone reports of studies, analyses, and
initiatives, often as HTML, while restating the same requirements for information
order, evidence, diagrams, and presentation quality. `ad-report` must own the
editorial plan and verification of the final deliverable while delegating the
requested format to an existing artifact capability.

This task owns `src/skills/{claude-code,codex}/ad-report/`, its analytical report
baseline, report fixtures, and report-specific tests. It consumes the template
contract from Task 0059 and does not modify the `ad-template-tune` or `ad-publish`
skill directories.

## Acceptance Criteria

- [x] `ad-report` ships for Claude Code and Codex and supports drafting or reviewing
      a standalone analytical report from findings, evidence, and an audience.
- [x] The bundled analytical report template encodes every applicable element in
      Spec 0005 R16, starts from the approved official-method baseline, and states
      that no private owner or team report corpus has yet been authorized.
- [x] The workflow owns executive conclusion, question, method, provenance,
      findings, recommendations, limitations, and optional depth while composing
      the available DOCX, PDF, presentation, visualization, site, or other artifact
      capability for rendering and its normal visual and accessibility checks.
- [x] The workflow composes `ad-voice`, `ad-ground`, `ad-research`,
      `ad-template-tune`, and artifact capabilities only through their public
      contracts and preserves every callee gate and material limitation.
- [x] Every applicable template rule and exemplar strength receives an internal
      satisfied, improved, not-applicable, or higher-priority-override verdict,
      with unresolved material gaps disclosed outside the usable report.
- [x] Missing renderers, inaccessible sources, or unavailable connectors degrade
      without fabrication; publishing or exporting beyond the agreed local target
      requires an exact-destination receipt and explicit approval.
- [x] Three held-out report fixtures preserve every marked fact and satisfy the
      editorial, composition, rendering, and accessibility criteria; owner
      comparison rates every result no worse than the untemplated baseline and
      strictly prefers at least one.
- [x] Dogfood installation, managed skill metadata, full tests, and
      `npm pack --dry-run` include every canonical reporting file.

## Plan

- [x] Implement the dual-host `ad-report` workflow and progressive references
      under its owned skill directories.
- [x] Encode the official-method analytical report baseline and its evidence
      limitations without retaining raw source reports.
- [x] Integrate the Task 0059 resolver and composition contracts for voice,
      research, curation, rendering, visual verification, and accessibility.
- [x] Add synthetic draft, review, missing-renderer, permission-refusal, factual
      preservation, export-gate, and composition tests under `test/`.
- [x] Render the held-out artifacts, run the owner comparison, and record aggregate
      results without private content.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-24

Implementation started after the shared curator and publication consumer were in
place. `ad-report` will own the editorial plan and final end-to-end verification,
while the available artifact capability retains ownership of rendering, visual
inspection, and its format-specific accessibility checks. No private report corpus
is authorized; the first baseline will therefore remain official-method-only.

### 2026-08-24

The dual-host workflow, official-method baseline, layered resolver, composition
contracts, synthetic fixtures, dogfood copies, and package coverage are in place.
The implementation review found and closed the private-source authorization gap.
Focused tests and the full local suite pass; only rendering the held-out artifacts
and the owner's comparison against an untemplated baseline remain before this task
can close.

### 2026-08-24

The blinded owner comparison ran across all three held-out report fixtures after
both options preserved every marked invariant. The PDF was tagged and visually
inspected, both DOCX options were rendered page by page, and both presentations
passed slide inspection and overflow checks. The templated result was preferred
twice and tied once, so all three were no worse than the untemplated baseline and
two earned a strict preference. No private content or owner rationale was retained.
This satisfies the remaining acceptance criterion and closes Task 0061.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
