# Installation and maintenance

`agentic` has two separate installation concepts:

- **Skill materialization** installs the personal default into your user home. A project copy is an explicit exception for a team that intentionally pins a shared version.
- **Global CLI installation** makes the `agentic` command available on your shell. It does not install skills into any project by itself.

## User-level installation (default)

This is the normal choice. It is safe to run from any directory:

```bash
npx --yes @alexandrealvaro/agentic@latest init --yes
```

The default materializes every bundled skill for both supported hosts under your home directory:

| Host | Skill directory | State file |
| --- | --- | --- |
| Claude Code | `~/.claude/skills/` | `~/.claude/agentic-state.json` |
| Codex | `~/.agents/skills/` | `~/.agents/agentic-state.json` |

Use `--agent claude-code` or `--agent codex` only when the project should support one host. `--agent both` is explicit but equivalent to the default non-interactive install.

The installer keeps `WORKFLOW.md` and `WORKFLOW-FLOWS.md` together at `~/.agentic/kit/`, then adds one bounded import block to each selected host's global instructions (`~/.codex/AGENTS.md` or `~/.claude/CLAUDE.md`). It never writes those kit documents into a repository.

## Explicit project installation

Use this only when a repository deliberately needs a versioned, shareable skill surface. From its root:

```bash
npx --yes @alexandrealvaro/agentic@latest init --scope project --yes
```

This writes only host-native skills and state below `.claude/`, `.agents/`, and `.codex/`; it does not copy `WORKFLOW.md` or `WORKFLOW-FLOWS.md` to the repository root. The personal global constitution remains the source of those rules. If the project intentionally shares the materialized skills, commit them as team-owned content; otherwise use the interactive exclude offer to keep the local files out of commits.

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

Update the global personal installation from any directory:

```bash
npx --yes @alexandrealvaro/agentic@latest update --yes
```

Preview before writing:

```bash
npx --yes @alexandrealvaro/agentic@latest update --dry-run --yes
```

`update` compares the current kit source, the hashes saved at the last install, and the target files. It updates unchanged kit files, preserves a user-edited skill by default, and asks before overwriting an actual conflict. Declared skill replacements also remove a retired name only when every known legacy file is unchanged; an edited retired skill stays intact. Use `--force` only when you deliberately want the kit version to replace a user edit.

For a deliberate project installation, run the same command at that repository root with `--scope project`.

## Remove an installation

From the project root, remove the files recorded in agentic's state:

```bash
npx --yes @alexandrealvaro/agentic@latest uninstall --scope project --yes
```

Preview first when you want an inventory:

```bash
npx --yes @alexandrealvaro/agentic@latest uninstall --scope project --dry-run --yes
```

The command removes only exact files listed in the selected scope's state files; it never deletes `.claude/`, `.agents/`, or `.codex/` wholesale. A locally edited managed file stays by default and its state entry remains for a later decision. Pass `--force` only when you explicitly want to discard those edits. To remove personal skills, specify `--scope user`; it deliberately leaves `~/.agentic/kit` and the global instruction import for manual review.

## Troubleshooting

- **Codex cannot see the skills:** verify `~/.agents/skills/` exists and re-run `agentic init --agent codex --yes` or `agentic update --agent codex --yes`. For a deliberate project install, add `--scope project`.
- **A root document was not updated:** it is probably Git-tracked. Review the change and re-run with `--force-root-doc` only when writing the managed section is intended.
- **A skill stayed old after update:** it was likely locally edited. Run `update --dry-run` to inspect the conflict; use `--force` only after deciding to replace that edit.
