# Task `0080`: Declare the ADR-0064 amendment relations

**Status:** done
**Created:** 2026-09-21
**Scope ref:** doc/adr/0064-install-all-skills-with-contextual-guidance.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

`doc/adr/PROJECTION.md` attributes seven partial retirements to ADR-0064 —
0020, 0021, 0036, 0053, 0054, 0060, and 0061 all lose their profile-based
installation scope to it. None of the seven carries an `Amended by:` header,
and ADR-0064 declares no `Amends:` at all, so the projection's own reliable
check cannot see the relation. Every other cross-record amendment in the
directory is declared on both sides and pairs cleanly; this group is the sole
exception.

Task 0079 verified the gap while correcting three stale statements on the same
page, and kept it out of that change because it is a different claim. Correcting
a sentence that describes the present is cheap and needs no re-reading of the
records; asserting that ADR-0064 amends seven named decisions requires opening
each one and confirming that what the projection says was retired is what the
record actually decided. An over-attributed row would be copied into a header
field and become harder to dislodge.

## Acceptance Criteria

- [x] Each of the seven records is read against its projection row, and the row is confirmed, narrowed, or corrected before any header field is written.
- [x] Every confirmed relation is declared on both sides: `Amends:` on ADR-0064 naming the record and the retired part, `Amended by:` on the record naming ADR-0064.
- [x] The projection's "Verifying this page" section drops the ADR-0064 exception once no exception remains, so the header-pair check describes the whole directory.
- [x] Any row that verification does not confirm is corrected in the table with its reason, rather than declared.
- [x] Added mid-task, after the coverage check exposed it: ADR-0007 decision item 7, recorded by task-0079 as a self-amendment naming ADR-0064 as its reason, is verified and declared as the same cross-record relation as the seven, or left as a self-amendment with the reason stated.

## Plan

- [x] Read the seven records and their rows; record per-record verification in the Notes before editing.
- [x] Land the header fields and the projection edit in one commit, per the projection's same-commit rule.
- [x] Run the full local gate and a fresh-context review before opening a pull request.

## Notes

### 2026-09-21 — Opened from Task 0079

The gap is documentation-only: no consumer behavior depends on it. Its cost is
that a reader following the projection's documented check concludes the
directory is fully paired when seven relations are invisible to it. Until this
task lands, the projection names the exception explicitly, so the check is at
least honest about its own coverage.

### 2026-09-21 — Seven relations verified, eight declared

Each of the seven records was read against its projection row before any header
field was written. All seven confirmed, none narrowed:

| Record | What the row attributes to ADR-0064 | Found in the record |
|---|---|---|
| 0020 | profile scope for `ad-deepen` | "universal across `team` and `mature` profiles ... absent from `poc`" |
| 0021 | the four-profile framing of `ad-diagnose` | "universal across all four profiles"; the row says framing, not scope, and that is the precise word — the skill's reach never changed |
| 0036 | profile scope for `ad-audit` | "`team` and `mature` only" |
| 0053 | profile scope for `ad-roadmap` | "profile-scoped to `solo`, `team`, `mature`; excluded from `poc`" |
| 0054 | profile scope for `ad-question-me` | same shape |
| 0060 | profile scope for `ad-research` | same shape |
| 0061 | profile scope for `ad-derisk` | same shape |

The corrector's side holds too, and more strongly than the rows imply: ADR-0064
does not narrow a scope, it removes the concept. Its Decision states that
installation state "no longer records a project-maturity profile, and the
`agentic profile` command is removed", which retires every profile-scoped
registration decision at once.

An eighth relation was declared that this task did not plan for, and it is a
deviation from the four criteria as written, not an incidental discovery. Task
0079 recorded ADR-0007 decision item 7 as a self-amendment naming ADR-0064 as
its reason; running the coverage check exposed that the two records stand in the
same cross-record relation as the other seven, described differently. It is held
to the same verify-before-write bar:

| Side | Quoted text |
|---|---|
| ADR-0007 decision item 7 | "**Auto-install with the universal set.** `agentic-review` joins `agentic-bootstrap` and `agentic-philosophy` as part of the always-installed universal skills." |
| ADR-0064 Decision | "We will install every bundled skill for each selected host." |

Item 7's claim is membership in a set that some skills join and others do not.
ADR-0064's Decision removes the set: installation is the whole bundle, so there
is nothing to join and nothing to be excluded from. The outcome item 7 wanted —
the skill present on every install — is unchanged, which is why the retirement
is the membership framing and the header says so. It is now a header pair like
the rest, the dated addendum stays for the reasoning, and the projection row
names ADR-0064 as the corrector for that part. A fifth acceptance criterion was
added above so the checkbox surface shows the task shipped it; keeping it in a
task of its own would have meant a separate branch and pull request for one
header line on each side of a relation this task's own check surfaced.

Verified after the edits, by walking every header field and every table row in
code rather than by reading: twenty relations, every A to B with its B to A, no
unpaired side, and no corrector named in the table that is not header-declared.
The projection's exception paragraph is gone because no exception remains
besides genuine self-amendments, which have no second record to pair with.

### 2026-09-21 — Fresh-context review, both axes

Two reviewers with no session history read the staged diff, one per axis.
Four findings, all accepted, none rejected.

Standards, on ADR-0021: the header text had the same shape as the six genuine
retirements, which invites the reading that an installation outcome changed. It
did not — ADR-0021 decision item 3 already registered `ad-diagnose` as universal
across all four profiles, so it is the one record ADR-0064 touches without
changing what installs. The row, the `Amends:` line, and the `Amended by:` line
now say that in the open. The relation is kept rather than dropped because
ADR-0021's text still contains the phrase "all four profiles", and a reader who
meets a term for a construct that no longer exists is better served by a pointer
than by silence. The header field now tells that reader which it is.

Standards also confirmed, against the records rather than against this task's
prose, that the other six are genuine (`poc` or `poc`-plus-`solo` exclusions
that ADR-0064 reversed), that the twenty relations pair structurally, that the
counts on the projection hold, and that writing a header field into an accepted
record is the append-only act itself under ADR-0049 decision item 2 — the
narrow latitude ADR-0038's "accepted ADRs are not swept" leaves open, and it
requires explicit confirmation, which this task carries.

Spec, two concerns: the eighth relation was a deviation from the four criteria
as written and was narrated as an incidental discovery; a fifth criterion now
names it so the checkbox surface shows what shipped. And the eighth relation
had only narrative reasoning where the seven had quoted evidence; it now carries
both sides quoted.

Process note for the next review handoff: the diff artifact handed to the
Standards reviewer was stale, because the Spec findings were applied to the task
file after it was written. The reviewer caught it, read the live files, and said
so. Regenerate the artifact between rounds, or point reviewers at the working
tree.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
