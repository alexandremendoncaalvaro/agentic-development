# task-0037: ad-audit empirical-falsification lane (ADR-0052, C4)

**Status:** in-progress
**Date:** 2026-08-07

## Goal

Implement [ADR-0052](../adr/0052-ad-audit-empirical-falsification-lane.md): a serial, orchestrator-only lane in `ad-audit` that **runs the mutation** when a reviewer finding asserts a specific test/suite *cannot fail* on a production change, instead of settling that claim by argument. This is candidate C4 from the kit-improvement pass — the one finding class three reviewers can agree on and all be wrong about, because the only proof is to make the change and watch the suite stay green.

Grounded against the current `ad-audit` on `main` (not memory — the skill moved under the parallel state-projection / design-intent / content-anchor merges). Aligns with ADR-0045's cited differential-execution mitigation (arXiv:2603.00539) and ADR-0047's determinism category; not added adversarial pressure.

## Checklist

- [x] `src/skills/claude-code/ad-audit/SKILL.md`: new Step 6 (the lane) inserted between the former Step 5 (harden) and Step 6 (aggregate); Steps 6/7/8 renumbered to 7/8/9 with all cross-references updated. Verified: headings sequential 0–9, ref tally consistent.
- [x] `src/skills/codex/ad-audit/SKILL.md`: mirror — lane is Step 7 (codex numbering: harden=6, aggregate was 7); former 7/8 renumbered to 8/9, cross-refs updated.
- [x] One-line guard in both `audit-group-reviewer` briefs (`.md` + `.toml`): reviewers do not mutate the tree; a "cannot fail" inference is handed up to the orchestrator's serial lane.
- [x] Dogfood refresh (`node bin/agentic.js update --yes`) — installed `.claude/skills` + `.agents/skills` copies and the two installed briefs synced byte-identical (parity test green).
- [x] `CHANGELOG.md` `[Unreleased]` entry.
- [x] Structural test: both hosts' `ad-audit` name the lane; `npm test` green.
- [ ] `/ad-review` (fresh context) on the diff.
- [ ] `/ad-audit` (Alê's mandatory final gate for this piece) on the diff; resolve/refute findings with evidence.
- [ ] Flip ADR-0052 to `accepted` on Alê's OK; open the PR via `ghp` against `main`.

## Notes

### 2026-08-07

Renumbering is the fiddly part: the two hosts number their steps differently (claude-code aggregate = Step 6; codex aggregate = Step 7), so the lane lands at a different integer per host (6 vs 7). Done by descending blanket renumber (8→9, 7→8, then 6→7 on claude-code only) to avoid double-shift, then insert, then grep-verify the sequence and ref tally on both. The final `/ad-audit` is the safety net for any renumber drift.

The `PROJECTION.md` count invariant trips on every `proposed`-ADR commit (the test wants count == file count, the prose assumes all accepted). ADR-0052 was counted 27→28 with a "proposed — not yet binding" note. Flagged as recurring friction of the normal `/ad-adr` flow; a fix to that feature is separate.
