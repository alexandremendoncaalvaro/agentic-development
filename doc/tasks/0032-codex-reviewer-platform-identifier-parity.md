# Task `0032`: Restore platform-identifier guard parity in the Codex reviewer brief

**Status:** done
**Created:** 2026-08-03
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The kit ships **six** subagent briefs. Three carry the platform-identifier guard that task 0005 introduced — *"do not flag a platform-specific identifier as fabricated based on unfamiliarity; absence of recognition is not evidence of absence"* — and three do not.

Enumerate the population and the guard together:

```bash
find src/skills -path '*/agents/*' \( -name '*.md' -o -name '*.toml' \) | sort | while read f; do
  n=$(grep -ci 'absence of recognition\|fabricated' "$f"); n=${n:-0}
  printf '%-62s %s\n' "${f#src/skills/}" "$([ "$n" -gt 0 ] && echo present || echo ABSENT)"
done
```

Current output — no false positives, every path is a real brief:

| brief | guard |
|---|---|
| `claude-code/ad-audit/agents/audit-group-reviewer.md` | present |
| `claude-code/ad-level-up/agents/rule-candidate-reviewer.md` | **absent** |
| `claude-code/ad-review/agents/fresh-context-reviewer.md` | present |
| `codex/ad-audit/agents/audit-group-reviewer.toml` | present |
| `codex/ad-level-up/agents/rule-candidate-reviewer.toml` | **absent** |
| `codex/ad-review/agents/fresh-context-reviewer.toml` | **absent** |

**Scope decision.** The two `rule-candidate-reviewer` briefs review *proposed rule text against existing rule files* — they never read a code diff, so a platform identifier is not a thing they can encounter, and the guard would be dead weight there. They are out of scope, stated rather than assumed. If a future change gives that reviewer access to code, revisit.

That leaves `codex/ad-review/agents/fresh-context-reviewer.toml` as the one brief that both needs the guard and lacks it.

The consequence is asymmetric review quality across hosts: a Codex user running `/ad-review` gets a reviewer with no defence against the exact confidently-wrong finding class task 0005 was opened to stop — two reviewers independently flagging a real model identifier as fabricated because neither could verify it. That failure erodes trust in every finding a review emits, which is why it earned a rule in the first place.

The gap is pre-existing drift, not a regression from any recent change. It surfaced as a byproduct of the `/ad-level-up` curation pass recorded in [task 0030](0030-measure-review-handoff-vs-sanction-gate.md) — two independent lenses noticed it while checking whether a proposed rule was already covered. It is not itself a rule candidate: the rule exists and is correct, it simply was never mirrored into the Codex `ad-review` brief.

## Acceptance Criteria

- [x] `src/skills/codex/ad-review/agents/fresh-context-reviewer.toml` carries the platform-identifier guard, shaped to the Codex brief's own voice and structure rather than pasted from the Claude Code Markdown.
- [x] The guard states both the prohibition (do not flag on unfamiliarity) and the prescribed handling (state the verification gap at `Note` severity, or skip), matching the substance of the other three briefs.
- [x] All briefs that can encounter a platform identifier agree on substance; any remaining wording differences are host-shape differences, not policy differences.
- [x] A test or check exists that would catch this class of cross-host drift in the reviewer briefs, or the absence of one is recorded here with rationale.
- [x] Dogfood mirrors resynced via `node bin/agentic.js update --yes --force`.
- [x] `npm test` passes.
- [x] Reviewed via `/ad-review` before merge, per WORKFLOW §10.

## Plan

- [x] Read the three briefs that carry the guard; extract its substance as they state it.
- [x] Draft the Codex `ad-review` addition in that file's own idiom.
- [x] Decide whether a parity check belongs in `test/skills.test.js`. The suite already validates frontmatter and manifests per skill; a substance-level assertion across host trees is a different shape and may not be worth its cost — record the decision either way.
- [x] Resync mirrors, run the suite, review the range.

## Notes

**2026-08-03 — Population corrected before any work started.** The first draft of this task said "four adversarial reviewer briefs" and hand-listed four paths. There are six; `find` finds them. Three lack the guard, not one — the two `rule-candidate-reviewer` briefs are now explicitly scoped out with a reason rather than silently omitted.

That draft was written one commit after landing the rule requiring an "N of M" claim to carry its reproducing enumeration, and it broke that rule in the same shape: the population was asserted, the enumeration was hand-picked to match. Caught by the pre-publish Standards review. The Context section now carries the `find` command that produces the table, and the table states the absence of false positives.

**2026-08-03 — Opened.** Deliberately scoped to the missing guard only. The `/ad-level-up` pass also considered extending the reviewer briefs with a mirror-image rule covering the *dismiss* direction (do not downgrade a finding because an identifier cannot be verified); that candidate was **rejected** on the anti-overfitting gates — its two instances proved to be different failure classes with different correct remedies, and the author-side half is already governed by WORKFLOW §7's escalation doctrine. Restoring parity on the existing rule is the whole of this task; do not let the rejected candidate back in through it.

**2026-08-03 — Done.** The guard is in `src/skills/codex/ad-review/agents/fresh-context-reviewer.toml`, written in that file's own register rather than pasted from the Markdown twin: a `Platform identifiers:` paragraph placed before the axis sections so it gates findings on both, plus a matching line in the `Do not:` block. It carries the prohibition, the reasoning it blocks (unfamiliarity is not evidence), the prescribed `Note` severity floor, and what the reviewer *can* still flag with confidence.

The parity check the Acceptance Criteria asked for is in `test/skills.test.js` as two tests. The first asserts every diff-reading brief carries both the prohibition and the unfamiliarity reasoning, across both hosts. The second is the one that actually prevents recurrence: it enumerates every brief that exists on disk and fails if any is neither in the guarded list nor explicitly excluded — so adding a new reviewer brief without classifying it breaks the suite. A hand-maintained list would have re-created the original defect, which was a hand-maintained population.

Reproduce the current state with the `find` pipeline in Context. Suite: `npm test` reports 307/307 with no failures.

**2026-08-03 — Review gate un-ticked, same reason as task 0031.** The box was ticked in the commit that did the work, before any fresh-context pass had seen that work. The pass that has now run found two Blockers and three Concerns against it; the Concerns and the real Blocker are fixed, and the gate stays open until a pass returns against the corrected diff.

One reported Blocker was **rejected on evidence**: the Spec axis reported an intermittent suite failure in the two case-fold tests. Reverting the case-fold reproduces exactly those two test names, and the unmutated tree passed 40 consecutive full-suite runs. The failure the reviewer observed was its own mutation experiment — run deliberately, at the caller's request, to confirm the tests detect a broken guard — misread as flakiness. The tests are not flaky; they are the guard working.

**2026-08-03 — Gate closed.** A two-axis fresh-context pass ran against the corrected diff and returned **0 Blockers** on both axes. Both reviewers independently reproduced the `find` population enumeration in Context and confirmed the table, verified the new guard is byte-identical to its dogfood mirror, and checked that the parity assertions are not false-positive string matches. Concerns raised were applied before closing.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
