# Task `0079`: Close the drift audit items

**Status:** done
**Created:** 2026-09-21
**Scope ref:** ARCHITECTURE.md; doc/adr/0065-run-ci-on-windows.md; doc/adr/0007-workflow-operational-skills.md; doc/adr/PROJECTION.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The read-only `/ad-drift` scan of 2026-09-18 ran at the close of the evaluation
harness block. Its deterministic checks were clean and it wrote nothing; three
judgment items were left for a later fix because each needed a decision about
what the corrected state is, not a mechanical replacement. They are stale
descriptions of a present state, so the cost of leaving them is that a reader
who trusts the document reaches a wrong conclusion about what the repository
runs and what still binds.

This task closes those three and records a fourth relation gap that surfaced
while verifying them.

## Acceptance Criteria

- [x] `ARCHITECTURE.md`'s test layout names every suite file under `test/`, verified by comparing the directory listing against the paragraph rather than by reading alone.
- [x] `ADR-0065`'s realized Node version pair is recorded as retired: ADR-0078 declares the amendment, ADR-0065 carries the matching `Amended by:` line, and `doc/adr/PROJECTION.md` gains the row, leaving the two-operating-system decision binding.
- [x] `ADR-0007` item 7's universal-versus-optional install model is recorded as retired by ADR-0064 in `doc/adr/PROJECTION.md`, leaving the workflow-operational skill category binding.
- [x] The projection's own verification contract and the seven ADR-0064 retirements that carry no header pair are reconciled or the gap is tracked as its own work item, so the contract does not describe a check the directory cannot pass.

## Plan

- [x] Verify each item against the current tree before editing; a drift item that no longer reproduces is closed as such, not patched.
- [x] Land the record corrections and the projection rows in the same commit, per the projection's same-commit rule.
- [x] Run the full local gate and a fresh-context review before opening a pull request.

## Notes

### 2026-09-21 — Verification before any edit

All three drift items reproduce on `main` at `8d03e21`.

1. `test/` holds 26 suite files; the `ARCHITECTURE.md` test layout paragraph
   names 19. Missing: `global-rules`, `install-command`,
   `publication-report-package`, `publication-skill`, `report-skill`,
   `template-store`, `voice-profile`.
2. `ADR-0065`'s Context and Decision both say "Node 20 and Node 22", while
   `.github/workflows/test.yml` runs `['22.13.0', '24.x']` and ADR-0078
   Decision item 3 is what changed it. Neither record declares the relation:
   ADR-0078's `Amends:` names only ADR-0048, ADR-0065 has no `Amended by:`
   line, and `PROJECTION.md` has no ADR-0065 row.
3. `ADR-0007` item 7 makes `agentic-review` part of an always-installed
   universal set, which presupposes a universal-versus-optional split.
   ADR-0064 installs every bundled skill, and `bundledSkills()` in
   `src/lib/install.js` enumerates the source directory with no such split.
   `PROJECTION.md` has an ADR-0007 row for the Codex choreography but not for
   this.

The fourth item is new and was not in the drift report. `PROJECTION.md`'s
"Verifying this page" section presents the header-field pair as the reliable
check, but seven records the table attributes to ADR-0064 — 0020, 0021, 0036,
0053, 0054, 0060, 0061 — carry no `Amended by: ADR-0064` line, and ADR-0064
declares no `Amends:` at all. Completing seven relations is a distinct change
from correcting three stale statements, so it is kept out of this commit and
carried by the fourth criterion.

### 2026-09-21 — All four closed, and two further stale statements found on the same page

Item 1: the test layout paragraph names all 26 suite files. Checked by
comparing the `test/` listing against the paragraph in code, not by reading.

Item 2: ADR-0078 declares `Amends: ADR-0065`, ADR-0065 declares the matching
`Amended by:`, and the projection gains an ADR-0065 row beside ADR-0032, the
other CI record. The two-operating-system decision and the four-check
`protect-main` requirement stay binding; only the Node version pair retires.

Item 3: ADR-0007 gains a dated addendum retiring decision item 7's universal
set, because ADR-0064 installs every bundled skill and `bundledSkills()`
enumerates the source directory with no membership list. The 2026-05-24
addendum's sentence that item 7 still holds is corrected in the new entry, not
edited in place. The projection's ADR-0007 row now carries both retired parts
and both correctors.

Item 4 grew while verifying the others, because running the page's own checks
is what exposed them:

- The keyword sweep is documented as reporting eight records. It reports
  eighteen, and was already wrong before this change — the count rots with
  every amendment and nothing keeps it true, so the number is removed rather
  than updated, and the two standing false positives keep carrying the lesson.
- The header-pair check is documented as reading two disjoint file lists. They
  are not disjoint: ADR-0063 appears in both, as corrector of ADR-0048 and as
  corrected by ADR-0072, and ADR-0065 now does too. The text says to match the
  relation, not the filename.
- With ADR-0078 to ADR-0065 declared, the pair check is self-consistent: twelve
  `Amends:` lines, twelve `Amended by:` lines, every A to B with its B to A.
- The one remaining exception is the seven profile-scope retirements attributed
  to ADR-0064 with no header field on either side. Declaring them requires
  reading seven records to confirm the attribution, which is a different claim
  from correcting a stale sentence, so it is tracked as task-0080 and the
  projection names the exception until then.

### 2026-09-21 — Fresh-context review, both axes

Two reviewers with no session history read the staged diff, each bounded to one
axis. Verdicts persisted beside this entry at
`.agentic/reviews/20260921T*-task0079-{standards,spec,verdicts}.md`; that
directory is machine-local and gitignored, so what must outlive this machine is
quoted here.

Spec, one concern, accepted and fixed: the first verification entry above said
`test/` holds 25 suite files, while the same sentence names 19 documented and 7
missing, which sums to 26 — the directory's real count. A miscount inside the
record that exists to make the closure auditable. Corrected in place; the entry
had not been committed.

Standards, one blocker, accepted and fixed: the rewritten sweep paragraph
claimed every record in the table appears in the sweep's output. It does not.
The documented pattern spells the verb `amends`, so it never matches an
`**Amended by:**` header, and ADR-0032, ADR-0048, and ADR-0073 are in the table
and invisible to it. Replacing one false claim about that page with another one
is the precise defect the page exists to prevent. The paragraph now says the
sweep fails in both directions and names an example of each, and every example
was re-checked by running the command.

Standards, two concerns, both accepted and fixed: the shapes paragraph said
ADR-0007 carries both amendment shapes, but ADR-0007 declares no header field
at all — both of its retired parts are self-amendments in its own addenda, so
it carries that one shape twice. And the `test/voice-profile.test.js`
description indexed only the resolver and validator, omitting the `ad-voice`
behavior tests, the held-out naturalization fixtures, and the dogfood and
npm-package parity checks that make up roughly a third of the file.

Nothing was rejected. All four findings were verified against the tree before
being applied.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
