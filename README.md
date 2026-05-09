# Agentic Development

A starter kit for engineering production code with LLMs. Lean templates and init prompts grounded in established standards: [Anthropic Skills](https://code.claude.com/docs/en/skills), [Claude Code subagents](https://code.claude.com/docs/en/sub-agents), [agents.md](https://agents.md), Nygard ADRs, and [Google Labs DESIGN.md](https://github.com/google-labs-code/design.md).

> **Status:** v0.2 in development on the `cli` branch — the CLI installs the universal skill set (`agentic-bootstrap`, `agentic-philosophy`, `agentic-architecture`, `agentic-adr`, `agentic-task`, `agentic-audit`, `agentic-review`) into Claude Code or Codex. Each skill produces its artifact (or runs its operation) via the agent's native conversational UI. v0.1.0-beta on npm still prints prompts; the v0.2 release ships once the conditional skills and polish chunks land. The manual prompts below cover artifacts the CLI does not install yet (DESIGN.md, custom skills, subagents). Report rough edges via [GitHub Issues](https://github.com/alexandremendoncaalvaro/agentic-development/issues).

## Prerequisites

An agentic coding tool that reads markdown files. Examples here use **Claude Code** and **Codex CLI** (primary tools the author uses); the kit also works with [Antigravity](https://antigravity.google), [Gemini CLI](https://github.com/google-gemini/gemini-cli), Cursor, Continue, Aider, and any other tool that follows the [agents.md](https://agents.md) open standard.

For the CLI path: Node.js 18+. The manual prompts have no runtime dependency.

For the philosophy and full reasoning behind the kit, see [WORKFLOW.md](WORKFLOW.md).

## Install & use

```bash
cd your-project
npx @alexandrealvaro/agentic@beta init
```

The CLI installs seven universal skills into your agent's native location:

* **Claude Code:** `.claude/skills/<skill-name>/SKILL.md` (plus `.claude/agents/<name>.md` for skills that ship a subagent)
* **Codex:** `.agents/skills/<skill-name>/SKILL.md` (+ `agents/openai.yaml`)

Two categories ([ADR-0007](doc/adr/0007-workflow-operational-skills.md)):

| Skill | Category | What it does | Invoke |
| --- | --- | --- | --- |
| `agentic-bootstrap` | spec-driven | Scans the repo, writes `AGENTS.md` ≤150 lines | `/agentic-bootstrap` |
| `agentic-architecture` | spec-driven | Scans the code, writes `ARCHITECTURE.md` | `/agentic-architecture` |
| `agentic-adr` | spec-driven | Drafts `doc/adr/NNNN-<slug>.md` from the conversation | `/agentic-adr` |
| `agentic-task` | spec-driven | Drafts `doc/tasks/NNNN-<slug>.md` (checkbox + Notes format) | `/agentic-task` |
| `agentic-audit` | spec-driven | Read-only drift report (AGENTS.md / ARCHITECTURE.md / ADRs) | `/agentic-audit` |
| `agentic-philosophy` | workflow-operational | Universal agent guardrails — auto-loads on non-trivial work | implicit |
| `agentic-review` | workflow-operational | Fresh-context code review per WORKFLOW §10; structured findings, no "approve" | `/agentic-review <range>` |

A short TUI shows the detected mode and asks which agent to install for. Non-interactive flags: `--agent claude-code | codex | both`, `--yes` to skip confirmations. Re-running on an installed project is idempotent — unchanged files report `·`, divergent ones prompt to replace.

For persistent install:

```bash
npm install -g @alexandrealvaro/agentic@beta
agentic init
```

> **Chunk 2.5 scope:** the universal skill set + workflow-operational `agentic-review` are wired ([ADR-0007](doc/adr/0007-workflow-operational-skills.md)). Conditional skills (`agentic-design`, `agentic-skill`, `agentic-subagent`) ship in Chunk 3; polish + npm release in Chunk 4. For artifacts the CLI does not install yet, see [Manual prompts](#manual-prompts) below.

## Manual prompts

Until the CLI covers every artifact, generate the rest by pasting prompts directly into your agent. Each prompt file has the literal text to copy, plus the matching template structure:

| Artifact | Prompt | Template | Lives at |
| --- | --- | --- | --- |
| `AGENTS.md` | [prompts/agents.md](prompts/agents.md) | [agents-project](templates/agents-project.md) | repo root |
| `ARCHITECTURE.md` | [prompts/architecture.md](prompts/architecture.md) | [architecture](templates/architecture.md) | repo root |
| ADR | [prompts/adr.md](prompts/adr.md) | [adr](templates/adr.md) | `doc/adr/NNNN-<title>.md` |
| Task | [prompts/task.md](prompts/task.md) | [task](templates/task.md) | `doc/tasks/NNNN-<slug>.md` |
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

**New project (greenfield).** Initialize git and project structure, then run `agentic init` to install the universal skill set. From inside Claude Code or Codex: `/agentic-bootstrap` produces `AGENTS.md`, `/agentic-architecture` produces `ARCHITECTURE.md`, `/agentic-adr` records each binding decision, `/agentic-task` opens trackable work items, `/agentic-audit` flags drift, `/agentic-review <range>` runs a fresh-context review of a diff. `agentic-philosophy` auto-loads on non-trivial work. For DESIGN.md, custom skills, and subagents, use the manual prompts below until the conditional skills ship.

**Existing project (brownfield).** Same flow. The project-wide prompts (`prompts/agents.md`, `prompts/architecture.md`) follow a **scan-first pattern**: the agent reads the codebase first, pre-fills every placeholder it can verify, then asks you only about the genuine gaps and conflicts — no philosophical questions, no interview-by-section. The per-artifact prompts (ADR, task, design, skill, subagent) work on a single decision or asset and don't need codebase-wide verification. Backfill ADRs only for decisions that matter going forward.

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
│   ├── adr/
│   │   └── NNNN-<title>.md
│   └── tasks/
│       └── NNNN-<slug>.md
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
