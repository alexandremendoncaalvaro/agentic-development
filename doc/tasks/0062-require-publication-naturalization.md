# Task `0062`: Require publication naturalization

**Status:** done
**Created:** 2026-08-26
**Scope ref:** doc/specs/0005-compose-publication-reporting.md (R4-R5)
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:** doc/specs/0005-compose-publication-reporting.md
**Board ref:**

## Context

`ad-publish` and `ad-report` can compose `ad-voice`, and `ad-voice` already owns a
bundled human-writing baseline. Their current wording does not require that path
for every final artifact or require the external `humanizer` when it is installed.
The result can therefore skip both the confirmed personal profile and the final
naturalness pass.

This task makes `ad-voice` a mandatory final editorial dependency for both
workflows. `ad-voice` uses the installed `humanizer` through its public contract
when available and otherwise applies its bundled equivalent, without making the
external skill a package dependency.

## Acceptance Criteria

- [x] Every `ad-publish` title and body and every `ad-report` editorial result pass
      through `ad-voice` after facts, constraints, evidence, and structure settle.
- [x] `ad-voice` always runs one naturalization pass: installed `humanizer` when
      discoverable, otherwise the bundled human-writing baseline.
- [x] The fallback covers the same material model-writing failure classes without
      claiming that the external skill ran.
- [x] Naturalization preserves the invariant ledger and cannot erase confirmed
      profile rules; any corrective rewrite repeats both audits.
- [x] Claude Code, Codex, dogfood copies, focused tests, the complete suite, and
      the package dry-run remain synchronized and green.

## Plan

- [x] Add contract tests for mandatory voice and naturalization composition.
- [x] Strengthen `ad-voice` and its bundled fallback for both hosts.
- [x] Require the `ad-voice` pass from `ad-publish` and `ad-report` for both hosts.
- [x] Refresh dogfood copies and run focused, full-suite, and package checks.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-26

The owner requires personal voice and naturalization on every publication and
report. The external `humanizer` is preferred when installed, but the kit must
remain self-contained and provide equivalent baseline behavior when it is absent.

### 2026-08-26

Both publication consumers now route every final text through `ad-voice` after
content settles and before final verification or rendering. `ad-voice` invokes a
discoverable `humanizer` through its public contract, falls back to the bundled
baseline when absent, applies the confirmed profile after generic naturalization,
and repeats invariant, profile, and naturalness audits after any correction.

The machine profile validated with 12 approved patterns, no retained examples,
and zero errors. Focused tests passed 31 of 31, the complete suite passed 702 of
702, and `npm pack --dry-run` succeeded. Claude Code, Codex, and dogfood copies are
byte-identical for the shared files. Inline review found no remaining Standards or
Spec concern.

### 2026-08-26

A post-merge maximum-gate audit invalidated the completion claim above. It found
that a Step 5 rewrite could bypass the final `ad-voice` result, the fallback did
not yet expose all 33 Humanizer 2.9.1 failure classes or its repeated audit loop,
and the tests did not include observed draft-to-final branch fixtures. The task is
reopened until the correction passes focused and full tests, fresh-context review,
and a new rules-anchored audit.

### 2026-08-26

The correction now makes the final no-return-after-change clause the terminal
verification instruction in both consumers. The bundled compatibility baseline
covers `HW.1` through `HW.33`, false-positive protection, human-signal
preservation, and the repeated invariant audit. Five held-out cases record both
Humanizer 2.9.1 and fallback branch runs with invariant and profile-rule ledgers,
audit rounds, and final outputs.

Focused consumer tests passed 10 of 10 and the complete local CI gate passed 703
of 703. `npm pack --dry-run` produced the expected package. A disposable-clone
mutation added a post-gate formulaic rewrite to all four publication skill copies;
the focused test failed 1 of 5 at the terminal-gate assertion, closing the prior
negative-coverage finding. Fresh-context review ended with zero Standards and zero
Spec concerns. The maximum rules audit covered all 35 changed files; two isolated
CV passes in opposite rule and hunk order agreed with matching anchors and no
implementation blocker.

### 2026-08-26

PR #122 did not enqueue the required GitHub Actions matrix on either its `opened`
or `reopened` event. This append-only receipt was committed to produce a genuine
`synchronize` event without changing the audited implementation. Merge remains
gated on all four required Node 20/22 and Ubuntu/Windows checks passing on the new
head, followed by exact-head closure verification.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
