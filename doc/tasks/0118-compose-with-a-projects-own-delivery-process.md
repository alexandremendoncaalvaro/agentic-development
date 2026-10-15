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
- [ ] Record writers use the configured location: the ground validator accepts a draft outside the repository; the artifact gate, cited-records and `ad-adr` (date naming) follow the config; an `issue-comment` destination drafts, validates, asks the owner, then posts.
- [x] `ad-task`, `ad-spec` and `ad-prd` refuse when their destination is external and print the handoff; `ad-next` routes by stage when the lifecycle owner is external; `ad-derisk` writes to the configured work item; `ad-philosophy` states the generic rule.
- [x] A generic issue-staged example ships; no methodology is named in kit logic; a new ADR records the principle.

## Plan

- [x] Slice 1: resolver schema v2, `--process`, milestone and stage annotation, docs and example (tests first).
- [ ] Slice 2: record writers and validator draft mode (tests first).
- [x] Slice 3: planning skills, navigation and the philosophy rule.
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

### 2026-10-15 — slice 3, handoffs and navigation

Two static-contract tests went red, then green. With `lifecycleOwner:
external`, `ad-task`, `ad-spec` and `ad-prd` (both hosts) read the process
first and, unless the record kind is a `repo-path` record, show the
configured handoff and write nothing; `ad-next` recommends from each issue's
stage and its next text; `ad-derisk` drafts its register as a comment on the
team's work item, posted only after the owner approves; `ad-philosophy`
states the rule to work inside the team's delivery process. The generic
example and the ADR shipped with slice 1. Still open: the issue-comment
flow observed end to end in a recorded run.

### 2026-10-15 — review of afd404a

Two-axis review, no blocker. Concerns, fixed and pinned by static-contract
assertions: `ad-task`, `ad-spec` and `ad-prd` now branch on the record kind
under an external owner (`external` or none shows the handoff; `issue-comment`
drafts, shows and posts with `gh issue comment` on the work item the owner
names only after approval; `repo-path` writes under its path); `ad-derisk`
reads the process before Step 1, follows `process.records.task` with the same
branches and states its posting step, and its output contract covers both
destinations. Concern accepted: these are text contracts; the recorded
end-to-end run stays open.
