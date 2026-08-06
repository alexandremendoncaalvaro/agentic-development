# Changelog

Notable changes to `@alexandrealvaro/agentic`, newest first — consumers install the published npm version, not `main`, so an unlogged change is invisible to every install. Format per [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions per [Semantic Versioning](https://semver.org) on the house `-beta.N` channel (`publishConfig.tag: beta`). `scripts/release.sh` owns the rotation of `[Unreleased]` into a version heading — do not rotate by hand.

Releases older than 0.19.0-beta.1 predate this file; their record is the annotated git tags and [GitHub Releases](https://github.com/alexandremendoncaalvaro/agentic-development/releases).

## [Unreleased]

### Added

- A read contract in `WORKFLOW.md` §1 (*Reading order*), delivered by `ad-philosophy` on both hosts (ADR-0049 Decision 5, task-0034): the definition layer always, an area's decision records only when the change touches that area, the evidence behind a decision only when the decision looks wrong. Volume of reading is not comprehension, and nothing previously told an agent where to stop.
- `init` and `update` now write `WORKFLOW.md` and `WORKFLOW-FLOWS.md` to the target repository root (ADR-0049 Decision 6). Installed skills cite the constitution by section and the installer's own hints print those section numbers, so every one of those references previously pointed at a file the target did not have. A target copy you have edited is **reported and skipped**, never overwritten — `--force` replaces it, matching the default skill installs already hold. Project-specific rules stay in `AGENTS.md` / `GUIDELINES.md`.
- Partial supersession has a declared shape: `Amends:` and `Amended by:` header fields in the ADR template and `ad-adr` on both hosts (ADR-0049). `Status:` still covers whole-document supersession; the pair covers the case it cannot express, and being a pair is what makes the relation checkable without reading prose.
- `WORKFLOW.md` §2 rule 10 permits one state projection per append-only layer, inside that layer's own directory — a screen naming which records still bind and what corrected the rest. A projection that only lists records remains a forbidden duplicate index. First use: `doc/adr/PROJECTION.md` in this repo.
- `ad-drift` (both hosts): an amendment-pair integrity check, and a check for a state projection contradicting a live record. A missing projection is not a finding — rule 10 permits one, it does not require one.

- Skills can ship executable skill scripts (`scripts/` beside `SKILL.md`), installed with the skill and SHA-tracked like any skill file (ADR-0047 Decision 1, task-0031). First consumer: `ad-audit`'s deterministic rules-resolution probe now runs as `scripts/resolve-rules.mjs` (Node, zero dependencies, no shell assumed; deterministic locale-independent listings — matching the replaced shell block under C-locale collation) on both hosts; host copies are byte-parity-tested.
- `ad-audit` content anchors (task-0033, both hosts): the rules-resolution probe emits a sha256 anchor per machine-store and project-layer rule file, group handoffs carry the expected anchors, each reviewer echoes `Anchors: <file>=<sha256>, target=<SHA>` alongside `Files grounded`, and aggregation treats an anchor mismatch or absence as UNVERIFIED verdicts (re-dispatch, or mark the group unaccounted) — a reviewer's claim that it read the right rules on the right tree becomes mechanically checkable.

- `ad-hooks` (both hosts): advisory-first debut rule — deterministic toolchain gates may block from day one; heuristic or novel gates debut warn-only with an explicit flip-to-block criterion.
- Release discipline for the kit repo (task-0032, ADR-0048): `scripts/release.sh` (version bump + changelog rotation + release commit with DCO sign-off + annotated tag, stopping before push and publish), and three `lefthook.yml` gates — an advisory changelog reminder on npm-shipped content, a blocking over-72-char commit-subject check, and a blocking pre-push guard for `main`/`cli` — plus this changelog.

### Fixed

- `ad-philosophy` claimed eleven Documentation Discipline rules while `WORKFLOW.md` declared thirteen authoritative, so the contract an agent loaded each session was two rules short of the one that bound it — and one of the two (cite a commit range by tag, not by SHA) had no delivery anywhere in the kit. Both hosts now deliver all thirteen, and the count parity is pinned by test.

## [0.19.0-beta.1] - 2026-08-05

### Added

- `ad-audit` v2 (ADR-0046, both hosts): the file-coverage axis (`Files grounded:` lines, aggregated so a formally complete rule matrix can no longer hide an unread file), a `critical | major | minor | nit` severity scale, and the prose-vs-code posture ("the diff is what ships") in the reviewer contracts.
- Team-practice absorptions (ADR-0047, both hosts): deterministic rules-layer resolution probe in `ad-audit` Step 1; re-audit mode against persisted findings under `.agentic/reviews/`; opt-in pre-commit review-gate tier in `ad-hooks`; PR-history harvest as a first-class `ad-level-up` candidate source.

### Fixed

- `rootdoc`: managed AGENTS.md sections stored with CRLF line endings are recognized again; the repo also pins an LF checkout via `.gitattributes`.
- `leak-guard`: in-repo symlinks are no longer reported as escapes on Windows.
