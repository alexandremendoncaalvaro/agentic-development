# PRD — `@alexandrealvaro/agentic`

Status: accepted
Created: 2026-05-11
Updated: 2026-05-24
Owner: Alexandre Alvaro

## Product

`@alexandrealvaro/agentic` is a CLI + manual-prompt kit that scaffolds the engineering-discipline artifacts (operational guides, product / domain / spec / architecture / task / decision documents, plus workflow-operational skills) an LLM-assisted engineer needs to ship production code without losing rigor across sessions.

## Target User

**Engineers using LLMs to ship production code** — specifically engineers who treat the LLM as a force multiplier rather than a generator, and who already practice (or want to practice) the disciplines amplified by the kit: specification before code, fresh-context review, deterministic quality gates, behavior-shaped tests, ubiquitous-language anchoring, architectural-boundary preservation. Excludes vibe coders (the kit's posture is incompatible — Steve Rogers framing per `WORKFLOW.md` preamble), and excludes pure product / design roles (this is engineering scaffolding, not product strategy).

## Problem

LLM-assisted engineering produces "almost right but not quite" output as the dominant failure mode ([WORKFLOW.md §12](../../WORKFLOW.md), grounded in JetBrains *DevEcosystem 2025* and Stack Overflow *2025 Developer Survey*). Three concrete failure surfaces:

- **Specification drift.** Without anchored specs, the agent re-invents requirements per session; reviews catch surface bugs but miss spec violations.
- **Vocabulary drift.** Without a ubiquitous-language artifact, the agent uses different paraphrases for the same concept across sessions; variable names, file names, and prose disagree.
- **Discipline gaps that compound silently.** Without deterministic gates (hooks, CI, fresh-context review), undisciplined outputs ship; bug density grows over time.

The cost of the status quo: engineers either (a) hand-roll discipline scaffolding per project, accepting per-project drift, or (b) skip the scaffolding and accept the bug-density curve. Neither scales past a single prototype.

## Goals

Definitional. Tracking of whether each goal is met lives in per-feature tasks.

- Install a complete artifact stack in one command (`agentic init`) — AGENTS, WORKFLOW, GUIDELINES, ARCHITECTURE, ADRs, tasks, skills.
- Stay in sync with upstream kit changes via state-aware three-way diff (`agentic update`).
- Scale discipline to project maturity via four profiles (`poc` / `solo` / `team` / `mature`); never pre-impose ceremony.
- Cover both major agentic hosts identically (Claude Code + Codex CLI) via `agents.md` open standard.
- Ship every recommended skill as a deterministic, scan-first generator that pre-fills detected fields and asks only the genuine gaps.
- Provide an unbroken happy path across the six-layer artifact stack: Constitution → Domain → Product → Spec → Plan/Decisions → Code.

## Non-goals

- **Not a vibe-coding accelerator.** The kit's posture rejects undisciplined LLM use; users who want raw generation speed are not the audience.
- **Not a product-strategy tool.** Product framing (this PRD) is *upstream* of engineering; the kit captures it but does not generate strategy. PMs / product leads do not interact with the kit directly.
- **Not a hosted SaaS.** CLI is offline; no network calls, no telemetry, no account. Future hosted variants are a separate product if they exist at all.
- **Not framework-coupled.** Kit is agent-host-agnostic via `agents.md`. No IDE-plugin parity, no editor extensions in the core kit.
- **Not opinionated about implementation language.** Skill generators produce language-aware artifacts (naming conventions, error idioms, test framework detection) but the kit itself ships as Node-only minimal CLI.

## Success Metrics

Definitional. Product-level KPIs that count, and the measurement source for each. Current values are not tracked here.

- **Idempotent install across all four profiles.** Source: `npm test` integration suite + `.github/workflows/test.yml` matrix (Node 20 / 22).
- **Cross-host parity.** Source: `test/skills.test.js` frontmatter + manifest validation; every shipped skill installs identically for Claude Code and Codex.
- **Documentation discipline holds in the kit itself.** Source: `/ad-audit` runs at release boundaries; zero rule-1 / rule-2 / rule-5 / rule-9 / rule-10 violations.
- **External adoption signal.** Source: `npm view @alexandrealvaro/agentic` + GitHub Insights. No internal target before 1.0 — pre-1.0 is dogfood-mode.
- **Industry-canon coverage breadth.** Source: ADR review (manual); every new layer or skill cites the canonical source(s) in its ADR's References section.

## Roadmap

Multi-feature scope tiers. No status annotations — implementation tracking lives in `doc/tasks/`. Each line names a feature and the user value it carries.

- **MVP tier — Layer 1 Constitution trinity.** `ad-bootstrap` (AGENTS), `ad-guidelines` (GUIDELINES), `WORKFLOW` (kit-shipped).
- **MVP tier — Layer 2 Domain.** `ad-domain` lazy `CONTEXT.md` lifecycle.
- **MVP tier — Layer 3 Product.** `ad-prd` lazy `doc/product/PRD.md` lifecycle.
- **MVP tier — Layer 4 Spec.** `ad-spec` feature-level specs at `doc/specs/`.
- **MVP tier — Layer 5 Plan/Decisions.** `ad-architecture`, `ad-adr`, `ad-task` — ARCHITECTURE, ADRs, tasks.
- **MVP tier — Workflow-operational core.** `ad-philosophy`, `ad-ground`, `ad-grill`, `ad-spike`, `ad-tdg`, `ad-tdd`, `ad-diagnose`, `ad-review`, `ad-next`, `ad-audit`, `ad-deepen`, `ad-commit`, `ad-pr`, `ad-merge`, `ad-hooks`.
- **Next tier — AGENTS ↔ GUIDELINES reciprocity automation.** `ad-bootstrap` writes pointer stubs (instead of inline rules) when `GUIDELINES.md` exists; `ad-audit` flags duplication.
- **Next tier — Release skill (`ad-release`).** Version-bump, changelog, npm publish, GitHub release. Replaces the current manual flow.
- **Next tier — Community-facing docs (`CONTRIBUTING.md` / `SECURITY.md`) scaffolds.** GitHub-conventional companion to `AGENTS.md`.
- **Later tier — Per-language guideline presets.** `ad-guidelines` ships canned templates for Rust / Python / Go / TypeScript / C++ beyond the current per-language detection.
- **Later tier — Skill eval harness.** Trajectory eval per `WORKFLOW.md` §13, applied to each shipped skill against a fixture corpus.
- **Later tier — Promotion to `main` + 1.0 release.** `cli` branch graduates when MVP feature surface is complete, audit reports clean across own dogfood, and pre-1.0 gaps (lint/format wiring, secret-scan, dep-audit per `GUIDELINES.md` §7 and §12) are closed.

## Constraints

What binds across the entire product. Skip the section if none.

- **Technical:** Node ≥20 (ESM, `node:util` `styleText`). Agent-host-agnostic via `agents.md` open standard; supports Claude Code and Codex today. No framework dependency in the kit (`commander` + `@clack/prompts` only).
- **Business:** Solo maintainer; pre-1.0 beta. License: MIT. No paid tier, no telemetry, no account.
- **Regulatory:** None today. Future hosted variants (if any) would need their own posture.
- **Operational:** Kit content ships via `package.json#files`. Every shipped skill must pass `test/skills.test.js` (frontmatter, summary cap, manifest). No skill ships without an accepted ADR.

## Open Questions

Deferred decisions. Each becomes a future ADR, a spec-time decision, or an explicit punt with rationale. Never delete a question — append a resolution paragraph.

- **When does `cli` promote to `main` and tag 1.0?** Criteria not yet locked. Candidates: (a) all MVP roadmap items shipped + own-dogfood audit clean; (b) external adoption threshold reached. Decision needs ADR.
  - **Partial resolution (2026-05-24):** the `cli` branch was consolidated into `main` — `main` is now the single source of truth for kit + CLI; npm beta publishes from `main`. The 1.0-tag criterion remains open; this only collapses the prior two-branch model. See README.md "Branch layout" and the consolidation commit `b69056e`.
- **Should the kit ship IDE-native integrations** (VS Code extension, JetBrains plugin) or stay agents.md-based? Current posture is the latter — keep the kit small, let host integrations be community contributions. Reconsider if adoption stalls on host-onboarding friction.
- **Telemetry policy when going hosted.** If a hosted variant ships, opt-in telemetry vs strict offline. Decision deferred until a hosted variant is on the roadmap (not currently).
- **How to measure "kit landed correctly" without telemetry.** Indirect signals (test green at install, audit clean) cover *correctness*; do not cover *fit*. Survey or community-channel signal is the open question.
- **Whether `doc/specs/` becomes a universal artifact for the kit itself**, or work continues to be tracked exclusively as `doc/tasks/` per the existing pattern. The kit currently does not have a single feature spec — only tasks.
  - **Resolution:** `doc/specs/` is universal for the kit going forward. Two backfilled specs (ad-handoff and two-axis ad-review) shipped and were swept into git history per `/ad-archive`; consult `git log --diff-filter=D -- doc/specs/` for the archived ledger. Future feature-level work on the kit lands a spec under `doc/specs/` before tasks decompose against it, per the `team` profile expectation. Tasks carry `Spec ref` to their parent spec.

## Related

- **ADRs:** see [`doc/adr/`](../adr/) for the canonical ledger.
- **Specs:** see [`doc/specs/`](../specs/) for live specs. Shipped specs archived per `/ad-archive`; recover via `git log --diff-filter=D -- doc/specs/`.
- **Tasks:** see [`doc/tasks/`](../tasks/) for the canonical ledger.
- **Supersedes:** none.
