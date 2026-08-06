# ADR-0048: Release discipline — CHANGELOG.md, release script, and commit-time gates

**Status:** proposed
**Date:** 2026-08-05
**Deciders:** Alexandre Alvaro

## Context

Merged is not released in a package repo: consumers install the published npm version, not `main`, so an unlogged or unreleased change is invisible to every install. The 2026-08-05 release of 0.19.0-beta.1 was hand-assembled and produced four incidents in one afternoon: a manual version bump, an over-length commit subject, a tag that needed a retry, and a `latest` dist-tag that had to be fixed with a manual `dist-tag add` (task-0032 records them).

Two standing conventions bear on the fix:

- GUIDELINES.md §11 rule 2 bans changelogs in narrative documents, exempting only the lifecycle-managed artifact directories — written before this repo distributed anything, when git history was the only consumer-visible record.
- The kit treats a new pre-commit gate as a decision requiring its own record (ADR-0033 set the precedent for `leak-guard`; the `lefthook.yml` header restates it via ADR-0007 §6's scrutiny rule).

Additionally, the audit of this change verified live that `main` has no GitHub branch protection or ruleset (`gh api .../branches/main` → `"protected": false`; `.../rulesets` → `[]`), so the "never push directly to `main`" convention (AGENTS.md, GUIDELINES.md §10.1) had zero mechanical enforcement anywhere.

## Decision

1. **`CHANGELOG.md` at the repo root is a sanctioned release record.** It is a lifecycle-managed artifact — dated version headings are its auditability primitive, the same reasoning that exempts `doc/adr/` and `doc/tasks/` — not a narrative document. GUIDELINES.md §11 rule 2 and the §11.1 scope table carry the exemption. Format: Keep a Changelog with an `[Unreleased]` section; entries summarize consumer-visible changes and name their ADRs; rotation is owned by `scripts/release.sh`, never done by hand.
2. **`scripts/release.sh <patch|minor|major|prerelease>` is the only release path.** It bumps `package.json` (+ lockfile), rotates `[Unreleased]` into the new version heading, creates the release commit with DCO sign-off and the annotated tag (`--cleanup=whitespace`, so markdown headings survive as the tag body) — and deliberately stops there. Pushing and `npm publish` (2FA) stay human steps. `--dry-run` wraps every mutating operation. Preflight refuses `main`, a dirty tree, an existing tag, and an empty `[Unreleased]`. Release tooling lives under `scripts/`, outside `package.json#files`, so it never ships in the npm tarball.
3. **Three commit-time gates in `lefthook.yml`, debuting per ad-hooks' advisory-first rule** (deterministic gates may block from day one; heuristic gates debut warn-only with a stated flip-to-block criterion):
   - `changelog-gate` (pre-commit, **warn-only**): a commit touching npm-shipped kit content without staging a `CHANGELOG.md` entry gets a reminder. The watched set is derived from `package.json#files` (`src/`, `bin/`, `templates/`, `prompts/`, `WORKFLOW.md`, `WORKFLOW-FLOWS.md`); `README.md`/`LICENSE` are excluded as meta files. The pairing heuristic is novel — flip-to-block criterion: two weeks without a false positive.
   - `subject-check` (commit-msg): a subject over 72 characters **blocks** (deterministic; the exact 2026-08-05 slip); imperative-mood heuristics (trailing period, past-tense opener) warn only. Merge/Revert/fixup!/squash! subjects are exempt.
   - `branch-guard` (pre-push, **blocks**): refuses a push that updates `main` or `cli` (deterministic; reads the pre-push ref lines from stdin, falling back to the current branch). This closes the gap the audit measured: with no GitHub-side protection, the no-direct-push convention was prose-only. GitHub branch protection on `main` remains the recommended origin-side layer; this guard is the offline, clone-local complement, not a substitute.

## Consequences

Positive:

- Releases become mechanical; the four incident classes (manual bump, long subject, tag retry, silent dist-tag drift) each have a guard or a documented tail step.
- A consumer-visible change without a changelog entry is nudged at commit time instead of discovered at release time.
- Direct pushes to protected-by-convention branches are refused locally even with GitHub protection absent.

Negative / trade-offs:

- `CHANGELOG.md` summaries overlap ADR content by design (consumer-facing digest vs decision record); the entry names its ADRs instead of restating rationale to keep the duplication bounded.
- The changelog gate's warn-only debut can be ignored; that is the point of the debut rule — it earns blocking by two false-positive-free weeks.
- A new hook stage requires contributors to re-run `lefthook install`; recorded as an AGENTS.md gotcha.

## Alternatives Considered

- **No ADR (task-0032 alone).** Rejected: ADR-0033 and the `lefthook.yml` header establish that commit-time gates are ADR-recorded decisions; the audit flagged the gap.
- **GitHub branch protection instead of a local pre-push guard.** Not agent-enablable and does not cover offline clones; recommended as an additional layer, adopted here as the local complement.
- **`npm version` for the bump.** Rejected: it lands on `-beta.0` for pre-releases; the repo's tag history is uniformly `-beta.N` starting at 1, so the bump is a small hand-rolled, unit-tested function.
- **Blocking changelog gate from day one.** Rejected by ad-hooks' advisory-first debut rule: the commit↔changelog pairing heuristic is novel, and a gate that blocks before earning trust trains bypassing.
