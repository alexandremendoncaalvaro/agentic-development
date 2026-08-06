# Changelog

Notable changes to `@alexandrealvaro/agentic`, newest first — consumers install the published npm version, not `main`, so an unlogged change is invisible to every install. Format per [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions per [Semantic Versioning](https://semver.org) on the house `-beta.N` channel (`publishConfig.tag: beta`). `scripts/release.sh` owns the rotation of `[Unreleased]` into a version heading — do not rotate by hand.

Releases older than 0.19.0-beta.1 predate this file; their record is the annotated git tags and [GitHub Releases](https://github.com/alexandremendoncaalvaro/agentic-development/releases).

## [Unreleased]

### Added

- Skills can ship executable skill scripts (`scripts/` beside `SKILL.md`), installed with the skill and SHA-tracked like any skill file (ADR-0047 Decision 1, task-0031). First consumer: `ad-audit`'s deterministic rules-resolution probe now runs as `scripts/resolve-rules.mjs` (Node, zero dependencies, no shell assumed; deterministic locale-independent listings — matching the replaced shell block under C-locale collation) on both hosts; host copies are byte-parity-tested.

- `ad-hooks` (both hosts): advisory-first debut rule — deterministic toolchain gates may block from day one; heuristic or novel gates debut warn-only with an explicit flip-to-block criterion.
- Release discipline for the kit repo (task-0032, ADR-0048): `scripts/release.sh` (version bump + changelog rotation + release commit with DCO sign-off + annotated tag, stopping before push and publish), and three `lefthook.yml` gates — an advisory changelog reminder on npm-shipped content, a blocking over-72-char commit-subject check, and a blocking pre-push guard for `main`/`cli` — plus this changelog.

### Changed

- `init` no longer edits a shared root doc unattended (ADR-0049, task-0034). When a run is non-interactive and the project's `AGENTS.md` / `CLAUDE.md` is tracked by git, the managed `Skills installed by agentic` section is not written: the write is skipped, the reason goes to stderr, and the rest of the install proceeds. An interactive run still asks as before, and a root doc that is untracked — or a directory that is not a git repository at all — is unaffected.

## [0.19.0-beta.1] - 2026-08-05

### Added

- `ad-audit` v2 (ADR-0046, both hosts): the file-coverage axis (`Files grounded:` lines, aggregated so a formally complete rule matrix can no longer hide an unread file), a `critical | major | minor | nit` severity scale, and the prose-vs-code posture ("the diff is what ships") in the reviewer contracts.
- Team-practice absorptions (ADR-0047, both hosts): deterministic rules-layer resolution probe in `ad-audit` Step 1; re-audit mode against persisted findings under `.agentic/reviews/`; opt-in pre-commit review-gate tier in `ad-hooks`; PR-history harvest as a first-class `ad-level-up` candidate source.

### Fixed

- `rootdoc`: managed AGENTS.md sections stored with CRLF line endings are recognized again; the repo also pins an LF checkout via `.gitattributes`.
- `leak-guard`: in-repo symlinks are no longer reported as escapes on Windows.
