# Installation and maintenance

`agentic` has two separate installation concepts:

- **Skill materialization** copies the kit into a project or your user home, where Claude Code and Codex can load it.
- **Global CLI installation** makes the `agentic` command available on your shell. It does not install skills into any project by itself.

## Project installation

This is the normal choice. From the target repository root:

```bash
npx --yes @alexandrealvaro/agentic init --yes
```

The default materializes every bundled skill for both supported hosts:

| Host | Skill directory | State file |
| --- | --- | --- |
| Claude Code | `.claude/skills/` | `.claude/agentic-state.json` |
| Codex | `.agents/skills/` | `.agents/agentic-state.json` |

Use `--agent claude-code` or `--agent codex` only when the project should support one host. `--agent both` is explicit but equivalent to the default non-interactive install.

The installer also copies `WORKFLOW.md` and `WORKFLOW-FLOWS.md`. If `AGENTS.md` or `CLAUDE.md` is present, it can maintain a bounded `Skills installed by agentic` section. A tracked root document is shared project content, so unattended installation skips that write unless you explicitly pass `--force-root-doc`.

## User-level installation

Use this when you want a personal default skill set outside a particular repository:

```bash
cd "$HOME"
npx --yes @alexandrealvaro/agentic init --yes
```

This writes the same host-native locations under your home directory and also installs the kit's workflow documents there. Project installation remains useful when you want a versioned, shareable skill surface in that repository.

## Global CLI installation

Install the executable once:

```bash
npm install --global @alexandrealvaro/agentic
```

Then run it from a target directory:

```bash
cd path/to/project
agentic init --yes
agentic update --yes
```

To remove only that globally installed executable:

```bash
npm uninstall --global @alexandrealvaro/agentic
```

## Update

Run an update from the same directory where the skills were materialized:

```bash
npx --yes @alexandrealvaro/agentic update --yes
```

Preview before writing:

```bash
npx --yes @alexandrealvaro/agentic update --dry-run --yes
```

`update` compares the current kit source, the hashes saved at the last install, and the target files. It updates unchanged kit files, preserves a user-edited skill by default, and asks before overwriting an actual conflict. Use `--force` only when you deliberately want the kit version to replace a user edit.

## Remove a project installation

There is currently no `agentic uninstall` command. It would be unsafe to guess: agent directories can contain project-owned files, and a state file does not preserve the original bytes of a locally edited skill.

If you deliberately remove a project materialization, use `.claude/agentic-state.json` and `.agents/agentic-state.json` only as an inventory. For every listed path, first verify that it is an unedited kit file or make a backup. Do not delete `.claude/` or `.agents/` wholesale.

Before removing root files, check ownership:

- Remove `WORKFLOW.md` and `WORKFLOW-FLOWS.md` only when the project did not add its own content.
- Remove the bounded `agentic-managed-skills` section from `AGENTS.md` or `CLAUDE.md` only when it is no longer wanted; preserve everything outside its markers.
- Keep project-owned `.claude/agents/`, `.codex/agents/`, and every locally edited skill file unless you deliberately mean to discard it.

## Troubleshooting

- **Codex cannot see the skills:** verify `.agents/skills/` exists in the project and re-run `agentic init --agent codex --yes` or `agentic update --agent codex --yes` from the project root.
- **A root document was not updated:** it is probably Git-tracked. Review the change and re-run with `--force-root-doc` only when writing the managed section is intended.
- **A skill stayed old after update:** it was likely locally edited. Run `update --dry-run` to inspect the conflict; use `--force` only after deciding to replace that edit.
