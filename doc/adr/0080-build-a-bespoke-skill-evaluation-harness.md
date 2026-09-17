# ADR-0080: Build a bespoke skill evaluation harness

**Status:** proposed
**Date:** 2026-09-17
**Deciders:** Alexandre Alvaro

## Context

Spec 0007 accepts a hybrid gate for evaluating skill trajectories: a credential-free replay lane that runs in normal local verification and CI, and an explicitly authorized live lane that generates fresh behavior through a host runner. The spec deliberately left the implementation mechanism open and required that any choice preserve the provider-neutral case, receipt, adapter, and grading contracts and justify any new dependency.

The forces are concrete. The normal gate must stay offline, deterministic, and free of provider credentials on the Ubuntu and Windows matrix. `GUIDELINES.md` §6.2 requires every dependency to justify why the kit cannot do without it and forbids a dev framework at the kit layer. The repository already validates and freezes evaluation artifacts with dependency-free ESM scripts under `ad-prism`, and already tests such scripts by spawning them under `node:test`. Both host CLIs expose a structured non-interactive surface that a thin adapter can spawn with a fixed argument list. The surveyed evaluation frameworks are provider-centric, hosted, or outside the Node-only stack, and the strongest public analog for this exact problem converged on bespoke code with a provider-neutral runner adapter and offline deterministic grading.

Grounding is recorded in `doc/research/0023-ground-skill-evaluation-harness-mechanism.md`; the contract it serves is `doc/research/0022-skill-trajectory-evaluation-contract.md`.

## Decision

We will build the skill trajectory evaluation harness as repository-only bespoke tooling under `eval/`, on Node built-ins only, and adopt no evaluation framework.

1. **Repository-only.** `eval/` holds cases, sanitized fixtures, frozen receipts, the library, and the `run.mjs` entry point. It stays outside `package.json#files`, like `scripts/` and `test/`, so the npm package, the installer contract, and the skill parity tests are untouched. Fixture roots are excluded from ESLint; harness modules are covered by the Prettier check; the suite runs under `npm test` through the existing explicit enumerator.
2. **Dependency-free ESM.** The harness uses `node:test`, `node:child_process`, `node:crypto`, and `node:fs` only. Digests reuse the `ad-prism` freeze scheme by importing `freezeArtifact` from the canonical skill script rather than duplicating the hashing code.
3. **Receipt contract.** A receipt declares its `origin`: `synthetic` receipts exercise harness mechanics and never carry a behavioral claim; `live` receipts, recorded by an authorized run, freeze the canonical skill digest and grader versions and are the only receipts that can support a behavioral claim.
4. **Verification, claim, and grading stay separate.** Integrity failures on the frozen case or fixture digest block grading and report `stale`. A live receipt whose frozen skill digest or grader versions no longer match reports a `stale` claim, is still graded so historical replay stays auditable, and raises `stale_claim` as a hard failure that fails the gate. Deterministic graders name their failing assertion in a failure record that carries the Spec 0007 R14 fields and a reproduction command that really runs.
5. **Runner-adapter seam.** The live lane accepts a host runner through one adapter boundary that spawns the host CLI with a fixed argument list, passes the environment through untouched, never reads credentials, and normalizes host events into the common receipt without erasing host-specific diagnostics. Fake runner adapters fed with captured sample streams prove the seam before any live pilot.
6. **Boundary validation.** Case and receipt records are validated before use: schema, origin, known grader ids, frozen inputs, skill host against the known host set, skill name against the skill directory pattern, and every digest computation surfaces its own failure instead of reading an absent value.

## Consequences

Positive:

- The normal gate stays exactly what Spec 0007 requires: offline, deterministic, credential-free, and portable across the CI matrix, with no new runtime or development dependency to justify or audit.
- The harness inherits the repository's proven patterns, which keeps it small enough to read in one sitting and testable through its public interface.
- Reusing the freeze scheme gives replay and live receipts the same digest semantics as frozen Prism artifacts, and inherits the LF normalization that `.gitattributes` guarantees on every platform; the Windows CI leg, not a single-machine run, is the measurement of that portability.
- The origin and claim split lets synthetic mechanics fixtures live in the suite indefinitely while live receipts rot on purpose when a skill or grader changes.

Negative / trade-offs:

- The kit owns its own grader, receipt, and adapter code instead of a maintained framework's; every new grader kind and every host event normalization is work this repository carries.
- Host, model, scaffold, and policy staleness cannot be observed at replay time; only the live lane can detect them when it regenerates a receipt.
- The import of `freezeArtifact` from one host's skill script couples repository tooling to a shipped skill path; the dual-host byte-parity test and the harness suite pin it, but a move of that script is a change to two places.

## Alternatives Considered

* `promptfoo` — provider-centric with a proprietary Claude Agent SDK dependency and an API key or live session requirement, no documented offline replay lane, and a thirty-megabyte dependency tree with roughly eighty runtime dependencies for a repository-only gate.
* OpenAI Evals API — hosted, requires uploading data to the provider, and is scheduled to become read-only on 2026-10-31.
* Public Python skill harnesses — the right shape, but outside the Node-only stack and the no-dev-framework rule.
* Shipping the harness as a kit skill — the harness evaluates the kit's own skills and is quality tooling for this repository; shipping it would spend the listing budget and bind downstream users to fixtures that describe this repository.
* Duplicating the digest code inside `eval/` — avoids the cross-tree import but forks the freeze semantics that receipts and Prism artifacts must share.
