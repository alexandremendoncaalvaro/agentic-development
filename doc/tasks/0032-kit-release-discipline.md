# task-0032: Release discipline for the kit repo

**Status:** done
**Date:** 2026-08-05

## Goal

A `scripts/release.sh` + `CHANGELOG.md` + changelog commit gate for this repo, so releases stop being hand-assembled. Principle (observed in a sibling methodology repo and felt here on 2026-08-05: manual version bump, an over-length commit subject, a tag that needed a retry): **merged is not released in a package repo** — consumers install the published version, not `main`, so an unlogged or unreleased change is invisible to every install.

## Checklist

- [x] `CHANGELOG.md` with an `[Unreleased]` section; seed it retroactively from v0.19.0-beta.1's content (ADR-0046/0047).
- [x] `scripts/release.sh <patch|minor|major|prerelease>`: bumps `package.json` (+ lockfile), rotates `[Unreleased]` into the new version heading, commits (`chore(release): x.y.z`, DCO), creates the annotated tag — and deliberately does NOT push or publish. `--dry-run` wraps every destructive op.
- [x] Changelog gate in `lefthook.yml` pre-commit: a commit touching `src/skills/`, `src/lib/`, `src/commands/`, or `bin/` without an `[Unreleased]` entry warns (advisory-first — see ad-hooks' debut rule); flip-to-block criterion: two weeks without a false positive.
- [x] Subject-length check (≤72, imperative) in the same gate — the exact slip that happened on 2026-08-05.
- [x] Document the publish tail in README: `npm publish` (2FA prompt) + dist-tag check — `latest` did not follow `publishConfig.tag: beta` on 0.19.0-beta.1 and needed a manual `dist-tag add`.
- [x] Tests: bats-style or node:test coverage for the rotate/bump logic; `npm test` green.
- [x] Self-audit with `/ad-audit` before PR.

## Notes

- 2026-08-05 — Registered from the SLIM/NEST mechanism investigation. The sibling repo's version also bundles a protected-branch gate; this repo's "never push directly to main" is already convention — evaluate whether a mechanical guard earns its cost during implementation.
- 2026-08-05 — Implemented on `chore/kit-release-discipline`. Pure logic (`bumpVersion`, `rotateChangelog`) TDD'd in `scripts/release-lib.js` + `test/release.test.js`; gates follow the leak-guard shape (pure policy core + thin git wrapper) in `scripts/changelog-gate.js` and `scripts/commit-subject-check.js` + `test/commit-gates.test.js`. Subject length blocks (deterministic per ad-hooks' debut rule); the changelog pairing and mood heuristics warn only. End-to-end verified on a throwaway branch: real run produced the signed `chore(release): 0.19.0-beta.2` commit, lockfile bump, and annotated tag carrying the changelog section (`--cleanup=whitespace`, or git eats the `###` headings as comments); guards observed refusing main (with the computed branch suggestion), an existing tag, a dirty tree, and an empty `[Unreleased]`. 345/345 tests green.
- 2026-08-05 — Protected-branch gate evaluation (the open question above): NOT absorbed as a standing hook. `release.sh` refusing to run on `main` is the mechanical guard scoped to where the incident lived; a general pre-push branch block duplicates GitHub-side protection and the repo convention without new coverage.
