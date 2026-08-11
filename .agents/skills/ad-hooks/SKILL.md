---
name: ad-hooks
description: Scaffold deterministic quality gates per WORKFLOW.md §11 — pre-commit (lint, format, secret-scan), pre-push (build, unit, integration). Detects the project's stack and recommends a hook runner (Husky / lefthook / pre-commit / native), scaffolds the runner config, and updates AGENTS.md Quality Gates. Use when the user wants to wire hooks, configure pre-commit / pre-push, set up quality gates, prevent --no-verify bypass, or close the WORKFLOW §11 advisory-vs-deterministic gap. Session-lifecycle hooks (e.g. a Stop hook nudging /ad-handoff when context runs low) are Claude-Code-scoped — see ADR-0055. Opt-in skill; not auto-installed.
summary: Scaffold deterministic quality gates per WORKFLOW §11 — pre-commit + pre-push, runner detected from stack signals. Session-lifecycle hooks (Stop handoff-nudge) are Claude-Code-scoped.
---

<background_information>
Scaffolds the deterministic gates `WORKFLOW.md` §11 names. The skill writes config files for a hook runner and updates `AGENTS.md` Quality Gates; it does not execute install scripts. The user runs the runner's one-time bootstrap (`npx husky init`, `lefthook install`, `pre-commit install`) — the skill names the exact command.

Codex auto-trigger on description keywords is less mature than Claude Code's. If auto-invocation does not fire when the user asks about hooks, pre-commit, or quality gates, invoke the skill manually.
</background_information>

<instructions>
Step 0 — confirm the gates the user wants. WORKFLOW §11 names two tiers:
- Pre-commit (fast): lint, format, secret-scan. Runs on every commit. Keep under ~5s; slow pre-commits push devs to `--no-verify`.
- Pre-push (thorough): build, unit tests, integration tests. Runs on every push. Acceptable to be slow.
- Pre-commit review gate (opt-in third tier — ADR-0047): wire `/ad-review` — or `/ad-audit` for team-bound work — over the staged work before it commits, confirmed findings blocking the commit. Trade-off belongs to the user: front-loads fixing (fits parallel workflows) but bottlenecks a frequent committer. Offer it; never scaffold unasked, never as a default.
- Advisory-first debut for heuristic gates: deterministic toolchain gates (lint, format, build, test) may block from day one — reproducible verdicts. Heuristic or novel gates (secret-scan patterns, the review gate) debut warn-only, with an explicit flip-to-block criterion stated at scaffold time. A gate that blocks before earning trust trains the user to bypass gates in general.

Confirm both tiers are in scope. If the user wants only one, scaffold only that tier.

Visual / E2E for UI projects (Cypress, Playwright) live in CI, not pre-push. Out of scope.

Step 1 — detect the runner. Run the deterministic detector from the consumer repository root:

```bash
node .agents/skills/ad-hooks/scripts/detect-hooks.mjs
```

If this skill was loaded from a different base directory, substitute that base; the bundled script is `scripts/detect-hooks.mjs`. Execute it; do not read it as prose. Its JSON reports `stacks`, `runners`, `prePush` (`files`, gate `commands`), `ci` (`files`, gate `commands`, `matrices`), raw textual `drift.ciOnlyCommands`, and `unreadable`. A non-empty `unreadable` means the scan is partial; name those paths instead of treating them as absent.

Use its facts in this order:

1. Existing runner. `.husky/` → Husky. `lefthook.yml` or `.lefthook.yml` → lefthook. `.pre-commit-config.yaml` → pre-commit. `.git/hooks/` with non-sample scripts → native hooks.
2. Stack signals (if no runner present). `package.json` → recommend Husky or lefthook. `pyproject.toml` → recommend pre-commit. `go.mod` → recommend lefthook. `Cargo.toml` → recommend lefthook. Multiple stacks → recommend lefthook (cross-language by default).
3. No signals. Recommend native `.git/hooks/` only as fallback. Warn the user that native hooks are not portable across clones.

If multiple runners are present, surface the conflict and ask the user before scaffolding. Never silently pick.

Step 2 — recommend the per-stack commands. For the chosen runner, propose the per-tier command set from the command catalog in [references/hook-commands.md](references/hook-commands.md) (Node / Python / Go / Rust). For a mixed / other stack not in the catalog, ask for the per-tier command list. Do not invent.

Offer to swap any default. Confirm before writing.

Step 3 — scaffold the runner config. Write the runner-specific config file using the config shapes in [references/hook-commands.md](references/hook-commands.md) (Husky / lefthook / pre-commit / native — each with its file paths and bootstrap command).

Step 4 — update `AGENTS.md` Quality Gates. Append or refresh the section with: pre-commit gate list, pre-push gate list, runner name + config path, bootstrap command, CI status if known, no-bypass policy. Honor existing managed markers if `ad-bootstrap` already wrote Quality Gates.

Step 5 — mirror CI locally. WORKFLOW §11: "CI failure is a local gate gap." The detector already performed the deterministic scan; do not re-derive it in prose.
1. CI surface and commands. `ci.files` is the detected CI surface; when it is empty, note the gap and stop this step. `ci.commands` contains test / lint / typecheck / build-like `run:` / `script:` commands; `prePush.commands` contains the corresponding local gate commands.
2. Matrix. `ci.matrices` contains inline CI matrix dimensions. Compare them with the actual local runtime the pre-push hook uses; a script cannot infer a developer's installed version. For each meaningful missing dimension, warn: `CI matrix <dim>=<values>, pre-push runs <value>. Failures under <missing-value> will only surface in CI.`
3. Command drift. `drift.ciOnlyCommands` is an exact-text diff. For each command with no wrapper evidence, warn: `CI runs <cmd> — pre-push does not. Add to pre-push or CI will catch what local won't.` A wrapper may be semantically equivalent while spelling the command differently; inspect and state that evidence rather than claiming a gap from raw text alone.
4. Offer to close the gap. Propose specific edits to the runner config; ask the user before writing (matrix mirroring can be expensive).

Step 6 — tell the user the bootstrap command. Output the exact one-line command the user runs. The skill does not execute it.
</instructions>

<output_contract>
Filesystem changes:
- The runner's config file (`.husky/pre-commit`, `lefthook.yml`, `.pre-commit-config.yaml`, or `.git/hooks/`).
- An updated `AGENTS.md` Quality Gates section.
- For native-hooks fallback: a `setup-hooks.sh` script.

The skill does not execute the runner's install command. The skill does not write CI config.

Session-lifecycle hooks — agent-side session events wired in the host's settings, such as a Stop hook that nudges `/ad-handoff` when context runs low (ADR-0055) — are Claude-Code-scoped. Codex exposes compact-related hooks, but context-injection parity for a one-time non-looping nudge is undocumented, so this tier is not wired on Codex. The shared `scripts/handoff-nudge.mjs` ships in both host trees for byte-parity discipline only; the Codex flow does not install a settings hook for it. If Codex documents context-injection parity, revisit ADR-0055.

Documentation discipline rules apply at write time:
- No emoji anywhere in scaffolded config or AGENTS.md update.
- No version stamps or DRAFT markers.
- Quality Gates section opens with the operational rule (gates are deterministic) before listing the gates.
- One scope: Quality Gates. No duplication of ARCHITECTURE.md or ADR rationale.
- No commented-out scripts. No orphan TODO / FIXME.
</output_contract>

## Next

- Run the runner's bootstrap command (cited in Step 6 — e.g., `npm install`, `lefthook install`, `pre-commit install`).
- Verify a deliberately-failing edit (e.g., a known lint violation) gets blocked at commit.
- Add a redundant CI gate so contributors cannot bypass via `--no-verify`. WORKFLOW §11 binding.
- `/ad-drift` periodically to confirm hooks stay wired as the project evolves.
