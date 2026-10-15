# Task `0118`: Describe the delivery process as configuration

**Status:** in-progress
**Created:** 2026-10-15
**Scope ref:** doc/adr/0097-describe-the-delivery-process-as-configuration.md
**Evidence ref:** doc/research/0020-ground-project-evidence-sources.md; kit audit of 2026-10-15
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The kit assumes it owns the delivery lifecycle: tasks, specs and the PRD live
under `doc/`, ground records under `doc/research/`, ADRs as `NNNN-<slug>.md`.
A team that runs another methodology (SLIM, for one) keeps its plan in issues
staged by labels, its ADRs under its own naming, and its evidence as issue
comments, so the kit writes records in the wrong place and recommends the wrong
next step. The kit must work well with such a process without depending on it:
the process is described as configuration, and the kit ships only a generic
example.

## Acceptance Criteria

- [x] `.agentic/project-sources.json` (project and machine layers) accepts
  `schemaVersion` 2 with an optional `process` block: the lifecycle owner (`kit`
  or `external`), an owner label, per-record destinations, issue stages read from
  labels, and milestone reading; version 1 and an absent block behave exactly as
  before (tests).
- [x] `ad-project-state` reports the resolved process, annotates each issue with
  its first matching stage and the configured next step, reads milestones when
  asked, and prints the process alone offline with `--process` (tests).
- [ ] Records go where the process says: configured directories in the ground
  validator, the artifact gate and the commit's cited-record check; date naming
  for ADRs; an issue-comment destination drafts, validates and posts only after
  the owner approves (tests).
- [ ] With an external lifecycle owner, `ad-task`, `ad-spec` and `ad-prd` refuse to
  write and name the configured handoff; `ad-next` routes by stage; `ad-derisk`
  appends to the configured work item.
- [ ] The kit ships one generic example; no organization's process is named in
  shipped text.
- [ ] ADR-0097 amends ADR-0079 (schema), ADR-0070 (record locations) and ADR-0060
  (research directory).

## Plan

- [x] PR 1: schema version 2, the `process` block, stages, milestone and
  `--process` in the resolver; docs and the generic example; ADR-0097.
- [ ] PR 2: record destinations in the validator, the artifact gate and the
  cited-record check; ADR date naming; issue-comment drafting.
- [ ] PR 3: external-owner refusal in `ad-task`, `ad-spec` and `ad-prd`;
  stage routing in `ad-next`; `ad-derisk` target; the owner's real process stays
  in the machine layer.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-15 — planned

Planned from the kit audit of 2026-10-15; the owner approved doing every
remaining package and set the principle on 2026-10-15: the kit stays generic and
methodology-agnostic, works well with SLIM as one configuration, and never ties
itself to it. The real SLIM block stays in the owner's machine layer.

### 2026-10-15 — PR 1, the process block

Five resolver tests went red, then green: version 1 reports no process; a
version 2 process is reported and each issue carries its first configured
stage and its milestone; a process under version 1, with an unknown field, an
unknown destination or an unknown owner is invalid; `--process` prints the
process without running the GitHub CLI; a matching machine entry may carry a
process. The existing "unsupported schema" case moved from version 2 to 3,
the contract change ADR-0097 decides. The configuration reference documents
the block with the generic issue-staged example.
