# ADR-0079: Compose configurable project evidence

**Status:** accepted
**Date:** 2026-09-15
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0053 — configured primary project evidence may supplement or replace missing repository-local planning artifacts while roadmap reconciliation remains in `ad-roadmap`.

## Context

The kit's state-reading skills assume that project direction and active work are
represented by the repository's Product Requirements Document, specs, tasks, and
decisions. That is the ideal own-dogfood shape, but it is not universal. A mature
project may keep its active plan in GitHub issues and pull requests while the
repository contains code and an operational guide. In that shape, a local-only
survey can report the filesystem correctly and still recommend the wrong next
action.

Adding GitHub logic independently to `ad-next`, `ad-roadmap`, and `ad-brief` would
duplicate configuration, authentication, failure, provenance, and privacy rules.
Putting organization-specific repositories or queries in the public skill would
make the kit unsafe to publish and useless as a general solution. The source
contract must work with no configuration, follow one project across worktrees,
permit a team-owned override, and preserve useful local evidence when an external
provider fails.

Grounding is recorded in
`doc/research/0020-ground-project-evidence-sources.md`.

## Decision

We will add `ad-project-state` as a dual-host, model-invocable, read-only
workflow-operational skill. It owns source resolution and a bounded project-state
fact packet; it does not own next-action prioritization, roadmap reconciliation,
decision-maker presentation, or publication.

The capability will resolve two configuration layers:

1. A machine store at `$AGENTIC_PROJECT_SOURCES_FILE`, otherwise
   `~/.agentic/project-sources.json`. It contains project entries selected by an
   exact Git remote, so one private mapping applies across the repository's
   worktrees without entering version control.
2. An optional project contract at `.agentic/project-sources.json`. When present,
   it shadows the matching machine entry and may be committed as a team standard
   or kept machine-local by the repository owner.

Both forms use a closed, versioned JSON schema. Configuration may declare only
`repository` and `github` sources, unique source identifiers, evidence roles,
bounded issue and pull-request list queries, and GitHub repository coordinates.
It may not contain executable commands, tokens, source bodies, or authentication
material. The local repository remains an available baseline even when external
sources are configured.

The bundled resolver will be dependency-free ESM. It will validate configuration
before use, call only fixed GitHub CLI list operations through `execFile` without
a shell, strip Git worktree environment variables, and pass search expressions as
single arguments. A configured host controls the child process's `GH_HOST` so an
unrelated inherited alias cannot redirect the query. The existing `AGENTIC_GH`
environment seam may select an executable wrapper; authentication and account
selection remain owned by the user's existing GitHub CLI setup.

The fact packet will identify the selected configuration layer and remote match,
each resolved source and role, observation time, provider provenance, bounded
issue and pull-request metadata, and independent failures. It will not ingest
issue or pull-request bodies. When deeper meaning is necessary, the caller may
read one selected item through the provider's normal read interface.

Composition remains one-way:

- `ad-next` always obtains the project-state packet before it classifies the
  scenario and prioritizes actions.
- Project-scoped `ad-roadmap` obtains the packet before choosing its plan evidence;
  configured primary evidence can replace a missing local roadmap, while the
  skill still owns mapping, classifications, progress, and checklists.
- Standalone `ad-brief` obtains the packet while gathering live project evidence.
  A specialist-supplied fact packet remains authoritative and is not re-collected.
- `ad-project-state` never calls those consumers or any publication capability.

All public examples and tests use synthetic repositories. A private machine
mapping and its observed output remain outside the kit repository, package,
review handoffs, and outward text.

## Consequences

Positive:

- `ad-next` can describe what is actually active in GitHub-primary projects
  without weakening repository-first projects.
- One resolver owns configuration, provider execution, provenance, and partial
  failure for every current and future state reader.
- Machine mappings follow remotes across worktrees, while project contracts allow
  a team to share a more specific standard.
- Fixed shell-free commands and existing authentication avoid a command-injection
  surface and any credential store inside the kit.

Negative:

- The kit gains another model-invocable skill and spends listing-budget space.
- Machine mappings are exact-remote matches; a clone using a different remote
  spelling needs another entry or a project contract.
- List metadata may not explain a work item completely, so a caller sometimes
  needs one additional targeted read.
- GitHub availability and query quality become visible confidence inputs rather
  than hidden assumptions.

Neutral:

- The CLI remains offline. Network access occurs only when an installed skill is
  invoked for a project whose configuration explicitly enables GitHub.
- GitHub Projects, arbitrary provider plugins, caching, synchronization, and
  automatic configuration writes require separate evidence and decisions.

## Alternatives Considered

- **Extend only `ad-next`.** Rejected because roadmap and briefing would either
  remain incomplete or duplicate the same provider rules.
- **Copy one resolver script into every consumer.** Rejected because a real
  multi-consumer, multi-adapter seam now exists; deletion would redistribute
  meaningful complexity across callers.
- **Use project configuration only.** Rejected because private mappings would need
  to be recreated in every worktree and could be committed accidentally.
- **Use machine configuration only.** Rejected because teams could not version a
  portable project standard or override one practitioner's default.
- **Allow arbitrary commands as providers.** Rejected because flexibility would
  become code execution from configuration and make provenance provider-specific.
- **Fetch complete issue and pull-request bodies in the shared packet.** Rejected
  because it increases private context, latency, and token cost before relevance
  is known.
- **Continuously synchronize remote state.** Rejected because the kit has no
  service runtime and an on-demand read answers the user need.
