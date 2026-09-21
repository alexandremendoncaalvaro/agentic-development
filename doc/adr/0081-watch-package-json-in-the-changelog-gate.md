# ADR-0081: Watch package.json in the changelog gate

**Status:** accepted
**Date:** 2026-09-18
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0048 — the watched set of the `changelog-gate` pre-commit check

## Context

ADR-0048 debuted a warn-only pre-commit `changelog-gate`: a commit that touches npm-shipped kit content without staging a `CHANGELOG.md` entry gets a reminder. Its watched set was derived from `package.json#files` (`src/`, `bin/`, `WORKFLOW.md`, `WORKFLOW-FLOWS.md`), with `README.md` and `LICENSE` excluded as meta files. The derivation left out the manifest itself. npm's documentation of the `files` field (https://docs.npmjs.com/cli/v11/configuring-npm/package-json#files, accessed 2026-09-18) states that certain files are always included in the published tarball regardless of settings: `package.json`, `README`, `LICENSE` or `LICENCE`, the file named by `main`, and the files named by `bin`. `npm pack --dry-run` in this repository reproduces it: the tarball listing carries `package.json` although `#files` never names it. A change to `package.json` therefore reaches every consumer install even though the path appears nowhere in `#files`.

The gap was observed during Task 0048: an `npm run eval` script alias landed in the published `package.json` pointing at a repository-only directory, and the gate stayed silent because it could not see the file. The alias was later judged not to be a consumer-visible defect, so no changelog entry was owed in that instance. The class it belongs to is consumer-visible by definition: `scripts`, `dependencies`, `engines`, `bin`, `exports`, and `files` all change what an install does or receives. The rule curation of Task 0077 routed the fix here as a deterministic gate change rather than a rule line, because the gate's own definition is the load-bearing cause.

## Decision

We will add `package.json` to the `changelog-gate` watched set, as an exact file match beside the existing path prefixes, so that a staged change to the manifest without a staged `CHANGELOG.md` entry produces the same reminder as a change under `src/`. The gate stays warn-only under ADR-0048's advisory-first rule and keeps its flip-to-block criterion. `package-lock.json` stays unwatched: npm never publishes it.

## Consequences

Positive:

- The watched set now matches what npm ships rather than what `#files` lists, closing the one class of shipped change the gate could not see.
- The change is one exact-match entry and one test, with no new dependency and no change to the hook wiring.

Negative / trade-offs:

- Version bumps by `scripts/release.sh` touch `package.json` in the release commit; that commit also rotates `CHANGELOG.md`, so it stages the changelog and the reminder does not fire. A manual version bump without a changelog change will now be reminded, which is the intended behavior.
- Dependency-only changes with no user-visible effect will be reminded too; the gate is warn-only, so the author dismisses the reminder deliberately instead of the gate deciding silently.

## Alternatives Considered

* Leave the watched set derived from `#files` alone — rejected; it misses the one file npm ships unconditionally, which is where scripts, dependencies, and engines live.
* Watch `package-lock.json` as well — rejected; npm never publishes the lockfile, so its changes are not consumer-visible through the package.
* Flip the gate to blocking at the same time — rejected; ADR-0048's flip criterion (two weeks without a false positive) is a separate observation and this change adds a new source of reminders to observe.
* Record the requirement as a rule line in the practitioner's machine store — rejected by the Task 0077 curation; a deterministic gate change is the load-bearing fix and prose would only restate it.
