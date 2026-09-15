# Spec `0006`: Resolve configurable project evidence sources

**Status:** shipped
**Created:** 2026-09-15
**Owner:** Alexandre Alvaro

## Context

Engineers do not all track current work in the repository's Agentic Development
artifact stack. Some projects keep planning and delivery state in GitHub issues
and pull requests while the repository contains only code and operational
guidance. Today `ad-next` treats that valid shape as missing local planning
artifacts, so its recommendation can describe the repository accurately while
missing the work that actually matters.

State-reading skills need one shared way to discover authorized project evidence
without baking one organization, repository, credential, or command wrapper into
the public kit. The repository-only behavior must remain the zero-configuration
default, and external failures must reduce confidence visibly instead of erasing
the usable local result.

## User Scenarios

- **Scenario 1: Use the repository-only default**
  - Given a project has no source configuration
  - When a state-reading skill gathers project facts
  - Then it uses repository evidence exactly as before and reports that no
    external source was configured.

- **Scenario 2: Read active GitHub work**
  - Given a matching project source configuration names GitHub issues and pull
    requests as primary evidence
  - When `ad-next` surveys the project
  - Then it reconciles the configured open-work summaries with repository facts
    before recommending the next action.

- **Scenario 3: Reuse one source contract**
  - Given `ad-next`, `ad-roadmap`, or `ad-brief` needs current project state
  - When it gathers facts
  - Then it composes the same project-evidence capability rather than
    independently parsing configuration or querying providers.

- **Scenario 4: Continue through a partial failure**
  - Given a configured GitHub source is unavailable, unauthenticated, or returns
    invalid data
  - When project facts are gathered
  - Then repository evidence remains usable and the failed source, failure code,
    and resulting confidence limit are explicit.

## Requirements

### Functional

- R1: The kit provides one dual-host, model-invocable, read-only capability that
  resolves project evidence sources and returns a bounded fact packet for other
  skills.
- R2: With no configuration, the resolved source set contains the current
  repository only and preserves existing state-reader behavior.
- R3: A machine-local configuration may match a project by its exact Git remote;
  an optional project configuration may override that match. Both configurations
  use a closed, versioned JSON schema and contain no credentials.
- R4: The initial provider allowlist contains `repository` and `github` only.
  Configuration cannot name shell commands or executable code.
- R5: A GitHub source may select a host, repository, evidence role, issue query,
  pull-request query, state, and bounded result limit. The resolver passes query
  values as process arguments without shell parsing.
- R6: GitHub authentication comes from the existing GitHub CLI session. The
  existing `AGENTIC_GH` environment seam may select an executable wrapper; no
  token, account switch, login, or credential is stored by this feature.
- R7: The returned packet identifies the selected configuration layer, every
  resolved source, its evidence role, observation time, provenance, summarized
  items, and any source-specific failure.
- R8: GitHub list results contain the fields needed to identify and prioritize
  work but omit issue and pull-request bodies. A caller may read one selected item
  through the provider's normal read interface when the decision requires depth.
- R9: Project configuration outranks a matching machine configuration. A primary
  source outranks supporting evidence on conflict, and the caller discloses the
  conflict rather than silently combining incompatible claims.
- R10: `ad-next` always composes the capability before scenario classification;
  `ad-roadmap` and standalone `ad-brief` compose it when project state is their
  input. Caller-owned reconciliation, prioritization, presentation, and
  publication gates remain in their existing skills.

### Non-functional

- The implementation remains dependency-free ESM and works on the supported
  Node.js and operating-system matrix.
- All provider commands are fixed allowlisted invocations executed without a
  shell; configuration values are validated before use.
- External-source failure never suppresses readable repository evidence.
- Canonical sources, installed dogfood copies, and bundled scripts remain
  equivalent across Claude Code and Codex.
- Public fixtures, examples, documentation, and package contents contain no
  organization-specific names, paths, query conventions, or private results.

## Success Criteria

- A fixture with no configuration produces a repository-only packet and executes
  no GitHub command.
- A matching machine configuration and a project override resolve with the
  documented precedence, with an unmatched machine entry ignored.
- Fixtures reject unknown providers, fields, schema versions, duplicate source
  identifiers, unbounded limits, embedded commands, and malformed repositories.
- A fake GitHub executable proves that issue and pull-request searches receive
  validated arguments, return bounded summaries with provenance, and never pass
  through a shell.
- Independent fake-provider failures prove that one unavailable source leaves
  the other source and repository baseline intact while recording the failure.
- Static contract tests prove that `ad-next`, `ad-roadmap`, and standalone
  `ad-brief` compose the shared capability and do not duplicate provider logic.
- Running the feature against one repository whose active work is GitHub-primary
  changes `ad-next` from local-artifact-only advice to a recommendation grounded
  in both the configured remote work and the repository, without disclosing the
  private configuration in committed artifacts.
- The complete test suite, dual-host parity checks, dogfood refresh, drift audit,
  and package dry-run pass with the new capability included.

## Edge Cases

- The current directory is not a Git repository or has no matching remote.
- The machine or project configuration exists but is unreadable, invalid JSON,
  or repeats the same machine remote.
- The inherited `GH_HOST` disagrees with the configured source host.
- GitHub CLI is absent, unauthenticated, rate-limited, or returns invalid JSON.
- One query returns no work while another succeeds.
- More than one configured source claims primary authority for the same evidence
  kind.
- A query contains spaces, quotes, or a leading hyphen.

## Out of Scope

GitHub Projects, arbitrary URLs, issue or pull-request body ingestion, provider
plugins, synchronization, caching, telemetry, account management, automatic
configuration writes, and changes to outward publication approval are not part of
this feature.

## Open Questions

None.

## Related

- ADRs: `doc/adr/0079-compose-configurable-project-evidence.md`
- Tasks: `doc/tasks/0076-configurable-project-evidence-sources.md`
- Depends on: `doc/specs/0005-compose-publication-reporting.md` only for the
  existing privacy boundary; this feature does not publish.
