# Task 0005: Idempotency, root doc handling, README rewrite, publish v0.2.0-beta.1

**Status:** proposed
**Created:** 2026-05-08
**Owner:** Alexandre Alvaro
**Board ref:**

## Context

Chunk 4 of v0.2 (per [doc/v0.2-cli-plan.md](../v0.2-cli-plan.md)) — final polish before the first v0.2 beta release. Re-run safety, intelligent handling of pre-existing `CLAUDE.md`/`AGENTS.md` (so the user doesn't lose customizations), README reflecting the new install model, version bump, npm publish, git tag, push.

## Acceptance Criteria

- [ ] Re-running `agentic init` on an installed project does not duplicate skill files; surfaces a diff and asks per item if updates are available
- [ ] Pre-existing `CLAUDE.md` or `AGENTS.md`: append a managed section listing the installed agentic skills, never overwrite user content. Always confirm with user before writing.
- [ ] `README.md` on `cli` branch fully reflects v0.2 model — no stale references to v0.1's "print prompt" flow
- [ ] `package.json` version is `0.2.0-beta.1`
- [ ] `npm publish --tag beta` succeeds; `npx @alexandrealvaro/agentic@beta init` runs the new flow end-to-end against a fresh project
- [ ] Tag `v0.2.0-beta.1` exists locally and is pushed to origin
- [ ] `cli` branch pushed to `origin/cli`; merge to `main` deferred until I (Alexandre) decide it has matured enough in real use

## Plan

- [ ] Implement idempotency check in install logic (compare existing skills against incoming, list diffs)
- [ ] Implement root doc append/create logic with explicit user confirmation
- [ ] Rewrite `README.md` for the v0.2 install model (lead with `npx … init`, manual workflow becomes the optional fallback for users who prefer it)
- [ ] Bump `package.json` to `0.2.0-beta.1`; update lockfile
- [ ] Run full test suite; ensure green
- [ ] Manual e2e on three project types: fresh greenfield, brownfield without AGENTS.md, project with existing AGENTS.md
- [ ] Verify token + 2FA setup still works (reuse `.env` pattern from v0.1.0-beta.1)
- [ ] `npm publish --tag beta`
- [ ] `git tag v0.2.0-beta.1 && git push origin cli v0.2.0-beta.1`

## Notes

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
