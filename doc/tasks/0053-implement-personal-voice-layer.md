# Task `0053`: Implement the personal voice layer

**Status:** done
**Created:** 2026-08-13
**Scope ref:** doc/specs/0004-personal-voice-layer.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:** doc/specs/0004-personal-voice-layer.md
**Board ref:**

## Context

Generic humanization removes model-writing patterns but does not preserve the
owner's communicative identity across audience, channel, and language. The
accepted design separates owner evidence, target-community accommodation, and
situational context in a private machine-local profile. The implementation must
make that distinction enforceable without adding a service, account, telemetry,
or runtime dependency.

## Acceptance Criteria

- [x] `ad-voice` and `ad-voice-tune` install for Claude Code and Codex with
      byte-identical shared resources and concise progressive disclosure.
- [x] Profile resolution follows explicit path, `AGENTIC_VOICE_DIR`, then
      `~/.agentic/voice/`, and deterministic validation rejects the malformed,
      unsupported, unapproved, or cross-scope profiles named by Spec 0004.
- [x] `ad-voice` preserves factual invariants, keeps profile application
      read-only, separates communicative identity from accommodation evidence,
      and falls back honestly when evidence is insufficient.
- [x] `ad-voice-tune` negotiates source boundaries, removes raw samples by
      default, and persists only one explicitly approved profile delta at a time.
- [x] Tests cover installation, profile validation, privacy boundaries, host
      parity, dogfood synchronization, and npm package inclusion without storing
      personal samples or profile content in the repository.

## Plan

- [x] Add public-behavior tests for profile resolution and validation under
      `test/` and confirm each new behavior fails before implementation.
- [x] Implement the shared profile script and progressive references under
      `src/skills/{claude-code,codex}/{ad-voice,ad-voice-tune}/`.
- [x] Write both skill workflows, including the separate application and
      human-gated calibration contracts.
- [x] Refresh dogfood copies and state through the CLI installer.
- [x] Run focused tests, the complete suite, package dry-run, and fresh-context
      review; resolve every confirmed finding.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-13

ADR-0068 accepted after the owner clarified that Portuguese evidence supplies
communicative identity while authorized team conversations may supply English
accommodation conventions. The initial English pairwise comparison measured
naturalness more directly than owner fidelity because the owner is not fluent in
English.

The implementation introduced a shared zero-dependency resolver, validator, and
atomic writer; synthetic tests exercised approval, provenance, cross-language
scope, privacy, and malformed-profile boundaries before the corresponding
behavior was implemented. `agentic update --yes --force-root-doc` then refreshed
both dogfood trees, their state files, and the managed skill catalog.

The final gate passed 642 tests. The package dry-run included all 20 canonical
personal-voice skill files. The two-axis review found and resolved repository-path
retention, open-schema retention, parse-error disclosure, provenance, scope, and
stale-research issues. Its remaining Spec concern is the owner-authorized held-out
calibration, now tracked separately as Task 0054 because it requires private
evidence and human judgment rather than more implementation work.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
