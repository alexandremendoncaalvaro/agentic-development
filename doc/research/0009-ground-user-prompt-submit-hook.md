# GROUND-0009: `UserPromptSubmit` hook as the deterministic workflow checkpoint

**Status:** recorded
**Decision:** Ship `scripts/workflow-checkpoint.mjs` in the `ad-hooks` session-lifecycle tier as a `UserPromptSubmit` command hook that prints a short imperative checkpoint to stdout and always exits 0; wire it in `.claude/settings.json` with the script path resolved from the skill's installed base directory.
**Decision ref:** doc/tasks/0066-ship-workflow-checkpoint-hook.md (implements doc/adr/0074-user-prompt-submit-workflow-checkpoint-hook.md)
**Confidence:** Strong

## Decision and confidence

The happy path is the one the host documents and two independent implementations already use: a command hook on `UserPromptSubmit` whose plain-text stdout is appended to the model's context on exit 0. The event has no matcher and fires on every prompt, so a static checkpoint needs no matching logic. Exit 2 blocks the prompt and is never used. The kit's own `handoff-nudge.mjs` (ADR-0055) fixes the script shape: Node, zero dependencies, stdin read with `readFileSync(0)`, silent exit 0 on malformed input, env-tunable, byte-identical in both host trees, contract-tested by spawning the script with mock stdin.

Axis-2 verdict: Strong. The mechanism is primary-documented (A1), observed live in this very session (C1: the SLIM plugin's `UserPromptSubmit` hook delivered a `<slim-skill-nudge>` block into the model's context at the first prompt), and reproduced by two public implementations (B1, B2). The change is reversible: one settings block and one script.

## Evidence

### E1 — Plain-text stdout of a `UserPromptSubmit` hook on exit 0 is added as context the model can act on

**Strength:** High
**Provenance:** A1, C1, B1

A1: "For most events, Claude Code writes stdout to the debug log and doesn't show it in the transcript. The exceptions are `UserPromptSubmit`, `UserPromptExpansion`, `SessionStart`, and `PostModelSwitch`, where Claude Code adds plain-text stdout as context that Claude can see and act on." C1 is the live observation in this session. B1 relies on the same contract ("Exit 0; stdout is appended to context").

### E2 — The event fires on every prompt, has no matcher, and exit 2 blocks and erases the prompt

**Strength:** High
**Provenance:** A1

A1: fires "when you submit a prompt, before Claude processes it"; matcher table lists `UserPromptSubmit` under "no matcher support, always fires on every occurrence"; exit-2 table: "Blocks prompt processing and erases the prompt". The checkpoint therefore never exits 2.

### E3 — Stdin carries `session_id`, `prompt_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`, and the `prompt` text

**Strength:** High
**Provenance:** A1, B1

A1 common-input table plus the event example; B1 parses `prompt` and `cwd` from the same JSON. The checkpoint reads stdin only to stay silent on malformed input; its content does not depend on the prompt.

### E4 — An imperative instruction naming the skill is what makes auto-invocation reliable; polite reminders are ignored

**Strength:** Medium
**Provenance:** B2, B3, A2

B2 measured about 50% activation across 20 fresh sessions without a hook and reliable activation with a `UserPromptSubmit` hook emitting an imperative instruction. B3 injects its always-on router through a `SessionStart` hook and keeps the wording imperative. A2 states skills and CLAUDE.md are advisory and hooks are the deterministic mechanism. Medium because B2 is a single author's 20-session measurement.

### E5 — The scaffolded hook path must be resolved from the installed skill directory, not a project-relative constant

**Strength:** High
**Provenance:** C2, C3, A1

C2: the current `ad-hooks` scaffold writes `${CLAUDE_PROJECT_DIR}/.claude/skills/ad-hooks/scripts/handoff-nudge.mjs`. C3: the installer's default scope is `user` (`~/.claude/skills`), where that path does not exist. A1 documents `${CLAUDE_PROJECT_DIR}` as the project root only. The skill knows its own base directory at load time (stated at the top of every skill load), so the scaffold resolves the absolute path from it.

### E6 — Script shape, tests, and byte-parity follow the `handoff-nudge.mjs` precedent

**Strength:** High
**Provenance:** C4, D1

C4: `handoff-nudge.mjs` reads stdin with `readFileSync(0, 'utf8')`, exits 0 silently on empty, malformed, or non-object input, is env-tunable, and ships byte-identical in both host trees; `test/skill-scripts.test.js` spawns it with mock stdin for each shape. D1: commit 16a75cc landed the script, the tier documentation, and the tests together, which is the shape this task repeats.

### E7 — The hook wired in this repository injects the checkpoint on every prompt, without a host restart

**Strength:** High
**Provenance:** C5, A1

C5 is the retained artifact: the session transcript records the checkpoint as a `UserPromptSubmit` attachment on eight prompts between 14:07:50Z and 14:24:27Z on 2026-09-09, the first one 63 seconds after `.claude/settings.json` was edited (file mtime 14:06:38Z) and with no new session in between, and the injections continued after the host process restarted at about 14:14Z. Claude Code 2.1.257 therefore applied the edited project hook without a restart; A1 documents the injection mechanism.

## Source register

- **A1:** Claude Code hooks reference, https://code.claude.com/docs/en/hooks, sections "UserPromptSubmit", common input fields, exit-code table, matcher table, settings shape, `${CLAUDE_PROJECT_DIR}` placeholder (accessed 2026-09-09 via WebFetch)
- **A2:** Anthropic, "Steering Claude Code: skills, hooks, rules, subagents, and more", https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more, 2026-06-18 (accessed 2026-09-09 via WebFetch by the research subagent)
- **B1:** SLIM plugin `hooks/user-prompt-skill-nudge.sh` (boostlingo/slim 2.0.0, installed at `~/.claude/plugins/cache/slim/slim/1.2.1/hooks/`): `UserPromptSubmit` command hook, "Exit 0; stdout is appended to context", parses `prompt` and `cwd` from stdin JSON (accessed 2026-09-09 via Read)
- **B2:** Scott Spence, "Claude Code skills don't auto-activate", https://scottspence.com/posts/claude-code-skills-dont-auto-activate, 2025-11-06 (accessed 2026-09-09 via WebFetch by the research subagent)
- **B3:** obra/superpowers, `SessionStart` hook injecting the `using-superpowers` router, https://github.com/obra/superpowers (accessed 2026-09-09 via WebFetch by the research subagent)
- **C1:** This session's first prompt carried a `<slim-skill-nudge>` block produced by B1's hook, visible to the model as context (accessed 2026-09-09 via the live session)
- **C2:** `src/skills/claude-code/ad-hooks/SKILL.md:104-118`, hard-coded `${CLAUDE_PROJECT_DIR}/.claude/skills/ad-hooks/scripts/handoff-nudge.mjs` in the scaffolded settings block (accessed 2026-09-09 via Read)
- **C3:** `node bin/agentic.js update --help`: `--scope <scope>  install scope: user (default) | project` (accessed 2026-09-09 via the CLI)
- **C4:** `src/skills/claude-code/ad-hooks/scripts/handoff-nudge.mjs` and `test/skill-scripts.test.js:211-370` (accessed 2026-09-09 via Read)
- **C5:** Session transcript `~/.claude/projects/-Users-ale-conductor-workspaces-agentic-development-charlottetown/685df92f-3b24-4fed-a40e-9261eb4eeb21.jsonl`, lines 739, 790, 803, 816, 835, 891, 903, 913: `type: attachment`, `attachment.hookEvent: UserPromptSubmit`, `attachment.content` starting `Workflow checkpoint (agentic kit).`; extract kept at `.agentic/reviews/evidence/task-0066-live-injection.jsonl`; reproduce with `grep -c '"hookEvent":"UserPromptSubmit"' <transcript>` filtered on the checkpoint text (accessed 2026-09-09 via a Python scan of the transcript)
- **C6:** Red run before the script existed: five `workflow-checkpoint:` tests failing with `Cannot find module .../workflow-checkpoint.mjs`, output kept at `.agentic/reviews/evidence/task-0066-red-run.log` (accessed 2026-09-09 via `node --test test/skill-scripts.test.js`)
- **D1:** `git log --oneline --all -S handoff-nudge`: 16a75cc "feat(ad-hooks): Stop hook nudges /ad-handoff when context runs low" landed script, tier docs, and tests together; no prior `UserPromptSubmit` attempt in the repository (accessed 2026-09-09 via git log)

## Limitations and reversal

The record does not measure how much the checkpoint improves pipeline adherence; B2 is the only activation measurement and is a single author's. The live observations C1 and C5 prove delivery, not compliance. Reversal evidence: Claude Code documenting that `UserPromptSubmit` stdout is no longer injected as context, or a measured no-change in skill invocation after the hook ships.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs doc/research/0009-ground-user-prompt-submit-hook.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
