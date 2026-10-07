# Task `0097`: Absorb upstream practices into skill text

**Status:** done
**Created:** 2026-10-07
**Scope ref:** doc/research/0032-reference-skill-repos-delta.md (Conclusion items 2, 4, 5 and runners-up); doc/research/0033-host-native-enforcement-layer.md (E10)
**Evidence ref:** doc/research/0032-reference-skill-repos-delta.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

RESEARCH-0032 compared the kit with the current state of its reference
repositories and recommended a set of small skill-text changes the owner
approved in chat: `/ad-diagnose` asks for a minimised repro it never tells
the agent to build and says nothing about secrets in what it shows;
`/ad-pr` bodies carry no rollback or blast-radius line and no before/after
evidence; `/ad-tdd` does not name the tautological test; vertical slicing
has no stated exception for a wide mechanical refactor; `/ad-level-up` does
not read session transcripts and does not send a mechanical violation to a
hook or lint rule instead of rule text. RESEARCH-0033 E10 also found the
Codex skill bodies saying Codex has no structured-question tool, which is
stale.

Each change is a few lines of instruction text on both hosts; none adds a
skill, a script, or a dependency.

## Acceptance Criteria

- [x] `/ad-diagnose` on both hosts asks to redact secrets before showing commands, output or captured artifacts; adds a Minimise step to Phase 2 that ends when every remaining element is load-bearing; and ends Phase 1 only when one red-capable command has already been run and its output shown.
- [x] `/ad-pr` on both hosts adds optional `Evidence` (before and after) and `Merge danger` (one-way or two-way door, blast radius) sections and allows one small diagram in the summary when it explains the change better than prose.
- [x] `/ad-tdd` on both hosts names the tautological test (an expected value recomputed the way the code computes it) and asks for expected values from an independent source.
- [x] `WORKFLOW.md` §6 and `/ad-task` on both hosts name expand–contract as the exception to vertical slicing for a wide mechanical refactor.
- [x] `/ad-level-up` on both hosts accepts session transcripts as a cited candidate source, and its placement step routes a mechanically checkable violation to `/ad-hooks` or a lint rule instead of rule text.
- [x] No Codex skill body says Codex has no structured-question tool; each names `request_user_input` where the session exposes it, with inline numbered text as the fallback.
- [x] A test in `test/skills.test.js` locks each item on both hosts; the dogfood installs are refreshed, `npm run verify` passes, and `CHANGELOG.md` records the change.

## Plan

- [x] Red: one test per item in `test/skills.test.js`.
- [x] Green: edit both host bodies of `ad-diagnose`, `ad-pr`, `ad-tdd`, `ad-task`, `ad-level-up`, the five Codex bodies with the stale line, and `WORKFLOW.md` §6; refresh the dogfood install.
- [x] `CHANGELOG.md`; `/ad-review`; `/ad-audit`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Opened from RESEARCH-0032 and RESEARCH-0033; the owner approved the
backlog in chat. Sources, all read at the pinned heads in RESEARCH-0032:
mattpocock/skills `diagnosing-bugs` (Redact, Minimise, Phase-1 completion
criterion), `pr` (Evidence, Merge Danger, visuals), `tdd` (tautological
tests), `to-tickets` (wide refactors as expand–contract); mattpocock `retro`
and superpowers `diagnosing-superpowers` for transcript retrospectives. The
wording is the kit's own, not copied.

Red, then green: six new tests in `test/skills.test.js` failed on the
unchanged bodies and pass after the edits. Editing `WORKFLOW.md` §6 changes
its hash, so `src/lib/legacy-project-migration.js` registers the new hash as
the current development copy, as Task 0089 did; the previous hash stays.

Fresh-context review on both axes (local review files, gitignored; the
findings are quoted here): no Blocker. Accepted and fixed: the `/ad-pr`
Evidence and Merge danger sections now say to omit the heading when skipped
and never to guess a door; the `/ad-diagnose` Minimise stop rule now covers
a flaky loop (the rate drops to baseline) and an artifact replay that cannot
be shrunk; the `/ad-level-up` mechanical routing moved from placement to the
effectiveness pass and uses the existing reject disposition with the route
recorded, the check itself built behind its own approval; the tests now
match `mechanical violation`, require the Phase-1 output to be shown, and
assert that the five Codex bodies name `request_user_input` and the
fallback.

### 2026-10-07 — audit dispositions

`/ad-audit` over 4754695 (seven groups: CV with a second pass on another
model and reversed order, GH, AGENTS.md, GUIDELINES.md, ARCHITECTURE.md and
CONTEXT.md, the touched ADRs; HK and NET not applicable, no hook or .NET
surface): no blocker. Dispositions, fixed in the follow-up commit unless
stated:

- The red run is now reproducible: with the commit's test file over the
  `ee0ddd4` skill bodies and `WORKFLOW.md` (`git checkout ee0ddd4 --
  src/skills WORKFLOW.md` in a disposable worktree, then `node --test
  test/skills.test.js`), the six new tests fail and the other 668 pass.
- The Plan and Definition of Done were ticked before this audit ran; they
  stand from this entry on, which records the audit.
- Review files under `.agentic/reviews/` are gitignored by design; the
  findings and dispositions quoted in this log are the tracked record, as
  `/ad-review` requires. Raised by CV in two consecutive audits, so it goes
  to `/ad-level-up` as a candidate (CV.5 against the review-file design).
- `BOTH_HOSTS` renamed `bothHosts` (GUIDELINES §2.1).
- GUIDELINES §10.3 now names the optional PR sections, so the binding doc
  matches `/ad-pr`.
- A transcript candidate clears the same gates as any other, recurrence
  included (ADR-0037 D3).

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
