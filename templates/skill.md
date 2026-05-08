---
description: <what the skill does + when to invoke — primary triggering signal>

# Optional — declare only what you need.
# name: <skill-name>                # lowercase + numbers + hyphens, ≤64 chars; defaults to directory name
# when_to_use: <trigger phrases or example requests; appended to description>
# argument-hint: <[issue-number] or [filename] [format]>
# arguments: <space-separated names mapped to positions>
# allowed-tools: Read Grep          # pre-approves tools while skill is active
# disable-model-invocation: true    # only the user can invoke (no auto-load)
# user-invocable: false             # only Claude can invoke (background knowledge)
# context: fork                     # run in a forked subagent
# agent: Explore                    # Explore | Plan | general-purpose | <custom>
# paths: <glob,glob>                # auto-load only when working in matching files
# model: <sonnet | opus | haiku | inherit>
# effort: <low | medium | high | xhigh | max>
# hooks: <see code.claude.com/docs/en/hooks>
# shell: <bash | powershell>
---

<Imperative instructions: what to do, not why. State as standing rules — once
loaded, the body stays in context for the rest of the session.>

## Additional resources

- For detailed reference: see [reference.md](reference.md)
- For examples: see [examples.md](examples.md)
