# RESEARCH-0032: What changed in the kit's reference skill repositories that is worth absorbing?

**Status:** draft
**Created:** 2026-10-06
**Question:** Since the kit last absorbed them, which changes in its reference skill repositories (mattpocock/skills first; obra/superpowers, github/spec-kit, openai/skills, dotnet/skills, adewale/skill-eval-harness, anthropics/skills, and the Agent Skills spec) add value the kit does not already have, and which should be rejected?
**Stakes:** low times reversible
**Confidence:** Strong for the defect and the two High-graded items; Conditional for the Medium items

## Conclusion and confidence

Absorb five things, reject most of the upstream churn, and fix one defect first.

1. **Defect, fix now.** Twelve `SKILL.md` files (ad-adr, ad-research, ad-skill, ad-spec, ad-subagent, ad-task, on both hosts) carry `<slug>` or `<name>` in `description`. Anthropic's Agent Skills field requirements say the description cannot contain XML tags, and dotnet/skills stripped the same pattern on 2026-10-05 after Claude rejected it. Local Claude Code is not affected: this study's own session listed and loaded `ad-adr` with `<slug>` in its description. The exposure is upload to claude.ai, the API, or a marketplace sync. Reword the twelve descriptions and add a test that rejects tag-like text.
2. **`ad-diagnose`: add Minimise, Redact, and a Phase-1 exit check.** Phase 5 refers to "the minimised repro" that no phase asks for, and nothing asks the agent to redact secrets from logs and commands it shows.
3. **Eval harness: prove a grader can fail.** A planted-defect (mutation rejection) check per grader, plus baseline-headroom and noise-below-minimum-lift checks, in the ADR-0080 harness and the `ad-prism` audit checklist.
4. **`ad-level-up`: session transcripts as a candidate source, and a placement gate that routes a mechanical violation to a hook or lint rule instead of rule text.**
5. **`ad-pr`: optional Merge Danger line (one-way or two-way door, blast radius), before/after evidence, and an optional small diagram.**

Cheap runners-up: the tautological-test anti-pattern in `ad-tdd`, and expand–contract as the named exception to vertical slicing in WORKFLOW §6 and `ad-task`.

Items 1 to 3 rest on High evidence and proceed. Items 4 and 5 rest on Medium evidence (two converging sources; one source plus the owner's standing rule) and proceed as small, reversible text changes, each through `/ad-level-up` or a normal task.

## Question and scope

The kit credits several external repositories (WORKFLOW.md Provenance and Sources; ADR-0020, ADR-0021; research 0008, 0009, 0013 to 0016, 0021 to 0025, 0030). They have moved since. The question is which of those moves add value at the kit's quality bar, judged against its binding decisions (the ADR-0073 listing budget, ADR-0041 packaging, ADR-0045 anchored review, the owner's one-execution-owner rule). Stakes are low and every candidate is a reversible text or test change.

## Hypothesis

Not applicable: this is a survey question. The one measurable sub-claim (whether `<slug>` in a description breaks local Claude Code) was settled by observation, recorded below.

## Method

A research sidecar did a blob-less clone of each reference into the session scratchpad on 2026-10-06, diffed against the baseline commit or date the kit's own records cite, read every new or changed `SKILL.md` bearing on a kit skill, then read the kit file that would cover it. Official docs were fetched the same day. The author re-verified the two highest-stakes claims in the kit tree: the twelve descriptions (`grep -ln '^description:.*<' src/skills/*/*/SKILL.md` returns 12) and the dangling "minimised repro" (`ad-diagnose/SKILL.md` lines 123 and 127, no earlier Minimise step). The delta counts are reproducible from the public repositories at the heads read on 2026-10-06: `git rev-list --count 9f2e0bd..6fd947921b` in mattpocock/skills (451); `git rev-list --count --since=2026-09-17 8d670fa76a` in dotnet/skills (93) and `--since=2026-09-17 2cad2b6c5d` in adewale/skill-eval-harness (234); `--since=2026-09-09 62b6fcf499` in github/spec-kit (191, of which `-- templates` gives 2); `git rev-list --count 34040c9..683bc88e56` in anthropics/skills (3) and `5bf4e78..8ca22dba9a` in obra/superpowers (1); `find skills -name SKILL.md | wc -l` gives 38 in mattpocock/skills at `6fd9479`. Claims are graded per WORKFLOW §17.

## Evidence

### Baseline

| Reference | Absorbed | Baseline |
| --- | --- | --- |
| mattpocock/skills | Domain layer, deep-modules vocabulary, diagnose, vertical slicing, HITL/AFK, TDD tracer bullet, grill/domain/deepen | content 2026-05-10 (`9f2e0bd`); invocation flags only on 2026-09-24 (`c55ee46`) |
| obra/superpowers | router pattern, SessionStart hook, writing-skills pressure tests | `5bf4e78` (v6.4.1) |
| github/spec-kit | CLI-installs-skills, Spec layer, next-command routing | 2026-09-09 |
| openai/skills | concise descriptions, progressive disclosure | 2026-09-11 |
| dotnet/skills | outcome stimuli, dormancy cases, anti-overfitting | 2026-09-17 |
| adewale/skill-eval-harness | runner contract, stream adapters, offline grading | 2026-09-17 |
| anthropics/skills | test-and-iterate loop | `34040c9` |

### Delta

mattpocock/skills: 451 commits since the May absorption, 28 to 38 skills, 13 renamed or removed, 23 added (HEAD `6fd9479`, 2026-10-06). dotnet/skills: 93 commits. adewale: 234. spec-kit: 191, almost all ecosystem plumbing (2 touch `templates/`). anthropics/skills: 3, all in `claude-api`. superpowers: 1 plus v6.4.1 content. openai/skills: 0.

### Graded claims

- **E1 — Tags in descriptions are forbidden and the kit has twelve.** platform.claude.com Agent Skills overview, field requirements; dotnet/skills `c6ec97bf`, `1603d1b6` (2026-10-05). Kit: 12 files, no test (`test/skills.test.js` checks only length). Local observation: this session loaded `ad-adr` with `<slug>` in its description. **Strength: High** for the defect; the local-install effect is measured as absent.
- **E2 — `ad-diagnose` gaps.** mattpocock `diagnosing-bugs` @`6fd9479`, Redact section `efce423`; kit lines 123 and 127 reference an unrequested minimised repro. **Strength: High** (lineage source ADR-0021 already credits, plus an internal inconsistency confirmed by reading).
- **E3 — Graders must be shown able to fail.** dotnet `create-skill-test` mutation-rejection bar (`f868e4e0`); adewale `eval_health` headroom and noise marks; anthropics `claude-api/shared/evals/eval-audit.md` (`8a1541c`, 2026-09-28). Kit `eval/` has no mutation or headroom check. **Strength: High** (three independent sources, one vendor).
- **E4 — Transcript retrospectives with mechanical-to-deterministic routing.** mattpocock `retro` (`a7d038f`); superpowers `diagnosing-superpowers` (v6.4.1). Kit `ad-level-up` harvests PR history (ADR-0047) but not transcripts, and its placement step does not route mechanical rules to `/ad-hooks`. **Strength: Medium** (two converging sources; applies the kit's own WORKFLOW §11).
- **E5 — PR body Merge Danger and evidence.** mattpocock `pr` (`2aecca1`). Kit `ad-pr` template is Summary / Test plan / Links. **Strength: Medium** (one source, aligned with WORKFLOW §7 blast-radius language and the owner's diagram rule).
- **E6 — Tautological tests; expand–contract.** mattpocock `tdd` (`639df6e`), `to-tickets` (`a0329ba`); Khorikov and Fowler/Sato parallel change. **Strength: Medium-High.**
- **E7 — ADR-0041's premise that Codex has no plugin system is stale.** mattpocock ADR-0002 (`42a5b70`) and openai/codex source; carried into RESEARCH-0033. **Strength: High.**

### Rejected, with the deciding evidence

| Upstream change | Why not |
| --- | --- |
| Fowler-smell review baseline | ADR-0045 measured that unanchored reviewers inflate findings |
| Refactor moved out of the TDD loop | WORKFLOW §16 follows Beck; upstream is opinion |
| CONTEXT.md renamed GLOSSARY.md | no stated rationale; CONTEXT.md is wired across the kit |
| Router skill (`ask-matt`) | ADR-0073 Alternatives |
| Plugin-marketplace repackaging | ADR-0041 decision still holds; see RESEARCH-0033 |
| Parallel implementers, long-running coordinator | owner's one-execution-owner rule |
| Grilling in batched rounds; "Call the Skill tool with X" wording | single-source and unmeasured; trial through the ADR-0080 harness before rewording |

### Contested

None material. The batched-grilling claim conflicts with `ad-grill-me`'s one-question rule, but the upstream side carries no measurement, so it is deferred rather than weighed.

## Limitations and what would reverse the conclusion

- The review read changed skills, not every commit; a change hidden in a non-skill file could be missed.
- The tag rejection was observed on claude.ai and marketplace sync by a third party, not reproduced here on those surfaces.
- A harness trial showing batched grilling or inline Skill-tool wording raises routing or answer quality would move those two rejected items to adopt.

## Provenance and artifacts

All sources accessed 2026-10-06 by blob-less clone (GitHub repositories) or WebFetch (platform.claude.com, code.claude.com, agentskills.io). Full candidate table with 28 rows, commit SHAs and per-row grading: session scratchpad `research-A-references.md` (not committed; the graded claims above are the durable record).

## Derived decision

None yet. Item 1 is a defect fix through a normal task. Items 2 to 5 and the runners-up go through `/ad-level-up` or individual tasks on the owner's approval.
