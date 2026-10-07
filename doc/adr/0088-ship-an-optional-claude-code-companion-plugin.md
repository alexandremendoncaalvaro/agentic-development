# ADR-0088: Ship an optional Claude Code companion plugin beside the installer

**Status:** proposed
**Date:** 2026-10-07
**Deciders:** Alexandre Alvaro

## Context

ADR-0041 kept the flat `ad-` prefix and the `agentic` installer and rejected plugin packaging, naming its revisit trigger: plugin-marketplace distribution becoming a PRD-level goal, then evaluated as a Claude-Code-additional channel in its own ADR, never as a replacement for the dual-host install. On 2026-10-07 the owner made it that goal (PRD, Next tier, "Optional Claude Code companion plugin").

Two facts behind ADR-0041 have also changed. Codex now has plugins with the same `namespace:skill` shape (RESEARCH-0033 E8, E9). And Claude Code mods, which run inside the host and can draw, ship only as plugins (GROUND-0035 E1). The RESEARCH-0033 spike showed a mod can read the real context fill, draw a band with a button, and reach the desktop task server (E12 to E14) — work no skill or settings hook can do.

## Decision

On acceptance this ADR amends ADR-0041's "do not package the kit as a Claude Code plugin" clause only, through the revisit trigger ADR-0041 names; the `Amends` and `Amended by` headers land in the accepting commit.

We will publish an **optional Claude Code companion plugin**, `agentic-session`, from a marketplace in this repository.

1. **Additive channel.** The plugin lives at `plugins/agentic-session/`, listed by `.claude-plugin/marketplace.json` at the repository root (marketplace `agentic-development`). Users opt in with `claude plugin marketplace add alexandremendoncaalvaro/agentic-development` and `claude plugin install agentic-session@agentic-development`. The `agentic` installer, the npm package and its contents are unchanged; neither path requires the other.
2. **Host-native add-ons only.** The plugin carries what only a host-native surface can do (mods). It carries no skill and no subagent: skills stay installer-distributed under the flat `ad-` prefix, so ADR-0041's prefix and dual-host install decisions stand.
3. **Only what needs the screen or the host.** A member exists because it must draw, or must reach the host (RESEARCH-0036). A gate that needs neither stays a settings hook shared by both hosts under ADR-0083, because a mod is Claude-Code-only. Members that would duplicate a kit skill (summaries, next-step suggestions, reviewer status) or block work are out.
4. **First member: a threshold context band.** It reads the fill from `$.session.usage()` on session start and on each main-loop turn, measured toward the auto-compact point when auto-compaction is on and toward the model's window otherwise, and draws a band above the prompt with that percentage and a `Handoff` button that submits `/ad-handoff`, only while the fill is at or above a `userConfig` number threshold (default 60, bounds 1 to 99, a design choice the owner can change in `/config`). Below the threshold it draws nothing. It intercepts no tool call and changes no prompt.
5. **Two more members, planned.** A resume chip the plugin creates on a session-handoff write, through the desktop task server, with the ADR-0087 reminder kept as the portable fallback; and a display-only receipt row when files were edited after the last test run, computed from tool calls and never fed to the model. Each lands as its own slice after the band.
6. **Claude Code only, by nature.** Codex has no drawing surface for mods (RESEARCH-0033 E9); a Codex companion is out of scope until one exists.
7. **Version floor stated.** The plugin needs Claude Code 2.1.287 in the terminal or 2.1.286 in the desktop app; the install instructions say so.
8. **Anything that blocks is its own decision.** An outward-action approval pane and a workflow-stage segment (RESEARCH-0036) each need their own ADR; the pane blocks, so ADR-0083 applies.

## Consequences

Positive:

- The owner gets the context band and one-press handoff now, on the documented install path, with no change to how the kit installs.
- A home exists for later host-native add-ons without reopening packaging each time.

Negative / trade-offs:

- The mod API is early access; a Claude Code release can break the band until the plugin is updated. Accepted: opt-in, small API surface, and the band fails closed (nothing drawn) when a reading is missing.
- Automated tests cover the plugin's logic and manifests, not the engine run, because this machine's terminal cannot run `claude plugin test`; the drawing is verified live in the desktop app.
- Two install paths to document. Accepted: the plugin is a short, separate section.

## Alternatives Considered

- **Keep ADR-0041 as is; ship nothing** — rejected: the owner set the product goal, and the band cannot be built from skills or settings hooks.
- **Package the whole kit as a plugin** — rejected: ADR-0041's reasons (dual-host parity, the flat prefix, the installer's three-way diff) still hold for skills.
- **A personal mod outside the kit** — rejected by the owner, who wants it in the kit.
- **Show the band always** — rejected by the owner: it should appear only when it is useful.
