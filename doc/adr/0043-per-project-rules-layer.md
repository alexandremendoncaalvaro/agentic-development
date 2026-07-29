# ADR-0043: Per-project rules layer with commit-or-exclude visibility

**Status:** accepted
**Date:** 2026-07-28
**Deciders:** Alexandre Alvaro

## Context

[ADR-0035](0035-rules-location-convention.md) resolved the audit rule-set from two layers: the repo's binding docs (always, zero-config base) and an optional curated machine store (`~/.agentic/rules/`, `AGENTIC_RULES_DIR` override) — "curate once, audit everywhere." It explicitly rejected a per-repo `.agentic/rules/` alternative.

Practice surfaced the gap that rejection left: **project-scoped curated rules have no home**. A team's review conventions are heavier than `AGENTS.md` prose (they carry group structure and critical tags for the audit) and more project-specific than a personal machine store — a practitioner's real per-project rule-sets today live outside the model entirely. ADR-0035's rejection reasons also do not apply to a *project* layer: portability is a non-goal for project rules by definition; the ephemeral-state mixing concern is solved by git tracking (not directory choice); and the `rules/`-path leak-guard is specific to this public kit repo, where it remains the backstop.

A second force, from the same practice: **whether project rules are committed must be the practitioner's per-repo choice.** In personal repos the rules should ship with the repo (the team inherits them on clone; rule changes go through PR). In an employer's repo the practitioner may want project rules that are neither committed *nor* declared in `.gitignore` (itself a committed, team-visible file).

## Decision

Add a **third rule-set layer**: per-project curated rules at **`.agentic/rules/`** in the repo root.

**Resolution** (extends ADR-0035's order): repo binding docs (always) ∪ curated machine store (if resolved) ∪ `.agentic/rules/` (if present). Same file format as the machine store — markdown rule files; groups and `critical` tags defined by the rule-set itself.

**Precedence:** union across layers, except on genuine conflict, where **the project layer wins over the machine store** — mirroring the layering principle that a repo's own standard outranks a personal convention set. Shadowing is never silent: the audit applies the project rule and **reports** which machine-store rule it shadowed. No override syntax in v1; explicit override markers are the revisit path if implicit shadowing ever misfires.

**Visibility is a per-repo choice with two supported modes:**

- **Committed** — the default posture: rules version with the project, the team inherits them on clone, and rule changes ride the same PR governance as code.
- **Machine-local** — the directory exists in the working tree but is excluded via **`.git/info/exclude`** (the per-clone exclusion file that is never committed), *not* `.gitignore` (a committed, team-visible file). `ad-level-up` asks which mode on first project-rule creation and, in machine-local mode, writes the `.git/info/exclude` entry itself.

**Anti-duplication boundary** (Documentation Discipline rule 5): content already in the binding docs stays there — the base layer always covers it. `.agentic/rules/` carries only what the binding docs do not: group/critical structure for the audit and curated review conventions.

This ADR **amends ADR-0035**: its "per-repo `.agentic/rules/`" rejected alternative is superseded for the project layer by the rationale above. The machine store and its resolution are unchanged. In this kit's own public repo, the leak-guard (ADR-0033) continues to block committing `rules/` paths — machine-local mode is the only mode here, by design.

## Consequences

Positive:

- Every rule scope now has a home: personal-everywhere (machine store), project (in-repo layer), operational prose (binding docs) — and teams share project rules by cloning.
- The commit decision belongs to the practitioner per repo, with a mode that leaves zero team-visible footprint when that is what the situation calls for.
- Shadowing-with-report keeps precedence visible without turning every personal-vs-project divergence into permanent audit noise.

Negative / trade-offs:

- Three layers to reason about instead of two. Mitigated: resolution stays one sentence, and the audit's shadowing report makes layer interaction observable.
- Machine-local mode means teammates' audits resolve fewer rules than the practitioner's on the same repo — inherent to the choice, and visible (the audit lists which layers resolved).
- `.git/info/exclude` is per-clone: a fresh clone of a machine-local repo needs the entry re-added. `ad-level-up` re-offers the wiring when it finds an unexcluded, uncommitted `.agentic/rules/`.

## Alternatives Considered

- **Machine store subdirectories per project (`~/.agentic/rules/<project>/`)** — rejected. Breaks team sharing via the repo, dies on a colleague's clone, and ties rules to a machine instead of the project they describe.
- **`.gitignore` for the private mode** — rejected. `.gitignore` is itself committed and team-visible; the private mode's requirement is zero footprint in the repo.
- **Union-only composition (no precedence)** — rejected. A genuine personal-vs-project conflict would surface as a finding on every audit of that repo — permanent noise for a deliberate divergence.
- **Silent project-wins precedence** — rejected. A shadowed machine-store rule disappearing without trace is drift the practitioner cannot see; the report line costs nothing.
- **Explicit override syntax in v1** — deferred (YAGNI). Implicit shadowing with a report covers the known cases; syntax lands if it misfires.
