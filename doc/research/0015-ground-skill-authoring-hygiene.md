# GROUND-0015: Align skill hygiene with host contracts and observable value

**Status:** recorded
**Decision:** Correct tool declarations and the repository's per-host skill skeleton, but reject punctuation-based trigger assertions; reserve trigger confidence for behavioral evaluations.
**Decision ref:** Task 0068 and Task 0069
**Confidence:** Strong

## Decision and confidence

The happy path is to keep each description concise while stating both capability
and activation context, keep Claude Code `allowed-tools` aligned with the tools a
workflow actually asks to use, and retain this repository's established
Markdown-on-Claude / XML-on-Codex authoring convention. Deterministic tests may
protect those repository contracts, but they must not claim that three quoted
phrases prove model activation. Actual recall and trajectory quality belong to
the behavioral evaluation harness already tracked by Task 0048. The evidence is
strong enough to proceed because official host documentation, public reference
skills, local conventions, and repository history converge on the structural
corrections while explicitly separating metadata checks from behavioral evals.

## Evidence

### E1 — Description quality is semantic, not punctuation-shaped

**Strength:** High
**Provenance:** A1, A2, B1, B3, C1, D2

Both hosts use `name` and `description` for discovery and require the description
to say what the skill does and when it applies. Relevant keywords help recall,
but no official contract requires quoted phrases or a fixed count. The
Superpowers reference recommends concrete trigger language but also treats real
activation scenarios as the useful test. Therefore a quote-count assertion would
produce false confidence and should not ship.

### E2 — Claude Code tool metadata is pre-approval and should match real use

**Strength:** High
**Provenance:** A2, B2, C2, D1

Claude Code documents `allowed-tools` as pre-approval rather than a restriction.
The repository nevertheless promises that declarations are minimal and complete,
so a workflow that writes a record while omitting `Write`, or declares web tools
while only dispatching another skill, creates avoidable permission friction and
misstates its operational surface. Correcting the named mismatches is warranted;
copying Claude-only metadata into Codex is not.

### E3 — Per-host structure may be standardized locally without becoming a universal rule

**Strength:** Medium
**Provenance:** A1, B1, B2, C2, C3, D1

The host specifications require useful instructions and progressive disclosure,
not a universal heading set. This repository already defines and uses a dominant
Markdown skeleton for Claude Code and XML sections for Codex, and prior history
added `Next` breadcrumbs across the Claude tree. Normalizing the outliers and
testing this repository-specific convention reduces maintenance drift, provided
the test is described as a local packaging contract rather than host behavior.

### E4 — Behavioral trigger confidence belongs to the evaluation harness

**Strength:** High
**Provenance:** A1, B3, C4, D3

Official guidance asks authors to test skills with real usage and representative
evaluations. Task 0048 already owns a fixture-based trajectory harness. Folding
activation scenarios into that harness preserves prompts, observed activation,
and failures; a regex over description punctuation observes none of those.

## Source register

- **A1:** Anthropic, [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) and [Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) — concise instructions, progressive disclosure, descriptions stating what and when, and real evaluations (accessed 2026-09-11 via official web documentation).
- **A2:** Anthropic, [Claude Agent SDK skills](https://code.claude.com/docs/en/agent-sdk/skills) — discovery from descriptions, relevant keywords, and `allowed-tools` as pre-approval rather than restriction (accessed 2026-09-11 via official web documentation).
- **B1:** OpenAI, [`openai/skills` skill-creator](https://github.com/openai/skills/blob/main/skills/.system/skill-creator/SKILL.md) — concise, discriminating descriptions and progressive disclosure in a production skill (accessed 2026-09-11 via GitHub web view and the bundled host-local copy).
- **B2:** Anthropic, [`claude-plugins-official` example command](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/example-plugin/skills/example-command/SKILL.md) — `allowed-tools` used as pre-approved tools in a compact Markdown skill (accessed 2026-09-11 via GitHub web view).
- **B3:** Jesse Vincent, [`obra/superpowers` writing-skills](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md) — concrete trigger conditions and behavioral pressure tests; its trigger-only description advice conflicts with both host contracts, so only the convergent keyword and evaluation guidance is adopted (accessed 2026-09-11 via GitHub web view).
- **C1:** `test/skills.test.js:1509` — existing invocation-class and listing-budget checks protect host-facing metadata without claiming runtime activation (accessed 2026-09-11 via repository read).
- **C2:** `src/skills/claude-code/ad-skill/SKILL.md:21` — the local authoring skill defines tool completeness and separate Claude Markdown / Codex XML shapes, but carries stale 1,536-character specification wording (accessed 2026-09-11 via repository read).
- **C3:** `src/skills/claude-code/ad-ground/SKILL.md:8` — dominant Claude Markdown skeleton with numbered steps, output contract, and next-stage routing (accessed 2026-09-11 via repository read).
- **C4:** `doc/tasks/0048-build-skill-evaluation-harness.md:12` — accepted roadmap task for fixture-based skill trajectory evaluation (accessed 2026-09-11 via repository read).
- **D1:** `git log --all -S'## Next' -- src/skills/claude-code`, commit `ea6ddd1` — prior repository-wide adoption of Claude `Next` breadcrumbs (accessed 2026-09-11 via local git history).
- **D2:** `git log --all -S'allowed-tools' -- src/skills/claude-code`, commit `993bb32` — prior skill frontmatter and reference consistency pass (accessed 2026-09-11 via local git history).
- **D3:** `git log --all -- test/skills.test.js`, commit `1efd695` — current invocation-class and listing-budget contract (accessed 2026-09-11 via local git history).

## Limitations and reversal

This record does not measure whether any current model activates a skill for a
particular prompt; only representative live-session evaluations can establish
that. A host specification requiring a fixed trigger syntax would reverse the
rejection of structural trigger assertions. A behavioral evaluation showing that
the repository's per-host skeleton harms performance would reverse the local
normalization decision.

## Audit path

Run `node .agents/skills/ad-ground/scripts/validate-record.mjs doc/research/0015-ground-skill-authoring-hygiene.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
