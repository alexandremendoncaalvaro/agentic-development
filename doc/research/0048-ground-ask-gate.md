# GROUND-0048: Hold a turn that ends asking the owner without a recommendation

**Status:** recorded
**Decision:** `ad-hooks` ships `scripts/ask-gate.mjs`, a `Stop` hook on both hosts. When the last assistant message ends by asking the owner a question (a `?` at the end of one of its last three prose lines, outside code, quotes and blockquotes) and carries no recommendation, or offers labelled options without any trade-off, it returns `{"decision":"block","reason":…}` once, telling the model to decide when the evidence settles it and otherwise to restate the question as a decision card. It skips when `stop_hook_active` is true and within a per-session cooldown, logs one line without reply text, and has a shadow mode and a kill switch.
**Decision ref:** doc/adr/0099-hold-a-question-without-a-recommendation.md
**Confidence:** Conditional
**Stakes:** medium × reversible

## Decision and confidence

The owner's most repeated complaint is the agent asking what the evidence or an earlier decision already settled; prose rules in `CLAUDE.md` and memory did not stop it (E1). Both hosts let a `Stop` hook read the final message and keep the turn going with a reason (E2), and public hooks already block a final message that ends in a question (E3). The kit had deferred any blocking `Stop` hook behind its own ADR and a measured rate (E4); a replay over the owner's transcripts supplies that rate (E5). Conditional: the detector is a heuristic over prose, so it cannot know whether a question was already decided, only whether it arrives with a recommendation; the mitigation is a one-shot block with a cooldown, shadow mode, and the replay script to re-measure.

## Evidence

### E1 — The owner wants a hook, not another rule, for questions that arrive without a recommendation

**Tier:** Primary
**Strength:** design choice
**Provenance:** C1, C2

The owner's global instructions require a question to arrive as a decision with context, options with advantage and disadvantage, and a recommendation (C1). The Phase T4 brief records 186 complaints of this kind and asks for a hook because the rule did not hold (C2).

### E2 — Both hosts expose the final message to a `Stop` hook and let it continue the turn

**Tier:** Primary
**Strength:** Medium
**Provenance:** A1, A2, C3

Claude Code: `last_assistant_message` holds the final response text; `decision: "block"` with `reason` tells Claude why to continue; check `stop_hook_active`; at most 8 consecutive continuations. Codex: the same fields; a block "creates a new continuation prompt that acts as a new user prompt, using your `reason`"; stdout must be JSON on exit 0; the matcher is ignored. Medium: both pages were read through a summarizing fetch tool, and RESEARCH-0026 C11 recorded the same contract on 2026-09-21 (C3).

### E3 — Public hooks block a final message ending in a question; `stop_hook_active` alone is not a safe loop guard

**Tier:** Secondary
**Strength:** Low
**Provenance:** B1, B2, B3

An overnight-mode gist strips code fences, matches a question in the last 500 characters of `last_assistant_message`, and exits 2 under a per-session counter. A published "decision ownership" Stop hook blocks text that hands the decision back to the user and nags once per response hash, and reports false positives from broad regexes. A Claude Code issue reports `stop_hook_active` staying false when reminders arrive between stop attempts, giving repeated blocks. Hence the extra cooldown.

### E4 — The kit deferred blocking `Stop` hooks behind an ADR and a measured rate

**Tier:** Primary
**Strength:** High
**Upgrade:** the claim is about the kit's own accepted records, read directly; no indirection between source and claim
**Provenance:** C3, C4, D1

RESEARCH-0026's contested section left a `Stop` gate to "its own ADR that names ADR-0047, ADR-0055, and ADR-0074". ADR-0094 rejected a `Stop` block for language drift because the owner would see the reply twice, and qualified ADR-0083 for a blocking guard with a transcript replay (C4).

### E5 — Measured on the owner's transcripts

**Tier:** Measurement
**Strength:** Medium
**Provenance:** C5

`node scripts/replay-ask-gate.mjs` over the owner's local Claude Code transcripts on 2026-11-24: see ADR-0099 decision 5 for the counts and the hand-labelled sample. Medium: one owner, Claude Code only, a growing corpus, and the rule was tuned on it.

## Source register

- **A1:** Claude Code hooks reference, Stop event, https://code.claude.com/docs/en/hooks (accessed 2026-11-24 via WebFetch subagent, summarized)
- **A2:** Codex hooks, https://developers.openai.com/codex/hooks, redirected to https://learn.chatgpt.com/docs/hooks (accessed 2026-11-24 via WebFetch subagent, summarized)
- **B1:** https://gist.github.com/jamonholmgren/caf41394d6643be4ceecbaa7c22f90b8, Overnight-mode Stop guard (accessed 2026-11-24 via WebSearch + WebFetch subagent)
- **B2:** https://hexisteme.github.io/notes/stop-hook-gates.html, decision-ownership Stop gate (accessed 2026-11-24 via WebSearch + WebFetch subagent)
- **B3:** https://github.com/anthropics/claude-code/issues/54360, `stop_hook_active` stays false between reminders (accessed 2026-11-24 via WebSearch + WebFetch subagent)
- **C1:** `~/.claude/CLAUDE.md`, "Postura de operação", the owner's global instructions (accessed 2026-11-24 via session context)
- **C2:** owner's Phase T4 brief, `brief-fase-t4-trava.md` (accessed 2026-11-24 via Bash cat)
- **C3:** `doc/research/0026-runtime-layer-deterministic-host-hooks.md` C11 and "Contested: a Stop-based verify-repair loop" (accessed 2026-11-24 via Bash grep)
- **C4:** `doc/adr/0094-deny-a-closed-list-of-destructive-shell-patterns.md` decision 4 and Alternatives; `src/skills/claude-code/ad-hooks/scripts/reply-language.mjs` (nearest analog, shadow `Stop` hook) (accessed 2026-11-24 via Bash cat)
- **C5:** `scripts/replay-ask-gate.mjs`, added with this record (accessed 2026-11-24 via Bash node)
- **D1:** `git log --all --oneline -i --grep=question` and `git log --all -G "ask.?gate|question.?gate"`: no prior attempt found; `git diff --name-only main...feat/auto-handoff`: no overlapping record (accessed 2026-11-24 via Bash git)

## Limitations and reversal

The detector reads form, not truth: a recommendation word passes a question that was already decided, and a fact only the owner can supply ("did the email arrive?") is held once. The owner sees the first reply and then its restatement. Reverse if the shadow or live log shows the owner reacting to restatements more than to the bare questions they replace, or if the block rate on approvals turns out to be noise the owner rejects.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs doc/research/0048-ground-ask-gate.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
