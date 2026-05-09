# ADR-0006: `ARCHITECTURE.md` lives at the repo root

**Status:** accepted
**Date:** 2026-05-09
**Deciders:** Alexandre Alvaro

## Context

The kit generates `ARCHITECTURE.md` as one of its first-class operational artifacts (paired with ADRs in `doc/adr/`). [Task 0001](../tasks/0001-dogfood-agents-md-and-architecture-md.md) wrote one for this repo and placed it at the repo root, mirroring the existing `prompts/architecture.md:7` instruction (`produce ARCHITECTURE.md at the repo root`) and the [v0.2 plan](../v0.2-cli-plan.md) §83/172. That choice was implicit — no ADR justified it. Reasonable question raised on review: should `ARCHITECTURE.md` instead live under `doc/`, alongside `doc/adr/` and `doc/tasks/`, since it is documentation?

Two industry patterns exist:

* **Repo root (matklad pattern).** Origin: [Aleksey Kladov, "The ARCHITECTURE.md File" (2021)](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html). Adopted by the Rust compiler, Cargo, rust-analyzer, Tokio, Bevy, Astral/uv, Deno, esbuild, Helix editor — the modern OSS dev-tooling cluster. Thesis: high-signal file, first read by new contributors, must be as visible as `README.md`.
* **`docs/` directory (diátaxis / framework pattern).** Adopted by the Linux kernel (`Documentation/`), Rails (`guides/`), Django (`docs/`), Kubernetes (`docs/`), TensorFlow (`docs/`). Thesis: heavy framework or research project, multiple doc types coexist, single home reduces root clutter.

LLM-tooling ecosystem signal:

* `AGENTS.md` — repo root by [agents.md](https://agents.md) spec, mandatory.
* `CLAUDE.md` — repo root, [Anthropic skills convention](https://code.claude.com/docs/en/skills).
* `DESIGN.md` — repo root, [Google Labs DESIGN.md](https://github.com/google-labs-code/design.md).
* `.cursorrules` / `.cursor/rules/` — repo root.
* `README.md` — repo root, universal.

Every operational doc the agent reads first lives at the repo root. The kit's own [WORKFLOW.md:37](../../WORKFLOW.md) treats `ARCHITECTURE.md` as a binding spec on the same plane as `DESIGN.md` and ADRs.

The kit's audience is developers building dev tooling and small-to-medium services with LLM assistance — the cluster that adopts the matklad pattern, not the cluster that adopts the framework `docs/` pattern.

## Decision

`ARCHITECTURE.md` lives at **the repo root**, paired with `AGENTS.md`, `README.md`, `DESIGN.md`. The convention applies to:

1. **This kit's own `ARCHITECTURE.md`** (already at the root since [Task 0001](../tasks/0001-dogfood-agents-md-and-architecture-md.md) close-out).
2. **Any project the kit's `agentic-architecture` skill generates** (skill ships in [Task 0003](../tasks/0003-universal-skills.md)). Skill instructions and `prompts/architecture.md:7` already encode this; this ADR makes it binding.

`doc/` remains the home for content with lifecycle and versioning: ADRs (`doc/adr/NNNN-*.md`), task tracking (`doc/tasks/NNNN-*.md`), and planning documents (`doc/v0.2-cli-plan.md`).

The split rule, written down so future skills inherit it without re-deciding:

| Lives at repo root | Lives under `doc/` |
| --- | --- |
| `README.md` | `doc/adr/NNNN-*.md` (decisions with status lifecycle) |
| `AGENTS.md` (and/or `CLAUDE.md`) | `doc/tasks/NNNN-*.md` (task tracking, [ADR-0004](0004-file-based-task-tracking.md)) |
| `ARCHITECTURE.md` | `doc/<plan-or-design-doc>.md` (working notes, plans, drafts) |
| `DESIGN.md` (UI projects) | |
| `WORKFLOW.md` (kit philosophy, when present) | |

Heuristic: read-first operational specs at the root; lifecycle/versioned/working content under `doc/`.

## Consequences

Positive:

- Aligns with the matklad convention adopted by the kit's target audience (dev-tooling cluster).
- Discoverability — agents and humans both find the file at the predictable path `<root>/ARCHITECTURE.md`. No path-guessing in skill prompts.
- Internal consistency with `AGENTS.md`, `README.md`, `DESIGN.md`, `WORKFLOW.md`.
- Clear split rule for future skills (`agentic-architecture`, `agentic-design`, `agentic-skill`, etc.).

Negative / trade-offs:

- Repo root grows by one entry. Acceptable; `ARCHITECTURE.md` is one file, not a directory, and it is exactly the kind of file root visibility is for.
- Projects that already use `docs/` for everything (frameworks, large enterprise codebases) get a small inconsistency. The skill should still place `ARCHITECTURE.md` at the root by default; if a project objects, the user can move it manually — but the skill does not detect existing `docs/` and reroute, because doing so would create two split rules and defeat the convention.

## Alternatives Considered

- **`doc/ARCHITECTURE.md`** — rejected. Symmetric with `doc/adr/` but breaks the matklad convention and clusters operational docs in two places (root for AGENTS/DESIGN/WORKFLOW, `doc/` for ARCHITECTURE). Inconsistent.
- **Per-project detection** (use `docs/` if `docs/` exists, else root) — rejected. Two split rules, surprising agent behavior, hard to encode in a one-page skill prompt.
- **Both copies** — rejected. Source-of-truth ambiguity; no benefit over a single canonical location.
