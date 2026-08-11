# Agentic Development

`@alexandrealvaro/agentic` installs a disciplined engineering skill kit for **Claude Code** and **Codex**. It helps an agent research, plan, build, review, ship, and hand work off without losing the project context between sessions.

It is not an agent runtime, a framework, or a product-management tool. It installs local skills and documentation; the host agent still does the work, and you retain every consequential decision.

## Start here

From a project root, install the complete skill set for both hosts:

```bash
npx --yes @alexandrealvaro/agentic init --yes
```

Then open the project in Claude Code or Codex and invoke:

```text
/ad-next
```

`/ad-next` reads the repository and recommends the next useful action. All skills are installed; it does not make you choose a maturity level or remember a catalog before you can start.

Requires Node.js 20.12 or newer. Claude Code skills install under `.claude/skills/`; Codex skills install under `.agents/skills/`.

## Essential commands

| Need | Command |
| --- | --- |
| Install in this project | `npx --yes @alexandrealvaro/agentic init --yes` |
| Install for Claude Code only | `npx --yes @alexandrealvaro/agentic init --agent claude-code --yes` |
| Install for Codex only | `npx --yes @alexandrealvaro/agentic init --agent codex --yes` |
| Update this project to the current kit | `npx --yes @alexandrealvaro/agentic update --yes` |
| Preview an update | `npx --yes @alexandrealvaro/agentic update --dry-run --yes` |
| Remove agentic from this project | `npx --yes @alexandrealvaro/agentic uninstall --yes` |
| Install the `agentic` command globally | `npm install --global @alexandrealvaro/agentic` |
| Remove the global command | `npm uninstall --global @alexandrealvaro/agentic` |

After a global CLI install, run `agentic init --yes` or `agentic update --yes` from a project. A global CLI install and a user-level skill install are different things; the [installation guide](https://github.com/alexandremendoncaalvaro/agentic-development/blob/main/doc/guides/installation.md) explains both, including safe project removal.

## Everyday workflow

Start every unfamiliar repository or fuzzy request with `/ad-next`.

| Situation | Useful path |
| --- | --- |
| New product | `/ad-grill-me` → `/ad-prd` → `/ad-bootstrap` → `/ad-spec` → `/ad-task` |
| Existing feature | `/ad-ground` → `/ad-spec` when scope needs a contract → `/ad-tdd` → `/ad-review` |
| Bug or regression | `/ad-diagnose` → regression test → `/ad-review` |
| Finish and ship | `/ad-commit` → `/ad-pr` → `/ad-merge`; package maintainers use `/ad-release` |

These are routes, not gates. A one-off change should not produce artifacts that do not change the work; a durable or high-risk change should use the documentation and quality checks it needs.

## Find the right detail

- [Installation and maintenance](https://github.com/alexandremendoncaalvaro/agentic-development/blob/main/doc/guides/installation.md) — project, user-level, global CLI, update, and removal.
- [Workflows](https://github.com/alexandremendoncaalvaro/agentic-development/blob/main/doc/guides/workflows.md) — choose a path by situation.
- [Skill reference](https://github.com/alexandremendoncaalvaro/agentic-development/blob/main/doc/guides/skills.md) — every skill, grouped by job and linked to its outcome.
- [Workflow principles](WORKFLOW.md) and [visual flows](WORKFLOW-FLOWS.md) — the engineering model behind the skills.
- [Architecture](ARCHITECTURE.md) and [ADRs](doc/adr/) — implementation and binding decisions for contributors.

The installer keeps project files in sync with a state-aware three-way diff: it updates kit changes, preserves user-edited skills by default, and never silently overwrites a conflict. Report issues on [GitHub](https://github.com/alexandremendoncaalvaro/agentic-development/issues); releases are listed on [GitHub Releases](https://github.com/alexandremendoncaalvaro/agentic-development/releases).
