# Task `0118`: Compose with a project's own delivery process

**Status:** proposed
**Created:** 2026-10-15
**Scope ref:** doc/adr/0093-compose-with-a-projects-own-delivery-process.md (to be written)
**Evidence ref:** doc/research/0045 (to be written)
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The kit writes records to fixed repository paths and assumes it owns the delivery lifecycle. A team that keeps proposals, designs and plans in issues, names ADRs by date, or runs another methodology has to work around it. The owner's principle (2026-10-15): the kit stays methodology-neutral and works well with any delivery process through a generic adapter, with nothing tied to one methodology.

## Acceptance Criteria

- [ ] With no `process` block in the project-sources config, every skill behaves exactly as before (test).
- [ ] The config accepts an optional `process` block (schema version 2; version 1 still accepted): lifecycle owner, per-record destination (`repo-path`, `issue-comment`, `external`), directory and naming (`sequence`, `date`), opaque handoff text, and label-to-stage-to-next mappings.
- [ ] `ad-project-state` reads milestones and annotates each issue with its configured stage and next action; an offline `--process` flag prints the resolved block.
- [ ] Record writers use the configured location: the ground validator accepts a draft outside the repository; the artifact gate, cited-records and `ad-adr` (date naming) follow the config; an `issue-comment` destination drafts, validates, asks the owner, then posts.
- [ ] `ad-task`, `ad-spec` and `ad-prd` refuse when their destination is external and print the handoff; `ad-next` routes by stage when the lifecycle owner is external; `ad-derisk` writes to the configured work item; `ad-philosophy` states the generic rule.
- [ ] A generic issue-staged example ships; no methodology is named in kit logic; ADR-0093 records the principle.

## Plan

- [ ] Slice 1: resolver schema v2, `--process`, milestone and stage annotation, docs and example (tests first).
- [ ] Slice 2: record writers and validator draft mode (tests first).
- [ ] Slice 3: planning skills, navigation and the philosophy rule.
- [ ] Review per slice, audit only where `auditPaths` match, pull requests.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-15 — planned

Planned from the kit audit of 2026-10-15 after a read-only verification of
its claims against the code. The owner approved doing every remaining
package on 2026-10-15.
