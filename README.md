# Agentic Development

A starter kit for engineering production code with LLMs. Lean templates and init prompts grounded in established standards: [Anthropic Skills](https://code.claude.com/docs/en/skills), [Claude Code subagents](https://code.claude.com/docs/en/sub-agents), [agents.md](https://agents.md), Nygard ADRs, and [Google Labs DESIGN.md](https://github.com/google-labs-code/design.md).

> **Status:** v0.1.0-beta — early. The CLI works for AGENTS.md bootstrap (`npx @alealvaro/agentic@beta init`); other artifact commands are in development. The manual workflow below stays fully usable for everything. Report rough edges via [GitHub Issues](https://github.com/alexandremendoncaalvaro/agentic-development/issues).

## Prerequisites

An agentic coding tool that reads markdown files. Examples here use **Claude Code** and **Codex CLI** (primary tools the author uses); the kit also works with [Antigravity](https://antigravity.google), [Gemini CLI](https://github.com/google-gemini/gemini-cli), Cursor, Continue, Aider, and any other tool that follows the [agents.md](https://agents.md) open standard.

For the CLI path: Node.js 18+ (only needed if you use `npx`/`npm install`; the manual workflow has no runtime dependencies).

## What's here

- **[WORKFLOW.md](WORKFLOW.md)** — the philosophy: how to engineer with LLMs without vibe-coding. Read this first.
- **[templates/](templates/)** — pure templates. Copy and fill, or have your agent fill them via the matching prompt.
- **[prompts/](prompts/)** — init prompts to paste into your agent. Each generates one artifact from its template.

## How to use

This kit is a **reference repository, not a per-project dependency.** Templates and prompts stay here; only the generated artifacts (AGENTS.md, ARCHITECTURE.md, ADRs, etc.) end up in your target project. The pattern matches how [GitHub's spec-kit](https://github.com/github/spec-kit) and [cookiecutter](https://cookiecutter.readthedocs.io/) handle distribution — templates in one place, outputs in another, never mixed.

### Quickstart (CLI, beta)

For AGENTS.md bootstrap, the fastest path is the CLI — no clone needed:

```bash
cd your-project
npx @alealvaro/agentic@beta init
```

The CLI auto-detects greenfield/brownfield/audit mode, then prints a self-contained prompt (templates inlined) for you to paste into your agent. Add `--mode greenfield|brownfield|audit` to override detection.

> **Beta scope:** Only `init` (AGENTS.md) is in v0.1.0-beta. For ARCHITECTURE.md, ADRs, design tokens, skills, and subagents, use the [manual workflow](#manual-workflow) below until those CLI commands ship.

### Manual workflow

Required for every artifact except AGENTS.md right now, and useful as a fallback for `init` if you want to run prompts directly without the CLI.

#### Setup (once)

1. Read [`WORKFLOW.md`](WORKFLOW.md) — the philosophy that everything else follows from.
2. Clone this repo to a location outside your projects:

   ```bash
   git clone https://github.com/alexandremendoncaalvaro/agentic-development.git ~/dev/agentic-development
   ```

   **Never copy this kit into your target project.** Only the generated artifacts go there.

#### Give the agent access to templates

When you paste a prompt from `prompts/`, the agent needs to read the matching template in `templates/`. Two ways to grant access:

- **Recommended** — start the agent with the kit added. In Claude Code, from your target project's directory:
  ```
  claude --add-dir <path-to-this-kit>
  ```
  The agent can then read templates via the relative paths the prompts use.
- **Standalone** — copy the content of both `prompts/<X>.md` and `templates/<X>.md` into the agent session. No setup, slightly more friction.

#### Workflows by scenario

**New project (greenfield).** Initialize git and set up the project structure, then paste `prompts/agents.md`. The agent interviews you about stack, build, test, conventions, and security boundaries, then writes `AGENTS.md` at the repo root. As architectural and design decisions emerge, use `prompts/architecture.md`, `prompts/adr.md`, `prompts/design.md`, `prompts/skill.md`, and `prompts/subagent.md` for each new artifact.

**Existing project (brownfield).** Same prompts. The project-wide ones (`prompts/agents.md`, `prompts/architecture.md`) instruct the agent to read the codebase, verify what you told them, and flag any mismatch before writing — so contradictions get surfaced instead of trusted. The per-artifact prompts (ADR, design, skill, subagent) work on a single decision or asset and don't need this verification. Backfill ADRs only for decisions that matter going forward; don't try to rewrite history.

**Revisiting / auditing existing specs.** When specs may have drifted from code, paste:

> *"Read AGENTS.md (or ARCHITECTURE.md). Compare with the current state of the codebase. For every place where the spec disagrees with the code, list the disagreement and suggest whether the spec or the code should change. Do not rewrite the spec yourself — flag and wait."*

Apply judgment manually; don't let the agent rewrite specs unattended.

**Project already built with agents.** Treat missing artifacts as brownfield (generate via the relevant prompt) and existing artifacts as audit (run the comparison prompt above).

#### What ends up in your target project

Only the generated outputs — never templates, prompts, or this guide:

```
your-project/
├── AGENTS.md
├── ARCHITECTURE.md
├── DESIGN.md                  (optional, UI projects)
├── doc/
│   └── adr/
│       └── NNNN-<title>.md
└── .claude/
    ├── skills/<name>/SKILL.md
    └── agents/<name>.md
```

### Reference table

| Artifact          | Template                                                                                      | Prompt                                              | Lives at                          |
| ----------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------- |
| `AGENTS.md`       | [agents-general](templates/agents-general.md) + [agents-project](templates/agents-project.md) | [prompts/agents.md](prompts/agents.md)              | repo root                         |
| `ARCHITECTURE.md` | [architecture](templates/architecture.md)                                                     | [prompts/architecture.md](prompts/architecture.md)  | repo root                         |
| ADR               | [adr](templates/adr.md)                                                                       | [prompts/adr.md](prompts/adr.md)                    | `doc/adr/NNNN-<title>.md`         |
| `DESIGN.md`       | (no template — bootstrap from existing tokens)                                                | [prompts/design.md](prompts/design.md)              | repo root                         |
| Skill             | [skill](templates/skill.md)                                                                   | [prompts/skill.md](prompts/skill.md)                | `.claude/skills/<name>/SKILL.md`  |
| Subagent          | [subagent](templates/subagent.md)                                                             | [prompts/subagent.md](prompts/subagent.md)          | `.claude/agents/<name>.md`        |

Templates carry pure structure. Prompts carry the spec links, conventions, and the literal text to paste.

## License

MIT — see [LICENSE](LICENSE).
