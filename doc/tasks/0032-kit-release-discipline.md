# task-0032: Release discipline for the kit repo

**Status:** proposed
**Date:** 2026-08-05

## Goal

A `scripts/release.sh` + `CHANGELOG.md` + changelog commit gate for this repo, so releases stop being hand-assembled. Principle (observed in a sibling methodology repo and felt here on 2026-08-05: manual version bump, an over-length commit subject, a tag that needed a retry): **merged is not released in a package repo** — consumers install the published version, not `main`, so an unlogged or unreleased change is invisible to every install.

## Checklist

- [ ] `CHANGELOG.md` with an `[Unreleased]` section; seed it retroactively from v0.19.0-beta.1's content (ADR-0046/0047).
- [ ] `scripts/release.sh <patch|minor|major|prerelease>`: bumps `package.json` (+ lockfile), rotates `[Unreleased]` into the new version heading, commits (`chore(release): x.y.z`, DCO), creates the annotated tag — and deliberately does NOT push or publish. `--dry-run` wraps every destructive op.
- [ ] Changelog gate in `lefthook.yml` pre-commit: a commit touching `src/skills/`, `src/lib/`, `src/commands/`, or `bin/` without an `[Unreleased]` entry warns (advisory-first — see ad-hooks' debut rule); flip-to-block criterion: two weeks without a false positive.
- [ ] Subject-length check (≤72, imperative) in the same gate — the exact slip that happened on 2026-08-05.
- [ ] Document the publish tail in README: `npm publish` (2FA prompt) + dist-tag check — `latest` did not follow `publishConfig.tag: beta` on 0.19.0-beta.1 and needed a manual `dist-tag add`.
- [ ] Tests: bats-style or node:test coverage for the rotate/bump logic; `npm test` green.
- [ ] Self-audit with `/ad-audit` before PR.

## Notes

- 2026-08-05 — Registered from the SLIM/NEST mechanism investigation. The sibling repo's version also bundles a protected-branch gate; this repo's "never push directly to main" is already convention — evaluate whether a mechanical guard earns its cost during implementation.
