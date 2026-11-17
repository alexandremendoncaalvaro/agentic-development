# RESEARCH-0047: Why a resumed session starts near auto-compact, and what bounds it

**Status:** recorded
**Created:** 2026-11-17
**Question:** After `/clear` and a resume from an `ad-handoff` file, where do the tokens of the first turn go, and which mechanisms bound the resume cost and the fixed floor?
**Stakes:** medium times reversible
**Confidence:** Strong for the resume path; Conditional for the floor savings (estimates until re-measured after the owner applies them)

## Conclusion and confidence

The resume turn is expensive because the handoff's protocol makes the resuming agent reconcile everything inline: it reads every referenced artifact and live source in the main window with unbounded output. In the measured Maestro resume the reconciliation added about 29k tokens on top of a floor of about 104k, so the session sat at 136k of a 168k auto-compact point after one turn (E1). Anthropic's guidance is to keep lightweight identifiers and load just in time, to isolate high-volume reads in a subagent whose summary is the only thing that returns, and to resume fresh sessions from a progress file plus the git log (E2, E3). The host also caps hook-injected context at 10,000 characters (E4), which is a natural size for a resume digest. The handoff threshold the Maestro used (`~120k` total tokens) is incoherent with a ~104k floor: it leaves about 16k of working space (E1). A threshold must be stated against working space, the auto-compact point minus the floor.

## Question and scope

In scope: the `ad-handoff` resume protocol, the handoff threshold, the `agentic-session` context band, and the reducible parts of the fixed floor. Out of scope: changing the host's auto-compact behaviour.

## Hypothesis

H1: most of the resume-turn growth is tool output from inline reconciliation, not the handoff file. H2: the floor is dominated by always-loaded listings and instruction files that have documented per-scope switches.

## Method

`eval/resume-cost.mjs` reads a Claude Code transcript, finds the user prompt that names the handoff, and reports the API context size (input + cache read + cache creation tokens) of every call in that turn, which is the context the model actually received. Run on the Maestro transcript `1d9f9015…jsonl` (2026-11-17, Opus, 200k window, auto-compact at 84%).

## Evidence

### E1 — The resume turn grew 29k tokens past the handoff read, on a 104k floor

**Tier:** Measurement
**Strength:** High
**Provenance:** S1

| Point | Context tokens |
| --- | --- |
| First call (instructions, memory, prompt) | 75,591 |
| After the handoff Read; host listings (skills, agents, deferred tools) arrive with this call | 106,994 |
| End of the resume turn (18 API calls, 23 tool results) | 136,235 |

The handoff file is 11,679 characters (about 3.4k tokens), so the floor before any work is about 103.6k. The 29.2k growth after the handoff came from a `ToolSearch` loading MCP schemas (+5.7k), a 20-line tail of a log whose lines embed whole commands (+6.5k), another session's event pages (four calls, ~3.7k), unbounded directory listings, and git probes. No subagent was used and no output was bounded. H1 holds: the handoff itself was 12% of the turn's cost.

The `/context` panel's "Autocompact buffer 33k" is reserved space, not consumed tokens; the measured floor is 104k real tokens, so working space before auto-compact (168k) is about 64k.

### E2 — Just-in-time retrieval and subagent isolation are Anthropic's documented pattern

**Tier:** Primary documentation plus reference
**Strength:** High
**Provenance:** A1, A2, B1

Subagents run in their own window and "only the summary and a small metadata trailer come back" (A1, `context-window`, `sub-agents` "Isolate high-volume operations"). Anthropic's context-engineering post recommends keeping lightweight identifiers (paths, queries) and loading at runtime, and puts a subagent's return at about 1,000 to 2,000 tokens (B1). Tool output defaults are large: Bash 30,000 characters, Read 25,000 tokens, MCP 25,000 tokens (A2, `env-vars`, `mcp`), so an unbounded call can cost 7k tokens or more.

### E3 — Long-running harnesses resume from a progress file plus git, then verify a baseline

**Tier:** Reference
**Strength:** Medium
**Provenance:** B2

The long-running-agent harness starts each fresh session with `pwd`, the git log, the progress file, one chosen item, and a baseline check, not a re-read of everything (B2, "Resuming fresh sessions").

### E4 — Hook-injected context is capped at 10,000 characters

**Tier:** Primary documentation
**Strength:** High
**Provenance:** A3

`SessionStart` hooks match `clear`, `resume`, `compact`, and their `additionalContext` or stdout is capped at 10,000 characters, beyond which it is saved to a file and only a preview is injected (A3, `hooks` "JSON output").

### E5 — The floor has documented per-scope switches

**Tier:** Primary documentation
**Strength:** High for the mechanisms; savings are estimates
**Provenance:** A4, A5, S1

| Floor part (panel) | Tokens | Documented switch |
| --- | --- | --- |
| MCP tools (loaded) | 19.2k | `/mcp` disable per project (`disabledMcpServers` in `~/.claude.json`); tool search defers schemas (`ENABLE_TOOL_SEARCH`) |
| Memory files | 14.8k | CLAUDE.md under 200 lines; `@imports` load in full; auto-memory `MEMORY.md` loads its first 200 lines or 25KB |
| Skills listing | 9.8k | `skillOverrides` per skill (`name-only`, `off`); does not apply to plugin skills |
| Custom agents | 5.8k (33 agents, mostly one plugin) | `enabledPlugins` per settings scope; `permissions.deny: ["Agent(name)"]` |

The Maestro's always-loaded instruction set is 26.6k characters (`~/.claude/CLAUDE.md` 7.5k, `AGENTS.ale.md` 18.1k, `RTK.md` 1k) plus a 103-line, 15.4k-character `MEMORY.md` index, which exceeds the 200-line guidance only in spirit (A4).

### E6 — Every tool call in the Maestro workspace fires failing hooks

**Tier:** Measurement
**Strength:** Medium (whether the host forwards these notices to the model is not documented)
**Provenance:** S1

The resume turn recorded 91 `hook_non_blocking_error` attachments with exit 127 (program not found) on `PreToolUse:Bash`, `PostToolUse:Bash`, `Stop` and `UserPromptSubmit`, about 29k characters. Not diagnosed here; listed as a follow-up.

## Limitations and what would reverse the conclusion

One transcript, one host (Claude Code desktop). Token counts are the API's own; character-to-token ratios are not used for the headline numbers. If a re-measured resume under the bounded protocol still grows past 10k, delegation is not the dominant fix and the protocol needs a hard command allowlist instead.

## Provenance and artifacts

- S1: `eval/resume-cost.mjs` over the Maestro transcript of 2026-11-17; the transcript stays local.
- A1: code.claude.com/docs/en/context-window, /sub-agents ("What loads at startup", "Isolate high-volume operations").
- A2: code.claude.com/docs/en/env-vars (`BASH_MAX_OUTPUT_LENGTH`, `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS`), /mcp ("MCP output limits").
- A3: code.claude.com/docs/en/hooks ("SessionStart", "JSON output").
- A4: code.claude.com/docs/en/memory ("Auto memory", CLAUDE.md size), /skills, /mcp ("Configure tool search").
- A5: code.claude.com/docs/en/settings (`enabledPlugins`), /sub-agents (agent listing cost, `Agent(name)` deny).
- B1: anthropic.com/engineering/effective-context-engineering-for-ai-agents ("Context retrieval and agentic search", "Sub-agent architectures").
- B2: anthropic.com/engineering/effective-harnesses-for-long-running-agents ("Resuming fresh sessions").

## Assessment

Evidence grade: measurement (E1, E6) plus primary docs (E2, E4, E5) plus reference (E3). Decision confidence: proceed.

## Derived decision

GROUND-0048 states the happy path; task-0127 tracks the change.
