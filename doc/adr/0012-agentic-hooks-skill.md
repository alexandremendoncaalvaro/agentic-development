# ADR-0012: Workflow-operational skill `agentic-hooks` for deterministic quality gates

**Status:** accepted
**Date:** 2026-05-09
**Deciders:** Alexandre Alvaro

## Context

[`WORKFLOW.md` §11](../../WORKFLOW.md) names deterministic quality gates as the kit's highest-priority technical practice. Quoting the section directly: *"`AGENTS.md` is advisory. Hooks and CI are deterministic. The difference matters: text you write hoping the agent obeys is not the same as a script that exits non-zero when a rule is violated."* §11 lists the gates explicitly — pre-commit (lint, format, secret-scan), pre-push (build, unit, integration), visual / E2E for UI, sandboxing + scoped permissions for autonomy, never bypass.

The kit ships **none of this.** Every project bootstrapped by the kit on day 1 has zero hooks wired. The Phase 2 holistic coherence review (handoff at `.agentic/reviews/2026-05-09T21-39-48Z-v0.5-coherence-review.md`) called this out as the largest single vibe-coding escape hatch in the kit:

> Skip hooks entirely. WORKFLOW §11 says "Hooks for inviolable rules" are more important than advisory text. The kit ships no hooks. AGENTS.md acknowledges "Lint, formatter, CI: not yet wired." Every quality gate the kit ships is advisory text that the agent can forget. A user who never wires hooks will never get a deterministic quality check from this kit.

[ADR-0007](0007-workflow-operational-skills.md) §6 explicitly listed `agentic-hooks` as a deferred v0.3 candidate. The deferral was a sequencing decision, not a "we don't need it" decision. v0.7 closes it.

The ecosystem has multiple competing tools for the gates §11 names:

- **Husky** — opinionated, npm-only, JSON config, large dep tree.
- **lefthook** — language-agnostic, single binary, YAML config, fast.
- **pre-commit** (pre-commit.com) — Python-rooted but cross-language, YAML config, broadest ecosystem of hooks.
- **simple-git-hooks** — minimal, npm-only, no abstractions.
- **Native `.git/hooks`** — universal, requires manual installation per clone.
- **Claude Code `.claude/settings.json` hooks** — agent-side gates that fire on `Stop`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`. Different surface — these gate the agent's behavior, not the engineer's git workflow. Both matter; they are not substitutes.

The kit must not pick one git-hooks runner for the user. Different stacks pick different tools (Node teams converge on Husky / lefthook; Python teams on pre-commit; Go / Rust teams often on lefthook for the cross-language fit). The kit's job is to scaffold what §11 declares — not to decide which runner runs the gates.

## Decision

We will introduce one workflow-operational skill, **`agentic-hooks`**, that scaffolds the deterministic quality gates `WORKFLOW.md` §11 names. The skill is opt-in (not auto-installed in the universal set) so projects that explicitly do not need hooks (PoC, spike, doc-only repo) are not coerced into them; projects that need them get a one-shot scaffolder.

1. **Skill name `agentic-hooks`.** Workflow-operational per [ADR-0007](0007-workflow-operational-skills.md). Conditional install — opt-in, like `agentic-skill` today. No auto-trigger from feature signals; the user invokes when they decide the project needs hooks.

2. **Detect-then-recommend, never prescribe.** The skill reads the repo signals — `package.json` (Node), `pyproject.toml` (Python), `go.mod`, `Cargo.toml`, `.git/hooks/` (existing native hooks), `.husky/`, `.lefthook.yml`, `.pre-commit-config.yaml` — and recommends a runner that matches the stack. If multiple runners are present, surface the conflict and ask the user before scaffolding. Never silently pick.

3. **Scaffold the gates `WORKFLOW.md` §11 names, not the runner's full feature set.** Per the principle "the kit's job is to scaffold what §11 declares," the skill writes the minimum config that wires lint + format + secret-scan to pre-commit and build + unit + integration to pre-push. It does not configure exotic hooks (commit-msg lint, post-merge migrations, etc.) — those are the project's call.

4. **Sandboxing + scoped permissions are documented, not scaffolded.** §11's last two bullets — "Sandboxing plus scoped permissions for autonomy" and "Never bypass" — are policy, not script. The skill writes a section into `AGENTS.md` (or appends to the existing managed-skills section) documenting the gates wired, the bypass policy, and the user's chosen runner. The kit's `agentic-bootstrap` Quality Gates section already has placeholders for this; `agentic-hooks` fills them in.

5. **Claude Code settings.json hooks are out of scope.** Those gate the agent's behavior (Stop / PreToolUse / PostToolUse). Different surface. Combining them into `agentic-hooks` would conflate engineer workflow gates with agent workflow gates. Future skill (`agentic-agent-hooks` or similar) may cover them; this ADR scopes only to git hooks per WORKFLOW §11.

6. **Codex parity is symmetric.** Git hooks are agent-agnostic; both Claude Code and Codex variants of the skill produce the same scaffolds. The Codex variant lives at `src/skills/codex/agentic-hooks/SKILL.md` with the matching `agents/openai.yaml`. Auto-trigger asymmetry per ADR-0007 §6 still applies — Codex users may need to invoke the skill manually.

7. **Output contract: write hook config + AGENTS.md Quality Gates update.** The skill's output is filesystem changes (the config file at `.husky/`, `.lefthook.yml`, or `.pre-commit-config.yaml` plus an updated `AGENTS.md` Quality Gates section). The user runs the runner's installer command (e.g., `npx husky init`) — the skill does not execute scripts.

## Consequences

Positive:

- Closes the largest vibe-coding escape hatch the Phase 2 review identified. WORKFLOW §11 is no longer advisory-only; the kit ships a scaffolder.
- The detect-then-recommend posture honors the user's stack choice. Node teams get Husky / lefthook; Python teams get pre-commit; mixed teams get lefthook with explicit rationale.
- The opt-in posture matches the principle the user articulated for the broader profiles work — "kit serves the project, project doesn't serve the kit." A solo PoC user is not coerced into pre-commit configuration on day 1.
- Closes ADR-0007 §6's deferral of `agentic-hooks` as an explicit decision rather than ongoing punt; the deferred-but-tracked posture turns into shipped tooling.
- Pairs cleanly with the upcoming profiles ADR (v0.8) — `team` and `mature` profiles will recommend invoking `agentic-hooks` as part of their bootstrap path; `poc` and `solo` profiles will not.

Negative / trade-offs:

- **The kit now has an opinion on three runners (Husky, lefthook, pre-commit) plus a fallback to native `.git/hooks/`.** Maintaining recommendation logic for four targets is monotone work; the skill body must stay current as runners evolve. Mitigation: detect-then-recommend logic is small (a dozen `existsSync` checks); no runtime dep on any runner.
- **Hook content is opinionated.** The kit picks a default secret scanner (gitleaks), a default lint command per stack (eslint / ruff / golangci-lint / clippy), a default format command (prettier / black / gofmt / rustfmt). Users with different choices have to override. Mitigation: the scaffolded config is a starting point; the skill body documents how to customize per stack.
- **Cross-platform hook portability.** `.git/hooks/` shell scripts assume bash / sh; Windows users without WSL hit edge cases. Husky and lefthook handle this transparently; native hooks do not. Mitigation: the skill prefers a runner over native hooks when the project shows runner signals; native hooks are the fallback only.
- **Hooks can be bypassed.** §11 closes with "Never bypass — no `--no-verify`." The skill scaffolds the gates; it cannot prevent `git commit --no-verify`. Mitigation: the AGENTS.md Quality Gates update written by the skill states the no-bypass policy explicitly so the agent reads it every session.

## Alternatives Considered

- **Pick one runner (Husky) and ship it as the universal default.** Rejected. Husky is opinionated about Node — Python / Go / Rust users would either fight it or skip the skill entirely. The kit must not coerce a runner choice that contradicts the project's stack.
- **Make `agentic-hooks` universal (auto-install).** Rejected. Same reason ADR-0011 argued for universal `agentic-spec` does not apply here — hooks are infrastructure, not artifacts. Auto-installing the skill description is fine (it doesn't write files until invoked); auto-scaffolding hooks would coerce projects that legitimately don't need them. The opt-in posture matches the principle "kit serves the project."
- **Combine `agentic-hooks` (git hooks) and `agentic-agent-hooks` (Claude Code settings.json hooks) into one skill.** Rejected per §5 in this ADR. Different surfaces; combining conflates engineer-workflow gates with agent-workflow gates. Future ADR may scope the second.
- **Defer to v0.8 alongside the profiles ADR.** Rejected. The Phase 2 review flagged §11 as the largest vibe-coding gap; profiles add maturity-aware install policy on top. Hooks need to ship first so profiles have something concrete to recommend.
- **Scaffold richer policies (commit-msg lint, post-merge migrations, conventional-commits enforcement).** Rejected. WORKFLOW §11 names a specific list; the skill scaffolds that list. Richer policies are project decisions, not kit decisions.
