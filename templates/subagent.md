---
# Required
name: <unique-name>                  # lowercase + hyphens
description: <when Claude should delegate to this subagent>

# Optional — declare only what you need.
# tools: Read, Glob, Grep            # comma-separated; omit to inherit all parent tools
# disallowedTools: Write, Edit       # subtract from inherited or specified list
# model: sonnet                      # sonnet | opus | haiku | <full-id> | inherit (default)
# permissionMode: default            # default | acceptEdits | auto | dontAsk | bypassPermissions | plan
# skills: skill-a, skill-b           # full skill content injected at startup
# maxTurns: 10
# memory: project                    # user | project | local — enables cross-session learnings
# isolation: worktree                # run in a temporary git worktree
# background: false
# effort: medium                     # low | medium | high | xhigh | max
# color: blue                        # red | blue | green | yellow | purple | orange | pink | cyan
# mcpServers: <see code.claude.com/docs/en/mcp>
# hooks: <see code.claude.com/docs/en/hooks>
# initialPrompt: <auto-submitted as first user turn when run as main agent>
---

<System prompt: the subagent's role, scope, and stop criteria.

State the role in one sentence. Define what it should do when invoked, what
output format to return, and what NOT to do. The subagent does not read
AGENTS.md — restate any convention it must follow.>
