# Task `0030`: Measure what actually calibrates adversarial review — handoff fidelity vs. an accepted-trade-off gate

**Status:** done
**Created:** 2026-07-30
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

A pre-publish review of the `0.18.0-beta.1` range was run as an ad-hoc adversarial fan-out: six hand-written subagent prompts partitioned by domain (mirror parity, rename integrity, docs, leak-guard, release readiness, ADR ledger), dispatched straight at `fresh-context-reviewer` **without going through `/ad-review`**. Manual revalidation of all 16 findings against the design intent showed **8 were inflated** — behaviours the binding ADRs explicitly accept as trade-offs, reported as `Blocker`.

The proximate cause was visible immediately: no handoff carried any ADR, because [`ad-review/SKILL.md`](../../src/skills/claude-code/ad-review/SKILL.md) — which mandates "Every ADR under `doc/adr/` with `Status: accepted` whose subject is touched by the diff" — was bypassed.

That left a real question the kit could not answer from posture alone: **is the existing handoff rule sufficient, or does the reviewer also need an explicit instruction on what to do when the spec already sanctions the behaviour it is about to flag?** Task 0002 established the repo's methodology for exactly this class of question (multi-arm review comparison over a fixed range), and [ADR-0042](../adr/0042-evidence-discipline-behaviors.md) established the evidence bar (class-level recurrence, counted).

Prior art on the same failure family: [`4fd46f6`](../../src/skills/claude-code/ad-review/agents/fresh-context-reviewer.md) (task 0005) codified a downgrade rule after two reviewers confidently flagged a real platform identifier as fabricated.

External grounding (four-source pass, `/ad-ground`):
- **LLM Critics Help Catch LLM Bugs** (arXiv:2407.00215) — critics beat paid human reviewers on recall but hallucinate bugs; human-machine teams catch a similar number while hallucinating less than the critic alone. There is an explicit precision/recall knob.
- **Are LLMs Reliable Code Reviewers? Systematic Overcorrection** (arXiv:2603.00539) — false-negative rate rises with prompt elaboration: GPT-4o on MBPP goes 35.9% (Direct) → 74.1% (+Explain) → 87.9% (Full); Claude-4.5-sonnet 62.3% at Full. Validated mitigation is a differential **execution** filter, not a prompt instruction.
- **Bias in the Loop** (arXiv:2604.16790) — twelve biases measured for SE judging; the paper explicitly does **not** validate mitigations.
- **ReDNA / Beyond One Path** (arXiv:2605.28465) and **ADHD** (adhdstack.github.io) — divergence mechanisms for the separate premature-convergence question.

## Acceptance Criteria

- [x] A human-labelled golden set exists for the range, with a reproduction command or cited artifact per finding.
- [x] Two arms run over the identical fixed range with identical axis structure, differing only in the variable under test.
- [x] Inflation rate reported per arm against the golden set.
- [x] A verdict rendered on the candidate rule, including rejection if the evidence does not support it.
- [x] Golden-set corrections recorded where the arms out-argued the manual labelling.
- [x] Observations below the repo's evidence bar recorded as such, for future re-grading, rather than legislated.

## Plan

- [x] Label the golden set by manual revalidation of the ad-hoc pass (2 real Blockers, 6 real minor, 8 inflated).
- [x] Four-source research pass on review calibration and divergence discipline.
- [x] Arm 1 — canonical `/ad-review` shape: Standards axis + Spec axis, binding docs and all twelve new ADRs read in full. No gate.
- [x] Arm 2 — Arm 1 plus an explicit accepted-trade-off gate instructing the reviewer to downgrade to `Note` when an ADR already names the behaviour, and to report a `Gated:` count.
- [x] Tally against the golden set; render verdict.
- [x] Land the fixes the measurement validated.

## Notes

**2026-07-30 — Result.** Range `e473882..1e25d9a`, fixed across all arms.

| Arm | Handoff | Findings | Inflated | Rate |
|-----|---------|----------|----------|------|
| Control (ad-hoc, 6 domain lenses) | no ADRs | 16 | 8 | 50% |
| Arm 1 (`/ad-review` canonical) | ADRs in handoff | 7 | 0 | 0% |
| Arm 2 (+ accepted-trade-off gate) | ADRs + gate | 13 | 1 | 8% |

**Verdict: the candidate rule is rejected.** Handoff fidelity is the causal variable. Arm 1 reached zero inflation *without* the gate; Arm 2 did not improve on it and introduced one inflated finding Arm 1 did not have (correct fact — pre-redaction identifiers reachable in public history — paired with a `git filter-repo` remedy disproportionate to content that is largely the author's own first name, two self-quotes, and a public app name). No new rule is warranted: [`ad-review/SKILL.md`](../../src/skills/claude-code/ad-review/SKILL.md) already mandates the ADRs in the handoff. The failure was process non-compliance, not a rule gap.

**2026-07-30 — Observations recorded, not legislated (n=1, below the ADR-0042 bar).**

1. **Cross-axis severity inconsistency.** Within Arm 2, the Standards axis rated the history-identifier finding `Blocker` while the Spec axis gated the same fact to `Note` citing [ADR-0033](../adr/0033-house-ip-leak-guard.md) ("the guard is a backstop, not a complete exfiltration control"). Same arm, same gate, same fact, opposite verdict. The gate asks "is this an accepted trade-off?" and never "is the severity proportionate to the harm?" — a distinct inflation class it does not cover.
2. **The `Gated:` count line was cheap and made the reviewer's suppression reasoning auditable** (5 gated across Arm 2, each citing the accepting line). It did not reduce inflation versus Arm 1, so it is not justified on those grounds alone; recorded in case a future pass finds the audit trail valuable for another reason.
3. **Lens design.** The control's six lenses were domain partitions, not structurally distinct vantage points, so their errors correlated rather than cancelling. ADHD/ReDNA argue for incompatible frames with no cross-branch context; the evidence is a self-published N=6 eval and a benchmark on interactive tool-use, neither on code review. Not adopted.
4. **Prompt elaboration.** arXiv:2603.00539's Direct→Full FNR curve suggests the kit's reviewer briefs (verdict + explanation + fix, i.e. "Full") sit at the worst end. A two-stage verdict-then-explain redesign was considered and **rejected as unsupported** — the paper compared output formats, not a staged pipeline. Testing it locally is the honest next step if the question recurs.

**2026-07-30 — Golden-set corrections.** The arms out-argued the manual labelling in five places:

- **`rules/` case-sensitivity moved INFLATED → REAL.** Both Spec-axis arms reproduced the bypass and rebutted the manual downgrade correctly: ADR-0033's Consequences section *enumerates* its accepted gaps (`--no-verify`, denylist false positives, per-line substring, latency) and case is not among them, while the Decision frames the guard as fail-closed. Fixed in this range by case-folding the path probe in [`src/leak-guard.js`](../../src/leak-guard.js) `findViolations`, with the four-variant regression test in [`test/leak-guard.test.js`](../../test/leak-guard.test.js) (`regression: findViolations flags case-variant rules/ paths`). Cited by artifact rather than commit SHA deliberately: a same-branch SHA does not survive a rebase or a squash-merge, and this repo does both (PRs #29–#33 landed as merge commits, PR #35 was squashed and killed its pre-squash SHA).
- **Four real findings the ad-hoc pass missed entirely**, all verified before acceptance: [`ARCHITECTURE.md`](../../ARCHITECTURE.md) claiming Codex has no `agentsDir` (contradicted by `install.js` and the shipped `.codex/agents/*.toml`); `ARCHITECTURE.md` stating `engines.node = ">=18"`; [`doc/product/PRD.md`](../product/PRD.md) roadmap omitting `ad-audit` / `ad-level-up`; [`src/commands/init.js`](../../src/commands/init.js) printing no outro line for either new skill.

The properly-handed-off review found **more** and inflated **less** than the ad-hoc adversarial fan-out.

**2026-07-31 — The fix range was itself reviewed, dogfooding the finding above.** `/ad-review 1e25d9a..HEAD`, two axes, handoffs persisted under `.agentic/reviews/`. Result: **0 Blockers on both axes**, 1 Concern each.

The Step 0 handoff-integrity gate earned its place before any reviewer was dispatched — it exposed that `workflow-first-version.md`, an unrelated untracked draft, had been swept into the link-fix commit by a `git add -A`. The branch was rebuilt by cherry-pick without it (40 files, not 41), which is what invalidated the SHA citation the Spec axis then caught.

Two review findings applied:

- Spec Concern — the Notes cited a commit SHA that the rebase had orphaned. Re-cited by artifact (file + named test) rather than SHA. Grounding checked before choosing the remedy: all six historical SHA citations in this repo's task files survive, but four of them reference prior-art commits already on `main`, where survival is trivial. Only one (`83b0c7a`, task 0006) cited a same-branch commit like this one did, and it survived only because that PR landed as a merge commit. Same-branch SHA survival is therefore non-deterministic here; an artifact reference is not.
- Standards Note — the task header dropped template fields. `**Spec ref:**` added blank (4 of 5 historical tasks carry it). `**Execution:**` deliberately **not** added: `templates/task.md` specifies it but only 1 of 5 historical tasks (0014) actually carries it, and nothing enforces it. The real finding is template-vs-practice drift across the task corpus, not this file — recorded here rather than silently complied with.

The reviewer's supporting claim that task 0029 "kept blank labels rather than dropping the fields" was checked and is false — 0029 has no `**Execution:**` line at all. Relayed reviewer detail re-verified per ADR-0042 rather than repeated.

Remaining Standards Concern (`extractAddedLines` `++ ` header bypass) was **not** fixed here — it is listed as open below, and fixing it would be exactly the scope creep the Spec axis confirmed this range is free of. Tracked as its own task.

**2026-07-31 — Retraction: two claims in the entry above were false.** The re-review pass (`/ad-review e7a4da0..HEAD`, Spec axis) raised a Blocker against this task's own Notes, and it was right on both counts. Both errors trace to one broken sampling method: `doc/tasks/` has **two generations of numbering**, and the check globbed `doc/tasks/NNNN-*` with `head -1`, so it silently mixed files from both. `0006-bootstrap-flow-and-agents-md-bloat-fix.md` (old) and `0006-rename-ad-grill-to-ad-grill-me.md` (current) both exist in history under the same number.

- **"only 1 of 5 historical tasks (0014) carries `**Execution:**`" — false.** Sampled correctly over the current generation (every task file added in 2026-07): **14 of 14** carry `**Execution:** AFK`. The only two files lacking it were this task and 0031. Both now carry it — `HITL` here, since this task's measurement ran with the user deciding scope at each gate; `AFK` on 0031, matching the corpus default. The declared rationale for omitting the field was the exact inverse of what the repo shows.
- **"only `83b0c7a` (task 0006) cited a same-branch commit, and it survived because that PR landed as a merge commit" — false.** `83b0c7a` is dated 2026-05-24 and is already an ancestor of the commit that created the current-generation task 0006 (`8f193e5`, 2026-07-28), so it is prior-art like the other four, not a same-branch citation. The same-branch citation in task 0006 is `8f193e5` itself, which has a single parent — not a merge commit — so the stated survival mechanism does not hold for the citation it actually applies to.

**The chosen remedy still stands; only its supporting narrative was wrong.** Citing the artifact (file + named test) instead of a SHA remains correct, and for a reason that survives the correction: this branch's own SHAs were orphaned by a cherry-pick within the hour, and PR #35 demonstrates squash-merge killing a pre-squash SHA in this repo. What collapsed is the claim to have *measured* the pattern's failure rate across the corpus — the sample was invalid, so the honest status is that same-branch SHA survival here is **unmeasured**, not "a coin flip".

This is the second time in this task's own history that a confidently-stated claim failed verification — the first being the reviewer's false assertion about task 0029, correctly caught above. The symmetry is the point: ADR-0042 rule 1 is not a rule about *other* agents' claims.

**2026-07-31 — Numbering collision, surfaced by the above and not yet decided.** `ad-task` Step 1 says NNNN is "next available 4-digit number after the highest existing" in `doc/tasks/`, and `ad-archive` hard-deletes finished tasks. After the 0.18.0 archive sweep the directory was empty (`doc/tasks/` does not exist in `e473882`), so the rule points at `0001` — which is how the current generation restarted and collided with the archived 0001–0029. This task chose `0030` from the git-history maximum instead, which avoids collision but is **not** what the rule says. Neither option is clean: following the rule reuses numbers and makes every historical task citation ambiguous (the precise failure that produced the two retracted claims above); deviating from it makes the skill's own instruction wrong. Left undecided deliberately — this is rule-set design, so it belongs to `/ad-level-up` with the user in the loop, not to a silent fix here.

**2026-07-31 — Third retraction, same root cause.** The second re-review pass caught that `"**Spec ref:** added blank (4 of 5 historical tasks carry it)"` is also false, produced by the same glob-and-`head -1` sampling. Correct figure over the current generation: **14 of 14** carry the `**Spec ref:**` label; only one (0013) carries a non-blank value. Neither reading supports "4 of 5". Three false claims now trace to one broken sampling method — the count matters more than any single error, because it is the class-level recurrence ADR-0042 asks for.

**2026-07-31 — Severity misjudgement, corrected by the owner.** The Result entry above dismisses Arm 2's history-leak finding as inflated, on the reasoning that the exposed content was "largely the author's own first name, two self-quotes, and a public app name". **That judgement was wrong.** The owner confirms one of the identifiers names a private company repository. Arm 2 was right to raise it and right about the remedy class; the manual revalidation under-graded it because it reasoned about the identifiers it could recognise and treated the one it could not judge as benign by default.

This is the mirror image of the `gpt-5.4` false positive that produced the task-0005 rule: there, a reviewer flagged an unrecognised identifier as fabricated; here, the reviewer's finding was *downgraded* because the identifier was unrecognised. Both are the same error — treating "I cannot verify this" as evidence. The existing rule covers only the flag direction, not the dismiss direction. That asymmetry is a genuine rule-gap with two counted instances, and it goes to `/ad-level-up`.

**Compounding:** writing this task's Notes reintroduced the identifier verbatim into the working tree, so the record of the leak became a second instance of it. Redacted in place. The lesson is mechanical, not conceptual — a finding *about* sensitive content must not quote the content, and the leak-guard would have caught this had it been installed.

**2026-07-31 — Numbering: decided, not deferred.** The prior entry left this open and routed it to `/ad-level-up`. That was a misapplication of WORKFLOW §7, which lists what warrants an ask — design/taste, irreversible or high blast radius, genuine ties, insufficient evidence, fuzzy spec — and this is none of them. Decided here:

**Task numbering continues from the ledger, not the directory.** `ad-archive` hard-deletes finished tasks and declares git history the sole ledger. "Highest existing" in `ad-task` Step 1 therefore has to be read against that ledger, because the alternative reading lets the archive sweep destroy the numbering invariant it depends on. Highest NNNN ever used, excluding this task and 0031, is **0029** — so 0030 and 0031 are correct and stay. The 2026-07 cycle's restart at 0001 was the drift, and it is what produced the colliding corpus behind all three retractions above.

What remains for `/ad-level-up` is narrower and is a real gap: `ad-task` Step 1's wording is ambiguous between the two readings, and nothing in the corpus disambiguates it. That is a rule-text fix with human-in-the-loop, not a numbering question.

**2026-07-30 — Open, not closed by this task.**

- `extractAddedLines` treats a content line beginning with `++ ` as a diff file header, disabling the content scan for the rest of that file (reproduced: exit 0 with the marker committed). Not an ADR-0033 named limitation. Needs its own fix + pure-function test.
- `main()` has no integration test against a real git repo — flagged independently by three of the four arms.
- Pre-redaction identifiers remain reachable in public history from `origin/main`. Whether a private-source identifier is genuinely sensitive is the owner's call; history rewrite on a public repo is irreversible and was deliberately not performed.
- The leak-guard is not actually installed on the maintainer's machine (no `lefthook` binary, not in `devDependencies`, no local denylist), so none of this range's commits — including the release commit and the fixes above — were scanned. ADR-0033 names unset hooks as an accepted bypass, so this is setup debt rather than a defect, but it means the guard has never executed.
