# GROUND-0041: Record the approved body's hash and compare outgoing comments and chat sends with it, in shadow

**Status:** recorded
**Decision:** A zero-dependency `ad-hooks/scripts/publish-receipt.mjs record --destination <target> --body-file <file>` appends the SHA-256 of the normalized approved body (line endings to LF, trailing whitespace on each line and trailing newlines removed) to `.agentic/receipts/publish.jsonl`, which `ad-publish` runs after the owner's approval when `ad-hooks` is installed, posting from that same file; `sequence-gate.mjs` reads the outgoing body from `gh pr comment` and `gh issue comment` (`-b`/`--body`, `-F`/`--body-file`, a quoted heredoc), `gh api` comment calls (`-f`/`-F` `body=`, `--input`) and the chat-send MCP tool's `message`, and logs `clear` when a receipt carries the same hash, `would-block` when none does, and `runtime-unavailable` when the body cannot be read statically.
**Decision ref:** doc/tasks/0109-check-the-publish-receipt-in-shadow.md
**Confidence:** Strong

## Decision and confidence

ADR-0089 decisions 1 to 3 fix the receipt's content (destination, approved-body hash, approval time) and its freshness (only the identical normalized body). `gh` takes a comment body from a literal flag, a file or standard input, and `gh api` from a field or an input file, so the gate can recover the body without running anything when it is a literal, a quoted heredoc or a readable file; an editor, standard input or a shell variable leaves it unknown, which the gate reports as a reading it could not take rather than as a missing receipt. Both hosts run `PreToolUse` on MCP tools and pass their JSON arguments, so the same script reads a chat send's text. GitHub stored a body posted with `--body-file` byte for byte, so posting from the approved file makes the hashes agree by construction; normalization only absorbs the trailing newline and whitespace differences a literal `--body` or a reformatting introduces, the subset of `git stripspace` that leaves Markdown structure intact. Recording lives in `ad-hooks`, beside `gate-run.mjs`, and `ad-publish` calls it only when present, as `ad-pr` already does for the gate-run receipt, so the normalization exists once. Axis-2: Strong. The body sources are the tools' own documentation, the storage behaviour was measured, and the change only logs.

## Evidence

### E1 — `gh` comment and API commands carry the body in a few statically readable forms

**Strength:** High
**Provenance:** A1, A2

`gh pr comment` and `gh issue comment` take `-b, --body text` or `-F, --body-file file` (`-` reads standard input), or open an editor or the browser with `-e`/`-w` (A1). `gh api` takes `-f, --raw-field key=value`, `-F, --field key=value` where `@<path>` or `@-` reads the value from a file or standard input, and `--input file` as the whole request body (A2). A literal, a file path or a quoted heredoc is readable before the command runs; an editor, the browser, standard input or a shell expansion is not.

### E2 — Both hosts run `PreToolUse` on MCP tools with their JSON arguments

**Strength:** High
**Provenance:** A3, A4, C3

Claude Code names MCP tools `mcp__<server>__<tool>`, matches them by regex (`.*` required), and passes `tool_input` to `PreToolUse` (A3). Codex fires `PreToolUse` for MCP tools under the same naming and lets a hook inspect their JSON arguments, while warning that some tool paths can opt out (A4). The Slack connector available to the owner exposes `slack_send_message` with the text in `message` (C3).

### E3 — Posting from the approved file stores the body unchanged, so a strict normalization suffices

**Strength:** High
**Provenance:** A5, D2

Measured: pull request 162's body, posted with `gh pr create --body-file`, came back from the REST API byte-identical to the approved file (1,782 characters, no carriage return) (D2). `git stripspace` removes trailing whitespace, collapses runs of empty lines, removes leading and trailing empty lines and ensures a final newline (A5); the gate adopts only the line-ending, trailing-whitespace and trailing-newline parts, because collapsing or trimming interior or leading lines would let a different Markdown text match.

### E4 — Command lines are tokenized with quoting and operators before reading flags

**Strength:** Medium
**Provenance:** B1

shell-quote's `parse` returns the arguments of a quoted command line with operators (`&&`, `||`, `|`) as separate tokens and expands variables from a supplied environment (B1). The gate needs the same split, but the kit's hook scripts carry no dependency, so it implements the subset it needs (single and double quotes, backslash escapes, operators, a heredoc with a quoted delimiter) and treats any expansion as unreadable instead of guessing its value.

### E5 — The kit already records receipts beside the gate and calls the recorder from the producing skill

**Strength:** High
**Provenance:** C1, C2, C4, D1, D3

`gate-run.mjs` appends tree-keyed receipts to `.agentic/receipts/` and `sequence-gate.mjs` reads them (C1). `ad-pr` runs `<ad-hooks-dir>/scripts/gate-run.mjs record` only when that script exists (C2), introduced in 240fc16 (D3). `ad-publish` already shows an exact-text approval receipt in chat and says any change invalidates it, but persists nothing (C4), since bd9c2cc (D1). SHA-256 over text is the kit's existing digest (`ad-prism`'s `freeze-artifact.mjs`, `ad-release`'s `release-plan.mjs`) (C1).

## Source register

- **A1:** GitHub CLI 2.94.0 manual, `gh pr comment --help` and `gh issue comment --help`, flags `--body`, `--body-file`, `--editor`, `--web` (accessed 2026-10-07 via the installed CLI; https://cli.github.com/manual/gh_pr_comment)
- **A2:** GitHub CLI 2.94.0 manual, `gh help api`, `--raw-field`, `--field` with `@<path>`, `--input` (accessed 2026-10-07 via the installed CLI; https://cli.github.com/manual/gh_api)
- **A3:** Claude Code hooks reference, "Match MCP tools" and `PreToolUse` input, https://code.claude.com/docs/en/hooks (accessed 2026-10-07 via WebFetch)
- **A4:** Codex hooks documentation, tool coverage of `PreToolUse` and MCP matchers, https://learn.chatgpt.com/docs/hooks (accessed 2026-10-07 via WebFetch)
- **A5:** git documentation, `git-stripspace`, https://git-scm.com/docs/git-stripspace (accessed 2026-10-07 via WebFetch)
- **B1:** ljharb/shell-quote README, `parse()` with operators and environment interpolation, https://github.com/ljharb/shell-quote (accessed 2026-10-07 via WebFetch)
- **C1:** `src/skills/claude-code/ad-hooks/scripts/gate-run.mjs` and `sequence-gate.mjs` (receipt file and reader); `src/skills/claude-code/ad-prism/scripts/freeze-artifact.mjs:3-11` and `src/skills/claude-code/ad-release/scripts/release-plan.mjs:153-155` (SHA-256 digests) (accessed 2026-10-07 via Read and grep)
- **C2:** `src/skills/claude-code/ad-pr/SKILL.md:64`, recording the gate-run receipt when `ad-hooks` is installed (accessed 2026-10-07 via Read)
- **C3:** the Slack connector's `slack_send_message` schema in this session's tool listing: required `channel_id` and `message` (accessed 2026-10-07 via ToolSearch)
- **C4:** `src/skills/claude-code/ad-publish/SKILL.md:183-195` and `src/skills/codex/ad-publish/SKILL.md` "Before publishing, show an approval receipt" (accessed 2026-10-07 via Read)
- **D1:** `git log --oneline -S"show an approval receipt" -- src/skills/claude-code/ad-publish/SKILL.md` returned bd9c2cc, "add publication and report workflows"; `git log --all --oneline -S"body hash" -- src doc/adr doc/research doc/tasks` returned only aa1a56c, the study that planned this check; no prior attempt at a persisted publish receipt found (accessed 2026-10-07 via Bash)
- **D2:** measurement on pull request 162 of alexandremendoncaalvaro/agentic-development: `gh api repos/alexandremendoncaalvaro/agentic-development/pulls/162` body compared in Python with the approved file `.agentic/reviews/pr-0108-body.en.md` posted by `gh pr create --body-file`: equal, 1,782 characters each, no `\r` (accessed 2026-10-07 via Bash)
- **D3:** `git log --oneline -S"gate-run.mjs record" -- src/skills/claude-code/ad-pr/SKILL.md` returned 240fc16 (accessed 2026-10-07 via Bash)

## Limitations and reversal

A body passed through a shell variable, standard input, an editor or the browser cannot be read before the command runs; those lines read `runtime-unavailable`, and the shadow run measures how often. The receipt matches by hash alone, as ADR-0089 decision 2 states, so an approved text posted to a different destination reads `clear`; the destination is recorded for the read-out. Only the chat tool named here is matched; another connector needs its tool name and text field added. Codex documents that some tool paths may skip hooks. Flag forms the gate does not parse, such as `-fbody=x` or `--field=body=@x`, leave no line. A relative body file after a `cd`, a path under `~`, a non-regular file or one over 1 MiB (a design cap) reads `runtime-unavailable`. `publish.jsonl` is read whole on each check and is never pruned. If the shadow run shows most comment bodies are unreadable, the recorder should also write the approved body to a file the posting command must name.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs <this-path>`, then reopen every source in the register. Structural validity proves the map, not the source content.
