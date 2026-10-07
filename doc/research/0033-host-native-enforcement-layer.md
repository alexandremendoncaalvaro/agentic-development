# RESEARCH-0033: Should the kit specialize per host, and can Claude Code mods enforce its gates?

**Status:** draft
**Created:** 2026-10-06
**Question:** To get the most from each host, should the kit diverge its skills per host, add a host-native enforcement layer (hooks, plugins, Claude Code mods), or keep parity as today; and which kit gates that now depend on the agent remembering can a host mechanism make reliable?
**Stakes:** medium times reversible (a packaging change would be costlier to reverse than a hook)
**Confidence:** Conditional

## Conclusion and confidence

Keep one skill body per host as today, and add a thin, optional, host-native enforcement layer in three measured steps. Do not diverge the skill bodies further.

The owner's motivating case, the handoff chip, shows why. In an exploratory measurement on the owner's own Claude Code transcripts (a private corpus a reviewer cannot reopen), every desktop session that actually invoked `/ad-handoff` offered the chip (6 of 6). The one desktop handoff without a chip was written without invoking the skill, so the chip instruction never reached the model. The failure is "the skill did not run", not "the agent ignored the text". More or different skill text cannot fix that. A trigger on the effect (a handoff file being written) can.

1. **Now, inside current decisions.** Add a `handoff-chip` member to the `ad-hooks` session tier: a `PostToolUse` hook on writes under the handoff directory that tells the model to offer the resume chip where the host has one and to print the path and resume prompt where it does not. Pair it with a handoff-shape check so it fits ADR-0083's validator wording, or record it as a nudge in a short ADR as ADR-0055 and ADR-0074 did. In the same slice: make the chip a numbered step in `ad-handoff`, have the Stop nudge and the checkpoint route any handoff through `/ad-handoff`, correct the Stop nudge (its `systemMessage` reaches the user, not the model), and fix the stale "Codex has no AskUserQuestion primitive" lines.
2. **Next, an unshipped spike.** Load a mod under `--plugin-dir` on the desktop app: a toast driven by the real context percentage, a band with a one-press handoff button, and a workflow-stage band. Measure chip rate and handoff timing against the hook-only baseline from step 1.
3. **Only if the spike shows a gain.** An ADR that amends ADR-0041 on the new facts (Codex now has plugins with the same `namespace:skill` shape) and allows an optional companion plugin per host, additive to the installer and never replacing it.

Blocking gates such as "no pull request without an audit" start as host permission `ask` rules, which need no kit ADR. A `PreToolUse` deny needs its own ADR under ADR-0083.

Conditional because the chip measurement is small (n = 7 desktop handoffs, one machine, no Codex sessions) and the mod API is early access. The named mitigation is the step-1 before/after measurement and the step-2 spike, both reversible.

## Question and scope

Options compared: (a) parity, host primitives as optional sentences inside skills (status quo); (b) a host-native add-on layer of hooks now and optionally plugins or mods later; (c) diverged skill bodies per host. Deciding criterion: which option makes the memory-dependent gates reliable at the lowest drift and maintenance cost while keeping the skills-only install valid. Binding context: ADR-0041 (no plugin packaging), ADR-0083 (runtime layer limited to feedback gates), ADR-0055 and ADR-0074 (nudge hooks), ADR-0085 (effects gated inside skills).

## Hypothesis

The chip is missed because the agent ignores the skill text. Prediction if true: sessions that invoked `/ad-handoff` on a chip-capable host would show misses. Result: refuted on the available corpus. Zero misses in 6 invocations; the only miss bypassed the skill.

## Method

A research sidecar read the binding ADRs and research (0041, 0055, 0073, 0074, 0083 to 0085; RESEARCH-0026, 0027, 0030; Spec 0008), diffed the two host skill trees, and grepped host primitives. It fetched the Claude Code hooks, skills, plugins and mods documentation and the Codex hooks, plugins and config documentation on 2026-10-06, read the mod typings bundled with the running desktop engine, and read `openai/codex` source through the GitHub API. It measured chip adherence with two read-only Node scripts over `~/.claude/projects/*/*.jsonl`, counting `ad-handoff` Skill calls, writes to handoff files, and `spawn_task` calls after the write. Claims are graded per WORKFLOW §17.

## Evidence

- **E1 — Chip adherence by host and path.** Desktop: 7 handoffs written, 6 through `/ad-handoff`, 6 chips, all carrying the handoff path; 1 written without the skill, no chip, with `spawn_task` available. Conductor: 24 handoffs, 0 chips, no `spawn_task` tool in any of 40 transcripts (correct). **Strength: Medium, exploratory**: the corpus is the owner's private session store and the scan scripts were not retained, so a reviewer cannot reproduce the count; small n.
- **E2 — Skill-frontmatter hooks cannot fix it.** They register only when the skill is invoked (code.claude.com/docs/en/skills; ADR-0074 line 48 rejected them for the same reason). **Strength: High.**
- **E3 — The Stop nudge text goes to the user, not the model.** `ad-hooks/scripts/handoff-nudge.mjs` builds the message at lines 89-90 and emits it as `systemMessage` at line 159. **Strength: High.**
- **E4 — Claude Code hooks.** About 30 events; `PostToolUse` returns `additionalContext` but cannot block; handler types include `command`, `http`, `mcp_tool`, `prompt`, `agent`. code.claude.com/docs/en/hooks. **Strength: Medium.**
- **E5 — Mods.** Plugins whose hooks module exports `register(on, options)`. They can render panes, a band above the prompt, toasts and a status line; hold, rewrite or answer tool calls; rewrite a skill's expanded text (`skill.prompt`); read the real context percentage (`$.session.usage()`); append model-visible rows; submit a prompt; open the native question dialog. On by default from Claude Code 2.1.287 (terminal) and 2.1.286 (desktop); not sandboxed. code.claude.com/docs/en/plugins/mods; bundled `plugin-authoring` typings. **Strength: High.**
- **E6 — Mod API stability.** The bundled reference says the API is early access and moves between releases. **Strength: High.**
- **E7 — Owner's toolchain.** Terminal `claude` is 2.1.227, below the mod floor; the desktop app bundles 2.1.286. **Strength: High.**
- **E8 — Codex has plugins with symmetric namespacing.** `.codex-plugin/plugin.json` bundles skills, MCP servers, apps and hooks; plugin skills are named `namespace:skill`. `openai/codex` `codex-rs/plugin/src/manifest.rs`, `codex-rs/ext/skills/src/loader/namespace.rs` lines 176-179. Codex also reads the agent-plugins.org 1.0.0 schema. **Strength: High.** This removes ADR-0041's main factual premise; its decision and revisit trigger are untouched.
- **E9 — Codex has no UI extension surface.** Status line takes built-in items only; `notify` and `tui.notifications` exist; no panes, bands or render hooks. **Strength: Medium** (not exhaustively verified).
- **E10 — Codex has a structured-question tool.** `request_user_input`, one to three questions, available in some collaboration modes (`codex-rs/core/src/tools/handlers/request_user_input_spec.rs`). The kit's "Codex has no AskUserQuestion primitive" is partly stale. **Strength: High** for existence; default-mode availability unverified.
- **E11 — Host trees already differ in every `SKILL.md`** (115 differing entries in `diff -rq`). Option (c) would add drift cost without addressing the measured failure. **Strength: High.**

### Gates that depend on memory

| Gate | Mechanism | Class |
| --- | --- | --- |
| Offer the chip at handoff | `PostToolUse` on handoff writes | feedback (+ nudge text) |
| Route ad hoc handoffs through the skill | reword Stop nudge and checkpoint | nudge |
| Review after a slice | hook on `git commit` against a review receipt | feedback once a receipt exists |
| Audit before a pull request | permission `ask` rule; `PreToolUse` deny only under its own ADR | human gate / blocking |
| No outward post without approval | permission `ask` rules on `gh pr create`, comment, merge, chat sends | human gate |
| Handoff when context runs low | mod reading the real context percentage | UI (spike) |
| Answer in the user's language | not deterministically enforceable | none |

### Contested

None between sources. The open trade-off is internal: the mod layer's value against its early-access API churn and Claude-only reach. The step-2 spike decides it.

## Limitations and what would reverse the conclusion

- Small chip corpus; Codex sessions not in the store. A larger corpus showing misses inside `/ad-handoff` runs would shift weight back to skill text.
- Unverified: whether a mod's `$.mcp.call` can reach the desktop `spawn_task` server (settled by the spike below, E14); whether Claude Code reads agent-plugins.org manifests; exact event keys for skill-frontmatter hooks; whether Codex's status line accepts a custom command.
- A spike showing no gain from mods over hooks closes step 3.

## Provenance and artifacts

Accessed 2026-10-06: code.claude.com docs (hooks, skills, plugins-reference, plugins/mods) and learn.chatgpt.com Codex docs (plugins, hooks, config reference) by WebFetch; `openai/codex` source by GitHub API; agent-plugins.org by WebFetch; the bundled `plugin-authoring` reference and typings by local read. Measurement scripts and the full sidecar report (session scratchpad `chip.mjs`, `chip2.mjs`, `research-B-host-specialization.md`) are not committed; the graded claims above are the durable record.

## Spike result

Step 2 ran on 2026-10-07 as a throwaway mod loaded by hot reload in a Claude
Code desktop session (engine 2.1.289), then deleted. It settles three of the
open items:

- **E12 — A mod reads the real context fill.** `$.session.usage()` returned
  `context.percent = 67` mid-session, the token figure the `Stop` nudge
  currently approximates from transcript bytes. **Strength: High** (observed).
- **E13 — A mod renders a one-press handoff affordance.** An `AbovePrompt`
  band showing the context percentage and a `Handoff` button (wired to
  `$.prompt.submit({ text: '/ad-handoff', asUser: true })`) rendered for the
  owner; the button was not pressed. **Strength: High** (observed by the
  owner).
- **E14 — A mod reaches the desktop task server.** `$.mcp.call('ccd_session',
  'dismiss_task', { task_id: 'spike-nonexistent-id' })` returned the server's
  own validation error ("task_id must be the id returned by spawn_task"),
  which proves the call reached the server that owns `spawn_task` without
  creating a chip. A mod can therefore create the resume chip itself,
  deterministically, instead of asking the model to. **Strength: High**
  (observed; `spawn_task` itself was not called).

What this changes: step 3 is now feasible on Claude Code desktop, and the
strongest form of the chip guarantee is a mod that calls `spawn_task` on the
handoff write, not a reminder. It does not change the constraints that made
step 3 conditional: the mod API is early access, mods are Claude-Code-only and
ship only as a plugin (ADR-0041), and the owner's terminal CLI (2.1.227) does
not load them. The step-1 reminder (ADR-0087) stays the portable baseline.

## Derived decision

Step 1 became the handoff-chip reminder of ADR-0087. Step 3 became ADR-0088, which amends ADR-0041 to ship the optional `agentic-session` companion plugin.
