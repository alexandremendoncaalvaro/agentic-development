# Bootstrap a Skill

Spec: [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) | open standard [agentskills.io](https://agentskills.io) | examples [github.com/anthropics/skills](https://github.com/anthropics/skills)

## Where it lives

- Personal: `~/.claude/skills/<skill-name>/SKILL.md`
- Project: `.claude/skills/<skill-name>/SKILL.md`

Directory name becomes the command (`/<skill-name>`).

## Paste to your agent

> Read the SKILL spec at https://code.claude.com/docs/en/skills and the structure in [`templates/skill.md`](../templates/skill.md). Create a skill at `<.claude/skills/<name>/SKILL.md | ~/.claude/skills/<name>/SKILL.md>` that `<does X when Y>`.
>
> Constraints:
> - `description` is the triggering signal — include keywords a user would naturally say. Combined `description` + `when_to_use` is capped at 1,536 chars.
> - Body ≤500 lines; move long material to sibling files (`reference.md`, `examples.md`, `scripts/`).
> - Body stays in context after invocation — every line is recurring token cost. State *what to do*, not narration.
> - Don't restate AGENTS.md.
> - Only declare frontmatter fields you actually need. **Do not invent fields not in the spec.**
