# ADR-0013: Project maturity profiles configure which skills auto-install and which gates are recommended

**Status:** accepted
**Date:** 2026-05-09
**Deciders:** Alexandre Alvaro

## Context

The kit has been growing the universal skill set monotonically: v0.5 had nine universals, v0.7 added one opt-in conditional. Every new project bootstrapped by the kit gets the same nine universal skills regardless of whether the project is a 200-line spike, a solo developer's side product, a team's commercial application, or a regulated public-facing service.

The Phase 2 holistic coherence review (handoff at `.agentic/reviews/2026-05-09T21-39-48Z-v0.5-coherence-review.md`) and the user's subsequent provocation surfaced a real tension. Quoting the user:

> Tudo isso poderia ser adequado por projeto na hora que configuramos a ferramenta. Sendo possível também mudar depois, pois algo pode começar simples, como uma PoC, e amadurecer pra um produto. […] o que realmente importa são os princípios que direcionam pra um bom resultado, fazendo com que o Steve Rogers possa se tornar o Capitão América.

The kit must amplify, not coerce. WORKFLOW.md §1 already states the principle directly: *"Prune. If removing a line wouldn't make the agent fail, cut it."* Applied to artifacts, not lines: if a primitive does not change agent behavior in project X, it is ceremony in project X.

The current install policy assumes "team product" as the implicit default. This is correct for the kit's most-stated audience but wrong for solo PoCs and spikes (which need posture and research, not specs and ADRs) and incomplete for regulated / mature products (which need deterministic gates the kit ships only as opt-in).

The Phase 2 review's principle-anchored audit found three skills with parcial honesty against WORKFLOW principles:

- `agentic-spec` — defensible in a team / mature context per WORKFLOW §1; ceremony in PoC.
- `agentic-task` — defensible when work spans multiple sessions; overhead when a single fix fits in one session.
- `agentic-adr` — defensible when binding decisions land; speculation when nothing yet binds.

The remaining nine skills pass the principle test as universals.

## Decision

We will introduce **project maturity profiles** that select the install set, recommend conditional skills, and shape per-profile gate posture. Four profiles ship: `poc`, `solo`, `team`, `mature`. Profile is recorded in the per-agent state file, selectable at `init`, changeable later via `agentic profile <name>`. The default for new installs is `team` — preserving the v0.7 behavior so existing installs and existing tests are unaffected.

1. **Four profiles, monotone in scope.**

   * **`poc`** — minimum viable: `agentic-philosophy` (posture), `agentic-ground` (research), `agentic-audit` (drift). No mandatory artifact-producing skills. Goal: figure out if the technique works without imposing ceremony. Conditional skills (`agentic-design`, `agentic-subagent`, `agentic-skill`, `agentic-hooks`) all blocked at this profile.
   * **`solo`** — solo developer shipping a real product: adds `agentic-bootstrap` (operational guide), `agentic-spec` (feature specs), `agentic-task` (work units), `agentic-review` (§10 review). `agentic-architecture` and `agentic-adr` remain available but opt-in (binding decisions are rare for one-person work). Conditional skills follow the v0.7 autoIf rules.
   * **`team`** — team product (the v0.7 default): all nine universals install, conditional skills follow autoIf rules. This is the profile every existing install gets when migrated from a state file without a `profile` field.
   * **`mature`** — mature / regulated product: same universals as `team`, plus `agentic-hooks` is recommended (not auto-installed without confirmation, but the TUI pre-checks the conditional). Future skills covering WORKFLOW §13 (evals) and §14 (staged spikes) land in this profile when shipped.

   The four profiles are monotone — each is a superset of the previous — so migrating from `poc` to `solo` to `team` to `mature` is additive. Reversing direction (`mature` → `poc`) prompts before removing skills.

2. **`profile` field in the state file, optional and forward-compatible.** Schema version stays at `1`. The `profile` field is optional in stored JSON; when absent (existing v0.7 installs), the loader assumes `team` for backward compatibility. New installs always write the field.

3. **New CLI command: `agentic profile`.** `agentic profile` (no argument) shows the current profile per agent. `agentic profile list` enumerates the four profiles with their notes. `agentic profile set <name>` changes the profile for the current project, prompts before adding or removing skills, then runs the equivalent of `update` to bring the install set into compliance with the new profile.

4. **`agentic init` accepts `--profile <name>`.** Non-interactive flow uses the flag value (or `team` if omitted). Interactive flow shows the profile selection as the first TUI prompt, before agent selection, with brief notes for each profile and `team` pre-selected.

5. **Profile catalog lives in `src/lib/profiles.js`.** The catalog declares per-profile universal lists, per-profile conditional rules (autoIf overrides, recommended-default overrides, blocked entries), and the human-readable note. `init.js` and `update.js` consume the catalog rather than hardcoded `REQUIRED_SKILLS` / `CONDITIONAL_SKILLS` constants. The hardcoded constants are preserved (and exported) as the `team` profile's contents to keep existing imports backward-compatible.

6. **Profiles do not change skill bodies, templates, or output contracts.** Per-profile template depth (e.g., a "lightweight" spec template that omits Out-of-Scope and Open Questions for `poc` / `solo`) was considered and deferred to a follow-up ADR. Templates today are universal; profile selection only changes which skills install and which conditional skills are recommended.

7. **WORKFLOW principles are not profile-scoped.** Every profile inherits the same WORKFLOW.md philosophy (TL;DR principles, §1 spec-driven design, §10 fresh-context review, §11 quality gates). Profiles change which artifacts the kit installs, not which principles bind. A `poc` install that ships zero artifact-producing skills still gets `agentic-philosophy` and `agentic-ground` because the principles those skills carry apply at every maturity level.

## Consequences

Positive:

- The kit stops assuming "team product" as the implicit default and matches each project to its actual maturity. Solo PoC users no longer get coerced into ADR / spec ceremony on day 1; mature product teams get the deterministic-gate recommendation surfaced.
- The migration path (`poc` → `solo` → `team` → `mature`) is monotone and explicit. A project that grows in scope adds capabilities; the kit doesn't trap users at the maturity level they picked at init.
- The principle "kit serves the project, project doesn't serve the kit" is honored in code, not just in prose. A user who explicitly chose `poc` is not periodically nagged to adopt `agentic-spec`.
- The catalog-driven design lets future profile additions land cleanly. A `lib` profile (libraries that ship to npm / PyPI) or a `notebook` profile (data-science exploration) can be added without touching `init.js`'s control flow.
- Existing v0.7 installs migrate to `team` without any user action — the loader's optional-field default is `team`, and `team` is byte-identical to the v0.7 install set.
- Pairs cleanly with [ADR-0012](0012-agentic-hooks-skill.md) (`agentic-hooks`) — `mature` profile recommends the skill; `team` allows it; `solo` allows it but does not recommend; `poc` blocks it.

Negative / trade-offs:

- **Four profiles is a public-facing taxonomy.** Once shipped, renaming or merging profiles becomes a migration. Mitigation: the four names are intuitive and aligned with how engineers already describe project maturity (PoC, solo, team, mature). Fifth profile rarely warranted; if it is, a new ADR adds it.
- **Profile choice is a decision the user must make at init.** The TUI prompt adds one step. Mitigation: `team` pre-selected; non-interactive flow defaults to `team` without `--profile`. Most users press enter and proceed exactly as today.
- **The `mature` profile carries a recommendation, not enforcement.** A user who selects `mature` but never invokes `agentic-hooks` still has no deterministic gates. Mitigation: this matches the kit's overall posture (default-skip, soft surfacing); enforcing gates would require hooks that the kit cannot install without the user's runner choice. The recommendation is honest about the gap.
- **Profile change via `agentic profile set <name>` runs an equivalent of `update`** — files may move (skills installed under the new profile that weren't under the old). The state-aware three-way diff already handles user-edit preservation; the prompt-on-conflict default applies.
- **Future profile-scoped templates require schema changes.** Deferred per item 6. When the first per-profile template ships, a follow-up ADR documents the schema extension and a state-file `schemaVersion` bump.

## Alternatives Considered

- **Three profiles only (`solo`, `team`, `mature`).** Rejected per G1. PoC / spike / hackathon work is common enough that excluding it forces those users to either over-install (`solo` is too heavy for a 200-line spike) or skip the kit entirely. Four profiles cover the realistic spectrum without inflating the taxonomy.
- **Auto-detect profile from repo signals.** Rejected per G1. Signals are fragile (repo age, presence of `package.json` deps, presence of CI config — none uniquely indicates maturity). Explicit beats auto-detect; the cost is one TUI prompt at init.
- **Profile as a separate file (`.agentic/profile.json`).** Rejected per G5. The state file already records per-agent install state; adding a sibling file fragments the source of truth and complicates `update`. Single file, optional field, profile lives where install state lives.
- **Profile changes silently re-run install.** Rejected. `agentic profile set <name>` runs the three-way diff with prompts so the user sees what is being added or removed. Mirrors the `update` UX. Quiet behavior on a destructive operation contradicts the kit's overall safe-default posture.
- **Per-profile skill bodies (e.g., a `poc` variant of `agentic-spec` with simpler template).** Rejected per item 6. Deferred to a follow-up ADR. Today's profiles change which skills install; tomorrow's may also change template depth.
- **Profile field bumps `schemaVersion` to `2`.** Rejected per item 2. Forward-compatibility wins — old loaders that don't know about profile silently ignore the field; the v0.8 loader fills missing fields with `team` default. No migration tool needed; existing installs work without action.
