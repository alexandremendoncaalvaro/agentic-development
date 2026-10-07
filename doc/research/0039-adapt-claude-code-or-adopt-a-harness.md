# RESEARCH-0039: Adapt Claude Code or adopt a harness for an enforced multi-agent loop?

**Status:** draft
**Created:** 2026-10-07
**Question:** For the owner's goal of mature autonomous development (several sessions or agents in parallel, independent review, redundancy, and the Agentic Development sequence enforced rather than remembered), should the kit invest in adapting Claude Code, or adopt an existing harness such as Paperclip?
**Stakes:** medium times reversible (a spike and plain files; a harness adoption would be harder to reverse on the company repository)
**Confidence:** Conditional

## Conclusion and confidence

Adapt Claude Code; do not replace it. Claude Code now ships the two
deterministic pieces the goal needs. Dynamic workflows are scripts that decide
which stage runs next, can run each stage in an isolated copy with a chosen
model, and run locally; per the bundled workflow reference, a stage can also
name a custom subagent type, so the kit's reviewers would plug in unchanged. Hooks can refuse a tool call or an agent's stop, which is where
ADR-0089's receipt gates already live. Together they give a stage order and
hard gates that do not depend on the model remembering, and they fit the
company repository's protected-health-information posture because they run
locally.

Paperclip is the one outside candidate worth a time-boxed comparison. Among
the candidates surveyed, it is the only one whose documentation describes the
runtime refusing to close a task until configured review and approval stages
pass, with reviewers that can be agents on another harness (Codex reviewing
Claude Code). It is seven months old, releases every one to two weeks, has
telemetry on by default, and is a separate server that holds its own task and
run records, so it is a personal-repository trial only.

Conditional, with the mitigation of a spike on a personal
repository that runs the native arm against Paperclip on the same three tasks
under a decision rule fixed before the run.

## Question and scope

Options: (A) native hybrid: a saved Claude Code workflow per stage as the
sequencer, the kit's skills and subagents as the method, hooks as hard gates;
(B) Paperclip orchestrates and the kit supplies the method; (C) a parallel
workspace app (Conductor, Nimbalyst, Sculptor, Claude Squad); (D) adopt a
methodology kit (Superpowers, Spec Kit, BMAD). Deciding criterion: the
sequence is enforced deterministically, review is independent and tied to the
reviewed state, and the company repository's data posture holds. Out of scope:
replacing the agent itself (Devin, Factory, Amp, OpenHands, Goose), since none
runs the kit unchanged.

## Hypothesis

If the native arm is sufficient, then on three real tasks it opens no pull
request without a review and an audit receipt for its head, and records an
independent review tied to the SHA, with no more owner interventions than
Paperclip. Refuted if the native arm skips a stage or lacks an SHA-tied
independent review on any task while Paperclip passes all.

## Method

A research sidecar read the Claude Code documentation as raw Markdown, the
bundled workflow-authoring reference, candidate repositories through the
GitHub API, and product documentation and secondary reviews through WebFetch
and WebSearch, all on 2026-10-07. For this study the load-bearing claims were
re-checked: Paperclip's repository metadata, releases and README (telemetry
default, "Approval gates are enforced") through the GitHub API, its
execution-policy guide through a raw fetch, and the workflows page's
statements on who decides the next stage, mid-run input and resume through a
raw fetch. Claims are graded per WORKFLOW section 17.

## Evidence

- **E1. Claude Code has a deterministic stage sequencer.** The workflows page
  contrasts approaches by "who decides what runs next" and answers "the script" for workflows; an agent in a workflow takes a model and an
  isolated copy of the repository, and, per the bundled workflow-authoring
  reference, a custom subagent type. Limits: no mid-run user input (sign-off
  between stages means one workflow per stage) and resume only within the same
  session. **Strength: High** for the sequencer, model, isolation and limits
  (official documentation, re-fetched); **Medium** for the custom subagent
  type (the bundled reference, read by the sidecar, not re-checked).
- **E2. Hooks give hard gates, with two caveats.** Several events can block,
  including `PreToolUse`, `Stop` and `SubagentStop`, and a hook that exits 2
  stops the call before permission rules run. Caveats: a mod handling
  `tool.check` can approve a call a non-managed hook blocked, so gates that
  must hold belong in managed settings or are re-checked in CI; and whether a
  hook still blocks under `--dangerously-skip-permissions` is contested (a
  summary said no; the raw documentation does not say so). **Strength: High**
  for blocking events; **Medium** for the bypass question.
- **E3. Every native worker is Claude.** A different model reviewing means an
  MCP server or a shell call, which the kit's dual-host split for `ad-audit`
  already does by hand. Agent teams are experimental, without worktrees or
  resume. **Strength: High** (official documentation).
- **E4. Paperclip enforces review and approval stages at task close.**
  `paperclipai/paperclip`, MIT, created 2026-03-02, about 98,000 stars, six
  releases between 2026-09-02 and 2026-10-06; the README states approval gates are enforced and documents
  anonymous telemetry on by default (disable with
  `PAPERCLIP_TELEMETRY_DISABLED=1`). Its execution-policy guide says the runtime "intercepts the transition"
  when an executor tries to close an issue and routes it to reviewers or
  approvers, and that an unattended loop ends on a human decision after
  `maxReviewRounds`. Its Claude Code adapter drives `claude --print` and, per
  its documentation, skips permission prompts by default. **Strength: High**
  for repository facts, releases, telemetry and the execution-policy text
  (re-checked); **Medium** for the adapter default and for reviewers on
  another harness (read through a summarizer).
- **E5. Workspace apps parallelize but do not enforce; methodology kits
  enforce through prompts.** Conductor, Nimbalyst, Sculptor and Claude Squad
  run agents in worktrees with no stage enforcement found. Superpowers' only
  hook is a session-start injection, and Spec Kit's quality gates are optional
  prompts. Vibe Kanban announces it is sunsetting and Crystal became Nimbalyst.
  **Strength: Medium** (repository reads and product pages, not run).
- **E6. Data posture favors local execution.** Claude Code's HIPAA
  configuration covers the CLI and the desktop Code tab in local mode, and
  refuses cloud sessions; cloud review features are unavailable under zero
  data retention. A local third-party orchestrator does not change where model
  traffic goes, but stores transcripts outside Claude Code's retention, which
  the agreement does not cover.
  **Strength: High** for Claude Code's documented configuration; **Medium**
  for the third-party inference.

Contested: whether Claude Code is covered only with zero data retention.
Secondary articles say so; the primary HIPAA setup page says local mode is
covered under the HIPAA configuration without it. The primary page holds
unless the organization's actual configuration differs, which is unverified.

## Limitations and what would reverse the conclusion

- No candidate was run. Paperclip's execution policy and adapter behavior were
  read through a summarizer.
- The organization's actual Claude Enterprise configuration is unverified; it
  decides which native features are available on the company repository.
- Reversal: the spike's native arm skipping a stage or lacking an SHA-tied
  independent review on any task while Paperclip passes all; or a hook
  failing to block under the permission-bypass mode the native arm would
  need.

## Provenance and artifacts

Sidecar report `research-harness-vs-adapt.md` in the session scratchpad (not
committed; the graded claims above are the durable record), accessed
2026-10-07. Re-checked for this study on 2026-10-07: `gh api
repos/paperclipai/paperclip`, its releases and README; `curl -L
https://docs.paperclip.ing/guides/power/execution-policy/`; `curl
https://code.claude.com/docs/en/workflows.md`. Other sources, 2026-10-07:
code.claude.com/docs/en/ hooks, permissions, agents, agent-teams, worktrees,
hipaa-setup and zero-data-retention pages (raw Markdown); docs.paperclip.ing
execution-policy and Claude Code adapter pages (WebFetch); GitHub API reads of
stravu/crystal, smtg-ai/claude-squad, BloopAI/vibe-kanban, imbue-ai/sculptor,
obra/superpowers, github/spec-kit and bmad-code-org/BMAD-METHOD;
conductor.build pages (WebFetch).

## Derived decision

None yet. The investment choice is the owner's: whether to run the spike, and
when. If the native arm wins, its design graduates to an ADR that builds on
ADR-0089's receipts; if Paperclip wins, an ADR records it as the personal-repo
orchestrator with the kit as the method layer.
