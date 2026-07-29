# Task `0003`: Implement the new `ad-audit` maximum-gate skill

**Status:** done
**Created:** 2026-07-27
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

[ADR-0034](../adr/0034-audit-tier-skills-over-fold.md) decided to build the maximum-gate audit as a new skill; [ADR-0036](../adr/0036-ad-audit-maximum-gate.md) specifies its mechanism; [ADR-0035](../adr/0035-rules-location-convention.md) specifies where its rule-set lives. This task authors that skill — generic, dual-host, hardcoding no rule content — on the `ad-audit` name freed by Task 0002.

## Acceptance Criteria

- [x] `src/skills/{claude-code,codex}/ad-audit/SKILL.md` exist with `name: ad-audit`, `description` ≤1536, `summary` ≤320.
- [x] Codex `agents/openai.yaml` carries `interface.display_name`, `interface.short_description`, `policy.allow_implicit_invocation`.
- [x] Each host ships a bundled `audit-group-reviewer` subagent (Claude `.md`, Codex `.toml`) wired via `manifest.json`; both route into `.claude/agents/` and `.codex/agents/` on install.
- [x] The skill resolves its rule-set per ADR-0035: repo binding docs always, plus `$AGENTIC_RULES_DIR` / `~/.agentic/rules/` when present; it hardcodes no rule content or group names.
- [x] The contract implements ADR-0036: exhaustive per-rule verdicts with a coverage matrix, one isolated reviewer per group, cross-model second pass on rule-set-declared CRITICAL groups via the dual-host split, union-then-filter aggregation, evidence-artifact hard gate, and never an "approve" verdict.
- [x] `ad-audit` registered in `src/lib/profiles.js` for `team` + `mature` only; managed AGENTS.md table shows its row.
- [x] `npm test` green — 221/221 on Node 24 locally (Node 20 / 22 confirmed by CI on the PR; not installed in the dev env).
- [x] No house IP: no private tool or platform names, internal group-id schemes, or note-vault references anywhere.

## Plan

- [x] Author `src/skills/claude-code/ad-audit/{SKILL.md, manifest.json, agents/audit-group-reviewer.md}`.
- [x] Author `src/skills/codex/ad-audit/{SKILL.md, manifest.json, agents/openai.yaml, agents/audit-group-reviewer.toml}`.
- [x] Register `ad-audit` in `src/lib/profiles.js` (team + mature).
- [x] `node bin/agentic.js update --yes --force` to install + regenerate the managed table; verify subagents route to `.claude/agents/` + `.codex/agents/`.
- [x] Run `npm test`; fresh-context `/ad-review` before PR.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-07-27

Authored both hosts modeled on the kit's reference example for a fan-out review skill (`ad-review`): numbered steps, `Task` fan-out on Claude Code, single-session structural separation + user-initiated escalation on Codex, bundled reviewer subagent via `manifest.json`. Generic mechanism extracted from a private maximum-gate audit skill (per-rule coverage, cross-model on critical, union-then-filter, evidence gate) and re-authored from scratch with zero house IP. Rule content lives in the resolved rule-set only (ADR-0035), never in the skill. 221/221 green; subagents routed to both host agent dirs; managed table row present.

### 2026-07-29 — closed

Shipped in PR #38 (`70b6fef`), merged to `main` with CI green. Every acceptance criterion and Definition-of-Done item above is checked against work that actually landed, not against intent.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
