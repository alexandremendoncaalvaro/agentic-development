# Bootstrap a Subagent

Spec: [code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents)

A custom Claude Code subagent runs with isolated context, scoped tools, and its own system prompt. The body of the file becomes the subagent's full system prompt — it does **not** inherit AGENTS.md / CLAUDE.md from the parent.

## Where it lives

- Project (versioned): `.claude/agents/<name>.md`
- Personal: `~/.claude/agents/<name>.md`

Edits to files on disk require a session restart; agents created via `/agents` take effect immediately.

## Common patterns

| Pattern                | Tools                       | Model      | Notes                                                   |
| ---------------------- | --------------------------- | ---------- | ------------------------------------------------------- |
| Fresh-context reviewer | `Read, Glob, Grep, Bash`    | `sonnet`   | Matches WORKFLOW §10. No write tools.                   |
| Codebase researcher    | use built-in **Explore**    | inherit    | Don't build custom unless you need different tools.     |
| Diff-only auditor      | `Read, Bash`                | `sonnet`   | Pair with `permissionMode: dontAsk` for read-only runs. |

Built-in subagents (`Explore`, `Plan`, `general-purpose`) cover most cases. Build a custom one only when you need a specific role, scoped tools, persistent memory, or a different model.

## Paste to your agent

> Read the subagents spec at https://code.claude.com/docs/en/sub-agents and the structure in [`templates/subagent.md`](../templates/subagent.md). Create a project subagent at `.claude/agents/<name>.md` for `<role and trigger>`.
>
> Constraints:
> - `description` is the routing signal — Claude reads it to decide whether to delegate. Be specific.
> - Body = full system prompt; every line costs tokens on every subagent turn. Be terse.
> - Don't restate AGENTS.md. Subagents don't read it. State only what differs.
> - Limit tools deliberately. A reviewer with `Write` access stops being a reviewer.
> - Tell the subagent where to stop.
> - Frontmatter: `name`, `description`, plus only the fields you actually need from the spec. **Do not invent fields not in the spec.**
