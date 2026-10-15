# ADR-0097: Describe the delivery process as configuration

**Status:** accepted
**Date:** 2026-10-15
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0079 — the source configuration gains `schemaVersion` 2 with an optional `process` block, and the fact packet reports it; every other decision binds unchanged.
**Related:** ADR-0070 and ADR-0060 (record locations, amended as each slice lands); ADR-0085 (skills gate their own outward effects)

## Context

The kit's skills assume the kit owns the delivery lifecycle: work items are
task files, decisions are `doc/adr/NNNN-<slug>.md`, evidence is
`doc/research/NNNN-ground-<slug>.md`, and the next step follows the PRD, spec and
task chain. Teams that run another methodology keep their plan in issues staged
by labels, name ADRs by date, and keep evidence as issue comments. In such a
repository the kit writes records where nobody reads them and recommends a step
the team's process does not have. Encoding one methodology in the kit would tie
every user to it; ignoring methodologies makes the kit fight the process it
should serve.

## Decision

1. The process is configuration. `.agentic/project-sources.json`, in the project
   or machine layer of ADR-0079, accepts `schemaVersion` 2 with an optional
   `process` block; version 1 stays valid. Absent the block, every skill behaves
   as before.
2. The block is closed and declarative: `lifecycleOwner` (`kit` or `external`), an
   `ownerLabel` naming the process for the reader, `records` per kind (`research`,
   `adr`, `task`, `spec`, `prd`) with a `destination` (`repo-path`,
   `issue-comment` or `external`), an optional `path`, `naming` (`sequence` or
   `date`) and a `handoff` text, `stages` mapping an issue label to a stage name
   and a `next` text, and `readMilestone`. It holds no command, credential or URL
   template; `handoff` and `next` are text the kit shows, never interprets or
   runs.
3. `ad-project-state` reports the resolved process and annotates each issue with
   the first stage whose label it carries, in configuration order; with
   `--process` it prints the process alone without contacting any provider.
4. Consumers adapt as they land: record writers honor the destination, an
   issue-comment record is drafted, validated and posted only after the owner's
   approval (ADR-0085), and with an external lifecycle owner the kit's
   work-item skills hand off instead of writing.
5. The kit ships one generic example, an issue-staged lifecycle with neutral
   labels. No organization's process appears in shipped text; a real process
   lives in the machine layer or in the team's own repository.

## Consequences

Positive:

- A team keeps its methodology, and the kit writes and recommends within it.
- The default path, with no configuration, is unchanged.

Negative:

- Stages come only from GitHub labels; another tracker needs a new source type.
- A misconfigured block is reported and ignored with the rest of the
  configuration, falling back to the repository baseline, as ADR-0079 already
  does for invalid configuration.

## Alternatives Considered

- **Built-in methodology profiles.** Rejected: it names organizations in shipped
  text and ties the kit to their evolution.
- **Free-form hooks or commands in configuration.** Rejected: ADR-0079 keeps
  executable content out of configuration.
