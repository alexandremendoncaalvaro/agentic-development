# Task `0118`: Compose with a project's own delivery process

**Status:** in-progress
**Created:** 2026-10-15
**Scope ref:** doc/adr/0097-describe-the-delivery-process-as-configuration.md
**Evidence ref:** doc/research/0020-ground-project-evidence-sources.md; kit audit of 2026-10-15
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The kit writes records to fixed repository paths and assumes it owns the delivery lifecycle. A team that keeps proposals, designs and plans in issues, names ADRs by date, or runs another methodology has to work around it. The owner's principle (2026-10-15): the kit stays methodology-neutral and works well with any delivery process through a generic adapter, with nothing tied to one methodology.

## Acceptance Criteria

- [x] With no `process` block in the project-sources config, every skill behaves exactly as before (test).
- [x] The config accepts an optional `process` block (schema version 2; version 1 still accepted): lifecycle owner, per-record destination (`repo-path`, `issue-comment`, `external`), directory and naming (`sequence`, `date`), opaque handoff text, and label-to-stage-to-next mappings.
- [x] `ad-project-state` reads milestones and annotates each issue with its configured stage and next action; an offline `--process` flag prints the resolved block.
- [x] Record writers use the configured location: the ground validator accepts a draft outside the repository; the artifact gate, cited-records and `ad-adr` (date naming) follow the config.
- [ ] An `issue-comment` destination drafts, validates, asks the owner, then posts, observed in a recorded run (the skill text describes it; only the validation step is tested).
- [ ] `ad-task`, `ad-spec` and `ad-prd` refuse when their destination is external and print the handoff; `ad-next` routes by stage when the lifecycle owner is external; `ad-derisk` writes to the configured work item; `ad-philosophy` states the generic rule.
- [ ] A generic issue-staged example ships; no methodology is named in kit logic; a new ADR records the principle.

## Plan

- [x] Slice 1: resolver schema v2, `--process`, milestone and stage annotation, docs and example (tests first).
- [x] Slice 2: record writers and validator draft mode (tests first).
- [ ] Slice 3: planning skills, navigation and the philosophy rule.
- [ ] Review per slice, audit only where `auditPaths` match, pull requests.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-15 — planned

Planned from the kit audit of 2026-10-15 after a read-only verification of
its claims against the code. The owner approved doing every remaining
package on 2026-10-15.

### 2026-10-15 — slice 1, the process block

Five resolver tests went red, then green: version 1 reports no process; a
version 2 process is reported and each issue carries its first configured
stage and its milestone; a process under version 1, with an unknown field, an
unknown destination or an unknown owner is invalid; `--process` prints the
process without running the GitHub CLI; a matching machine entry may carry a
process. The existing "unsupported schema" case moved from version 2 to 3,
the contract change ADR-0097 decides. The configuration reference documents
the block with the generic issue-staged example. ADR-0097 records the
principle; it amends ADR-0079 now and names ADR-0070 and ADR-0060 for the
record-location slices.

### 2026-10-15 — review of slice 1

Spec ships as-is. Standards, no blocker. Fixed: this work had first opened a
second task numbered 0118; it now lives in this task and the duplicate is
removed. Shown text (`ownerLabel`, `handoff`, `next`) rejects control and
line-separator characters, pinned by tests. A parameter no longer shadows
the `process` global. Deferred to slice 2, where a record writer first reads
it: whether `repo-path` requires `path` and other destinations forbid it.
Notes accepted: `--process` prints a smaller packet with the same schema
version; an empty `stages` list is valid.

### 2026-10-15 — slice 2, record locations

Three tests went red, then green: the ground validator accepts a record in a
`--dir` directory, rejects it elsewhere and rejects a `--dir` outside the
repository; with `--draft` it checks a record's content outside the
repository; `cited-records` resolves a citation in a `--dir` directory and
refuses an unsafe one. `ad-ground`, `ad-research`, `ad-adr` and `ad-commit`
read `--process` before writing or citing a record; an issue-comment record
is drafted in the OS temporary directory, validated, shown and posted only
after the owner approves. Decided here, from the slice 1 review: `path` is
read only for `repo-path`. The artifact gate still validates on write only
under `doc/research/`, a limit ADR-0097 now states. ADR-0097 amends ADR-0070
and ADR-0060 for the record locations.

### 2026-10-15 — review of 8a2d7bd

Spec found a blocker: the criterion was ticked although the artifact gate
still governed only `doc/research/`. Fixed rather than descoped: the gate
reads the configured research directory from the project layer, or the
machine entry matching the `origin` remote, and validates `GROUND-` records
there with `--dir`; a malformed or unsafe setting keeps the default; two
tests went red, then green. Also fixed: `--dir` in `cited-records` splits on
the first `=`, refuses a path with `=` and an inherited name such as
`toString`; the `ad-ground` text says the configured path replaces
`doc/research` in the numbering, record and validate commands; the Codex
`ad-adr` reads the process before numbering. Recorded as limits in ADR-0097:
a `PRISM-` plan is gated only under `doc/research/`, and a date-named ADR is
cited by path. Note accepted: `--draft` reads any path the caller names; it
only reports validation errors, never the content.

### 2026-10-15 — review and audit of ba00b66

Reviewed SHAs for the record: slice 1 at 62aded9 (both axes) and its delta at
1ef9791 (no findings); slice 2 at 8a2d7bd (findings in the entry above, with
their severities: Spec blocker, the unimplemented gate clause; Spec concerns,
the Codex `ad-adr` order, the `ad-ground` hard-coded steps and date-named ADR
citations; Standards concerns, the hard-coded steps and `--dir adr=a=b`;
notes, `--dir .`, `task` and `spec` kinds, `ad-research` coverage).

Delta review of ba00b66: no blocker. Concerns, fixed here: the gate read the
configuration on its own, more loosely than the resolver, so an invalid
process still moved the gate and a `./docs/evidence` path matched nothing; the
gate now asks the `ad-project-state` resolver, and the validator and
`cited-records` strip a leading `./`. A spec concern on the PRISM limit is
answered by the next fix.

Audit of ba00b66 (CV on two models, HK): HK no finding. CV blocker, fixed: the
criterion was ticked although only the validation step of the issue-comment
flow is tested; it is now split, and the unobserved flow stays open. CV major,
fixed: with a configured directory a PRISM plan in `doc/research/` went
ungated, contradicting ADR-0097; `doc/research/` now stays governed for every
kind, pinned by a test. CV major, fixed: the `./` path above. CV minor, fixed:
this entry names the reviewed SHAs and severities. CV judgement-call, retired
by mutation in a disposable worktree: with 8a2d7bd's gate the two gate tests
fail, and with cf632f7's validator and cited-records the three slice-2 tests
fail; restored afterwards, worktree clean.
