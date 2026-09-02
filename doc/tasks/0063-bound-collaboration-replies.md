# Task `0063`: Bound collaboration replies

**Status:** done
**Created:** 2026-09-02
**Scope ref:** doc/specs/0004-personal-voice-layer.md; doc/specs/0005-compose-publication-reporting.md
**Evidence ref:** doc/research/0007-ground-context-bounded-collaboration-replies.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:** doc/specs/0004-personal-voice-layer.md; doc/specs/0005-compose-publication-reporting.md
**Board ref:**

## Context

`ad-voice` and `ad-publish` currently build factual invariant ledgers from an
entire brief. In a thread-reply workflow, that brief can mix the target message,
private owner-agent deliberation, supporting evidence, constraints, and the text
actually intended for publication. Treating all of it as publishable content can
leak private context, restate settled discussion, and produce a longer answer than
the recipient needs.

This task makes source roles explicit, adds a compact collaboration-reply type,
grounds factual claims before drafting, and verifies that the chosen formatting
works in the exact destination surface.

## Acceptance Criteria

- [x] `ad-voice` separates target-thread context, intended content, evidence,
      private deliberation, and constraints before building its invariant ledger.
- [x] `ad-publish` supports Slack, Discord, and GitHub issue or pull-request
      replies through an approved `collaboration-reply` baseline.
- [x] A reply starts with the answer or requested action and includes only the
      unresolved, evidence-backed delta needed for the conversation to continue.
- [x] A brief peer opener carries the concrete delta in the same sentence; the
      reply omits article-like framing and decision-irrelevant mechanism detail.
- [x] Existing thread content and private deliberation are not restated or
      published unless the user explicitly requests them or they are necessary
      for comprehension.
- [x] Factual claims are verified from authorized local or remote evidence when
      available; unsupported claims are omitted, qualified, or surfaced as a gap.
- [x] Tables, diagrams, collapsible detail, images, and other rich formatting are
      used only when useful and supported by the exact destination surface.
- [x] Claude Code, Codex, dogfood copies, focused tests, complete tests, and the
      package dry-run remain synchronized and green.

## Plan

- [x] Amend Specs 0004 and 0005 with source-role, reply-delta, grounding, and
      destination-capability requirements.
- [x] Add focused failing contract and fixture tests.
- [x] Update both `ad-voice` variants with a context-boundary gate.
- [x] Add the collaboration-reply template and channel-capability reference to
      both `ad-publish` variants.
- [x] Refresh dogfood copies and run focused, full-suite, and package checks.
- [x] Run fresh-context review and the maximum rules audit; close every finding.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-02

The owner reported a recurring failure in Slack, Discord, GitHub issue, and pull
request replies: the model republishes owner-agent deliberation or repeats context
that thread participants already know. GROUND-0007 selects explicit source roles,
a delta-only reply baseline, evidence acquisition before drafting, and a
destination-capability gate as the smallest extension of the existing architecture.

The owner then supplied a rejected-and-corrected thread reply. The accepted
direction preserved a small peer greeting, moved the concrete configuration delta
into that opening, and reduced technical evidence to the practical risk conclusion.
Only these derived properties are retained; the private example is not stored.

Focused verification passed 31/31 tests and the complete suite passed 706/706.
The ground record validated with 15 sources across all four required classes;
`npm pack --dry-run --json --ignore-scripts` and `git diff --check` also passed.
The final two-axis review found no Standards or Spec issues. The re-audit resolved
the prior `CONTEXT.md` and ADR-0071 drift findings, covered every rule group and
all 40 target files, and ended complete with no open finding.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
