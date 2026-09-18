# GROUND-0023: Build the skill evaluation harness as a bespoke in-stack runner

**Status:** recorded
**Decision:** Implement the Task 0048 harness as repository-only, dependency-free ESM code on Node built-ins (`node:test`, `node:child_process`, `node:crypto`), with a runner-adapter seam around the two host CLIs; adopt no evaluation framework.
**Decision ref:** doc/tasks/0048-build-skill-evaluation-harness.md
**Confidence:** Strong

## Decision and confidence

The happy path is a bespoke harness that lives beside the existing repository
tooling and ships to nobody. The replay lane is a set of validators and
deterministic graders over tracked cases, fixtures, and sanitized receipts,
exercised through `node:test` like every other quality gate in this repository.
The live lane is a thin adapter that spawns a host CLI with a fixed argument
list, `claude -p --output-format stream-json` or `codex exec --json`, captures
the structured event stream, and normalizes it into the common receipt contract
declared by Spec 0007. Digests reuse the freeze scheme already shipped by
`ad-prism`.

The evidence is Strong for building on this path without a spike. The choice is
not a taste call between comparable techniques: the accepted contract's
constraints eliminate every surveyed framework deterministically. The
credential-free CI lane rules out hosted or provider-centric products, the
dependency rule in `GUIDELINES.md` §6.2 rules out a thirty-megabyte dependency
tree for a repository-only gate, and the Node-only stack rules out the Python
harnesses. Independently of those constraints, the strongest public analog for
this exact problem converged on the same shape: bespoke code, a provider-neutral
runner adapter, offline deterministic grading, and credentials touched only by
the run commands. The remaining uncertainty is not which mechanism to use but how
to structure a few internals, which is an implementation-strategy question for
`ad-tdg` inside `ad-tdd` slices, not a technique question for `ad-spike`.

One Conditional element sits beside the Strong verdict and is tracked in the
Task 0048 risk register rather than here: whether both hosts' event streams
carry enough information for the Spec 0007 failure record on every case. The
official documentation names the events; the live pilot is the measurement. The
mitigation is the adapter seam plus fake runner adapters fed with captured
sample streams, which Spec 0007 already requires.

## Evidence

### E1 — Node built-ins cover every replay-lane need without a framework

**Strength:** High
**Provenance:** A1, C1, C2, C4

The Node 22 test runner is Stability 2 and provides subtests, `describe`/`it`,
snapshot testing, built-in reporters including `junit`, and programmatic
execution through `run()`. The repository already validates and freezes
evaluation artifacts with dependency-free ESM scripts, and already tests those
scripts by spawning them under `node:test`. The repository's own explicit test
enumerator shows how a new gate joins `npm test` without new tooling.

### E2 — Both host CLIs expose a structured non-interactive surface an adapter can spawn

**Strength:** High
**Provenance:** A2, A3, A4, B1, B2

Claude Code documents `-p` with `--output-format json` or `stream-json`, a
`system/init` event carrying model, tools, and loaded plugins, a final `result`
event with cost and `permission_denials`, `--allowedTools`,
`--permission-mode`, `--json-schema`, and `--bare` as the recommended scripted
mode. Codex documents `codex exec --json` as a JSON Lines event stream with
`thread.started`, `turn.started`, `item.started`, `item.completed`,
`turn.completed`, and `error`, plus `--output-schema`,
`--output-last-message`, `--ephemeral`, `--ignore-user-config`, and
`--sandbox`. Two independent public harnesses drive exactly these commands
from a spawned child process. The flags are observations that the adapter wraps;
they are not the harness API, as GROUND-0021 already recorded.

### E3 — Surveyed frameworks fail the accepted contract's constraints, not a preference

**Strength:** High
**Provenance:** A4, A5, A6, C3

promptfoo is provider-centric: its Claude Agent SDK provider requires the
proprietary `@anthropic-ai/claude-agent-sdk` package and an API key or a live
Claude Code session, documents no offline replay lane, and the `promptfoo`
package itself measures 30,978,179 bytes unpacked with roughly eighty runtime
dependencies including an HTTP server, a database driver, OpenTelemetry, and
analytics. The OpenAI Evals API is hosted, requires uploading data to the
platform, and is scheduled to become read-only on 2026-10-31 and shut down on
2026-11-30. The repository's dependency rule requires every dependency to
justify why the kit cannot do without it and forbids a dev framework at the kit
layer. Spec 0007 requires the normal gate to be offline, deterministic, and
credential-free. No surveyed framework satisfies all three at once.

### E4 — The strongest public analog independently chose bespoke plus adapter plus offline grading

**Strength:** Medium
**Provenance:** B1, B2, B3

`adewale/skill-eval-harness` states a provider-neutral answer-runner contract
with per-host adapters for `claude -p --output-format stream-json` and
`codex exec --json --output-last-message`, writes `trace.jsonl`,
`events.json`, `metrics.json`, and a SHA-256 artifact inventory, grades with
deterministic assertions and no model calls in the grade path, and needs
credentials only for its `run-*` and `judge` commands. It explicitly rejects
`openai/evals` and `viteval` for lacking paired comparison and leakage
discipline. A second public author built a custom orchestrator around the same
Claude Code command for skill-activation measurement. The `dotnet/skills`
reference uses an in-house .NET validator, which confirms the in-house pattern
but is not transferable to this stack. The strength is Medium because these are
practitioner implementations, not primary documentation, and the first is
Python.

### E5 — The harness is repository-only quality tooling, not shipped kit content

**Strength:** High
**Provenance:** A7, C3, C4, C5

The PRD frames the harness as trajectory evaluation applied to each shipped
skill, which is quality assurance for the kit itself. `package.json#files`
ships only `bin/`, `src/`, the workflow documents, `README.md`, and `LICENSE`;
`scripts/` and `test/` are repository-only by the same list, and the
`changelog-gate` hook watches only shipped paths. Placing the harness outside
the shipped tree keeps the npm package, the skill parity tests, and the
installer contract untouched. A new top-level directory also must be added to
the ESLint ignore list or kept free of executable JavaScript fixtures, because
the flat config lints every `.js` and `.mjs` under the repository root except
the named ignores.

### E6 — Digest stability across the CI matrix is already solved in-repo

**Strength:** High
**Provenance:** C1, C6, C7

`.gitattributes` normalizes every text file to LF on checkout on every
platform, which is what keeps byte digests of tracked fixtures identical between
the Ubuntu and Windows CI legs. The existing `freeze-artifact.mjs` sorts files
by forward-slash relative paths, rejects symlinks, and length-prefixes each
entry, so a directory digest is independent of path separator and traversal
order. Reusing that scheme inherits its Windows coverage.

### E7 — No prior framework or harness attempt exists in this repository

**Strength:** High
**Provenance:** D1, D2, D3

The history of the evaluation scripts shows a consistent bespoke lineage from
the first generic evaluation methodology commit through the assurance
separation. A content search for `promptfoo` across `origin/main` returns
nothing, and the sibling branches that touch evaluation or reviewer tooling
carry no harness commits beyond `origin/main`.

## Source register

- **A1:** Node.js v22 Test runner documentation, Stability 2, sections "Subtests", "`describe()` and `it()` aliases", "Snapshot testing", "Test reporters", and "`run([options])`": https://nodejs.org/docs/latest-v22.x/api/test.html (accessed 2026-09-17 via official web documentation).
- **A2:** Claude Code, Run Claude Code programmatically: `-p`, `--output-format json|stream-json`, `--bare`, `system/init`, `result`, `permission_denials`, `--allowedTools`, `--permission-mode`, `--json-schema`: https://code.claude.com/docs/en/headless (accessed 2026-09-17 via official web documentation).
- **A3:** Codex, Non-interactive mode: `--json` JSON Lines events `thread.started`, `turn.started`, `item.started`, `item.completed`, `turn.completed`, `error`; `--output-schema`, `--output-last-message`, `--ephemeral`, `--ignore-user-config`, `--sandbox`, `CODEX_API_KEY`: https://developers.openai.com/codex/noninteractive, served from https://learn.chatgpt.com/docs/non-interactive-mode (accessed 2026-09-17 via official web documentation, 308 redirect followed).
- **A4:** promptfoo, Claude Agent SDK provider: requires `@anthropic-ai/claude-agent-sdk` installed separately, proprietary license, `ANTHROPIC_API_KEY` or an existing Claude Code session, tool calls in `response.metadata.toolCalls`, no offline replay: https://www.promptfoo.dev/docs/providers/claude-agent-sdk/ (accessed 2026-09-17 via official web documentation).
- **A5:** promptfoo, Providers overview: `file://` JavaScript and Python providers, `exec:` script providers, HTTP providers, environment-variable authentication: https://www.promptfoo.dev/docs/providers/ (accessed 2026-09-17 via official web documentation); `npm view promptfoo version dependencies dist.unpackedSize` reports 0.123.0, about eighty runtime dependencies, 30,978,179 bytes (accessed 2026-09-17 via local command execution).
- **A6:** OpenAI, Evals API guide: hosted evaluation over uploaded data, read-only from 2026-10-31, shutdown 2026-11-30: https://developers.openai.com/api/docs/guides/evals (accessed 2026-09-17 via official web documentation, 301 redirect followed).
- **A7:** `doc/product/PRD.md:68`, "Later tier — Skill eval harness. Trajectory eval per `WORKFLOW.md` §13, applied to each shipped skill against a fixture corpus" (accessed 2026-09-17 via repository read).
- **B1:** `adewale/skill-eval-harness:README.md`, a public implementation with a provider-neutral runner contract, adapters for `claude -p --output-format stream-json` and `codex exec --json --output-last-message`, `trace.jsonl` plus `events.json` plus SHA-256 inventory, deterministic offline grading; short excerpt: "Grade outputs with deterministic assertions: string, regex, file, JSON field, and opt-in `script` oracles": https://github.com/adewale/skill-eval-harness (accessed 2026-09-17 via fetched GitHub page).
- **B2:** Scott Spence, Measuring Claude Code Skill Activation With Sandboxed Evals, a custom TypeScript orchestrator running `claude -p "$QUERY" --output-format stream-json --verbose --max-turns 1 --allowedTools Skill` and parsing `tool_use` blocks named `Skill`: https://scottspence.com/posts/measuring-claude-code-skill-activation-with-sandboxed-evals (accessed 2026-09-17 via fetched web page).
- **B3:** `dotnet/skills:.agents/skills/create-skill-test/SKILL.md`, an in-house .NET validator (`dotnet run --project eng/skill-validator/...`), git-tracked fixtures under `tests/<plugin>/<skill>/`, CI adapter `eng/vally-adapter/adapt-agent-results.mjs`, LLM judge requiring model access: https://raw.githubusercontent.com/dotnet/skills/main/.agents/skills/create-skill-test/SKILL.md (accessed 2026-09-17 via fetched GitHub source).
- **C1:** `src/skills/codex/ad-prism/scripts/freeze-artifact.mjs:1-70`, dependency-free ESM digesting with `node:crypto`, sorted forward-slash relative paths, symlink rejection, length-prefixed entries; `ARCHITECTURE.md:42`, "Dependency-free ESM scripts validate plans and reports and freeze settled local artifact packages" (accessed 2026-09-17 via repository read).
- **C2:** `test/prism-scripts.test.js:1-12`, bespoke scripts tested by `spawnSync` under `node:test` with `mkdtempSync` fixtures (accessed 2026-09-17 via repository read).
- **C3:** `GUIDELINES.md:181-183`, dependency justification rule and "No dev framework"; `GUIDELINES.md:399-401`, kit code spawns `git`/`npm` with fixed argument lists only (accessed 2026-09-17 via repository read).
- **C4:** `scripts/run-tests.mjs:1-45`, explicit suite enumeration that refuses a zero-test pass; `package.json#files` lists `bin/`, `src/`, `WORKFLOW.md`, `WORKFLOW-FLOWS.md`, `README.md`, `LICENSE` only (accessed 2026-09-17 via repository read).
- **C5:** `eslint.config.js:5-7`, ignores limited to `.agents/**`, `.claude/**`, `.context/**`, `node_modules/**` with `files: ['**/*.{js,mjs}']`; `lefthook.yml` changelog-gate comment naming shipped paths `src/skills/`, `src/lib/`, `src/commands/`, `bin/` (accessed 2026-09-17 via repository read).
- **C6:** `.gitattributes:1-7`, `* text=auto eol=lf` with the Windows `core.autocrlf` rationale (accessed 2026-09-17 via repository read).
- **C7:** `src/skills/codex/ad-prism/evals/evals.json` and `test/skills.test.js:377-421`, the existing static case vocabulary (`id`, `prompt`, `expected_route`, `expected_outcomes`) that the harness case format extends (accessed 2026-09-17 via repository read).
- **D1:** `git log origin/main --oneline -- src/skills/codex/ad-prism/scripts test/prism-scripts.test.js test/fixtures`; commits `8b1043a` (generic evaluation methodology) and `c4204c7` (method dimensions and assurance) introduced and extended the bespoke script lineage (accessed 2026-09-17 via git history).
- **D2:** `git log origin/main --oneline -S'promptfoo'`; empty result, no prior framework attempt found (accessed 2026-09-17 via git history).
- **D3:** `git log origin/main..<branch> --oneline` for `origin/feat/refine-prism-method-routing`, `origin/feat/configurable-project-sources`, and `origin/fix/reviewer-temp-artifacts`; no commits beyond `origin/main`, no sibling harness attempt found (accessed 2026-09-17 via git history and branch sweep).

## Limitations and reversal

This record establishes the mechanism, not the corpus, the graders' calibration,
or the pilot decision values. It does not measure that either host's live event
stream satisfies every field of the Spec 0007 failure record; the documentation
names the events, and the authorized live pilot is the measurement. Reversal
evidence: a credential-free evaluation framework in plain JavaScript with a
small dependency tree and a first-class replay lane; a host CLI removing its
structured non-interactive output; or a pilot showing that adapter
normalization cannot preserve the diagnostics both hosts emit. Any of those would
reopen the framework question through a new record, not a spike.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs doc/research/0023-ground-skill-evaluation-harness-mechanism.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
