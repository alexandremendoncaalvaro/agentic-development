# Task `0030`: Measure what actually calibrates adversarial review — handoff fidelity vs. an accepted-trade-off gate

**Status:** done
**Created:** 2026-07-30
**Owner:** Alexandre Alvaro
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

- **`rules/` case-sensitivity moved INFLATED → REAL.** Both Spec-axis arms reproduced the bypass and rebutted the manual downgrade correctly: ADR-0033's Consequences section *enumerates* its accepted gaps (`--no-verify`, denylist false positives, per-line substring, latency) and case is not among them, while the Decision frames the guard as fail-closed. Fixed in [`7133c18`](../../src/leak-guard.js) with a four-variant regression test.
- **Four real findings the ad-hoc pass missed entirely**, all verified before acceptance: [`ARCHITECTURE.md`](../../ARCHITECTURE.md) claiming Codex has no `agentsDir` (contradicted by `install.js` and the shipped `.codex/agents/*.toml`); `ARCHITECTURE.md` stating `engines.node = ">=18"`; [`doc/product/PRD.md`](../product/PRD.md) roadmap omitting `ad-audit` / `ad-level-up`; [`src/commands/init.js`](../../src/commands/init.js) printing no outro line for either new skill.

The properly-handed-off review found **more** and inflated **less** than the ad-hoc adversarial fan-out.

**2026-07-30 — Open, not closed by this task.**

- `extractAddedLines` treats a content line beginning with `++ ` as a diff file header, disabling the content scan for the rest of that file (reproduced: exit 0 with the marker committed). Not an ADR-0033 named limitation. Needs its own fix + pure-function test.
- `main()` has no integration test against a real git repo — flagged independently by three of the four arms.
- Pre-redaction identifiers remain reachable in public history from `origin/main`. Whether `private-platform` is genuinely sensitive is the owner's call; history rewrite on a public repo is irreversible and was deliberately not performed.
- The leak-guard is not actually installed on the maintainer's machine (no `lefthook` binary, not in `devDependencies`, no local denylist), so none of this range's commits — including the release commit and the fixes above — were scanned. ADR-0033 names unset hooks as an accepted bypass, so this is setup debt rather than a defect, but it means the guard has never executed.
