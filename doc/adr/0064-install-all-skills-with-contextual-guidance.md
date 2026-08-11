# ADR-0064: Install all skills with contextual guidance

**Status:** accepted
**Date:** 2026-08-11
**Deciders:** Alexandre Alvaro

## Context

The kit previously asked users to choose `poc`, `solo`, `team`, or `mature` and used that choice to install only a subset of skills. That retired policy made the initial install harder to explain, added state that could become stale, and hid useful capabilities behind a maturity label rather than the actual work.

The skill bodies already contain the relevant context: a one-off experiment does not need a PRD, a small script does not need architectural deepening, and a high-risk shared change may need stronger quality gates. That context is observable from the repository and request; it does not need to be encoded in the installer.

## Decision

We will install every bundled skill for each selected host. A bare `init` installs both Claude Code and Codex; `--agent` remains an explicit host restriction. `update` reconciles the same complete host-specific set.

Installation state records only the kit version and managed-file hashes. It no longer records a project-maturity profile, and the `agentic profile` command is removed.

Skills will use the request, repository shape, delivery risk, and artifact dependencies to decide whether a recommendation is relevant. `/ad-next` is the single navigation entry point when the user does not know which skill to invoke.

## Consequences

Positive:

- Onboarding has one default answer: install the kit, then start with `/ad-next`.
- Users can discover every capability without reconfiguring the project.
- The installer, state format, documentation, and skill guidance have one simpler model.

Negative / trade-offs:

- Each host receives a larger skill catalog, including skills that will often be irrelevant to a small change.
- Skill bodies must be precise about when not to create an artifact or run a heavyweight gate.
- Legacy state is migrated on the next `init` or `update`; the removed profile value is discarded.

## Alternatives Considered

- **Keep four maturity profiles.** Rejected: the configuration cost and hidden capabilities exceed their value; context is available at invocation time.
- **Keep profiles but make `team` implicit.** Rejected: it preserves a second mental model and stale-state failure mode without helping the user.
- **Install a minimal set and auto-add skills from feature detection.** Rejected: detection is incomplete and surprises users; deterministic complete installation is easier to explain and maintain.
