# Changelog

Notable changes to `@alexandrealvaro/agentic`, newest first — consumers install the published npm version, not `main`, so an unlogged change is invisible to every install. Format per [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org) on the pre-1.0 `-beta.N` channel. `scripts/release.sh` owns the rotation of `[Unreleased]` into a version heading — do not rotate by hand.

Releases older than 0.19.0-beta.1 predate this file; their record is the annotated git tags and [GitHub Releases](https://github.com/alexandremendoncaalvaro/agentic-development/releases).

## [Unreleased]

## [0.20.0-beta.8] - 2026-08-26

### Added

- `/ad-publish`, `/ad-report`, and `/ad-template-tune` add example-grounded
  publication and reporting workflows on both hosts. Drafting resolves approved
  project-over-machine-over-bundled templates, preserves factual invariants, and
  composes voice, research, PR, and artifact capabilities through their existing
  gates. Template curation remains a separate human-approved writer whose atomic
  changes bind the candidate, layer, and visibility; project templates stay
  machine-local by default through filename-scoped exclusions.

### Changed

- `/ad-publish` and `/ad-report` now repeat `/ad-voice` after every text change
  and return only the final naturalized result. `/ad-voice` always applies the
  confirmed personal profile plus either the installed Humanizer or a bundled
  compatibility baseline covering all 33 Humanizer 2.9.1 failure classes, with
  held-out receipts for both execution paths.

## [0.20.0-beta.7] - 2026-08-21

### Changed

- `/ad-voice` now silently audits every active personal-voice pattern before
  returning a draft, revising unmet instructions while preserving factual and
  destination constraints. The audit remains private unless an override would
  otherwise make the result misleading.

## [0.20.0-beta.6] - 2026-08-19

### Added

- `/ad-ground` now persists a versioned, claim-to-source evidence receipt for
  every material implementation decision. The receipt links to its governing
  task, spec, or ADR; its byte-identical host validator checks the source map
  and reports unreadable content instead of silently omitting it. A structural
  pass intentionally does not certify external source truth: review reopens
  every cited source.

### Changed

- `/ad-handoff` keeps the complete rules, artifacts, roadmap, and live state in
  its session packet while a resumed session shows only a short preparation
  receipt and a plain-language executive brief. The brief explains the final
  objective, roadmap position, current focus, definition of done, and only the
  judgment calls that genuinely need the maintainer.

## [0.20.0-beta.5] - 2026-08-14

### Changed

- `update --scope project --migrate-legacy` now gives prior project-local
  installations a safe, previewable path to the global kit: it removes only
  state-recorded pristine skills, exact historical Constitution copies, and
  the bounded generated skills section while preserving divergent files.

## [0.20.0-beta.4] - 2026-08-14

### Changed

- The default `init` and `update` installation is now user-scoped: skills and
  the Agentic Development constitution live in the user's global host
  directories, while a project-local materialization is an explicit
  `--scope project` exception. This prevents shared repositories from
  receiving kit-owned workflow files by default. Package-executed update
  commands also pin `@latest`, so a stale globally installed binary cannot
  shadow the published kit.

## [0.20.0-beta.3] - 2026-08-13

### Added

- `ad-voice` and `ad-voice-tune` add a private, machine-local personal voice
  layer on both hosts. Application is read-only and preserves factual invariants;
  calibration separates owner identity, community accommodation, and situational
  context behind source-read and per-delta write approvals. A shared deterministic
  script resolves, validates, and atomically writes the derived-only profile.
- `ad-community-docs` scaffolds or audits GitHub-conventional `CONTRIBUTING.md` and `SECURITY.md` on both hosts. It deterministically detects existing documents in the root, `.github/`, and `docs/`, preserves local policy, and asks maintainers only for security policy facts the repository cannot establish.
- `ad-drift` now reports deterministic AGENTS-to-GUIDELINES reciprocity facts for the four operational sections. It accepts designated pointers and identifies a mapped section that omits its pointer, while ignoring Markdown code examples and surfacing unreadable root documents.
- `agentic uninstall` removes only exact files recorded in the project state, preserves locally edited managed files by default, supports a no-write `--dry-run`, and requires both `--yes` and `--force` to remove a local edit unattended. It deliberately leaves host directories and project-facing root documentation in place for manual ownership review.
- `/ad-update` gives Claude Code and Codex a session-native path to preview and, when explicitly requested, safely apply the current project's Agentic Development update. It routes through the state-aware CLI, never infers `--force`, and exposes preserved edits or migration actions rather than hiding them.

### Changed

- The installer now materializes every bundled skill for each selected host (ADR-0064), rather than asking for a `poc` / `solo` / `team` / `mature` profile. Bare `init` still installs both hosts; `--agent` restricts hosts only. The profile command and state field are removed, legacy state is migrated on the next update, and skills choose relevance from the request and repository rather than installer metadata.
- Public onboarding documentation now leads with project installation, update, global CLI, user-level setup, and `/ad-next`; detailed installation, workflow, and skill references live under `doc/guides/`.
- Pre-1.0 `-beta.N` releases now publish on npm's default `latest` dist-tag
  (ADR-0066), so an ordinary package install receives the current kit version.

### Fixed

- `/ad-task` now requires a validated repository-local `Scope ref` before it
  creates a task (ADR-0067, both hosts). Its deterministic anchor probe lists
  only root definition documents, product artifacts, feature specs, and
  accepted ADRs; external paths and a Board ref alone cannot establish task
  ownership. `/ad-next` now reports unfinished tasks lacking a local Scope or
  Spec reference as orphans, while completed legacy records remain history.
- `update` now applies declared skill-name migrations safely: a retired skill is removed only when its exact known files still match a saved or historical kit fingerprint. A local edit preserves the whole retired skill rather than leaving a half-deleted customization.
- **Two bundled skill scripts behaved differently on Windows.** `ad-hooks`' `detect-hooks` emitted `.github\workflows\x.yml` into output it documents as stable JSON facts, where every other repo-relative string it reports is forward-slash, so a consumer comparing or quoting those strings got a different answer per platform. And the `AGENTIC_GH` wrapper seam in `ad-pr`/`ad-merge`'s `gh-preflight` was unusable on Windows at all: an executable wrapper cannot be authored there without compiling a binary, since a `.cmd` raises `EINVAL` when spawned without a shell (the CVE-2024-27980 mitigation) and reaching for a shell would re-parse arguments carrying user-supplied PR numbers and URLs. A Node script now counts as a wrapper and runs under the process's own node binary: still shell-free, and the same seam on both platforms.
- The `ad-audit` skill and its `audit-group-reviewer` brief (Claude Code) linked ADR-0052 with a path authored against this repo's source layout. It resolves here, where the source sits under `src/skills/claude-code/ad-audit/`, and points outside the target repo entirely once the skill installs to `.claude/skills/ad-audit/` — five levels up from an installed agent brief lands above the drive root. Both now carry the bare `ADR-0052` reference the Codex twins already used. A new guard fails any skill-source relative link that climbs above the skills root, which is the level installation flattens to, so the class cannot ship again unseen.

## [0.20.0-beta.2] - 2026-08-11

### Added

- Deterministic P2 workflow probes (ADR-0057, both hosts): `ad-hooks` detects the project stack, hook runner, and CI-versus-pre-push drift; `ad-adr`, `ad-spec`, `ad-task`, and `ad-spike` share next-artifact numbering; `ad-pr` and `ad-merge` share GitHub/Git preflight; `ad-architecture`, `ad-bootstrap`, `ad-diagnose`, and `ad-guidelines` read project signals; and `ad-rules` resolves the host's global rules. The zero-dependency Node scripts have expected-output coverage and preserve unreadable-file facts in structured output.
- `ad-release` (ADR-0063, both hosts, `solo` / `team` / `mature`): an explicitly confirmed npm release workflow around the configured local release script. It preserves the tagged release commit through `ad-merge --release`, checks local package and Git facts through byte-identical deterministic probes, publishes only from a disposable tag-pinned worktree, and resumes partial releases without retrying immutable npm publication.
- **Evidence-graded research & discovery methodology** (ADR-0058 / 0059 / 0060 / 0061, both hosts): a shared grade-of-evidence primitive plus two new skills. `WORKFLOW.md` gains §17 "Grade the Evidence, Not Just the Coverage" — a two-axis primitive (Axis 1: the E1–E5 source-strength hierarchy with provenance and a side-by-side contested block; Axis 2: a proportional Strong / Conditional / Insufficient-spike-first verdict whose bar scales with stakes × irreversibility). `ad-ground`'s confidence checkpoint consumes it additively (quick mode = the prior coverage behavior, still the default; full mode = the graded appraisal), with an explicit Insufficient → `ad-spike` seam. **`ad-research`** (Front A, spec-driven, `solo` / `team` / `mature`) turns an open question into an evidence-graded study at `doc/research/NNNN-<slug>.md` via the Evidence-Based loop (Ask / Acquire / Appraise / Apply / Assess) plus the scientific method when the question is measurable, reusing `ad-ground` for Acquire and graduating a binding conclusion into an ADR. **`ad-derisk`** (Front B, workflow-operational, `solo` / `team` / `mature`) is a pre-construction de-risking orchestrator — enumerate a defined task's unknowns into a risk register, retire each with the skill that fits (`ad-ground` / `ad-spike` / `ad-tdg` / `ad-grill-me`), grade per §17, and stop when residual technical risk falls below the non-technical risks; it adds no new research tools and writes no artifact of its own. `doc/research/` is added to the Documentation Discipline no-dates exemption (§2 rule 2).
- `ad-hooks` gains a **session-lifecycle hooks** tier (ADR-0055, task-0040, Claude Code): a `Stop` hook that, once per long session and only above a measured transcript-size threshold (~750 KB, env-overridable via `AD_HANDOFF_NUDGE_THRESHOLD_BYTES`), emits a user-facing `systemMessage` nudging the user to run `/ad-handoff` before context is compacted or lost — so the handoff no longer depends on remembering to ask for it. Verified against the official hooks docs: `PreCompact` cannot inject a message, and a `Stop` hook returning `systemMessage` on exit 0 with no `decision` stops the turn normally (no loop). Shipped as a Node zero-dependency skill script, byte-identical across host trees and fail-silent on any bad input; Codex wiring is out of scope (compact-hook context-injection parity is undocumented). The kit's own repo is dogfood-wired via `.claude/settings.json`.
- `ad-roadmap` (both hosts, ADR-0053, task-0038): a read-only progress rollup for a decision-maker. It reconciles the PRD `## Roadmap` tiers against implementing specs and tasks into an overall percentage plus a per-tier done / in progress / blocked / remaining breakdown, so the "how much is done, how much is left, are we on track" question has a self-contained, plain-language answer without reading a diff. A different question from `ad-next` (what to do next, for the practitioner) and `ad-prd` (which authors the roadmap); it routes to them rather than duplicating either. Installed at `solo` / `team` / `mature` (not `poc`, which has no plan to measure).
- `ad-question-me` (both hosts, ADR-0054, task-0039): a value-first questioner that renders no verdict. It absorbs the value the author intends, then raises the questions they cannot see from inside the work — obvious-thing-missed, drift-from-goal, weak grounding, unverified premise — ranked with the killer question first. Its defining rule: a question surfaces ONLY when it is the owner's judgment call or genuinely un-groundable after a real code / docs / references pass; anything answerable from the code, docs, or spec it resolves itself instead of asking. Distinct from `ad-grill-me` (pre-work, sharpening a fuzzy ask, with recommended answers) and from `ad-review` / `ad-audit` (which render verdicts at the gate); it raises questions and feeds them. Installed at `solo` / `team` / `mature` (not `poc`).
- `ad-audit` gains a serial, orchestrator-only **empirical-falsification lane** (ADR-0052, task-0037, both hosts): when a reviewer finding claims a specific test or suite *cannot fail* on a specific production change, the orchestrator runs the mutation and watches the suite rather than settling the claim by argument — apply the minimal mutation, run the CI-exact filter, restore the tree, and trust a green only if the mutation demonstrably took effect and the run completed. It fires solely on that negative-coverage trigger, runs only after the parallel reviewers finish (never concurrent), and the reviewer briefs forbid mutation and hand the trigger up. Aligns with ADR-0045's cited differential-execution mitigation; determinism, not added adversarial pressure.
- The installer offers to keep its freshly-installed, still-untracked kit files out of a shared repo's commits by adding them to `.git/info/exclude` — per-clone and never committed, unlike `.gitignore` (ADR-0051 Decision 4). Entries are by filename, never by directory, so a mixed-ownership `.claude/agents/` never hides a team-owned file from git. Interactive `init`/`update` offer it; non-interactive leaves the files and says so. The install summary also notes when a user-level agentic install already covers the skills.

### Changed

- `ad-pr` and `ad-merge` reuse the GitHub executable validated by preflight for every later GitHub operation, including authentication recovery, draft handling, checks, reviews, and merge. Target-repository merge-policy lookup now uses the GitHub CLI's supported positional repository syntax.
- `init` no longer edits a shared root doc unattended (ADR-0051, task-0036). When a run is non-interactive and the project's `AGENTS.md` / `CLAUDE.md` is tracked by git, the managed `Skills installed by agentic` section is not written: the write is skipped, the reason goes to stderr, and the rest of the install proceeds. This covers both write paths — appending a new section and refreshing a stale one, the latter of which previously had no confirmation callback wired at all. For a tracked root doc, both interactive prompts — appending a new managed section and regenerating a stale one — now name the sharing risk (the section becomes visible to everyone who clones the repo) and default to declining instead of accepting; the previous wording spoke only to content being preserved, which reassures about the wrong risk. A root doc that is untracked, or a directory that is not a git repository at all, keeps the previous prompt and default. `--force-root-doc` is scoped to the tracked case: on an untracked doc it never overwrites a hand-edited section — only `--force` does. `init --force-root-doc` overrides the skip for callers that do want the section in a shared file; it is a distinct flag from `update --force`, which means "overwrite user-edited files on conflict".

### Removed

- Legacy top-level `prompts/` and `templates/` directories no longer ship. Their copies never installed into consumer skill directories and could leave dangling references, the failure class addressed by ADR-0056.

### Fixed

- Updated the development-only `js-yaml` dependency to 4.3.1, removing the audited high-severity quadratic CPU denial-of-service vulnerability in affected 4.x releases.
- Bare non-interactive `init` now installs both host trees (ADR-0062, task-0043). An empty repository or one with only `.claude/` previously received Claude Code skills only, silently omitting the supported Codex install at `.agents/skills`; explicit `--agent claude-code`, `codex`, and `both` selections remain unchanged.
- `ad-audit` SKILL.md on both hosts names the machine store by its canonical noun ("machine store", per CONTEXT.md) — four spots said "curated store", the alias the glossary exists to retire.

## [0.20.0-beta.1] - 2026-08-06

### Added

- A read contract in `WORKFLOW.md` §1 (*Reading order*), delivered by `ad-philosophy` on both hosts (ADR-0049 Decision 5, task-0034): the definition layer always, an area's decision records only when the change touches that area, the evidence behind a decision only when the decision looks wrong. Volume of reading is not comprehension, and nothing previously told an agent where to stop.
- `init` and `update` now write `WORKFLOW.md` and `WORKFLOW-FLOWS.md` to the target repository root (ADR-0049 Decision 6). Installed skills cite the constitution by section and the installer's own hints print those section numbers, so every one of those references previously pointed at a file the target did not have. A target copy you have edited is **reported and skipped**, never overwritten — `--force` replaces it, matching the default skill installs already hold. Project-specific rules stay in `AGENTS.md` / `GUIDELINES.md`.
- Partial supersession has a declared shape: `Amends:` and `Amended by:` header fields in the ADR template and `ad-adr` on both hosts (ADR-0049). `Status:` still covers whole-document supersession; the pair covers the case it cannot express, and being a pair is what makes the relation checkable without reading prose.
- `WORKFLOW.md` §2 rule 10 permits one state projection per append-only layer, inside that layer's own directory — a screen naming which records still bind and what corrected the rest. A projection that only lists records remains a forbidden duplicate index. First use: `doc/adr/PROJECTION.md` in this repo.
- `ad-drift` (both hosts): an amendment-pair integrity check, and a check for a state projection contradicting a live record. A missing projection is not a finding — rule 10 permits one, it does not require one.

- Skills can ship executable skill scripts (`scripts/` beside `SKILL.md`), installed with the skill and SHA-tracked like any skill file (ADR-0047 Decision 1, task-0031). First consumer: `ad-audit`'s deterministic rules-resolution probe now runs as `scripts/resolve-rules.mjs` (Node, zero dependencies, no shell assumed; deterministic locale-independent listings — matching the replaced shell block under C-locale collation) on both hosts; host copies are byte-parity-tested.
- `ad-audit` content anchors (task-0033, both hosts): the rules-resolution probe emits a sha256 anchor per machine-store and project-layer rule file (an unreadable file reports `UNREADABLE:<code>` instead of killing the probe), audit handoffs carry the expected anchors with each file's absolute path, each reviewer echoes `Anchors: <file>=<sha256>, target=<SHA>` alongside `Files grounded`, and aggregation treats an anchor mismatch or absence as UNVERIFIED verdicts (re-dispatch, or mark the group unaccounted). A stale or wrong-tree read fails the comparison mechanically; a matching echo is necessary, not sufficient, and the trail file keeps the expectations for re-checking. Framing per ADR-0045: verification directed at an artifact class — no new lens, no added pressure.

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
