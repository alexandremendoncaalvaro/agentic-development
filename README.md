# Agentic Development

A starter kit for engineering production code with LLMs. Lean templates and init prompts grounded in established standards: [Anthropic Skills](https://code.claude.com/docs/en/skills), [Claude Code subagents](https://code.claude.com/docs/en/sub-agents), [agents.md](https://agents.md), Nygard ADRs, and [Google Labs DESIGN.md](https://github.com/google-labs-code/design.md).

## What's here

- **[WORKFLOW.md](WORKFLOW.md)** — the philosophy: how to engineer with LLMs without vibe-coding. Read this first.
- **[templates/](templates/)** — pure templates. Copy and fill, or have your agent fill them via the matching prompt.
- **[prompts/](prompts/)** — init prompts to paste into your agent. Each generates one artifact from its template.

## How to use

1. Read [`WORKFLOW.md`](WORKFLOW.md).
2. To bootstrap a new project, paste [`prompts/agents.md`](prompts/agents.md) into your agent. It interviews you and produces `AGENTS.md`.
3. To add an artifact later, paste the matching prompt from `prompts/`.

| Artifact          | Template                                                                                      | Prompt                                              | Lives at                          |
| ----------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------- |
| `AGENTS.md`       | [agents-general](templates/agents-general.md) + [agents-project](templates/agents-project.md) | [prompts/agents.md](prompts/agents.md)              | repo root                         |
| `ARCHITECTURE.md` | [architecture](templates/architecture.md)                                                     | [prompts/architecture.md](prompts/architecture.md)  | repo root                         |
| ADR               | [adr](templates/adr.md)                                                                       | [prompts/adr.md](prompts/adr.md)                    | `doc/adr/NNNN-<title>.md`         |
| `DESIGN.md`       | (no template — bootstrap from existing tokens)                                                | [prompts/design.md](prompts/design.md)              | repo root                         |
| Skill             | [skill](templates/skill.md)                                                                   | [prompts/skill.md](prompts/skill.md)                | `.claude/skills/<name>/SKILL.md`  |
| Subagent          | [subagent](templates/subagent.md)                                                             | [prompts/subagent.md](prompts/subagent.md)          | `.claude/agents/<name>.md`        |

Templates carry pure structure. Prompts carry the spec links, conventions, and the literal text to paste.
