# ADR-0041: Keep the `ad-` skill prefix; reject Claude Code plugin packaging

**Status:** proposed
**Date:** 2026-07-28
**Deciders:** Alexandre Alvaro

## Context

Claude Code supports packaging skills as plugins, which namespace their commands as `<plugin>:<skill>` (e.g. `ad:review`) and distribute through plugin marketplaces. With the kit's skill set stabilized, the question is whether to repackage the kit as a Claude Code plugin — replacing the flat `ad-` prefix convention with the plugin namespace — or keep the current model: a CLI installer (`agentic init`) that copies flat `ad-*` skills into each host's own skill directory.

Three facts weigh on the decision:

- **The kit is dual-host by contract.** Every skill ships a Claude Code variant (`src/skills/claude-code/`) and a Codex variant (`src/skills/codex/`); parity is a test-enforced authoring rule. Codex has no plugin system and no namespace equivalent — a plugin-packaged kit would be Claude-Code-only, or split into two distribution models with divergent invocation names (`ad:review` on one host, `ad-review` on the other).
- **The `ad-` prefix is itself the outcome of a settled migration.** The kit renamed every skill from `agentic-*` to `ad-*` across trees, docs, and installs; repackaging would re-open that identifier surface a second time for a cosmetic change, with a blast radius in the hundreds of files (skills, installed copies, state, narrative docs, tests).
- **Independent validation from the upstream cross-pollination pass:** Matt Pocock's skills repo adopted plugin packaging and is Claude-only as a result — confirming that the plugin route half-serves a dual-host kit rather than serving it.

## Decision

**Keep the flat `ad-` prefix and the CLI-installer distribution. Do not package the kit as a Claude Code plugin.**

The `ad-` prefix remains the kit's invocation namespace on both hosts; `agentic init` / `update` remain the distribution mechanism; no plugin manifest is added.

**Revisit trigger:** plugin-marketplace distribution becomes an explicit product goal (a PRD-level decision, not a packaging preference). If that happens, plugin packaging returns as a Claude-Code-additional channel evaluated in its own ADR — not as a replacement for the dual-host install.

## Consequences

Positive:

- Dual-host symmetry holds: one skill name, one invocation shape, both hosts. The authoring and test contracts stay single-model.
- The settled `agentic-` → `ad-` identifier surface stays settled; no second whole-kit rename.
- Distribution keeps working where the kit's users already are (any repo, any host, `npx`-able), with no marketplace dependency.

Negative / trade-offs:

- The kit forgoes plugin-marketplace discoverability and the plugin update channel on Claude Code. Accepted: distribution reach is not a current product goal (pre-1.0, dogfood-mode per the PRD), and the revisit trigger names the condition under which this reverses.
- Flat `ad-*` names occupy the user's global skill namespace rather than a plugin-scoped one. Accepted: the two-character prefix exists precisely to make collisions unlikely and the set greppable.

## Alternatives Considered

- **Package as a Claude Code plugin (`ad:` namespace)** — rejected. Claude-Code-only: breaks the dual-host contract that defines the kit; forces either dropping Codex or maintaining two divergent invocation names; re-opens the settled rename for zero current distribution benefit.
- **Hybrid: plugin for Claude Code, installer for Codex** — rejected. Two distribution models, two invocation shapes, doubled release surface — permanent complexity for a channel the product does not target today.
- **Rename to a different flat prefix** — rejected. No deficiency in `ad-` has been observed; any rename re-pays the identifier-migration cost for taste.
