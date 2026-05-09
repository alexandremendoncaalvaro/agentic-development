# ADR-0003: Use @clack/prompts for the CLI's TUI

**Status:** accepted (carrying forward from v0.1, reconfirmed for v0.2)
**Date:** 2026-05-08
**Deciders:** Alexandre Alvaro

## Context

`agentic init` (Phase 1 of the architecture in [ADR-0002](0002-two-phase-architecture.md)) presents a short interactive flow: confirm detected mode, pick which agent(s) to install skills for, confirm which optional skills to include, optionally pick a destination for files. The flow has on the order of 3–5 prompts, no animations or progress bars, and exits in seconds.

The Node.js ecosystem offers several options for building this kind of interactive surface:

- **`@clack/prompts`** — minimal, modern aesthetic, used by Vite, Astro, Nuxt installers. Built-in cancellation handling (`isCancel`), good visual polish.
- **`prompts` (terkelg/prompts)** — small, simple, slightly less polished output.
- **`inquirer`** — popular and feature-rich; older API, heavier output, larger dependency.
- **`ink`/`blessed` (full TUI frameworks)** — overkill for one-shot install flows; better suited to long-lived terminal apps.
- **Plain `readline`/stdin** — zero dependency but ugly and brittle.

The CLI runs once per project and is most often invoked via `npx`, where startup time matters. Aesthetic consistency with tools the audience already uses (Vite, Astro, Nuxt — all on `@clack/prompts`) reduces surprise.

## Decision

Use **`@clack/prompts`** as the only TUI library in `agentic init`.

Standard idioms:

- `p.intro(...)` / `p.outro(...)` for the title and final-line summary.
- `p.note(...)` for "we detected X" panels.
- `p.select(...)` and `p.multiselect(...)` for choices.
- `p.confirm(...)` for yes/no.
- `p.text(...)` for free-text input (rare in this CLI).
- `p.isCancel(...)` checked after every prompt so Ctrl-C / Esc exits cleanly.

When `process.stdout.isTTY` is false (piped, CI, scripted) or when an explicit non-interactive flag is passed (`--copy`, `--stdout`, `--out`, `--yes`), the CLI bypasses TUI entirely and uses defaults plus flags only.

## Consequences

Positive:

- Aesthetic alignment with the audience's existing tooling (Vite, Astro, Nuxt, `create-*` scaffolders).
- Compact API surface, easy to test (each prompt is a single async call returning the chosen value or a cancel symbol).
- Cancellation handling is standardized via `isCancel`.
- Already in use in v0.1.0-beta.1; carrying forward avoids unnecessary churn.

Negative / trade-offs:

- Adds ~50 KB to the package (acceptable; total package stays under 100 KB unpacked).
- Snapshot-style tests for TUI output need to mock the prompt functions; not difficult but it is one more thing to maintain.
- If `@clack/prompts` ever changes API, we adjust. The maintainer (Nate Moore) has been stable, the library is widely depended on; risk is low.

## Alternatives Considered

- **`inquirer`** — rejected. Heavier dependency tree; older default aesthetic; no built-in cancel-symbol pattern. We would gain feature breadth we do not need.
- **`prompts` (terkelg)** — rejected. Smaller and faster but less visual polish. The polish matters for first-impression UX of a beta tool.
- **`ink` (React-style TUI)** — rejected. Overkill for one-shot install. Long-lived TUI dashboards are not in scope.
- **Plain `readline`** — rejected. Cheap but visually weak; would clash with the kit's broader emphasis on a "small but polished" feel.
- **No TUI, fully flag-driven** — rejected as the default. We keep this path available (`--copy`, `--stdout`, `--out`, `--yes`) for scripting, but humans get the TUI by default.
