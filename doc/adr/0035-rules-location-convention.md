# ADR-0035: Curated rule-set location convention

**Status:** proposed
**Date:** 2026-07-27
**Deciders:** Alexandre Alvaro

## Context

The new `ad-audit` (maximum-gate audit, [ADR-0034](0034-audit-tier-skills-over-fold.md)) audits a work product against a **rule-set**, and `ad-level-up` curates that rule-set. Neither can hardcode rule content, and this repository is public — the leak-guard ([ADR-0033](0033-house-ip-leak-guard.md)) actively blocks committing a `rules/` path here. So the curated rules cannot live in the kit, and they should not have to be re-authored per project: a practitioner curates a personal or team convention set once and audits many repositories against it.

Two forces pull on the location:

- **Portability.** The value of a curated rule-set is carrying it across every repo you work in. That argues for a single machine-level home, not a per-repo copy.
- **Zero-config usefulness.** `ad-audit` must still do something useful in a repo with no curated store — otherwise it is dead weight until configured.

No configuration convention exists in the kit today; skills read no config key. This ADR establishes one.

## Decision

We will resolve the rule-set for `ad-audit` / `ad-level-up` from two layers:

1. **Repo binding docs (always, base layer).** `AGENTS.md`, `ARCHITECTURE.md`, `GUIDELINES.md`, and accepted ADRs under `doc/adr/` — whatever the repo defines — are always in scope. This makes `ad-audit` work zero-config in any repo.
2. **Curated machine store (optional, additive).** A portable rule-set at a **configurable machine path**, default **`~/.agentic/rules/`**, overridable by the environment variable **`AGENTIC_RULES_DIR`**. When present, its rules are added on top of the base layer.

Resolution order the skill applies at runtime: use `$AGENTIC_RULES_DIR` if set; else `~/.agentic/rules/` if it exists; always union with the repo binding docs. Resolution is done by the skill instructions (markdown telling the agent where to look) — no kit code and no new dependency; this keeps it dual-host by construction.

The kit ships **no rules** — only documentation of this convention and, optionally, an example. `~/.agentic/rules/` is a user-machine path; `AGENTIC_RULES_DIR` lets a team point at a shared checkout.

The home-directory name `~/.agentic/` is chosen for consistency with the `.agentic/` working-state directory the kit already uses in-repo (e.g. `.agentic/reviews/`).

## Consequences

Positive:

- Portable: curate once, audit everywhere. The machine store follows the practitioner across repos.
- Zero-config: the repo-docs base layer means `ad-audit` is useful immediately, with the curated store as an upgrade.
- Leak-guard-compatible: the curated rules never live under version control in this public kit; `rules/` stays blocked here.
- No code, no dependency: runtime path resolution lives in the skill instructions, so both hosts get it identically.

Negative / trade-offs:

- One more convention to document and for users to learn (`AGENTIC_RULES_DIR`, the default path).
- The curated layer requires the user to populate a machine path; empty means base-layer-only audits (acceptable, and explicit).
- An environment variable is process-scoped; a user who audits from a shell without it set silently gets the default path. Documented, not surprising.

## Alternatives Considered

* **Per-repo `.agentic/rules/`** — rejected. Not portable (re-curate per repo), mixes with the ephemeral `.agentic/reviews/` working state, and is blocked by the leak-guard inside this kit's own repo.
* **Config-key only, no default path** — rejected. `ad-audit` would be unusable until configured; the zero-config base-layer path is the happy path.
* **XDG base directory (`~/.config/agentic/rules/`)** — rejected. More "correct" for Linux purists, but inconsistent with the `.agentic/` directory the kit already uses in-repo; internal consistency wins here.
* **Ship a starter rule-set in the kit** — rejected. The kit is public and generic; shipping rules would either leak house-specific content or impose opinions the kit deliberately avoids. Rules are the user's.
