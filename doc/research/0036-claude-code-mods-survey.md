# RESEARCH-0036: Which Claude Code mods fit the kit's workflow?

**Status:** draft
**Created:** 2026-10-07
**Question:** Among published Claude Code mods and closely related plugins, which ideas would improve the owner's workflow through the `agentic-session` companion plugin (ADR-0088) without adding clutter, and which should be rejected?
**Stakes:** low times reversible
**Confidence:** Conditional

## Conclusion and confidence

Keep `agentic-session` to three members, in this order:

1. **The threshold context band with a one-press handoff**, measured against the auto-compact point when auto-compaction is on (the figure two methodology products report as the one that matters), else against the model's window.
2. **A deterministic resume chip on a session-handoff write**, created by the plugin through the desktop task server, with the ADR-0087 reminder kept as the portable fallback.
3. **A display-only verify-before-done receipt**: one quiet row per turn when files were edited after the last test run, computed from tool calls, never fed back to the model in its first version.

An outward-action approval pane (exact payload and its hash before `gh pr create`, a comment, or a chat send) and a workflow-stage segment in the same band stay on deck, each behind its own decision; the first blocks, so ADR-0083 requires one.

The design rule that falls out: the mod layer holds only what needs the screen or the host. A gate that needs neither stays a settings hook shared by both hosts, as ADR-0083 requires; written as a mod it would be Claude-Code-only.

Conditional because popularity is not measurable yet (mods reached general availability on 2026-10-01 and no marketplace publishes install counts), so the ranking rests on recurring ideas and fit, not usage data.

## Question and scope

The owner asked for a broad survey — most used, best rated, smartest ideas — compared with how he works (`AGENTS.ale.md`: ground before code, TDD, review per slice, audit before PR, decide when grounded, verify before claiming done, handoff with a chip, approval before outward text), to raise the kit without polluting it.

## Hypothesis

Not applicable: a survey question.

## Method

A research sidecar read the official mods documentation and Anthropic's sample and built-in mods, the community catalogues and collections, GitHub code search for mod modules, editorial lists, and related non-mod plugins, on 2026-10-07, recording GitHub stars through the API. It classified 21 candidate ideas by the workflow gate each serves, verdict, risk (nag, block, clutter; conflicts with ADR-0083 and ADR-0074) and effort. The author checked the one open technical claim in the engine typings: `$.session.usage({ breakdown })` returns `autoCompactThreshold` and `isAutoCompactEnabled`.

## Evidence

- **E1 — The ecosystem is large and young; popularity is not measurable.** One catalogue counts 2,685 mods (karanb192/awesome-claude-code-mods, scanned 2026-10-06); apart from a browser pane (3,679 stars) the most-starred mod repositories have 130 stars or fewer; no marketplace publishes installs; editorial lists say their rankings are editorial. Star and catalogue counts are a point-in-time, exploratory reading (gh api, the dates given), not a durable measure. **Strength: Medium.**
- **E2 — Most mods are meters, dashboards, renderers or toys; a small group "keeps the agent honest"** (per-turn receipts, merge gates, scope guards). **Strength: Medium** (README reading, mods not run).
- **E3 — A context figure measured toward auto-compaction is the converged design** (Storybloq's dashboard, context-view) and the engine exposes it (`autoCompactThreshold` in `SessionContextBreakdown`, engine 2.1.289 typings). **Strength: High** for availability, Medium for "matters more".
- **E4 — Three methodology products built a workflow-stage display** (Storybloq, gsd-status-mod, plan-progress); gsd-status-mod is the closest analogue to the kit. **Strength: Medium.**
- **E5 — A per-turn receipt flagging unverified completion recurs in two independent collections** (yash-gadodia, hoobnn). **Strength: Low-Medium.**
- **E6 — The chip can be made deterministic**: a mod reaches the desktop task server (RESEARCH-0033 E14). **Strength: High** for reach; creating a chip from a mod was not run.

### Rejected, with the reason

| Idea | Why not |
| --- | --- |
| Per-turn summaries, next-prompt suggestions, live reviewer lines | Duplicate `/ad-brief`, `/ad-next`, `/ad-review` and `/ad-audit`; paid model calls each turn |
| Scope guard, cold-send guard, collision guard | Block or hold work, against ADR-0083 and ADR-0074; worktrees already isolate parallel sessions |
| Cost, quota and cache meters | ccstatusline and ccusage already own them |
| Dashboards, compaction or memory replacements, prompt and model rewriters, renderers, toys | Clutter or silent behaviour changes; the kit's answer to context is the handoff |
| blast-radius, secret-redactor, the `you-should-know` built-in | Useful, but personal installs, not kit workflow |

## Limitations and what would reverse the conclusion

No community mod was run; behaviour comes from READMEs. Install counts would change the ranking once published. A chip created from a mod is inferred, not observed. A measured nag rate for the receipt above the owner's tolerance would drop member 3.

## Provenance and artifacts

All sources accessed 2026-10-07: code.claude.com/docs/en/plugins/mods (WebFetch); anthropics/claude-code-playground `claude-code/mods` at e9ab132 and anthropics/claude-code `mods/` at 765f236 (gh api); karanb192/awesome-claude-code-mods, hamzafer/claude-code-mods, helenkwok/gsd-status-mod, yash-gadodia/claude-mods, hoobnn/hoobnn-agent-mods, Storybloq/storybloq, zycck/claude-mods (gh api, stars as of that day); editorial lists at stashbase.ai, claudemods.ai, capitalandcompute.net (WebFetch). The sidecar's 21-row candidate table with risk and effort was exploratory and stayed in the session scratchpad (`research-C-mods-survey.md`), not committed; the graded claims above are the durable record, and nothing here depends on that table.

## Derived decision

ADR-0088 (accepted) adopts the design rule and members 1 and 2, planned in Tasks 0104 and 0105. The owner dropped member 3, the display-only receipt, in favour of the shadow mode of evidence gates, a separate gate decision under ADR-0083; Task 0106 is re-scoped to display that shadow result.
