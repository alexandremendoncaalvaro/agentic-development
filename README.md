# Agentic Development

A starter kit for engineering production code with LLMs. Lean templates and init prompts grounded in established standards: [Anthropic Skills](https://code.claude.com/docs/en/skills), [Claude Code subagents](https://code.claude.com/docs/en/sub-agents), [agents.md](https://agents.md), Nygard ADRs, and [Google Labs DESIGN.md](https://github.com/google-labs-code/design.md).

> **Status:** v0.1.0-beta — early. The CLI works for AGENTS.md bootstrap; other artifact commands are in development. The manual prompts below cover everything else. Report rough edges via [GitHub Issues](https://github.com/alexandremendoncaalvaro/agentic-development/issues).

## Prerequisites

An agentic coding tool that reads markdown files. Examples here use **Claude Code** and **Codex CLI** (primary tools the author uses); the kit also works with [Antigravity](https://antigravity.google), [Gemini CLI](https://github.com/google-gemini/gemini-cli), Cursor, Continue, Aider, and any other tool that follows the [agents.md](https://agents.md) open standard.

For the CLI path: Node.js 18+. The manual prompts have no runtime dependency.

For the philosophy and full reasoning behind the kit, see [WORKFLOW.md](WORKFLOW.md).

## Install & use

```bash
cd your-project
npx @alexandrealvaro/agentic@beta init
```

The CLI auto-detects whether your project is **greenfield** (empty), **brownfield** (existing code, no AGENTS.md yet), or in **audit mode** (AGENTS.md already exists, compare drift). It runs a short TUI: confirm the mode, choose where to send the output (clipboard / stdout / file), and paste the result into Claude Code, Codex, Antigravity, or any agentic tool. Templates are bundled inline — no clone needed.

For persistent install:

```bash
npm install -g @alexandrealvaro/agentic@beta
agentic init
```

> **Beta scope:** only `init` (AGENTS.md) is implemented in v0.1.0-beta. For ARCHITECTURE.md, ADRs, DESIGN.md, skills, and subagents, see [Manual prompts](#manual-prompts) below.

## Manual prompts

Until the CLI covers every artifact, generate the rest by pasting prompts directly into your agent. Each prompt file has the literal text to copy, plus the matching template structure:

| Artifact | Prompt | Template | Lives at |
| --- | --- | --- | --- |
| `AGENTS.md` | [prompts/agents.md](prompts/agents.md) | [agents-general](templates/agents-general.md) + [agents-project](templates/agents-project.md) | repo root |
| `ARCHITECTURE.md` | [prompts/architecture.md](prompts/architecture.md) | [architecture](templates/architecture.md) | repo root |
| ADR | [prompts/adr.md](prompts/adr.md) | [adr](templates/adr.md) | `doc/adr/NNNN-<title>.md` |
| `DESIGN.md` | [prompts/design.md](prompts/design.md) | (no template — bootstrap from existing tokens) | repo root |
| Skill | [prompts/skill.md](prompts/skill.md) | [skill](templates/skill.md) | `.claude/skills/<name>/SKILL.md` |
| Subagent | [prompts/subagent.md](prompts/subagent.md) | [subagent](templates/subagent.md) | `.claude/agents/<name>.md` |

Prompts reference templates by relative path. Two ways to give your agent access:

- **Browse on GitHub.** Open the prompt and template files in tabs, copy both into your agent session. No install.
- **Use the npm-installed package as a kit folder.** If you ran `npm install -g @alexandrealvaro/agentic@beta`, the kit is already on disk. For Claude Code from your project's directory:
  ```bash
  claude --add-dir "$(npm root -g)/@alexandrealvaro/agentic"
  ```
  The agent then reads the templates locally via the paths the prompts use.

## Workflows by scenario

**New project (greenfield).** Initialize git and project structure, then run `agentic init` (or paste `prompts/agents.md`) for AGENTS.md. As architectural and design decisions emerge, use the manual prompts above for ARCHITECTURE.md, ADRs, DESIGN.md, skills, and subagents.

**Existing project (brownfield).** Same flow. The project-wide prompts (`prompts/agents.md`, `prompts/architecture.md`) already instruct the agent to read the codebase, verify what you told them, and flag any mismatch before writing — contradictions get surfaced instead of trusted. The per-artifact prompts (ADR, design, skill, subagent) work on a single decision or asset and don't need codebase-wide verification. Backfill ADRs only for decisions that matter going forward.

**Revisiting / auditing existing specs.** When specs may have drifted from code, paste:

> *"Read AGENTS.md (or ARCHITECTURE.md). Compare with the current state of the codebase. For every place where the spec disagrees with the code, list the disagreement and suggest whether the spec or the code should change. Do not rewrite the spec yourself — flag and wait."*

Apply judgment manually; don't let the agent rewrite specs unattended.

**Project already built with agents.** Treat missing artifacts as brownfield (run the relevant prompt) and existing artifacts as audit (run the comparison prompt above).

## What ends up in your target project

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

The pattern matches how [GitHub's spec-kit](https://github.com/github/spec-kit) and [cookiecutter](https://cookiecutter.readthedocs.io/) handle distribution — templates in one place, outputs in another, never mixed.

## Develop or fork

Want to contribute, fork, or run the CLI from source?

```bash
git clone https://github.com/alexandremendoncaalvaro/agentic-development.git
cd agentic-development
npm install
node bin/agentic.js init
```

Branch layout:
- `main` — manual workflow source of truth (no CLI code; the npm package gets promoted here when mature).
- `cli` — CLI development (you're here). Beta releases are published from this branch.

## License

MIT — see [LICENSE](LICENSE).
