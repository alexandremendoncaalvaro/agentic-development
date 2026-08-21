# Task `0058`: Audit personal-voice principles before delivery

**Status:** done
**Created:** 2026-08-21
**Scope ref:** doc/specs/0004-personal-voice-layer.md
**Evidence ref:** doc/research/0004-ground-voice-rule-audit.md
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:** doc/specs/0004-personal-voice-layer.md
**Board ref:**

## Context

`ad-voice` preserves facts and applies a selected profile slice, but its final
check does not explicitly account for every active pattern individually. The
application contract therefore cannot demonstrate rule-complete coverage. It
needs a rule-by-rule audit, while the new personal principles themselves remain
machine-local and require the existing `ad-voice-tune` approval gate.

## Acceptance Criteria

- [x] `ad-voice` audits every active profile pattern before returning a draft,
      revises unmet items, and accounts for higher-priority overrides.
- [x] Normal output remains one usable draft; audit details appear only on request
      or when a material override prevents an honest result.
- [x] The audit contract is identical across Claude Code and Codex source and
      dogfood copies, with a regression test that fails if it disappears.
- [x] The owner's proposed profile delta records only derived explicit preferences
      and is written only after approval of the exact change.
- [x] Local tests and the package dry-run pass.

## Plan

- [x] Ground the audit design in psychology, content design, public voice tools,
      repository patterns, and git history.
- [x] Add the rule-audit requirement and success criterion to Spec 0004.
- [x] Add a failing contract test for exhaustive active-pattern accounting.
- [x] Implement the silent audit loop in both host skill sources and refresh the
      dogfood install.
- [x] Run the focused test, full suite, package dry-run, and Codex two-axis review.
- [x] Present one exact machine-local profile delta and wait for owner approval
      before writing it.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-21

The research supports a silent per-rule feedback loop rather than a new profile
schema or a visible score. The shipped kit will own the audit mechanism; personal
principles stay outside the repository under the existing human-gated profile
contract.

The focused contract test failed before the instruction change and passed after
it. The project update refreshed both dogfood hosts. The full suite passed 656 of
656 tests, the package dry-run included both canonical skill trees, and the
two-axis review reported no Standards or Spec findings. The exact profile delta
remains behind the owner's approval gate.

After that checkpoint, the owner approved the exact four-pattern delta. The
atomic writer replaced the machine-local profile, and the validator observed 12
approved patterns, zero exact examples, and zero errors. Temporary candidate
material was removed. No raw sample
or profile content entered the repository.

The release-gate audit independently exercised the shipped behavior on Codex and
Claude Code with the same validated two-pattern synthetic profile outside the
repository. Both fresh runs began from a source whose order violated both active
patterns, revised it, reported both pattern IDs as satisfied, preserved the name,
version, measurement, technical identifier, and uncertainty marker, and observed
the same profile SHA-256 before and after. A separate validation of the current
machine-local owner profile reported 12 patterns, zero retained examples, and zero
errors. Only these aggregate results were recorded; the synthetic material was
removed after the audit.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
