# GROUND-0020: Resolve project evidence through one shared capability

**Status:** recorded
**Decision:** Add a read-only `ad-project-state` capability whose deterministic
resolver selects repository and GitHub evidence from closed machine and project
configuration, then supplies one provenance-bearing fact packet to state-reading
skills.
**Decision ref:** doc/specs/0006-configurable-project-evidence-sources.md
**Confidence:** Strong

## Decision and confidence

The happy path is one deep, model-invocable capability with two concrete source
adapters from its first release: the zero-configuration repository baseline and
an explicitly configured GitHub adapter. Its bundled, dependency-free ESM script
validates layered configuration, executes fixed GitHub CLI list commands without
a shell, and reports bounded facts, observation time, provenance, and independent
failures. `ad-next`, project-scoped `ad-roadmap`, and standalone `ad-brief` compose
that packet and retain their own judgment and presentation responsibilities.

The decision is Strong. Official GitHub CLI contracts expose repository-scoped,
filtered, bounded JSON listings for both evidence kinds; an established external
adapter system uses declarative type-and-target locations; and this repository
already proves layered configuration, shell-free GitHub wrappers, partial-result
reporting, and one-way packet composition. A public-repository probe also
confirmed the installed GitHub CLI and wrapper can execute both list operations.

The deliberate deviation from the Backstage reference is on-demand collection
instead of continuous synchronization. The kit is an offline CLI plus invoked
skills, not a catalog service; caching, polling, and provider plugins would add a
runtime the feature does not need. Project configuration shadows a matching
machine entry, following the existing template-store precedent. The machine entry
is keyed by exact Git remote so one private mapping follows all worktrees without
entering a repository; a project may still declare a portable team override.

## Evidence

### E1 — GitHub exposes the required bounded read interfaces

**Strength:** High
**Provenance:** A1, A2, C6

`gh issue list` and `gh pr list` both support an explicit repository, state,
search expression, result limit, and selected JSON fields. Passing each configured
value as one `execFile` argument gives the required flexibility without shell
interpretation. A live public-repository probe on GitHub CLI 2.94.0 successfully
returned parseable results for both commands through the machine's existing
authenticated wrapper.

### E2 — A declarative source seam is established and deep enough

**Strength:** High
**Provenance:** B1, C1, C2, D2

Backstage demonstrates the analogous pattern of declarative source locations
identified by type and target, with provider-specific integration behind that
surface. In this kit, template resolution already layers machine and project
state through one validated resolver, and Prism already keeps project-specific
context outside its domain-agnostic core. Deleting a shared project-state
capability would force configuration and provider behavior back into three
callers, so the seam earns its interface.

### E3 — Existing repository execution patterns cover the security boundary

**Strength:** High
**Provenance:** C3, A1, A2

The shipped GitHub preflight uses `execFileSync`, strips Git worktree environment
leaks, accepts an executable wrapper only through `AGENTIC_GH`, and records
structured probe errors. The new resolver can reuse that proven boundary while
keeping commands out of configuration. A configured GitHub host replaces an
inherited `GH_HOST` only for the child process; authentication still comes from
the user's existing CLI session.

### E4 — Partial evidence must remain explicit and usable

**Strength:** High
**Provenance:** C4, D1, B1

The current `ad-next` survey already degrades missing, corrupt, unreadable, and
non-git inputs into explicit facts rather than crashing, and its original commit
records that behavior as a contract. Backstage likewise treats source-processing
errors as diagnosable conditions rather than a reason to erase all other catalog
state. Independent issue and pull-request probes therefore report separate
failures while preserving the repository baseline and any successful source.

### E5 — Callers should compose facts, not duplicate collection or judgment

**Strength:** High
**Provenance:** C5, D1

ADR-0076 establishes one-way fact packets as the repository's composition model:
the collector or specialist owns its facts, while the caller retains its own
reconciliation and presentation. Extending that pattern lets `ad-next` classify
and prioritize, `ad-roadmap` reconcile progress, and `ad-brief` explain meaning
without any of them owning provider configuration or GitHub execution.

## Source register

- **A1:** GitHub CLI manual, `gh issue list`, repository selection, search, state, limit, and JSON fields: https://cli.github.com/manual/gh_issue_list (accessed 2026-09-15 via official web documentation).
- **A2:** GitHub CLI manual, `gh pr list`, repository selection, search, state, limit, and JSON fields: https://cli.github.com/manual/gh_pr_list (accessed 2026-09-15 via official web documentation).
- **B1:** `backstage/backstage:docs/features/software-catalog/configuration.md:206-250`, a public implementation reference whose catalog declares source locations by type and target and places provider behavior behind integration processors; short source excerpt: "declaratively add locations pointing to YAML files" (accessed 2026-09-15 via GitHub web source inspection).
- **C1:** `doc/adr/0071-layer-publication-templates.md:35-73`, the accepted machine/project precedence and shared deterministic resolver pattern (accessed 2026-09-15 via repository read).
- **C2:** `doc/adr/0077-adopt-generic-prism-evaluations.md:31-33`, the accepted optional project adapter, live-evidence precedence, and dependency-free script pattern (accessed 2026-09-15 via repository read).
- **C3:** `src/skills/codex/ad-pr/scripts/gh-preflight.mjs:13-83,212-222`, the existing `AGENTIC_GH`, shell-free execution, clean environment, and structured error seam (accessed 2026-09-15 via repository read).
- **C4:** `src/skills/codex/ad-next/scripts/survey.mjs:25-30,75-86`, the existing explicit partial-result contract (accessed 2026-09-15 via repository read).
- **C5:** `doc/adr/0076-compose-a-canonical-decision-maker-brief.md:42-58`, the one-way fact-packet composition rule (accessed 2026-09-15 via repository read).
- **C6:** `GH_HOST=github.com ghp issue list --limit 1 --json number` and the matching `ghp pr list` command in the current public repository, using GitHub CLI 2.94.0; both exited zero with parseable JSON (accessed 2026-09-15 via local command execution).
- **D1:** `git show b65f700 -- src/skills/codex/ad-next test/skill-scripts.test.js`; commit `b65f700` moved deterministic survey work into a tested script and kept judgment in the skill body (accessed 2026-09-15 via git log and git show).
- **D2:** `git show c4204c7 -- src/skills/codex/ad-prism doc/adr/0077-adopt-generic-prism-evaluations.md`; commit `c4204c7` reinforced the generic-core/project-adapter split and auditable confidence limits (accessed 2026-09-15 via git log and git show).

## Limitations and reversal

The evidence establishes the resolver architecture and GitHub CLI contract; it
does not prove that one generic query finds every project's meaningful work or
that titles and metadata alone settle every recommendation. The configuration
therefore keeps issue and pull-request searches project-specific, and callers may
read one selected item when its meaning is required. Private dogfood must still
show that a GitHub-primary project produces a materially better `ad-next` result
without retaining its data. Repeated need for bodies, GitHub Projects, or another
provider across unrelated repositories would justify a follow-up spec; it does
not justify preloading those surfaces now.

## Audit path

Run `node .agents/skills/ad-ground/scripts/validate-record.mjs doc/research/0020-ground-project-evidence-sources.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
