# Task `0059`: Implement template curation

**Status:** done
**Created:** 2026-08-21
**Scope ref:** doc/specs/0005-compose-publication-reporting.md
**Evidence ref:** doc/research/0005-publication-template-system.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:** doc/specs/0005-compose-publication-reporting.md
**Board ref:**

## Context

`ad-publish` and `ad-report` need one validated template contract and one safe
writer before either workflow can depend on durable owner or project standards.
Without that foundation, each skill would resolve and mutate templates differently,
duplicating privacy-sensitive behavior and making precedence unreliable.

This task owns `src/skills/{claude-code,codex}/ad-template-tune/` and the shared
template resolver, validator, schema fixtures, and parity tests. It does not own
the `ad-publish` or `ad-report` skill directories or their artifact-specific
baselines.

## Acceptance Criteria

- [x] `ad-template-tune` ships for Claude Code and Codex with equivalent trigger,
      source-authorization, review, approval, and write behavior.
- [x] A versioned Markdown template contract represents every field required by
      Spec 0005 R8 and ADR-0071 and keeps author classes separately attributed.
- [x] A deterministic skill script resolves bundled, machine, and project layers,
      applies project-over-machine-over-bundled shadowing by stable identifier,
      and reports the resolved layers and material conflicts.
- [x] Validation rejects missing provenance, unknown schema versions, duplicate
      identifiers, mixed author classes, unauthorized retained excerpts, invalid
      approval state, path traversal, and mutation without recorded approval.
- [x] Writes are atomic, propose one delta at a time, leave the prior store intact
      after rejection or interruption, and never retain raw source content by
      default.
- [x] First project-layer creation offers committed or machine-local visibility,
      defaults to machine-local, and writes only filename-scoped
      `.git/info/exclude` entries for that mode.
- [x] Shared contract and script copies remain byte-identical across consumers and
      hosts where required, with deterministic fixtures covering resolution,
      validation, privacy, and interrupted writes.
- [x] Dogfood installation, managed skill metadata, full tests, and
      `npm pack --dry-run` include every canonical curator file.

## Plan

- [x] Define the Markdown-plus-JSON contract and synthetic fixtures under
      `src/skills/claude-code/ad-template-tune/`.
- [x] Implement zero-dependency resolution, validation, and atomic-write scripts
      under the curator's `scripts/` directory.
- [x] Mirror the skill, references, scripts, and Codex metadata under
      `src/skills/codex/ad-template-tune/` with required host parity.
- [x] Add focused resolver, validation, privacy, parity, installer, and package
      tests under `test/`.
- [x] Refresh dogfood copies with `node bin/agentic.js update --yes`, verify the
      package dry-run, and run the complete local gate.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-24

Implementation started from the accepted Spec 0005 and ADR-0071. The contract
will use one canonical Markdown file per template, a closed JSON metadata block,
derived human-readable instructions, separately attributed provenance groups, and
an exact candidate digest as the write-approval boundary. Tests are being written
before the skill and script implementation.

Implementation completed with equivalent Claude Code and Codex skills, a shared
closed Markdown-plus-JSON contract, deterministic three-layer resolution, exact
candidate and target approval receipts, atomic writes, filename-scoped project
exclusion, and privacy-safe validation failures. Dogfood copies match canonical
source. The final `npm test` gate passed 676/676 tests, the package dry-run
included every curator file, `git diff --check` passed, and no new `TODO` or
`FIXME` remains. The corrected two-axis review found no remaining
Standards or Spec issue; its ephemeral audit trail is
`.agentic/reviews/2026-08-24T15-03-36Z-working-tree.md`.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
