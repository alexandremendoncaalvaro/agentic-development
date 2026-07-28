# ADR-0033: Pre-commit house-IP leak-guard

**Status:** proposed
**Date:** 2026-07-27
**Deciders:** Alexandre Alvaro

## Context

This repository is public. Several planned skills (`ad-audit`, `ad-level-up`) generalize private, house-specific tooling whose original prose names internal rules, tools, and paths. Authoring the generic versions means working next to that private source material, which creates a standing hazard: private rule content pasted into a committed file, or a rule-set symlinked in from a personal store and accidentally dereferenced into the tree, leaks house intellectual property into a public repo where it is cached and indexed the moment it is pushed.

`.gitignore` plus author discipline are not sufficient. `.gitignore` does not stop a pasted block of prose, and it does not stop a symlink whose target escapes the repo from being committed as a dereferenced copy. Discipline fails silently and exactly once is enough.

The kit already treats pre-commit gates as decisions requiring their own record: [`lefthook.yml`](../../lefthook.yml) states that adding a pre-commit gate is "a separate decision... own ADR + Task per ADR-0007 §6 scrutiny rule." No pre-commit gate exists today — the only hook is `pre-push` running `npm test`.

## Decision

We will add a `pre-commit` lefthook gate that fails a commit when staged content does any of the following:

1. Matches any pattern in a local, gitignored denylist at `.agentic/leak-denylist.txt`.
2. Adds a path under `rules/` (the curated rule-set never belongs in this public repo; it lives at a configurable machine path, decided separately).
3. Adds a symlink whose resolved target escapes the repository root.

The denylist patterns are the sensitive markers themselves, so shipping them would disclose what we are hiding. They live locally only; the repo ships `.agentic/leak-denylist.example.txt` with generic placeholders and setup docs. Consumers copy the example to the real filename and fill in their own markers.

The gate is fail-closed and honors the no-bypass rule in [`WORKFLOW.md`](../../WORKFLOW.md) §11: no `--no-verify`, no skipped hooks. It is implemented as a small Node script under `src/` (ESM, `node:` built-ins only) with a `node:test` suite, wired into `lefthook.yml` alongside the existing `pre-push` gate.

The guard is a repository hygiene mechanism, not a skill: it installs no skill surface and registers no profile entry.

## Consequences

Positive:

- Leaking house IP into a public repo becomes a deterministic, checked failure at commit time rather than a matter of author vigilance.
- The mechanism is generic and reusable by any project that forks the kit — a house-IP boundary any team can adopt.
- Landing this before the `ad-audit` / `ad-level-up` port means the backstop is active while the highest-risk authoring happens.

Negative / trade-offs:

- The guard is a client-side lefthook hook, so it is a policy-backed local control, not a technical impossibility: `--no-verify` (or unset hooks) can bypass it, and WORKFLOW §11 forbids that — the same footing as every other gate in this repo. There is deliberately no CI re-check, because by the time content reaches CI on a public ref it has already leaked (see Alternatives).
- One more local-setup step: contributors must copy `.agentic/leak-denylist.example.txt` to `.agentic/leak-denylist.txt`. Absent the local file, the denylist check is a no-op — the `rules/` and symlink checks still fire.
- False positives are possible when denylist patterns are broad. Patterns are tuned locally by whoever owns them; the cost of a false positive is a blocked commit, not lost work.
- Content matching is per-line literal substring, so a marker split across lines or living in a binary blob is not caught by the content scan (the path check still applies). The guard is a backstop, not a complete exfiltration control.
- The guard reads staged content on every commit, adding a small fixed latency to the commit path.

## Alternatives Considered

* Credential secret-scanners (gitleaks and similar) — solve a different problem (tokens, keys, PII), not house-IP prose or rule-set paths. Complementary, not a substitute; keep separate.
* `.gitignore` only — offers no protection against pasted prose or against a repo-escaping symlink committed as a dereferenced copy.
* A CI-only check — fires after the content is already pushed to a public repo, which is too late; the leak has already happened.
* Manual review discipline as the sole control — fails silently and permanently on the first miss; the whole point is a deterministic backstop that does not depend on the author remembering.
