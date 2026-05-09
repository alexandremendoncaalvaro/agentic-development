# Agentic Development

A starter kit for engineering production code with LLMs. Lean templates and init prompts grounded in established standards: [Anthropic Skills](https://code.claude.com/docs/en/skills), [Claude Code subagents](https://code.claude.com/docs/en/sub-agents), [agents.md](https://agents.md), Nygard ADRs, and [Google Labs DESIGN.md](https://github.com/google-labs-code/design.md).

> **Status:** v0.2 in development on the `cli` branch — the CLI installs the full skill set (universal: `agentic-bootstrap`, `agentic-philosophy`, `agentic-architecture`, `agentic-adr`, `agentic-task`, `agentic-audit`, `agentic-review`; conditional: `agentic-design` for frontend, `agentic-subagent` for Claude Code, `agentic-skill` opt-in) into Claude Code or Codex. Each skill produces its artifact (or runs its operation) via the agent's native conversational UI. v0.1.0-beta on npm still prints prompts; the v0.2 release ships once the polish chunk lands. Report rough edges via [GitHub Issues](https://github.com/alexandremendoncaalvaro/agentic-development/issues).

## Prerequisites

An agentic coding tool that reads markdown files. Examples here use **Claude Code** and **Codex CLI** (primary tools the author uses); the kit also works with [Antigravity](https://antigravity.google), [Gemini CLI](https://github.com/google-gemini/gemini-cli), Cursor, Continue, Aider, and any other tool that follows the [agents.md](https://agents.md) open standard.

For the CLI path: Node.js 18+. The CLI is the recommended path. Paste-into-agent prompts (see [Manual prompts](#manual-prompts) below) remain as an alternative for users who don't want to run an installer — same artifacts, same patterns.

For the philosophy and full reasoning behind the kit, see [WORKFLOW.md](WORKFLOW.md).

## Install & use

```bash
cd your-project
npx @alexandrealvaro/agentic@beta init
```

The CLI installs the universal skill set into your agent's native location, plus conditional skills based on what your project needs:

* **Claude Code:** `.claude/skills/<skill-name>/SKILL.md` (plus `.claude/agents/<name>.md` for skills that ship a subagent)
* **Codex:** `.agents/skills/<skill-name>/SKILL.md` (+ `agents/openai.yaml`)

Two categories ([ADR-0007](doc/adr/0007-workflow-operational-skills.md)) and two installation modes (universal = always; conditional = depends on project signals or opt-in):

| Skill | Category | Installs | What it does | Invoke |
| --- | --- | --- | --- | --- |
| `agentic-bootstrap` | spec-driven | universal | Scans the repo, writes `AGENTS.md` ≤150 lines | `/agentic-bootstrap` |
| `agentic-architecture` | spec-driven | universal | Scans the code, writes `ARCHITECTURE.md` | `/agentic-architecture` |
| `agentic-adr` | spec-driven | universal | Drafts `doc/adr/NNNN-<slug>.md` from the conversation | `/agentic-adr` |
| `agentic-task` | spec-driven | universal | Drafts `doc/tasks/NNNN-<slug>.md` (checkbox + Notes format) | `/agentic-task` |
| `agentic-audit` | spec-driven | universal | Read-only drift report (AGENTS.md / ARCHITECTURE.md / ADRs) | `/agentic-audit` |
| `agentic-philosophy` | workflow-operational | universal | Universal agent guardrails — auto-loads on non-trivial work | implicit |
| `agentic-review` | workflow-operational | universal | Fresh-context code review per WORKFLOW §10; structured findings, no "approve" | `/agentic-review <range>` |
| `agentic-design` | spec-driven | auto if frontend detected | Bootstrap `DESIGN.md` from existing tokens (Figma, tailwind.config, tokens.json, CSS custom props) | `/agentic-design` |
| `agentic-subagent` | spec-driven | auto if installing for Claude Code | Drafts `.claude/agents/<name>.md` (Claude Code only — Codex has no subagent primitive) | `/agentic-subagent` |
| `agentic-skill` | spec-driven | opt-in only | Drafts a new Claude Code or Codex skill at the appropriate path | `/agentic-skill` |

A short TUI shows the detected mode, agent, and feature signals (frontend / `.claude/` / `.agents/` presence) and lets you toggle the conditional skills. Non-interactive flags: `--agent claude-code | codex | both`, `--yes` to skip confirmations — auto-checked conditionals (e.g., `agentic-design` if the project has React) install; `agentic-skill` stays opt-in. Re-running on an installed project is idempotent — unchanged files report `·`, divergent ones prompt to replace.

If your project already has an `AGENTS.md` (or `CLAUDE.md`), the installer appends a managed `Skills installed by agentic` section bracketed by `<!-- agentic-managed-skills:start -->` / `:end -->` markers. User content outside those markers is byte-preserved; re-runs update only the managed block.

## Updating an existing project

To pull upstream kit changes into a project that already has agentic skills installed:

```bash
cd your-project
npx @alexandrealvaro/agentic@beta update
```

`update` is a separate command from `init` (clearer intent) and runs a three-way diff against a state file the kit writes at install time:

* `.claude/agentic-state.json` — for Claude Code installs.
* `.agents/agentic-state.json` — for Codex installs.

These state files are committed to your repo so the whole team shares one view of what skill version is in place. They record kit version, per-skill version, and the SHA of every shipped file at the time of last install. The three-way diff uses those SHAs to distinguish *user-edited* files from *kit-changed* files and acts accordingly:

| File state | Action |
| --- | --- |
| New file in the kit | install |
| Kit unchanged, you didn't touch it | report unchanged |
| Kit unchanged, you edited it | keep your edits |
| Kit changed, you didn't touch it | silent update |
| Kit changed, you also edited it | prompt with diff (default: skip) |
| Skill removed from the kit or de-selected | prompt before removing your file (default: keep) |

Useful flags:

* `--dry-run` — print the action plan without writing anything. Always start here when you're not sure what will happen.
* `--force` — overwrite user-edited files on conflict (non-interactive default: no). Escape hatch when you genuinely want kit-side content to win.
* `--agent claude-code | codex | both` — restrict the update to one agent.
* `--yes` — non-interactive, accepts defaults (skip on conflict, keep orphans). Combine with `--force` if you want overwrites in CI.

If the project was installed with a kit version older than v0.3 (no state file present), the first `update` falls back to today's byte-compare behavior, then writes the state file so subsequent runs use the three-way diff.

The `agentic-review` skill writes the assembled WORKFLOW §10 handoff to `.agentic/reviews/<ISO-timestamp>-<scope>.md` before delegating to the fresh-context reviewer (Claude Code) or before instructing you to `/clear` and paste (Codex). These files are ephemeral audit artifacts — add `.agentic/reviews/` to your `.gitignore`.

For persistent install:

```bash
npm install -g @alexandrealvaro/agentic@beta
agentic init
```

## Manual prompts

If you prefer to skip the installer, the same artifacts can be generated by pasting prompts directly into your agent. Each prompt file has the literal text to copy, plus the matching template structure:

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

**New project (greenfield).** Initialize git and project structure, then run `agentic init` to install the universal skill set plus any auto-detected conditional skills. From inside Claude Code or Codex: `/agentic-bootstrap` produces `AGENTS.md`, `/agentic-architecture` produces `ARCHITECTURE.md`, `/agentic-adr` records each binding decision, `/agentic-task` opens trackable work items, `/agentic-audit` flags drift, `/agentic-review <range>` runs a fresh-context review of a diff, `/agentic-design` bootstraps `DESIGN.md` from your tokens (frontend projects), `/agentic-subagent` and `/agentic-skill` scaffold custom subagents and skills. `agentic-philosophy` auto-loads on non-trivial work.

**Existing project (brownfield).** Same flow. The project-wide skills (`/agentic-bootstrap`, `/agentic-architecture`) follow a **scan-first pattern**: the agent reads the codebase first, pre-fills every placeholder it can verify, then asks you only about the genuine gaps and conflicts — no philosophical questions, no interview-by-section. The per-artifact skills (`/agentic-adr`, `/agentic-task`, `/agentic-design`, `/agentic-skill`, `/agentic-subagent`) work on a single decision or asset and don't need codebase-wide verification. Backfill ADRs only for decisions that matter going forward.

**Revisiting / auditing existing specs.** Run `/agentic-audit` from inside Claude Code or Codex. The skill reads `AGENTS.md`, `ARCHITECTURE.md`, and `doc/adr/` and produces a drift list — one finding per line, format `[file or section]: spec says X, code says Y. Suggested resolution: change spec / change code / discuss.` Read-only — never rewrites specs. Apply judgment manually before changing anything.

**Reviewing your own diff.** Run `/agentic-review <range>` (e.g. `/agentic-review main..HEAD` or `/agentic-review PR#42`). The skill assembles the diff, the relevant spec slice (`AGENTS.md`, applicable ADRs, the task's Acceptance Criteria), and delegates to a fresh-context reviewer subagent — no inherited bias from the session that wrote the code (WORKFLOW §10). Returns structured findings grouped Blocker / Concern / Note. Codex variant uses `/clear` + paste handoff since Codex has no subagent primitive.

**Project already built with agents.** Treat missing artifacts as brownfield (run the relevant skill) and existing artifacts as audit (`/agentic-audit`).

## What ends up in your target project

Only the generated outputs — never templates, prompts, or this guide:

```
your-project/
├── AGENTS.md                   (with a managed "Skills installed by agentic" section
│                                appended below your content if AGENTS.md already existed)
├── ARCHITECTURE.md
├── DESIGN.md                   (optional, frontend projects)
├── doc/
│   ├── adr/
│   │   └── NNNN-<title>.md
│   └── tasks/
│       └── NNNN-<slug>.md
├── .agentic/
│   └── reviews/                (gitignored — ephemeral §10 review handoffs)
├── .claude/                    (Claude Code targets)
│   ├── agentic-state.json      (kit install state — committed)
│   ├── skills/agentic-*/SKILL.md
│   └── agents/fresh-context-reviewer.md
└── .agents/                    (Codex targets, cc-sdd convention)
    ├── agentic-state.json      (kit install state — committed)
    └── skills/agentic-*/{SKILL.md, agents/openai.yaml}
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
