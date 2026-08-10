# ADR-0056: Agent Skills use `references/` for progressive disclosure

**Status:** accepted
**Date:** 2026-08-07
**Deciders:** Alexandre Alvaro

## Context

Both host formats the kit targets — Anthropic Agent Skills and OpenAI Codex skills — share one packaging model: a `SKILL.md` plus optional `references/`, `scripts/`, and `assets/` subdirectories, loaded by *progressive disclosure*. Level 1 is the frontmatter `name` + `description` (~100 tokens, always in the system prompt); Level 2 is the SKILL.md body (loaded only when the skill triggers; the guidance targets < 5k tokens and < 500 lines); Level 3 is the bundled files, which cost **zero tokens until the agent actually reads them**.

A kit-wide audit of every `SKILL.md` across both hosts (33 skills × 2 = 66 files) found that **not one** uses `references/`. Every copy-paste template, worked example, and block of rationale lives in the always-loaded Level-2 body. Concretely: `ad-bootstrap` embeds a ~125-line AGENTS.md template inline (both hosts) that duplicates `templates/agents-project.md`; `ad-handoff` embeds a ~90-line output template; `ad-spike` carries four worked-example blocks; `ad-spec` a ~60-line template; `ad-adr` / `ad-task` / `ad-architecture` / `ad-domain` inline templates that duplicate existing `templates/*` files. This both bloats the body — degrading the instruction-following this kit exists to protect — and creates drifting duplicate copies.

It also masks a latent bug. The top-level `templates/` directory is **not** installed into a consumer repo: `src/lib/install.js` copies skill directories and the Constitution docs, never `templates/` (which `AGENTS.md` labels "manual templates shipped to npm"). So `ad-guidelines` and `ad-prd`, which tell the agent to open `templates/guidelines.md` / `templates/prd.md`, reference a path that resolves only in this self-dogfooding repo; in a consumer it dangles. On Codex the template is not even bundled beside the skill.

Feasibility is already proven. `installSkills` → `walkSkill` recurses a skill directory and copies every file and subdirectory; `package.json#files` includes `src/`. So `references/` ships to `.claude/skills/<skill>/` and `.agents/skills/<skill>/` with no installer change, and `ad-audit` already bundles `scripts/` and `agents/` this way.

## Decision

We will adopt progressive disclosure as the skill-authoring standard for both host trees.

1. The `SKILL.md` body stays a lean, imperative overview. Reference material — copy-paste templates, long worked examples, rationale/background prose, exhaustive checklists, and format specifications — moves into bundled `references/*.md`, linked **one level deep** from the body (no reference-to-reference nesting, which causes partial reads).
2. Each artifact-drafting skill carries its template in its own `references/<artifact>-template.md`, **not** the top-level `templates/` directory. `templates/` does not install into consumer repos; a skill-local `references/` file does. This makes each template a single canonical copy that ships with its skill.
3. Reference files longer than 100 lines carry a table of contents at the top.
4. Every change is made in both `src/skills/claude-code/` and `src/skills/codex/` and re-synced via `node bin/agentic.js update --yes`, with `npm test` green.

## Consequences

Positive:

- Always-loaded bodies shrink (40–60% on the worst offenders such as `ad-bootstrap`, `ad-handoff`, `ad-spike`), which is the direct lever on reliable instruction-following.
- Each template becomes one canonical, installed copy — eliminating the inline-vs-`templates/` drift and the dangling-path bug for `ad-guidelines` / `ad-prd` on both hosts.
- Bundled reference material costs zero context tokens until the agent needs it.

Negative / trade-offs:

- More files per skill directory, and a migration pass that touches ~13 skills across both host trees.
- References must be kept one level deep; a skill author who nests them reintroduces partial-read failures.
- The top-level `templates/` directory becomes redundant for skill use once templates move into `references/`; retiring or repurposing it is a follow-up, not part of this decision.

Neutral:

- No skill changes *what it does* — only *where its reference material lives*.

## Alternatives Considered

* **Leave all reference material inline** — rejected. It is the direct cause of oversized always-loaded bodies (the "too large to be followed" failure this audit targets) and of the duplicate/dangling templates.
* **Keep the shared top-level `templates/` and make the installer copy it into consumer repos** — rejected. More intrusive (it drops files at the consumer's repo root), and it runs against the host packaging model, which puts a skill's resources *inside* the skill. A per-skill `references/` file is self-contained and already ships.
* **One template file shared by several skills** — rejected as unnecessary coupling. Each artifact type maps to one owning skill; sharing reintroduces a cross-skill dependency and the same "where does the shared file install" question this decision removes.
