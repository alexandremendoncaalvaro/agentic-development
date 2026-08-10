# Optional escalation — Codex fresh-context reviewer subagent

Setup for the user-spawned escalation referenced by `ad-review` (Codex): bundled subagent locations, the minimum TOML config body, and the explicit spawn command.

```
For a fresh-context review, spawn the bundled Codex reviewer subagent against the audit-trail file.

1. If the project was installed with agentic, the bundled reviewer should already exist at:
     .codex/agents/fresh-context-reviewer.toml

   If it is missing, create it with `/ad-subagent` or a standalone TOML file at one of:
     ~/.codex/agents/fresh-context-reviewer.toml          (personal — shared across all projects)
     .codex/agents/fresh-context-reviewer.toml            (project-scoped — committed with the repo)

   Minimum custom body (per developers.openai.com/codex/subagents). Required fields:
   `name`, `description`, `developer_instructions`. Optional fields: `model`,
   `model_reasoning_effort`, `sandbox_mode`. NOTE on TOML indentation: the
   triple-quoted `developer_instructions` string preserves leading whitespace
   verbatim, so dedent the body to column 0 when copying — do not carry the
   display indentation below.

       name = "fresh-context-reviewer"
       description = "Adversarial §10 reviewer. Reads only the handoff file."
       model = "gpt-5.4"                   # optional — omit to inherit parent session
       model_reasoning_effort = "high"     # optional
       sandbox_mode = "read-only"          # optional
       developer_instructions = """
   Read only the handoff file the user passes. No prior context.
   Report findings under ## Standards Findings and ## Spec Findings.
   Each finding one line: file:line: <severity>: <problem>. <fix>.
   Severity is the literal word Blocker, Concern, or Note.
   Do NOT synthesize an "approve" verdict.
   """

2. From Codex, explicitly spawn it against the audit-trail file:

     > spawn the fresh-context-reviewer agent. Read <audit-path>.

The subagent loads only the handoff file, so it has no inherited context from this
session. Requires Codex subagent support (see developers.openai.com/codex/subagents).
NOTE: the [agents] block in ~/.codex/config.toml is for global subagent
settings (max_threads, max_depth) only — not for declaring individual
subagents.
```
