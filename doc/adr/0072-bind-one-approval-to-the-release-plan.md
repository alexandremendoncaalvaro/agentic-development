# ADR-0072: Bind one approval to the complete release plan

**Status:** accepted
**Date:** 2026-09-02
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0063 — its requirement for five separate confirmations and independently gated release PR handoffs.

## Context

ADR-0063 correctly made release effects explicit and state-aware, but equated
maintainer authority with a separate conversation turn before every write. A real
beta.9 release required repeated confirmation after the maintainer had already
approved all remaining steps. The deterministic checks added safety; repeating
the same question did not.

The release target and its effects are known after the configured dry-run. They
can be bound into one inspectable digest. CI, merge policy, ancestry, registry,
package, tag, and GitHub Release checks can continue to stop execution without
requiring the maintainer to re-authorize an unchanged command.

## Decision

`ad-release` will offer one plan-wide approval as the default. The deterministic
planner binds the package name and version, configured dist-tag, release kind
for a new release or the verified existing tag for a resume,
base and release branches, tag, prerelease flag, exact PR title and body, and all
direct or delegated effects into a SHA-256 digest. One explicit approval of that
displayed plan authorizes every effect whose target and command still match the
digest.

The approval does not bypass technical gates. A failed check stops the workflow.
A changed target or effect invalidates the receipt and requires a new plan. After
a non-mutating interruption such as npm 2FA, the same receipt remains valid only
after state inspection proves the planned version is still unpublished and the
target is unchanged.

`ad-pr` and release-only `ad-merge` will consume the valid receipt instead of
asking again. They still surface the exact PR draft, CI result, warnings, and merge
decision before acting, so the maintainer can interject. Per-stage confirmation
remains a fallback when the maintainer declines plan-wide authorization.

## Consequences

Positive:

- The normal release path needs one authorization instead of seven repetitive
  conversation turns.
- Approval remains auditable and narrower than a generic "do everything" because
  any target or effect change invalidates its digest.
- Technical and idempotency gates retain the same authority.

Negative / trade-offs:

- The workflow must carry the approval digest across delegated skills and resumed
  turns.
- A material PR-draft change or command change requires regenerating and approving
  the plan.

## Alternatives Considered

- **Keep five direct confirmations plus PR and merge confirmations.** Rejected by
  observed use: it interrupted a fully authorized release without adding evidence.
- **Remove approval entirely.** Rejected: publishing an immutable package still
  requires explicit owner authority.
- **Treat any earlier "yes" as permanent approval.** Rejected: it is not bound to
  an exact release target and can silently authorize drift.
