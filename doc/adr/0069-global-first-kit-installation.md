# ADR-0069: Make kit installation global-first

**Status:** proposed
**Date:** 2026-08-14
**Deciders:** Alexandre Alvaro

## Context

The installer currently materializes the full Agentic Development kit in every
target project, including `WORKFLOW.md` and `WORKFLOW-FLOWS.md` at its root.
That makes skills' section references resolvable, but duplicates a personal
runtime into every repository and worktree. A non-interactive install leaves
those files visible to Git unless the repository already ignores them. The
result is inconsistent ownership, version drift, and a risk of committing
machine-local material as project content.

The kit already distinguishes a user-level installation from a project
installation. The former is the natural home for one practitioner's common
skills and Constitution; the latter remains necessary only when a team elects
to share and pin a kit version for one project.

## Decision

We will make the user-level installation the default personal runtime. It will
store host-native skills in their global locations and the kit Constitution
under `~/.agentic/kit/`. Installed skills will resolve that Constitution without
requiring repositories to record machine-specific paths.

Project materialization will require an explicit project scope. It is reserved
for teams that intentionally version and share the kit. A project Constitution
is opt-in shared content, never a machine-local file hidden from Git. Ordinary
repositories receive no generated skill, subagent, state, or Constitution file.

## Consequences

Positive:

- A personal kit update happens once, rather than once per repository and
  worktree.
- Ordinary repositories stay free of generated Agentic Development files and
  accidental kit commits.
- A shared project installation has a clear owner: the team commits and
  maintains it deliberately.

Negative:

- Existing project materializations require a staged migration and cannot be
  deleted blindly because some files have diverged from the kit.
- The CLI needs an explicit scope contract and existing unattended invocations
  must migrate to it.
- Skills need a deterministic resolver for the global Constitution before
  project copies stop being the default.

## Alternatives Considered

- Keep copying the kit into every project and improve `.git/info/exclude` —
  rejected because hidden machine-local copies still duplicate updates and do
  not give project files clear ownership.
- Delete all existing copies and reinstall the current project flow — rejected
  because it recreates root Constitution files and risks discarding diverged
  project material.
- Put absolute paths to the user's global Constitution in each repository —
  rejected because a repository must remain portable to other machines and
  contributors.
