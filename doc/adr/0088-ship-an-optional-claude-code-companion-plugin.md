# ADR-0088: Ship an optional Claude Code companion plugin beside the installer

**Status:** accepted
**Date:** 2026-10-07
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0041, its "do not package the kit as a Claude Code plugin" clause only, through the revisit trigger ADR-0041 names
**Amended by:** ADR-0090, items 3 and 8, for the work-in-progress briefing: a display of the kit's own briefing script may summarize the work in progress, and ADR-0090 is the workflow-stage segment's own decision.

## Context

ADR-0041 kept the flat `ad-` prefix and the `agentic` installer and rejected plugin packaging, naming its revisit trigger: plugin-marketplace distribution becoming a PRD-level goal, then evaluated as a Claude-Code-additional channel in its own ADR, never as a replacement for the dual-host install. On 2026-10-07 the owner made it that goal (PRD, Next tier, "Optional Claude Code companion plugin").

Two facts behind ADR-0041 have also changed. Codex now has plugins with the same `namespace:skill` shape (RESEARCH-0033 E8, E9). And Claude Code mods, which run inside the host and can draw, ship only as plugins (GROUND-0035 E1). The RESEARCH-0033 spike showed a mod can read the real context fill, draw a band with a button, and reach the desktop task server (E12 to E14) — work no skill or settings hook can do.

## Decision

We will publish an **optional Claude Code companion plugin**, `agentic-session`, from a marketplace in this repository.

1. **Additive channel.** The plugin lives at `plugins/agentic-session/`, listed by `.claude-plugin/marketplace.json` at the repository root (marketplace `agentic-development`). Users opt in with `claude plugin marketplace add alexandremendoncaalvaro/agentic-development` and `claude plugin install agentic-session@agentic-development`. The `agentic` installer, the npm package and its contents are unchanged; neither path requires the other.
2. **Host-native add-ons only.** The plugin carries what only a host-native surface can do (mods). It carries no skill and no subagent: skills stay installer-distributed under the flat `ad-` prefix, so ADR-0041's prefix and dual-host install decisions stand.
3. **Only what needs the screen or the host.** A member exists because it must draw, or must reach the host (RESEARCH-0036). A gate that needs neither stays a settings hook shared by both hosts under ADR-0083, because a mod is Claude-Code-only. Members that would duplicate a kit skill (summaries, next-step suggestions, reviewer status) or block work are out.
4. **First member: a threshold context band.** It reads the fill from `$.session.usage()` on session start, on each main-loop turn and after a compaction, and drops it when the session ends, measured toward the auto-compact point when auto-compaction is on and toward the model's window otherwise, and draws a band above the prompt with that percentage and an `AD handoff` button that submits `/ad-handoff`, only while the fill is at or above a `userConfig` number threshold (default 60, bounds 1 to 99, a design choice the owner can change in `/config`; **default now 80 and an opt-in clear-and-continue — see the 2026-10-13 and 2026-10-15 addenda**). Below the threshold it draws nothing. It intercepts no tool call and changes no prompt. The ADR-0055 `Stop` handoff nudge stays as it is: it is the portable fallback for Codex and for Claude Code without the plugin, and the band is its on-screen counterpart where the plugin is installed.
5. **One more member, planned.** A resume chip the plugin creates on a session-handoff write, through the desktop task server, with the ADR-0087 reminder kept as the portable fallback; it lands as its own slice after the band. A display-only verify-before-done receipt was considered and dropped by the owner in favour of the shadow mode of evidence gates, which is a gate concern under ADR-0083 and gets its own decision; the band may later display that shadow result.
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

## Addendum 2026-10-13: a later band and an opt-in clear-and-continue

The owner found the band on screen too often at 60% and wanted it from about
80%; the default threshold is now 80, still bounded 1 to 99 and changeable in
`/config`. The band also carries a "clear and continue" box, off by default
and remembered in the plugin's store: with it on, the `AD handoff` press
submits `/ad-handoff` as before and, once that turn ends, finds the handoff
file written since the turn began under `${TMPDIR}/agentic-handoffs`, runs
`/clear` through `$.command.run`, and submits a prompt that resumes from that
file. When no handoff file was written it clears nothing and says so
(Task 0115). A spike on Claude Code 2.1.289 showed a plugin's `$.command.run`
runs the built-in `/clear` (the session ends with reason `clear` and
continues under a new id) and that a `$.prompt.submit` after it runs in the
new session.

The member still intercepts no tool call and rewrites no prompt; the clear is
an owner-chosen action, the same kind as the existing one-press submit, not a
blocking member, so item 3's rule that a blocking member needs its own
decision is unchanged.

## Addendum 2026-10-15: the handoff runs as a command, and the failure cases

Item 4's and the 2026-10-13 addendum's "submits `/ad-handoff`" now read "runs
`/ad-handoff`": a plugin's `$.prompt.submit` of that text did nothing in the
desktop app, so the press runs the command through `$.command.run`
(Task 0116). The 2.1.295 typings say `prompt.submit` sends its text to the
model as written, so a slash command through it is not expanded; the resume
prompt is plain text and still goes through `$.prompt.submit`.

The clear runs only after a handoff turn that ended with an answer and wrote
exactly one new file in the shape `ad-handoff` names it,
`<UTC stamp>-<slug>.md`; any other name, or one with a control character or a
line break, is ignored, because the directory may be the shared `/tmp` and the
name reaches the model as the person's own words. The check is that file's
time, not who wrote it: if another session of the same person writes the one
new handoff during that turn, the band resumes from it. That limit is
accepted; `ad-handoff`'s own text is not visible to the plugin as the turn
starts. Turning the box off before that turn ends cancels the clear. When the turn
did not finish, wrote no such file or more than one, or the clear is refused,
a toast says so and the session stays as the handoff left it. When the clear
ran but the resume prompt is refused, the session is already cleared; the
toast names the handoff file to resume from. The failure notices are toasts
from the band's plugin, the channel Task 0116 uses for a press that cannot
start. The directory lookup assumes POSIX paths, as `ad-handoff`'s own
`${TMPDIR:-/tmp}` does; elsewhere it finds no file and clears nothing.
