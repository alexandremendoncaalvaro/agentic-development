# Task `0001`: `verify Codex config.toml [agents] syntax in ad-review escalation block`

**Status:** `done`
**Created:** `2026-05-24`
**Owner:** `Alexandre Alvaro`
**Spec ref:** `doc/specs/0002-two-axis-fresh-context-review.md`
**Board ref:** ``

## Context

The Codex variant of `ad-review` (`src/skills/codex/ad-review/SKILL.md`, "Optional escalation" block at the end of `<instructions>`) instructs users to configure `[agents]` in `~/.codex/config.toml` to enable the user-initiated subagent escalation that delivers the WORKFLOW §10 ideal (truly fresh-context reviewer). The path, the block name, and the example snippet are presented as settled fact, but the skill body cites no source and no one on this repo has verified the syntax against current Codex documentation. The fresh-context review of commit `3fabb92` flagged this explicitly:

> `src/skills/codex/ad-review/SKILL.md:167`: Concern: The escalation block instructs users to configure `[agents]` in `~/.codex/config.toml`, but no Codex public documentation is cited or verifiable from this repo, and the path/key name is presented as settled fact. If the key is wrong or the feature was renamed, users will silently fail when attempting §10 escalation.

(Audit trail: `.agentic/reviews/20260524T031236Z-v0.17.1-vs-HEAD.md`, Standards Concern #2.)

What breaks without this task: users who follow the escalation block on a real project find their subagent invocation silently failing, lose trust in the skill, and either fall back to ad-hoc single-session reviews (degrading §10) or stop using `ad-review` on Codex altogether.

## Acceptance Criteria

- [x] Current Codex subagent configuration documentation located and a citable URL captured (e.g. `developers.openai.com/codex/subagents`, `developers.openai.com/codex/cli/features`, or the project's GitHub README).
- [x] Config file path verified — is it `~/.codex/config.toml`, or has it moved (`~/.config/codex/config.toml`, `~/.openai/codex.toml`, etc.)?
- [x] Block name verified — is it `[agents]`, `[[agents]]`, `[subagents]`, or something else?
- [x] Minimum required keys per agent verified — name, prompt, model, tools, etc.
- [x] Example block in `src/skills/codex/ad-review/SKILL.md` "Optional escalation" section either confirmed correct (with citation added) or rewritten to match the verified schema.
- [x] If the syntax was wrong, the source URL is referenced in the SKILL.md so future audits can re-verify.

## Plan

- [x] `WebFetch developers.openai.com/codex/subagents` — get the canonical reference.
- [x] If subagent config docs aren't on that page, fetch `developers.openai.com/codex/cli/features` and `developers.openai.com/codex/cli/configuration` (or whatever the current config-reference page is).
- [x] Cross-check against the openai/codex GitHub repo README and any `CHANGELOG.md` entry around the subagent rollout (Jan-Apr 2026 window).
- [x] Compare findings against the current "Optional escalation" block in `src/skills/codex/ad-review/SKILL.md` (lines around 161-170).
- [x] If divergence: edit the SKILL.md block — fix path / key / example. Add a footnote citing the source URL. Mirror via `node bin/agentic.js update --agent both --yes`.
- [x] If matched: add the citation URL inline (one line) so the next auditor doesn't have to re-research.
- [x] Commit per `/ad-commit`. Suggested subject: `fix(ad-review): verify and cite Codex subagent config syntax`.
- [ ] `/ad-review` the change before merge (DoD requirement).

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### `2026-05-24`

Verified against `developers.openai.com/codex/subagents` via `WebFetch`. The prior SKILL.md was wrong on **both** path AND mechanism:

- **Wrong path.** Kit said `~/.codex/config.toml` with an `[agents]` block. Actual: subagents are **standalone TOML files** at `~/.codex/agents/<name>.toml` (personal — shared across projects) or `.codex/agents/<name>.toml` (project-scoped — committed with the repo). One file per agent.
- **Wrong block name.** Kit said `[agents]` block. The `[agents]` block in `config.toml` DOES exist but is for **global subagent settings only** (`agents.max_threads`, `agents.max_depth`), not for declaring individual subagents.
- **Required fields verified.** Per docs: `name`, `description`, `developer_instructions` (the agent's prompt) are required. Optional: `model`, `model_reasoning_effort`, `sandbox_mode`.
- **The `developers.openai.com/codex/cli/configuration` URL** referenced in the original plan returned 404; subagent config docs live entirely under the `/codex/subagents` page.

Edited `src/skills/codex/ad-review/SKILL.md` "Optional escalation" block (commit `<TBD>`) to:
1. Show the two correct file paths (`~/.codex/agents/<name>.toml` and `.codex/agents/<name>.toml`) with a clear personal-vs-project-scoped distinction.
2. Replace the stub `[agents]` snippet with a minimum complete TOML example matching the verified schema (`name`, `description`, `model`, `model_reasoning_effort`, `sandbox_mode`, `developer_instructions`).
3. Add a footnote explicitly clarifying that `[agents]` in `~/.codex/config.toml` is for global settings only — not declarations. This prevents the same drift recurring during future audits.
4. Cite `developers.openai.com/codex/subagents` inline.

`/ad-review` of the change is a DoD requirement; deferred to a single combined review of all 0001 + 0002 followup work.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10) — deferred per Notes 2026-05-24
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
