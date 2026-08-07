# ADR-0057: deterministic skill steps are bundled `scripts/`; judgment stays text

**Status:** accepted
**Date:** 2026-08-07
**Deciders:** Alexandre Alvaro

## Context

The Anthropic authoring guidance frames skill content by *degrees of freedom*: fragile, consistency-critical, deterministic operations should be **low-freedom bundled scripts** the agent executes — more reliable than regenerated code, cheaper in tokens (only the script's output enters context, never its source), and consistent across runs — while open-ended work should stay **high-freedom text** the model reasons through. This is the same Level-3 packaging as `references/` (see ADR-0056): scripts run via bash and ship inside the skill directory.

The kit-wide audit found only two skills bundle a script — `ad-audit` (`scripts/resolve-rules.mjs`) and `ad-hooks` (`scripts/handoff-nudge.mjs`, from ADR-0055). Many skills instead narrate deterministic work in prose, re-derived on every invocation and drifting between skills:

- `ad-next` spells out a full `flutter doctor`-style survey — file-signal detection, `Status:` frontmatter parsing, ADR/task counts, `git rev-list` ahead-count, tests/hooks/CI presence, spec↔task reciprocity — all deterministic.
- `ad-drift` lists numbering-gap, `Status:`, supersession-chain, amendment-pair, emoji, and checkbox checks, several already written inline as `grep` commands.
- `ad-archive` narrates a `Status:` scan across artifact directories plus an absorption grep and an atomic `git rm`.
- `ad-hooks` narrates stack/runner detection and a CI-vs-pre-push diff; `ad-rules` narrates host-global-rules symlink resolution; `ad-pr` and `ad-merge` narrate `gh`/git preflight and a local gate-runner; next-`NNNN` numbering is independently re-specified in `ad-adr`, `ad-spec`, `ad-task`, and `ad-spike`.

Prose for this work is less reliable than executed code, costs body tokens, and lets the same logic drift across skills. Bundling `scripts/` is already proven to ship (ADR-0047 shipped `resolve-rules.mjs` this way; `walkSkill` copies the whole skill directory).

## Decision

We will adopt an agent-vs-script policy for both host trees.

1. Deterministic, consistency-critical sub-steps in a skill are bundled as `scripts/` the agent **executes**, with explicit execute-vs-read intent stated in the body ("run X" vs "see X"). Scripts follow "solve, don't defer" — they handle their own error conditions and document their constants rather than punting to the model.
2. Genuine judgment workflows stay high-freedom text and are **out of scope**: grounding, grilling, code review, diagnosis reasoning, TDD/TDG, and posture (`ad-philosophy`). Scripting them would over-constrain reasoning where high freedom is correct.
3. Deterministic logic reused across skills — next-`NNNN` numbering, `gh`/git preflight, repo/stack/profile detection — is factored so it is not re-derived per skill. Whether that is a per-skill copy or one shared module is an explicit sub-decision at rollout. Host-divergent helpers (e.g. `ad-rules` resolving `~/.codex/AGENTS.md` vs `~/.claude/CLAUDE.md`) are authored per host, never shared across trees.
4. Every change is made in both `src/skills/` trees, re-synced via `node bin/agentic.js update --yes`, with `npm test` green, and each new script verified to install into a consumer via `npm pack --dry-run` plus a scratch `init`.

## Consequences

Positive:

- Deterministic steps become reliable, reproducible, and token-cheap; the audit's flagship case `ad-next` drops from ~152 body lines to ~50.
- Logic duplicated across skills (detection, preflight, numbering) collapses toward a single source, ending silent drift between skills.
- Aligns the kit with the grounded "degrees of freedom" guidance and extends the `ad-audit` precedent.

Negative / trade-offs:

- Executable code in skill bundles enlarges the maintenance and security-review surface: scripts run with the agent's privileges, so each must be reviewed like shipped code, kept cross-platform (forward-slash paths, Node availability), and tested.
- The shared-helper location (per-skill copy vs one module) is deferred to rollout; getting it wrong reintroduces either duplication or a fragile shared dependency.
- Migration touches ~8 skills across both host trees.

Neutral:

- Judgment-heavy skills are explicitly unchanged; the policy names them out of scope so the boundary is not re-litigated per skill.

## Alternatives Considered

* **Keep narrating deterministic steps in prose** — rejected. It is re-derived every run, drifts between skills, and is less reliable than executed code; it contradicts the grounded degrees-of-freedom guidance the kit already follows elsewhere.
* **Script everything, including judgment workflows** — rejected. Grounding, review, and diagnosis need high freedom; encoding them as low-freedom scripts would degrade exactly the skills whose value is open-ended reasoning.
* **Defer the policy and decide skill-by-skill during edits** — rejected. Without a recorded convention the edits drift one skill at a time; this ADR sets the standard the `scripts/` rollout follows, the same way ADR-0056 sets it for `references/`.
