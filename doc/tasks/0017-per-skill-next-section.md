# Task `0017`: Add per-skill `Next` section breadcrumbs (v0.11.0-beta.1)

**Status:** done
**Created:** 2026-05-09
**Owner:** Alexandre Alvaro
**Spec ref:**
**Board ref:**

## Context

The kit ships three navigation surfaces (README sequence static, `agentic-next` reactive snapshot, `agentic init` slashLine inventory) but has no per-command breadcrumb that says "after this skill, what's natural to do next?" Industry research surfaced this as the most-common pattern in mature CLIs (rails, gh, heroku, vue, cookiecutter, yeoman, Spec Kit). ADR-0016 accepts: each skill body ships a final `Next` section with 1–2 prescriptive next-action breadcrumbs, profile-aware where it matters. Documentation-only at the source layer; no new skill / command / schema.

## Acceptance Criteria

- [x] [`doc/adr/0016-per-skill-next-section.md`](../adr/0016-per-skill-next-section.md) exists, status `accepted`, with the per-command vs reactive vs README distinction and the maintenance contract.
- [x] Every skill in [`src/skills/claude-code/`](../../src/skills/claude-code/) except `agentic-next` ships a final `## Next` section. Coverage:
  - [ ] `agentic-bootstrap`
  - [ ] `agentic-philosophy`
  - [ ] `agentic-architecture`
  - [ ] `agentic-adr`
  - [ ] `agentic-spec`
  - [ ] `agentic-task`
  - [ ] `agentic-audit`
  - [ ] `agentic-review`
  - [ ] `agentic-ground`
  - [ ] `agentic-design`
  - [ ] `agentic-subagent`
  - [ ] `agentic-skill`
  - [ ] `agentic-hooks`
- [x] Same coverage in [`src/skills/codex/`](../../src/skills/codex/) variants — appended after the `</output_contract>` tag.
- [x] `agentic-next` does NOT ship a `Next` section (recursive — skill's whole purpose is pointing at next actions; output contract already prescribes "3–5 concrete invocations").
- [x] Profile-aware inline notes where relevant (parenthetical `(skip in poc / solo)` or conditional `In team / mature:` blocks).
- [x] Dogfood install in this repo refreshed via `node bin/agentic.js update --yes --force` (managed-skills section regenerates against unchanged skill set; per-skill content updates ship via the three-way diff).
- [x] [`package.json`](../../package.json) bumped to `0.11.0-beta.1`.
- [x] `npm test` passes (no new tests required — existing `SKILL.md frontmatter parses` covers the body change).

## Plan

- [x] Branch `feat/v0.11.0-per-skill-next` cut from `cli`.
- [x] Write [`doc/adr/0016-per-skill-next-section.md`](../adr/0016-per-skill-next-section.md) in status `accepted`.
- [x] Write this task file.
- [x] Add `## Next` to each Claude Code skill body (13 files).
- [x] Add `## Next` to each Codex skill body (13 files).
- [x] Run `node bin/agentic.js update --yes --force` to refresh dogfood install.
- [x] Bump version in [`package.json`](../../package.json).
- [x] Run `npm test`. Fix anything that drifted.
- [x] Atomic commits + PR + merge to `cli`; tag `v0.11.0-beta.1`; `npm publish --tag beta`; smoke verify.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-05-09

Decision sequence with the user (O1–O5):

- O1: ADR-0016 separated, not bundled. Per-skill change across 26 files merits its own decision record.
- O2: Section heading is `Next` (action-oriented, short).
- O3: Profile-aware inline notes obligatory where the skill's natural next varies by profile (poc skips Layer 2/3 successors, etc).
- O4: `agentic-audit` and `agentic-review` ship `Next` (both have natural successors); `agentic-next` does not (recursive).
- O5: `agentic-next` stays. Per-command and reactive complement, not substitute.

Trade-off accepted: skill body length grows 3–6 lines per skill. Maintenance burden documented in ADR-0016 §6 — future ADRs that touch skills name `Next` updates explicitly.

### 2026-05-09 — close-out (v0.11.0-beta.1)

Shipped in v0.11.0-beta.1. Close-out flipped retroactively after `/agentic-next` surfaced this task as in-progress despite the v0.11.0 release. ADR-0016 + Task 0017 + 13 Claude Code skill bodies updated with `## Next` sections + 12 Codex variants updated (no agentic-subagent on Codex; agentic-next omitted per ADR §3) + dogfood refresh all landed; 139/139 tests green at the time of release.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
