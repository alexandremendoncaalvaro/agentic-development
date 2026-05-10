# ADR-0026: Rename slash-command prefix from `agentic-` to `ad-`

**Status:** accepted
**Date:** 2026-05-10
**Deciders:** Alexandre Alvaro

## Context

The kit ships 23 skills, every one invoked via `/agentic-<verb-or-noun>` (`/agentic-bootstrap`, `/agentic-architecture`, etc.). The prefix is 9 characters. With several skill invocations per session — and `agentic-` being the typo target every time — the ergonomics cost compounds. The author types these slash commands dozens of times per working day; nobody else uses the kit yet, so the breaking-change cost is null.

The pre-rename Phase-2 cross-pollination pass against [`mattpocock/skills`](https://github.com/mattpocock/skills) used short single-word skill names (`diagnose`, `grill-with-docs`). The kit's `agentic-` prefix exists to disambiguate against host skills (Claude Code ships built-ins like `init`, `review`, `security-review`) — disambiguation works as long as a prefix exists, but the prefix does not need to be nine characters.

[ADR-0001](0001-skills-mode-for-claude-and-codex.md) and [ADR-0007](0007-workflow-operational-skills.md) name the skills with `agentic-` prefix throughout. Both ADRs predate the realization that the prefix length itself was load-bearing on typing cost. They are not superseded by this ADR — only the naming convention they document is updated.

## Decision

We rename the slash-command prefix from `agentic-` to `ad-` (short for "agentic development", the kit's full name). The shorter prefix is two characters instead of nine.

1. **Rename surface (in scope):**
   - Skill directories under `src/skills/<agent>/agentic-X/` → `src/skills/<agent>/ad-X/`.
   - Dogfood install directories under `.claude/skills/agentic-X/` and `.agents/skills/agentic-X/` → `.claude/skills/ad-X/` and `.agents/skills/ad-X/`.
   - SKILL.md frontmatter `name: agentic-X` → `name: ad-X` (Claude Code variant).
   - Codex `agents/openai.yaml` `display_name: agentic-X` → `display_name: ad-X`.
   - Inside skill bodies: `/agentic-X` slash-command references and bare `agentic-X` cross-skill mentions → `/ad-X` / `ad-X`.
   - Install-path wiring: `src/lib/profiles.js`, `src/commands/init.js`, `src/lib/rootdoc.js` skill-name strings → `ad-X`.
   - Tests: `test/init.test.js` `UNIVERSAL_SKILLS`, `test/profile.test.js` assertions, `test/lib.test.js` skill-name strings → `ad-X`.

2. **Preserve (out of scope):**
   - The `agentic` brand. The kit, the npm package (`@alexandrealvaro/agentic`), the CLI binary (`agentic`), the repo (`agentic-development`), the WORKFLOW prose, and the README all keep "agentic" as the project name.
   - CLI subcommands (`agentic init`, `agentic update`, `agentic profile`) — these are CLI verbs, not skill names. Unchanged.
   - State files (`.claude/agentic-state.json`, `.agents/agentic-state.json`) — they record the kit's state, not a skill identity. Unchanged.
   - The managed-doc marker `<!-- agentic-managed-skills:start -->` and section heading `## Skills installed by \`agentic\`` — these reference the kit, not the skill prefix. Unchanged.
   - Historical ADRs (0001-0025) and tasks (0001-0027) bodies that mention old skill names. ADR-0004 binds task files as append-only; ADRs are decision records preserving the language of their moment. Per the rename's interpretation, a single forward-pointing line in `AGENTS.md`, `README.md`, and `ARCHITECTURE.md` covers all historical references with one durable pointer.

3. **No backwards-compatible alias.** A `/agentic-bootstrap` shim that aliases to `/ad-bootstrap` would double the surface area and produce stale docs over time. Since nobody outside the author uses the kit yet, the breaking change ships clean.

4. **Mapping table (all 23 skills).**

   | Before | After |
   | --- | --- |
   | `/agentic-bootstrap` | `/ad-bootstrap` |
   | `/agentic-philosophy` | `/ad-philosophy` |
   | `/agentic-architecture` | `/ad-architecture` |
   | `/agentic-adr` | `/ad-adr` |
   | `/agentic-spec` | `/ad-spec` |
   | `/agentic-task` | `/ad-task` |
   | `/agentic-audit` | `/ad-audit` |
   | `/agentic-review` | `/ad-review` |
   | `/agentic-ground` | `/ad-ground` |
   | `/agentic-next` | `/ad-next` |
   | `/agentic-spike` | `/ad-spike` |
   | `/agentic-tdg` | `/ad-tdg` |
   | `/agentic-domain` | `/ad-domain` |
   | `/agentic-grill` | `/ad-grill` |
   | `/agentic-deepen` | `/ad-deepen` |
   | `/agentic-diagnose` | `/ad-diagnose` |
   | `/agentic-commit` | `/ad-commit` |
   | `/agentic-pr` | `/ad-pr` |
   | `/agentic-merge` | `/ad-merge` |
   | `/agentic-design` | `/ad-design` |
   | `/agentic-subagent` | `/ad-subagent` |
   | `/agentic-skill` | `/ad-skill` |
   | `/agentic-hooks` | `/ad-hooks` |

## Consequences

**Positive.**
- 7 characters saved per invocation. With dozens of invocations per day, real ergonomics gain.
- `ad-` is the same length as common host-tool prefixes (`gh-`, `git`, `npm`) — typing rhythm matches.
- The "ad" mnemonic doubles as a forcing function: the user thinks "agentic development" each time, reinforcing the kit's positioning.

**Negative / trade-offs.**
- **Breaking change.** Every prior commit history, ADR, task, and external doc referencing `/agentic-X` becomes stale. Mitigated by the null external user base and the global forward-pointer in narrative docs (AGENTS.md, README.md, ARCHITECTURE.md).
- **Audit-tool noise.** `/agentic-audit` runs in the future will surface every historical ref. Mitigated: the audit skill is read-only and the historical refs are intentional historical records, not drift.
- **Search costs.** Code search for "agentic-bootstrap" only finds historical material; live system uses "ad-bootstrap". Mitigated: the ADR's mapping table is the canonical lookup.
- **Re-init for downstream projects.** A downstream project that ran `agentic init` before the rename has `.claude/skills/agentic-X/` dirs on disk and an `agentic-state.json` listing them. `agentic update` will see the old skills as orphans and the new ones as creations, prompting orphan-removal. Mitigated: kit currently has no external users; the upgrade path is self-applied by the dogfood install.

## Alternatives considered

- **Keep `agentic-` (status quo).** Rejected — author's daily typing cost has compounded to the point where the prefix is the single biggest ergonomics drag in the kit.
- **Drop the prefix entirely** (`/bootstrap`, `/spec`, `/task`). Rejected — collides with Claude Code's built-in skills (`/init`, `/review`, `/security-review`) and would force renames every time Anthropic ships a new built-in. Two-character prefix `ad-` keeps the kit's namespace bounded against host churn.
- **Different short prefix** (`/a-`, `/ag-`, `/ax-`). Rejected — `ad-` carries semantic meaning ("agentic development") that the other options do not. `/a-` is too generic and would collide as soon as any other tool ships an `/a-X` skill.
- **Ship a `/agentic-X` → `/ad-X` alias layer.** Rejected per §Decision 3 — alias doubling produces stale docs and split-brain skill-discovery.
- **Defer the rename to a major version (v1.0).** Rejected — every day of delay costs more typing; v1.0 has no scheduled date.

## References

- [ADR-0001](0001-skills-mode-for-claude-and-codex.md) — original Skills-mode decision that introduced the `agentic-` prefix.
- [ADR-0007](0007-workflow-operational-skills.md) — workflow-operational skill category and the per-skill-ADR rule.
- [ADR-0013](0013-project-maturity-profiles.md) — profile catalog the renamed skills register into.
- [mattpocock/skills](https://github.com/mattpocock/skills) — prior art using short single-word skill names.
- [task-0028](../tasks/0028-slash-command-rename-ad-prefix.md) — implementing task.
