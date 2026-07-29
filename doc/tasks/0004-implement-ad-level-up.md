# Task `0004`: Implement the `ad-level-up` rule-set curation skill

**Status:** done
**Created:** 2026-07-27
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

[ADR-0037](../adr/0037-ad-level-up-rule-curation.md) specifies `ad-level-up`, the companion that curates the rule-set `ad-audit` audits against (ADR-0036 closes its loop here). This task authors it — generic, dual-host, hardcoding no rule content, behind a hard human-approval gate — writing to the rule-set at the [ADR-0035](../adr/0035-rules-location-convention.md) location.

## Acceptance Criteria

- [x] `src/skills/{claude-code,codex}/ad-level-up/SKILL.md` exist with `name: ad-level-up`, `description` ≤1536, `summary` ≤320.
- [x] Codex `agents/openai.yaml` carries `interface.display_name`, `interface.short_description`, `policy.allow_implicit_invocation`.
- [x] Each host ships a bundled `rule-candidate-reviewer` subagent (Claude `.md`, Codex `.toml`) wired via `manifest.json`, routing into `.claude/agents/` and `.codex/agents/`.
- [x] The HARD human gate is stated as a prime directive: never write to the rule-set without explicit approval, one item at a time; the gate is contract-enforced even though the skill can write.
- [x] The contract implements ADR-0037: candidate + evidence, root-cause trace, four anti-overfitting gates, effectiveness pass, deterministic placement, minimal-edit draft, adversarial multi-lens review, then report + approval gate.
- [x] Writes resolve to the ADR-0035 rule-set location (`$AGENTIC_RULES_DIR` / `~/.agentic/rules/`); the skill hardcodes no rule content and invents no location.
- [x] `ad-level-up` registered in `src/lib/profiles.js` for `team` + `mature`; managed AGENTS.md table shows its row.
- [x] `npm test` green; no house IP anywhere.

## Plan

- [x] Author `src/skills/claude-code/ad-level-up/{SKILL.md, manifest.json, agents/rule-candidate-reviewer.md}`.
- [x] Author `src/skills/codex/ad-level-up/{SKILL.md, manifest.json, agents/openai.yaml, agents/rule-candidate-reviewer.toml}`.
- [x] Register `ad-level-up` in `src/lib/profiles.js` (team + mature, after `ad-audit`).
- [x] `node bin/agentic.js update --yes --force`; verify subagents route to both host agent dirs; managed table row present.
- [x] Run `npm test`; fresh-context two-axis §10 review (Standards + Spec, via fresh-context reviewers) before PR.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-07-27

Authored both hosts modeled on `ad-audit` (fan-out review skill shape) + the extracted rule-curation mechanism. Prime directive front and centre on both hosts: the skill holds `Edit`/write capability but the contract forbids writing without explicit approval, one item at a time. Bundled `rule-candidate-reviewer` subagent runs the three refutation lenses (already-covered / coherence / placement). Generic — writes target the ADR-0035 machine location, zero house IP, no private-store specifics. Resolves the `/ad-level-up` forward reference from `ad-audit` (W1b).

Two-axis §10 review (Standards + Spec) ran adversarially and found a real Standards blocker plus several concerns, all fixed: added `Write` to `allowed-tools` (the skill offers to create the rule-set if absent, which `Edit` cannot do); set Codex `allow_implicit_invocation: false` to match the write-skill convention (a human-gated write skill must be explicitly invoked, not auto-fired); clarified the Codex escalation passes its handoff inline (no persisted trail, unlike `ad-audit`); fixed the Step 8 report to surface the dead-rule-sweep result rather than duplicating placement; removed a Claude-only lens-scaling clause for host symmetry and ADR fidelity.

### 2026-07-29 — closed

Shipped in PR #39 (`6285f72`), merged to `main` with CI green. Every acceptance criterion and Definition-of-Done item above is checked against work that actually landed, not against intent.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
