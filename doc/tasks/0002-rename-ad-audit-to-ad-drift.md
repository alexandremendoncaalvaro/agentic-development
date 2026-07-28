# Task `0002`: Rename `ad-audit` (doc-drift) to `ad-drift`

**Status:** in-progress
**Created:** 2026-07-27
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

[ADR-0034](../adr/0034-audit-tier-skills-over-fold.md) introduces a new maximum-gate `ad-audit` skill and frees the `ad-audit` name by renaming the existing documentation-drift skill to `ad-drift`. This task is that rename — a pure identifier change (the skill's drift-audit behavior is unchanged), swept across both host source trees, cross-referencing skills, narrative docs, profiles, the CLI, and the regenerated dogfood install + managed AGENTS.md table.

## Acceptance Criteria

- [x] Both source skill dirs renamed: `src/skills/{claude-code,codex}/ad-audit` → `ad-drift`; frontmatter `name:` matches the new dir.
- [x] Every source and narrative-doc reference to the doc-drift skill uses `ad-drift` / `/ad-drift` (profiles.js, init.js, cross-referencing skills, README, GUIDELINES, WORKFLOW-FLOWS, PRD).
- [x] Dogfood install regenerated: `.claude/skills/ad-drift` + `.agents/skills/ad-drift` present; orphaned `ad-audit` install dirs removed; state files carry no `ad-audit`.
- [x] Managed AGENTS.md "Skills installed" table shows the `ad-drift` row (no `ad-audit` row); cross-refs like ad-deepen's "Pairs with" point to `ad-drift`.
- [x] No `ad-audit` identifier remains in the renamed skill or its references; the only occurrences are intentional prose naming the *incoming* new `ad-audit` skill — in `doc/adr/0033`, `doc/tasks/0001`, and this rename's own `doc/adr/0034` + `doc/tasks/0002`.
- [x] `npm test` green (216/216 on Node 24; CI confirms Node 20 / 22).

## Plan

- [x] `git mv` both source skill dirs; update frontmatter `name:` + heading + self-references + codex `openai.yaml`.
- [x] Update `src/lib/profiles.js`, `src/commands/init.js`, `test/init.test.js`, cross-referencing skills, and narrative docs.
- [x] `node bin/agentic.js update --yes --force` to regenerate dogfood copies + the managed table (`--force` is required non-interactively to replace the managed section).
- [x] Remove orphaned `.claude/skills/ad-audit` + `.agents/skills/ad-audit` install dirs.
- [x] Verify no stray `ad-audit`; run `npm test`; fresh-context `/ad-review` before PR.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-07-27

Rename executed via an orchestrated source sweep (identifier-only; drift-audit behavior unchanged), then verified: source clean, frontmatter `name: ad-drift`, excluded files (`doc/adr/0033`, `doc/tasks/0001`) untouched. Discovered `update --yes` alone keeps the managed AGENTS.md section stale in non-interactive mode (`confirmRootDocReplace` returns false without `--force`, by design to protect user edits); `--force` regenerates it. Also had to `git rm` the orphaned `ad-audit` install dirs — `update` adds the new skill but does not prune a renamed one. Final: no stray `ad-audit` in the renamed skill or its references — the only remaining occurrences are the intentional prose mentions of the incoming new skill in `doc/adr/0033`, `doc/tasks/0001`, and this rename's own `doc/adr/0034` + `doc/tasks/0002`. Table shows `ad-drift`; 216/216 green.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
