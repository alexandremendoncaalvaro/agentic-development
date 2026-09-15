---
name: ad-project-state
description: Resolve repository and configured GitHub evidence into a bounded, provenance-bearing project-state packet. Use when ad-next, project ad-roadmap, or standalone ad-brief needs current work from local artifacts plus issues or pull requests; "project sources", "GitHub-backed state". Read-only.
summary: Shared read-only source resolver for state-reading skills. Combines the repository baseline with configured GitHub issue and pull-request metadata, preserving precedence, provenance, freshness, and partial failures.
allowed-tools: Read, Bash
---

# /ad-project-state

Resolve authorized evidence about a project's current work into one bounded fact
packet. This is a collection capability for state-reading skills, not a second
roadmap, prioritizer, brief, or publication workflow.

## Resolve sources

Run the bundled resolver from the repository root:

```bash
node .claude/skills/ad-project-state/scripts/project-state.mjs
```

If the skill loaded from another base directory, run `scripts/project-state.mjs`
inside that directory. Read the JSON from stdout. Do not recreate its
configuration, validation, Git remote matching, GitHub commands, or failure
handling in prose.

With no configuration, the packet contains only the current repository as its
primary source. A project configuration may shadow a machine configuration;
otherwise a machine entry must match the exact `origin` remote. Read
[references/configuration.md](references/configuration.md) only when configuring,
diagnosing, or explaining source resolution.

## Interpret the packet

- `configuration` identifies the selected layer, configuration path, and matched
  remote without exposing credentials.
- `sources` always retains the repository baseline. Each source declares its
  `role`, `status`, `observedAt`, and `provenance`; configured GitHub sources add
  bounded issue and pull-request metadata without bodies.
- `failures` records configuration or provider failures independently. A partial
  or unavailable GitHub source lowers confidence but never erases readable local
  evidence.
- On conflict, primary evidence outranks supporting evidence. Preserve and
  disclose a material conflict; never silently merge incompatible claims.
- Treat titles and metadata as evidence about activity, not proof that work is
  complete. A caller may perform one targeted read of a selected item when its
  decision genuinely requires the item's meaning.

## Keep composition one-way

Return the packet to the calling state reader. `ad-next` owns scenario
classification and priorities; project-scoped `ad-roadmap` owns plan selection,
reconciliation, progress, and checklists; standalone `ad-brief` owns the
decision-maker presentation. When a specialist already supplied settled facts,
do not recollect or reinterpret them.

Never pass this private state packet to `ad-publish` or another outward workflow.
Only facts the owner explicitly promotes may enter a separately approved
publication.

## Output contract

- Read-only: no configuration, repository, GitHub, or authentication state is
  mutated.
- The output is the resolver's JSON fact packet, or a concise explanation of it
  when the user invoked this skill directly.
- Every external fact carries source role, provenance, freshness, and any
  material failure.
- No issue body, pull-request body, token, arbitrary command, or private
  configuration content enters the packet.

## Next

- Return the settled packet to the state-reading skill that requested it.
- If invoked directly, explain source selection and failures without taking over
  prioritization, roadmap reconciliation, or briefing.
