# ADR-0032: CI failure is a local gate gap — pre-push mirrors CI

**Status:** accepted
**Date:** 2026-07-01
**Deciders:** Alexandre Alvaro

## Context

WORKFLOW §11 already named the two tiers (pre-commit fast, pre-push thorough) and the never-bypass rule (`--no-verify` forbidden). What it did not say: the local pre-push tier must mirror what CI runs, and CI catching something pre-push did not is a gate gap, not a CI feature.

Concrete failure modes seen in kit dogfood and in downstream projects:

- Pre-push runs `npm test` on the developer's local Node version (e.g., 22). CI runs the matrix (Node 20 + 22). CI catches a Node-20-only failure; developer iterates red CI runs pushing successive fixes.
- Pre-push runs unit tests only; CI runs unit + integration. Integration failures land on green pushes.
- Pre-push runs on one OS; CI runs on Linux + macOS. OS-specific failures surface only in CI.
- Pre-push has no lint gate; CI runs `eslint`. Every PR opens with lint findings that could have been caught locally.

Each of these normalizes broken main and burns CI minutes. The `/ad-pr` skill opened PRs without verifying local gates green; the `/ad-hooks` skill scaffolded pre-push without checking what CI runs. Both let the drift compound.

The user's stated framing: "It is inadmissible to break CI when it runs in the cloud. Local gates must catch it first."

## Decision

Adopt **CI failure is a local gate gap** as a hard clause. Three loci:

1. **WORKFLOW.md** — add TL;DR #22 (universal principle) and a `§11` bullet after "Never bypass": `CI failure is a local gate gap. Pre-push must mirror what CI runs — same commands (test, lint, typecheck, build) and, when they matter for the failure surface, the same matrix (language versions, OS targets, feature flags). If CI catches something pre-push did not, the deterministic fix is to close the gate locally and re-push, not to iterate red CI runs.`
2. **`/ad-hooks`** — new Step 5 "Mirror CI locally (drift check)". Reads `.github/workflows/*.yml`, `.gitlab-ci.yml`, `.circleci/config.yml`, `azure-pipelines.yml`, `.buildkite/pipeline.yml` in order. Extracts test / lint / typecheck / build commands from `run:` / `script:` steps. Extracts matrix (language versions, OS runners, feature flags). Diffs against pre-push and warns on each gap with a specific proposed edit. Ask before writing — matrix mirroring can be expensive.
3. **`/ad-pr`** — Phase 1 preflight adds a local-gate run before opening the PR. Detects the pre-push tier (`lefthook.yml`, `.husky/pre-push`, `.pre-commit-config.yaml`, `.git/hooks/pre-push`) and runs the extracted commands explicitly. Falls back to the CI surface if no hook runner is detected. Refuses to open the PR on any red exit; does not offer a bypass flag. Warns on matrix gap but does not refuse (matrix mirroring belongs to `/ad-hooks`).

**`AGENTS.md`** Quality Gates section adds a corresponding non-negotiable bullet referencing WORKFLOW §11 and TL;DR #22.

## Consequences

Positive:

- CI stops being where bugs surface for the first time. The developer loop tightens: red locally → fix → green locally → push → CI stays green.
- CI minutes stop being burned on failures pre-push would have caught. In a matrix build across 2 Node versions × 2 OS × several jobs, one red push is 4-8 minutes wasted.
- The kit stops teaching the "push and see what CI says" pattern that normalizes broken main. New contributors inherit the local-first posture through hooks and PR-open refusal.
- `/ad-pr`'s refuse-on-red gets the WORKFLOW §11 binding as backing — refusal is not helpfulness, it is the deterministic rule.

Negative:

- First-time `/ad-pr` runs are slower — the preflight adds the pre-push tier's runtime (unit + integration tests). For projects with slow integration suites, this is a noticeable wait per PR open. Acceptable: the wait is once per PR, not once per push cycle, and it replaces multi-minute CI cycles.
- Matrix mirroring (Node 20 + 22 locally) requires either a version manager (`nvm`, `fnm`, `asdf`) or explicit iteration in the runner config. Some developers will not have the version manager installed. `/ad-hooks` warns and offers to close the gap; the user picks whether to pay the cost.
- The refuse-on-red rule in `/ad-pr` can be a friction point during exploratory work — the developer wants to open a draft PR to share diff shape while tests are still red. Countermeasure: the escape hatch is not `--no-verify` (forbidden), it is `gh pr create --draft` invoked directly, bypassing `/ad-pr`. The skill's helper posture yields to the user's explicit override.
- On projects with no CI wired, `/ad-pr` runs only the hook runner (or nothing if none). Warned, continues. Acceptable — the mirror check has no target.

## Alternatives

- **Only add the WORKFLOW clause, no skill changes.** Rejected. WORKFLOW is advisory; §11's own preamble says "text you write hoping the agent obeys is not the same as a script that exits non-zero when a rule is violated." The skills are the deterministic surface where the rule bites.
- **Refuse-on-red in `/ad-hooks` scaffold time, not `/ad-pr` runtime.** Rejected. `/ad-hooks` runs once at project setup; `/ad-pr` runs every PR. The failure mode is per-PR drift (developer forgot to run pre-push locally, or hook was skipped), not scaffold-time misconfiguration. The gate belongs at the surface where the drift happens.
- **Add a `--no-mirror` flag to `/ad-pr`.** Rejected. Escape hatches erode the rule. WORKFLOW §11 already forbids `--no-verify`; adding a symmetric skill-level bypass reintroduces the pattern this ADR closes. Users who need the escape hatch invoke `gh pr create` directly.
- **Move the mirror check to a Git server-side hook (pre-receive).** Rejected. Not portable across hosts (GitHub, GitLab, self-hosted differ), and server-side rejection is a worse UX than pre-push refusal at the developer's terminal. Client-side gates plus refuse-on-red in `/ad-pr` are the right layer.
