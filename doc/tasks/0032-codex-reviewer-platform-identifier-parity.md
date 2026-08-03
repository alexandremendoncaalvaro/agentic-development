# Task `0032`: Restore platform-identifier guard parity in the Codex reviewer brief

**Status:** proposed
**Created:** 2026-08-03
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The kit ships four adversarial reviewer briefs. Three carry the platform-identifier guard that task 0005 introduced — *"do not flag a platform-specific identifier as fabricated based on unfamiliarity; absence of recognition is not evidence of absence"* — and one does not.

Verified by direct inspection of all four:

| brief | guard |
|---|---|
| `src/skills/claude-code/ad-review/agents/fresh-context-reviewer.md` | present |
| `src/skills/codex/ad-review/agents/fresh-context-reviewer.toml` | **absent** |
| `src/skills/claude-code/ad-audit/agents/audit-group-reviewer.md` | present |
| `src/skills/codex/ad-audit/agents/audit-group-reviewer.toml` | present |

Reproduce with:

```bash
grep -ci 'absence of recognition\|fabricated' \
  src/skills/{claude-code/ad-review/agents/fresh-context-reviewer.md,codex/ad-review/agents/fresh-context-reviewer.toml,claude-code/ad-audit/agents/audit-group-reviewer.md,codex/ad-audit/agents/audit-group-reviewer.toml}
```

The consequence is asymmetric review quality across hosts: a Codex user running `/ad-review` gets a reviewer with no defence against the exact confidently-wrong finding class task 0005 was opened to stop — two reviewers independently flagging a real model identifier as fabricated because neither could verify it. That failure erodes trust in every finding a review emits, which is why it earned a rule in the first place.

The gap is pre-existing drift, not a regression from any recent change. It surfaced as a byproduct of the `/ad-level-up` curation pass recorded in [task 0030](0030-measure-review-handoff-vs-sanction-gate.md) — two independent lenses noticed it while checking whether a proposed rule was already covered. It is not itself a rule candidate: the rule exists and is correct, it simply was never mirrored to one of the four files.

## Acceptance Criteria

- [ ] `src/skills/codex/ad-review/agents/fresh-context-reviewer.toml` carries the platform-identifier guard, shaped to the Codex brief's own voice and structure rather than pasted from the Claude Code Markdown.
- [ ] The guard states both the prohibition (do not flag on unfamiliarity) and the prescribed handling (state the verification gap at `Note` severity, or skip), matching the substance of the other three briefs.
- [ ] All four briefs agree on substance; any remaining wording differences are host-shape differences, not policy differences.
- [ ] A test or check exists that would catch this class of cross-host drift in the reviewer briefs, or the absence of one is recorded here with rationale.
- [ ] Dogfood mirrors resynced via `node bin/agentic.js update --yes --force`.
- [ ] `npm test` passes.
- [ ] Reviewed via `/ad-review` before merge, per WORKFLOW §10.

## Plan

- [ ] Read all four briefs; extract the substance of the guard as the other three state it.
- [ ] Draft the Codex `ad-review` addition in that file's own idiom.
- [ ] Decide whether a parity check belongs in `test/skills.test.js`. The suite already validates frontmatter and manifests per skill; a substance-level assertion across host trees is a different shape and may not be worth its cost — record the decision either way.
- [ ] Resync mirrors, run the suite, review the range.

## Notes

**2026-08-03 — Opened.** Deliberately scoped to the missing guard only. The `/ad-level-up` pass also considered extending all four briefs with a mirror-image rule covering the *dismiss* direction (do not downgrade a finding because an identifier cannot be verified); that candidate was **rejected** on the anti-overfitting gates — its two instances proved to be different failure classes with different correct remedies, and the author-side half is already governed by WORKFLOW §7's escalation doctrine. Restoring parity on the existing rule is the whole of this task; do not let the rejected candidate back in through it.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
