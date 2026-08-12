# ADR-0066: Publish prereleases on latest

**Status:** accepted
**Date:** 2026-08-11
**Deciders:** Alexandre Alvaro

## Context

The kit is pre-1.0 and releases versions with a `-beta.N` suffix, but its
package should remain simple to install. [npm installs the `latest`
dist-tag](https://docs.npmjs.com/cli/dist-tag/) when a consumer omits an
explicit tag. The previous `publishConfig.tag: beta` required consumers to know
and request a second channel, while the registry already exposes
`0.20.0-beta.2` through `latest`.

The maintainer selected `latest` as the intended installation path. The npm
registry's current assignment is therefore intentional state, not drift to
correct.

## Decision

We will publish the kit's pre-1.0 `-beta.N` releases with
`publishConfig.tag: latest`. The SemVer prerelease suffix remains the maturity
signal; `latest` is the package's default installation channel.

`ad-release` will continue to report the configured tag and will not mutate
dist-tags. Any later dist-tag change remains a separately approved external
effect.

## Consequences

Positive:

- `npm install @alexandrealvaro/agentic` resolves to the current kit release
  without requiring users to know a secondary tag.
- The declared publication contract matches the registry's existing `latest`
  assignment, so no corrective registry write is necessary.
- The `-beta.N` version makes the pre-1.0 maturity level visible independently
  of the installation channel.

Negative / trade-offs:

- Users who omit a version or tag receive a prerelease until the 1.0 policy
  changes.
- The historical `beta` dist-tag remains stale and is not maintained as a
  supported installation channel.

## Alternatives Considered

- **Publish prereleases under `beta`.** Rejected: it creates a second command
  for the normal installation path and conflicts with the maintainer's chosen
  registry state.
- **Keep `beta` in source and retag the registry.** Rejected: it would undo
  the intended simple default and require an unnecessary external mutation.
- **Maintain both tags.** Rejected: two supported channels create ambiguity
  without a distinct audience or release policy.
