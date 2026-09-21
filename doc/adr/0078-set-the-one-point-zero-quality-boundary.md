# ADR-0078: Set the 1.0 quality boundary

**Status:** accepted
**Date:** 2026-09-15
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0048 — stable release semantics and the composed verification gate
**Amends:** ADR-0065 — its realized Node version pair, which Decision item 3 moves to Node 22.13 and Node 24

## Context

The kit's MVP surface is shipped and dogfooded, but its release contract still
forces every version onto a beta suffix. The accepted PRD also names four open
1.0 concerns: lint/format enforcement, secret scanning, dependency auditing,
and a clean own-dogfood audit. Node 20, the package's current compatibility
floor and one CI matrix leg, is now end-of-life. The current supported ESLint
major requires at least Node 22.13 on the next LTS line.

The owner has selected stable 1.0 as the next release. That selection resolves
the product question, but publication still needs an objective, repeatable
entrance boundary. Grounding is recorded in
`doc/research/0019-ground-one-point-zero-readiness.md`.

## Decision

Agentic Development may publish `1.0.0` when all of these conditions are true:

1. The accepted PRD's MVP surface is present in the npm package for both hosts.
2. `npm run verify` passes locally and in every required CI matrix leg. The
   command composes ESLint, Prettier check mode, the behavioral test suite, and
   `npm audit --audit-level=high`.
3. CI tests the minimum supported Node 22.13 release and Node 24 on Ubuntu and
   Windows, using the current supported official checkout and setup-node action
   majors. `package.json#engines.node` is `>=22.13.0`.
4. GitHub secret scanning and push protection remain enabled, the local
   repository-specific leak guard remains blocking, and no evidence shows an
   uncovered secret class. A second generic local/CI secret scanner is
   deliberately excluded until an observed miss or compliance requirement
   justifies its dependency and ruleset.
5. A fresh two-axis review, maximum-gate audit, documentation-drift audit, and
   package dry run have no unresolved release blocker.

External adoption is not an entrance threshold. Downloads, stars, and issue
activity remain useful product signals, but they do not prove or disprove API
stability.

Versioning follows Semantic Versioning after this boundary. A `major` release
from the active `0.x` beta line produces stable `1.0.0`; stable patch, minor,
and major releases no longer receive an automatic beta suffix. The explicit
`prerelease` kind remains the way to continue or start a beta line. ADR-0048's
single-script, changelog, DCO commit, local annotated tag, and human-authorized
tail remain unchanged.

`npm test` remains the offline behavioral suite. `npm run verify` is the
release-quality command used by pre-push, CI, and `prepublishOnly`; keeping the
two names distinct makes a registry outage diagnosable without weakening the
release boundary.

## Consequences

Positive:

- The first stable version carries a concrete compatibility and quality promise.
- Local, CI, and prepublish checks share one visible command, closing gate drift.
- The supported toolchain no longer depends on an end-of-life Node release or
  an unsupported linter major.
- Stable version calculation agrees with the meaning of a SemVer major bump.

Negative / trade-offs:

- Node 20 users must upgrade before installing 1.0.0.
- Pre-push verification gains a registry-dependent audit step and is therefore
  slower and sensitive to advisory-service availability; the offline test
  command remains available to distinguish infrastructure failure from code
  failure.
- Adopting Prettier requires one mechanical baseline formatting pass across the
  maintained JavaScript surface.
- GitHub and the custom leak guard provide complementary secret controls, but
  neither is a general proof that arbitrary credentials cannot be committed.

## Alternatives Considered

- **Publish 1.0 immediately under the existing gates.** Rejected: the release
  helper cannot produce 1.0.0, Node 20 is unsupported, and the PRD's explicit
  quality gaps would remain open.
- **Require a download or star threshold.** Rejected: adoption measures reach,
  not public-API stability or release quality.
- **Keep Node 20 and pin ESLint 9.** Rejected: both the runtime and linter line
  are outside current support at the moment of the stable promise.
- **Run dependency audit only by hand at release time.** Rejected: a manual
  check is not the repeatable local/CI gate required by task 0049.
- **Add a generic local secret scanner now.** Rejected pending evidence: remote
  secret scanning and push protection plus the local private-material guard
  already cover the observed boundaries, while another scanner adds rules and
  operational dependencies without a demonstrated miss.
- **Format all Markdown and lifecycle records.** Rejected: formatting gates
  cover executable JavaScript and active configuration; mass rewriting
  historical decision records would add review noise without changing quality.
