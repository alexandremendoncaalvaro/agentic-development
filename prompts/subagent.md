# Bootstrap a Subagent

Specs:
- Claude Code: https://code.claude.com/docs/en/sub-agents
- Codex: https://developers.openai.com/codex/subagents

A custom subagent is useful when the work can be handed over with bounded context, scoped tools/sandbox, and a clear stop condition. Do not create one for a one-off question, frequent back-and-forth, product judgment, visual taste, or tightly coupled implementation.

## Where it lives

- Claude Code project: `.claude/agents/<name>.md`
- Claude Code personal: `~/.claude/agents/<name>.md`
- Codex project: `.codex/agents/<name>.toml`
- Codex personal: `~/.codex/agents/<name>.toml`

## Good fits

| Pattern | Host target | Notes |
| --- | --- | --- |
| Fresh-context reviewer | Claude or Codex | Matches WORKFLOW §10. Read-only; no write tools. |
| Codebase researcher | built-in when available | Build custom only when the repo needs a persistent role. |
| Docs/API researcher | Claude or Codex | Returns citations and version notes only. |
| Test designer | Claude or Codex | Reads spec/task and proposes public-interface tests; no production edits. |
| Bug reproducer | Claude or Codex | Builds the smallest failing loop, then stops before broad fixes. |
| Bounded worker | Claude or Codex | Owns a disjoint file/module set; returns changed paths and verification. |

## Paste to your agent

> Read the relevant subagent spec for my host:
> - Claude Code: https://code.claude.com/docs/en/sub-agents
> - Codex: https://developers.openai.com/codex/subagents
>
> Then read the templates in [`templates/subagent.md`](../templates/subagent.md) and [`templates/codex-subagent.toml`](../templates/codex-subagent.toml).
>
> Create a project subagent for `<Claude Code | Codex>` at the correct path for `<role and trigger>`.
>
> Constraints:
> - First apply the delegation-fit gate: use a custom subagent only if the role repeats, the work is self-contained, the output is bounded, or the role needs tool/model/sandbox restrictions.
> - `description` is the routing signal. Be specific about when the host should delegate.
> - State goal, scope, allowed sources, output format, and stop criterion.
> - Limit tools/sandbox deliberately. A reviewer with write access stops being a reviewer.
> - Do not rely on parent-session memory; cite any project files the subagent must read.
> - Use Claude Markdown/frontmatter for Claude Code; use TOML with `name`, `description`, and `developer_instructions` for Codex.
> - Do not invent fields not in the selected host's spec.
