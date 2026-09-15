# GROUND-0019: Define the 1.0 readiness boundary

**Status:** recorded
**Decision:** Promote the kit to 1.0 only after the shipped MVP is verified, the supported runtime and CI actions are current, lint/format/test/dependency-audit gates agree locally and in CI, repository secret controls are verified, and a final rules-and-documentation audit is clear. External adoption is evidence to observe, not an entrance threshold.
**Decision ref:** doc/tasks/0049-define-one-point-zero-readiness.md
**Confidence:** Strong

## Decision and confidence

The repository already ships the PRD's MVP surface and exercises it through a
937-test dual-host dogfood suite. The remaining uncertainty is therefore not a
feature-count question; it is whether the compatibility promise, release
mechanics, and quality boundary are fit for a stable public API. Semantic
Versioning makes `1.0.0` the point at which that API is declared, while the
current release helper still forces every major bump onto `-beta.1`. Node 20 is
now end-of-life, so retaining `>=20.12.0` for the first stable release would
anchor the new contract to an unsupported runtime and to an unsupported ESLint
line. Node 22.13 is the smallest common floor supported by the current ESLint
major, with Node 22 and 24 both current LTS lines.

The happy path is to raise the runtime floor to Node 22.13, test the minimum
supported 22 release and Node 24 on Ubuntu and Windows, update the official
Actions used by CI, add ESLint and Prettier checks, and make one `npm run verify`
command the local pre-push, CI, and prepublish gate. A high-severity `npm audit`
failure blocks that gate; lower severities remain visible for review instead of
silently changing the release threshold. GitHub secret scanning and push
protection are already enabled, while the local leak guard blocks repository-
specific private material. A second generic local secret scanner is deliberately
excluded until an observed coverage gap justifies another dependency and rule
set. The decision is Strong because every compatibility and release claim is
grounded in an official contract or directly observed repository state.

## Evidence

### E1 — Stable 1.0 is an API promise, not an adoption counter

**Strength:** High
**Provenance:** A1, C1, C2

Semantic Versioning defines `0.y.z` as initial development and `1.0.0` as the
point where the public API is defined. The PRD's complete MVP surface, package
tests, and own-dogfood audit are direct evidence about that promise. Download or
star counts do not establish API stability, so no numeric external-adoption
threshold is required.

### E2 — The supported runtime must move off Node 20 before 1.0

**Strength:** High
**Provenance:** A2, A3, A7, A8, C3

Node's official lifecycle marks Node 20 end-of-life and recommends production
use on LTS releases. ESLint 10 requires Node 20.19, 22.13, or 24+, while the
package currently promises 20.12. Raising the package floor to 22.13 removes an
unsupported runtime from the new stable contract and permits the supported
linter major without increasing runtime dependencies. The official checkout
and setup-node projects now document v7, so CI can also leave its deprecated
Node 20 action runtime behind.

### E3 — One visible verification command closes local/CI drift

**Strength:** High
**Provenance:** A4, A5, B1, C3

ESLint and Prettier expose non-mutating check commands, and npm documents an
audit exit status suitable for a severity threshold. Public Node packages use
separate lint and test scripts and compose them in CI. This repository already
requires pre-push and CI to execute the same effective command, so composing
lint, format, tests, and dependency audit under `npm run verify` preserves that
invariant while keeping `npm test` available as the offline behavioral suite.

### E4 — Existing secret controls close the observed boundary without a new scanner

**Strength:** Medium
**Provenance:** A6, C4

GitHub reports secret scanning and push protection enabled for this public
repository. The local pre-commit leak guard independently blocks the kit's
private denylist and unsafe paths. These controls cover different boundaries.
A generic scanner would add a third ruleset but no observed missing secret class;
it is therefore an explicit exclusion, not an unexamined gap.

### E5 — The release helper must permit the stable transition

**Strength:** High
**Provenance:** A1, B2, C5, D1

The current `major` calculation returns `1.0.0-beta.1` from the active beta
line. The public `node-semver` implementation returns `1.0.0` for that semantic
increment. Changing the tested major-bump contract is necessary before the
repository can produce the version the owner selected.

## Source register

- **A1:** Semantic Versioning, [Semantic Versioning 2.0.0](https://semver.org/) — public API declaration, initial-development semantics, and stable version precedence (accessed 2026-09-15 via official web documentation).
- **A2:** Node.js, [Node.js releases](https://nodejs.org/en/about/previous-releases) and [End-of-Life](https://nodejs.org/en/about/eol) — supported LTS lines and Node 20 end-of-life status (accessed 2026-09-15 via official web documentation).
- **A3:** ESLint, [Migrate to v10.x](https://eslint.org/docs/latest/use/migrate-to-10.0.0) — supported Node ranges for ESLint 10 (accessed 2026-09-15 via official web documentation).
- **A4:** ESLint, [Getting started](https://eslint.org/docs/latest/use/getting-started) — flat-config installation and lint workflow (accessed 2026-09-15 via official web documentation).
- **A5:** npm, [`npm audit`](https://docs.npmjs.com/cli/audit/) — audit severity and exit-code behavior (accessed 2026-09-15 via official web documentation).
- **A6:** GitHub, [Push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection) — supported-secret blocking at the repository boundary (accessed 2026-09-15 via official web documentation).
- **A7:** GitHub Actions, [`actions/checkout`](https://github.com/actions/checkout) — current action major and Node 24 action-runtime requirement (accessed 2026-09-15 via official repository documentation).
- **A8:** GitHub Actions, [`actions/setup-node`](https://github.com/actions/setup-node) — current action major, runner compatibility, and explicit Node-version configuration (accessed 2026-09-15 via official repository documentation).
- **B1:** ESLint, [`package.json`](https://github.com/eslint/eslint/blob/main/package.json) — public separation and composition of lint/test package scripts (accessed 2026-09-15 via public source inspection).
- **B2:** npm/node-semver, [`README.md`](https://github.com/npm/node-semver/blob/main/README.md) — stable major increment and prerelease semantics (accessed 2026-09-15 via public source inspection).
- **C1:** `doc/product/PRD.md` and `src/skills/` at base tree `4a253dbc58b9f287fe15733def0633d49385d7a2` — accepted MVP scope and shipped dual-host surface (accessed 2026-09-15 via repository read).
- **C2:** `npm test` on the same base tree — 937 passing tests before the readiness change (accessed 2026-09-15 via local command execution).
- **C3:** `package.json`, `.github/workflows/test.yml`, `lefthook.yml`, and `GUIDELINES.md` at the same base tree — Node 20.12 floor, Node 20/22 matrix, and missing lint/format/audit wiring (accessed 2026-09-15 via repository read).
- **C4:** GitHub repository API plus `src/leak-guard.js` at the same base tree — secret scanning and push protection enabled remotely; repository-specific leak prevention installed locally (accessed 2026-09-15 via authenticated API query and repository read).
- **C5:** `scripts/release-lib.js` plus `npm run release -- major --dry-run` at the same base tree — current major bump targets `1.0.0-beta.1` (accessed 2026-09-15 via repository read and local dry run).
- **D1:** commits `53116f7` and `acdb634` — introduction of the beta-only release convention and registration of the unresolved 1.0 readiness task (accessed 2026-09-15 via `git log` and `git show`).

## Limitations and reversal

The supported runtime change intentionally drops Node 20 consumers at the 1.0
boundary. The dependency audit requires registry advisory availability during
the composed verification gate; `npm test` remains separate and offline for
diagnosis. GitHub secret scanning covers supported patterns, not every possible
credential shape, and the custom leak guard covers repository-specific material,
not generic credential entropy. Add another local scanner only if a real miss or
new compliance requirement demonstrates the need. Revisit the runtime matrix as
LTS lines reach end of life.

## Audit path

Run `node .agents/skills/ad-ground/scripts/validate-record.mjs doc/research/0019-ground-one-point-zero-readiness.md`, inspect the repository security settings,
run `npm run verify`, and run `npm run release -- major --dry-run`. Structural
validity proves the evidence map, not the source content.
