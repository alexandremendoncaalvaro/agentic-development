# GROUND-0047: Roll the context over with a handoff, clear and resume instead of a compaction

**Status:** recorded
**Stakes:** medium × reversible
**Decision:** Near the auto-compact point the `agentic-session` plugin asks the model for a compact handoff file under the home directory, at a turn's end or beside the tool results of a turn still running; when the file is whole it runs `/clear` and submits a resume prompt in the same window, inside the turn-end hook so it also works in `claude -p`; a system-prompt section vouches for the request; a compaction that happens anyway is told what to keep and drops the pending handoff.
**Decision ref:** doc/adr/0098-roll-the-context-over-with-a-handoff.md
**Confidence:** Strong for Claude Code with the plugin on this build; Moderate across models and future builds

## Decision and confidence

The owner asked for the handoff, clear and resume to happen by themselves where the compaction happens today, headless included (C1). Published practice points the same way: a curated file that a fresh context reads beats a summary of the old one (E1, E2). The engine can do it from a plugin, and the measurements fix the shape: the request must also arrive mid-turn (E5), the clear must be awaited at the turn's end (E4), the path cannot depend on POSIX `/tmp` (E9), and the system prompt must vouch for the request (E7). One real headless run on the final code rolled over three times with no compaction (E8). Confidence is Strong for this build because the load-bearing claims are measured; it is Moderate beyond it because the plugin interface is early access and the model's willingness to follow the mid-turn request was observed on one model.

## Evidence

### E1 — Compaction loses what a long task needs; a file read by a fresh context is the published alternative

**Tier:** Primary
**Strength:** Medium
**Provenance:** A2, A3, B1, B2

Anthropic's long-running harness post says "compaction isn't sufficient" and pairs a progress file with git so each new session, which "begins with no memory of what came before", can pick the work up. Its context-engineering post describes structured notes kept outside the window beside compaction. Amp reports "We have removed compaction from Amp and replaced it with something that we think works a lot better: Handoff", extracting what matters for the next task instead of summarizing. Manus treats the file system as context and keeps compression restorable (keep the path, drop the document). Medium, not High: these are reports of practice, not measurements on this kit, and the quotes came through a fetch tool that summarizes pages.

### E2 — The community rollover on Claude Code is manual, banded, and reinjects through SessionStart

**Tier:** Primary
**Strength:** Medium
**Provenance:** A1, B3

A published setup turns auto-compaction off, warns once per band at 75, 85 and 92 percent from `UserPromptSubmit` and `PostToolUse` hooks, has the person run `/handoff` and `/clear`, and reinjects `HANDOFF.md` with a `SessionStart` hook matching `startup|clear`. The hooks reference confirms `SessionStart` sources `startup, resume, clear, compact, fork` and that its plain-text stdout becomes context. Adopted from it: bands, one request per band, a named "next concrete step". Not adopted: a settings hook cannot run `/clear` or submit a prompt, so that setup needs a keypress and does nothing in `claude -p`; the plugin interface can do both (E3, E4).

### E3 — A plugin can clear the session and submit the next prompt, and it loads in `claude -p`

**Tier:** Measurement
**Strength:** High
**Provenance:** C2, C3, C6, C7, C9

The repository already clears and resumes behind a button (task 0115, ADR-0088 addenda). Measured in `claude -p --plugin-dir`: the plugin loads, `turn.step` fires on every model request with the real fill from `$.session.usage()` (window 200,000, auto-compact threshold 167,000, about 48,000 tokens at the start), and an immediate `$.command.run({command:'clear'})` followed by `$.prompt.submit` continues the run under a new session id.

### E4 — In `claude -p` a deferred clear loses to the process exit

**Tier:** Measurement
**Strength:** High
**Provenance:** C8, C9

A clear and submit scheduled after the turn-end hook returned failed with "$.prompt.submit is not available in this mode: no session is bound": the process exits after the last turn. Awaited inside the `turn.complete` hook, the same calls work. The cycle therefore awaits them there.

### E5 — A long headless turn reaches the compaction before any turn end

**Tier:** Measurement
**Strength:** High
**Provenance:** C10, C11

A single long `-p` turn auto-compacted mid-turn three times and then ended with "Autocompact is thrashing" and exit code 1. `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` did not change the reported threshold. A request that waits for a turn's end never fires in such a run, so the request must also be added beside the tool results of the running turn.

### E6 — A mid-turn note makes the model stop and write the handoff

**Tier:** Measurement
**Strength:** Medium
**Provenance:** C12, C14

A note appended with `$.session.append` during a turn made the model stop and write a usable handoff file, and the first real cycle followed from it. Medium: one model, and E7 shows the same note refused in another run.

### E7 — Without a system-prompt statement the model may refuse the note as an injection

**Tier:** Measurement
**Strength:** High
**Provenance:** C15, C16

In one real run the model treated the note beside tool results as a prompt injection and went on working; the engine compacted and nothing rolled over. With a `prompt.compose` section saying the owner turned the rollover on, that the labelled message is genuine, and that it only ever asks for one handoff file under one directory, the next run followed every request. The section also bounds the label, so a tool result that imitates it cannot ask for anything else.

### E8 — The final code rolls over headless on Windows with no compaction

**Tier:** Measurement
**Strength:** High
**Provenance:** C16, C4

`claude -p` on Windows 11, start point 55, final code: three rollovers, no compaction, four session ids in sequence, a toast from the plugin at each, the task's final answer and exit code 0. The three handoff files exist under `<home>/.agentic/handoffs/`. `npm test` covers the rules and the failure cases (C4).

### E9 — The POSIX temp path does not exist on Windows

**Tier:** Measurement
**Strength:** High
**Provenance:** C13, C2, C5

On this Windows machine `TMPDIR` is undefined while the home directory is reachable through `HOME` and `USERPROFILE`. The task-0115 lookup reads `${TMPDIR:-/tmp}/agentic-handoffs` and so finds nothing there. The automatic handoff goes under the home directory, the same place on every system, and the plugin names the exact path in the request instead of searching for a file.

### E10 — A rest and a drop keep the cycle from looping or clearing the wrong context

**Tier:** Measurement
**Strength:** High
**Provenance:** C14, C4

The first real run showed both failures: a time-based rest after a resume delayed the next request until the engine compacted, and a handoff file written for the context that was then compacted triggered a needless clear. Now a session that is already past the start point on its first reading after a resume rests (another rollover would gain nothing), a session resumed below it is asked again when it gets there, and a main-loop compaction drops the pending handoff. Each has a test.

## Source register

- **A1:** Anthropic, "Hooks reference", https://code.claude.com/docs/en/hooks, `PreCompact`/`PostCompact` triggers, `SessionStart` sources and stdout as context (accessed 2026-11-21 via WebFetch, first 100k characters of the page)
- **A2:** Anthropic, "Effective harnesses for long-running agents", https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents, progress file, git, compaction not sufficient (accessed 2026-11-21 via WebFetch)
- **A3:** Anthropic, "Effective context engineering for AI agents", https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents, compaction and structured note-taking (accessed 2026-11-21 via WebFetch; paraphrase, not verbatim)
- **B1:** Amp, "Handoff (No More Compaction)", https://ampcode.com/news/handoff, compaction removed in favour of handoff (accessed 2026-11-21 via WebFetch)
- **B2:** Manus, "Context Engineering for AI Agents: Lessons from Building Manus", https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus, file system as context, restorable compression (accessed 2026-11-21 via WebFetch)
- **B3:** Semih Erdogan, "Context Rollovers Without /compact", https://dev.to/semiherdogan/context-rollovers-without-compact-338l, bands 75/85/92, `HANDOFF.md`, `SessionStart` reinjection (accessed 2026-11-21 via WebFetch)
- **C1:** The owner's request of 2026-11-21, relayed by the orchestrating session: handoff, clear and resume where the automatic compaction happens, headless too, `ad-handoff` updated, publish on success quoted in task 0127 Context (accessed 2026-11-21 via the session brief)
- **C2:** `plugins/agentic-session/hooks/register.mjs` and `hooks/band.mjs` at `7d49aa3`, the button-driven clear-and-continue and `handoffDirs` reading `${TMPDIR:-/tmp}` (accessed 2026-11-21 via Read)
- **C3:** `doc/adr/0088-ship-an-optional-claude-code-companion-plugin.md`, addenda of 2026-10-13 and 2026-10-15 (accessed 2026-11-21 via Read)
- **C4:** `test/session-plugin.test.js`, the `task-0127` tests, run with `node --test test/session-plugin.test.js` (accessed 2026-11-21 via Bash)
- **C5:** `src/skills/claude-code/ad-handoff/SKILL.md` at `7d49aa3`, the `${TMPDIR:-/tmp}/agentic-handoffs` path and the "do not auto-execute /clear" line (accessed 2026-11-21 via Read)
- **D1:** `git log --oneline -- plugins/agentic-session` ending at `d548e6d`, `ecf01f6`, `e218e01`: task 0115 built the clear behind a press and hardened the file name that reaches the model (accessed 2026-11-21 via git log)
- **C6:** Measured 2026-11-21, Claude Code 2.1.327, Windows 11, `claude -p --plugin-dir <plugin> --output-format stream-json`: the init event lists the plugin, and user-installed plugins load too. (accessed 2026-11-21 via a real `claude` run on this machine)
- **C7:** Same setup, a spike module logging `turn.step`: one call per model request; `$.session.usage()` gave window 200,000, auto-compact threshold 167,000, about 48,000 tokens before any work. (accessed 2026-11-21 via a real `claude` run on this machine)
- **C8:** Same setup, clear and submit run from a timer after `turn.complete` returned: "$.prompt.submit is not available in this mode: no session is bound". (accessed 2026-11-21 via a real `claude` run on this machine)
- **C9:** Same setup, clear and submit awaited inside `turn.complete`: the run continued under a new session id and answered the resume prompt. (accessed 2026-11-21 via a real `claude` run on this machine)
- **C10:** Same setup without the cycle, one long turn reading large files: three mid-turn auto-compactions, then "Autocompact is thrashing" and exit code 1. (accessed 2026-11-21 via a real `claude` run on this machine)
- **C11:** Same setup with `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` set: the reported auto-compact threshold did not change. (accessed 2026-11-21 via a real `claude` run on this machine)
- **C12:** Same setup, a note appended with `$.session.append` from `turn.step`: the model stopped and wrote a handoff file. (accessed 2026-11-21 via a real `claude` run on this machine)
- **C13:** Same machine, `$.env.get` from a spike module: `TMPDIR` undefined; `HOME`, `USERPROFILE` and `TEMP` defined. (accessed 2026-11-21 via a real `claude` run on this machine)
- **C14:** Real run 1, start point 40, first cycle code: one clean rollover; then the rest delayed the request, the engine compacted, and a stale file caused a second clear. (accessed 2026-11-21 via a real `claude` run on this machine)
- **C15:** Real run 2, start point 55, rest rule and drop in place, no system section: the model refused the mid-turn note as an injection; the engine compacted; no rollover. (accessed 2026-11-21 via a real `claude` run on this machine)
- **C16:** Real run 3, start point 55, final code: three rollovers, zero compactions, toasts "AD handoff: context rolled over; resuming from …", final answer `ALL-DONE`, exit code 0; handoffs `20261121T035333Z-auto-16f29365.md`, `20261121T035400Z-auto-8a674820.md`, `20261121T035426Z-auto-a4a0d2ee.md` under `<home>/.agentic/handoffs/`. (accessed 2026-11-21 via a real `claude` run on this machine)

## Limitations and reversal

The measurements are one machine, one Claude Code build and one model family; the stream captures stayed in a session scratch directory and are not kept in the repository, so the measurements C6 to C16 are reproducible by rerunning, not by reading a file. A machine-local plugin with a similar purpose was loaded during the real runs; it acts only at a turn's end from 80 percent, which those runs did not reach, but it was not unloaded. The interactive terminal and the desktop app were not run for this cycle; they share the hooks, and the turn-end request is the path they take. Plain-text `-p` output was not measured: the stream prints one result per turn, the `handoff written` turns included, so a caller reading only the last result gets the task's answer, and one reading the first does not. Codex has no such surface: there the skill's `--auto` mode writes the file and someone else starts the fresh session.

Reverse or revisit when a Claude Code build stops loading plugins in `-p`, refuses `$.command.run` for `clear`, or ships its own handoff-instead-of-compaction; or when a model keeps refusing the labelled request despite the system section. The default-on switch is the owner's and is one option away from off.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs doc/research/0047-ground-automatic-context-rollover.md`, then reopen every source in the register and rerun the measurements with `AGENTIC_AUTO_HANDOFF=55 claude -p --plugin-dir plugins/agentic-session --output-format stream-json --verbose` on a task that reads enough to cross the start point. Structural validity proves the map, not the source content.
