# GROUND-0044: Review the uncovered delta once, and load only the Constitution's summary

**Status:** recorded
**Decision:** `ad-review` reads the coverage ledger and reviews only the delta since the last covered commit, writing a `Base-SHA:` that the receipt gate accepts only when it chains to a covered review; the gate asks for an audit receipt only when the branch touches the repository's configured high-risk paths; the critical-group second pass of `ad-audit` names a model other than the first pass and runs once per covered state; and the installer writes the Constitution's TL;DR inline in the host's global rules file, in place of an import of the whole `WORKFLOW.md`.
**Decision ref:** doc/adr/0091-review-the-uncovered-delta-once.md; doc/adr/0092-load-the-constitution-summary-not-its-full-text.md
**Confidence:** Strong

## Decision and confidence

The owner's binding rule (C1) classes redundant review as a critical failure: review what is not yet covered, once per state; after a fix, the delta only; audit only for high-risk or uncovered work; cross-model hardening once per critical group. The kit's skill text and its receipt gate demand the opposite (C2, C3), and its "different model" pass resolves to the same model as the first (C4, A3). On the context side, the host documentation states that an import does not reduce context cost (A1) and that Codex supports no import at all within a 32 KiB budget (A2), which the owner's Codex session confirms (C5). The happy path is to change the realization, not the principle: a ledger read and a chained delta receipt, a risk-scoped audit check, a real model change, and a summary loaded inline with the full text on demand (B2). Axis 2: Strong. Every change is reversible, the gate is still shadow-only, and each behaviour is testable through the gate script and the installer's public functions.

## Evidence

### E1 — An imported file costs the same context as inline text, and Codex does not expand imports

**Strength:** High
**Provenance:** A1, A2, C5, C6, C8

The Claude Code memory documentation says imports "don't reduce its context cost, because imported files also load at launch" and targets under 200 lines per file. The Codex AGENTS.md documentation caps combined instructions at 32 KiB and describes no import directive; the owner's Codex session of 2026-10-13 received the literal `@/Users/ale/dev/ales-workflow/AGENTS.ale.md` line, not its content. Measured: the full `WORKFLOW.md` is 55,072 bytes; its TL;DR is 5,685 bytes.

### E2 — A small always-loaded bootstrap with full text on demand is an established pattern

**Strength:** Medium
**Provenance:** A1, B2, C6

The memory documentation moves instructions that matter only sometimes out of the always-loaded files. `obra/superpowers` bootstraps through one session-start skill and leaves every other skill to on-demand discovery. The kit already ships the full Constitution at `~/.agentic/kit/WORKFLOW.md` and the `ad-philosophy` skill as on-demand carriers. Medium, not High: the pattern is reported and implemented, not measured for adherence on this kit.

### E3 — The kit's review path re-reviews covered states and forces an audit on every pull request

**Strength:** High
**Provenance:** C1, C2, C3, D1

`sequence-gate.mjs:70-72` asks for an audit receipt before `gh pr create`, `ready` and `merge`; `ad-review` ends with "Re-run `/ad-review` on the fix"; `ad-audit` rebuilds every group on a re-audit and runs the critical second pass twice. The audit check entered with commit `0b52d75`.

### E4 — The second pass of `ad-audit` does not change model today

**Strength:** High
**Provenance:** A3, C4, C7, D1

The subagent documentation resolves a subagent's model from the per-invocation `model` parameter first, then its frontmatter. `audit-group-reviewer.md:5` pins `model: sonnet` since commit `5400127`, so a `sonnet` override is the same model. Measured over this repository's recorded subagent sessions before 2026-10-15: 133 of 133 `audit-group-reviewer` dispatches ran on `claude-sonnet-5-5`, and the 22 that passed an override passed `sonnet`.

### E5 — Delta review is an established reviewer mechanism

**Strength:** Medium
**Provenance:** B1, C1

GitHub's pull request review marks a file as viewed and unmarks it "if the file changes after you view the file", which scopes the next review to what changed. The owner's rule asks for the same at commit granularity. A chained receipt is the gate's analog: a delta counts only when its base was itself covered.

## Source register

- **A1:** Anthropic, "How Claude remembers your project", https://code.claude.com/docs/en/memory, size target and import cost (accessed 2026-10-15 via WebFetch)
- **A2:** OpenAI, "AGENTS.md", https://learn.chatgpt.com/docs/agent-configuration/agents-md (redirected from developers.openai.com/codex/guides/agents-md), 32 KiB default and no import directive (accessed 2026-10-15 via WebFetch)
- **A3:** Anthropic, "Create custom subagents", https://code.claude.com/docs/en/sub-agents, model field and per-invocation resolution order (accessed 2026-10-15 via WebFetch)
- **B1:** GitHub Docs, "Reviewing proposed changes in a pull request", https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/reviewing-proposed-changes-in-a-pull-request, viewed-file reset on change (accessed 2026-10-15 via WebFetch)
- **B2:** `obra/superpowers:RELEASE-NOTES.md`, session-start bootstrap through one skill and native discovery for the rest (accessed 2026-10-15 via GitHub tarball of `main`)
- **C1:** `/Users/ale/dev/ales-workflow/AGENTS.ale.md`, section "Review economy (every project)", the owner's binding rule (accessed 2026-10-15 via Read)
- **C2:** `src/skills/claude-code/ad-hooks/scripts/sequence-gate.mjs:70-72`, audit check on every pull request action (accessed 2026-10-15 via sed)
- **C3:** `src/skills/claude-code/ad-review/SKILL.md:160` and `src/skills/claude-code/ad-audit/SKILL.md:22,111-112`, re-run, rebuild-every-group and twice-run second pass (accessed 2026-10-15 via grep)
- **C4:** `src/skills/claude-code/ad-audit/agents/audit-group-reviewer.md:5`, `model: sonnet` (accessed 2026-10-15 via grep)
- **C5:** `~/.codex/sessions/2026/10/13/rollout-2026-10-13T18-32-05-01a1372e-042f-7e30-9dd8-25e382b6542c.jsonl`, injected global instructions carry the literal import line (accessed 2026-10-15 via grep)
- **C6:** `wc -c WORKFLOW.md` 55,072 and `awk '/^## TL;DR/{f=1} /^## 1\./{f=0} f' WORKFLOW.md | wc -c` 5,685 (accessed 2026-10-15 via Bash)
- **C7:** `~/.claude/projects/-Users-ale-Personal-agentic-development*/*/subagents/*.meta.json` with `agentType` `audit-group-reviewer`, excluding the session that wrote this record: the `model` override field (absent 111, `sonnet` 22) and the `message.model` values in each sibling `.jsonl` (`claude-sonnet-5-5` in 133 of 133); enumeration by a Python scan of those files, no false positives found because each file is one dispatch (accessed 2026-10-15 via Bash)
- **C8:** `wc -c ~/.claude/CLAUDE.md /Users/ale/dev/ales-workflow/AGENTS.ale.md ~/.claude/RTK.md ~/.agentic/kit/WORKFLOW.md ~/.claude/projects/-Users-ale-Personal-agentic-development/memory/MEMORY.md AGENTS.md` totals 104,210 bytes, the always-loaded stack of a session in this repository (accessed 2026-10-15 via Bash)
- **D1:** `git log -S"checks: ['gate-run', 'review', 'audit']" -- src/skills/claude-code/ad-hooks/scripts/sequence-gate.mjs` gives `0b52d75` (2026-10-07); `git log -S'model: sonnet' -- src/skills/claude-code/ad-audit/agents/audit-group-reviewer.md` gives `5400127` (2026-07-27); `git log -- src/lib/global-rules.js` starts at `886baa9` (2026-08-14) (accessed 2026-10-15 via git log)

## Limitations and reversal

This record does not measure whether a summary-only Constitution keeps rule adherence; a live trial showing the agent losing a rule the full text carried would reverse the inline-summary choice for that rule, by promoting it into the summary. It does not establish which paths are high-risk in another repository; each repository configures its own. A chained delta receipt trusts that the delta review covered its range, as the current gate trusts a full review.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs doc/research/0044-ground-review-economy-and-context-budget.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
