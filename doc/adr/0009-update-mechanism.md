# ADR-0009: Update mechanism — `agentic update` with per-agent state file and three-way diff

**Status:** accepted
**Date:** 2026-05-09
**Deciders:** Alexandre Alvaro

## Context

The kit ships skill source files into a user's repo at install time (`installSkills` in [`src/lib/install.js`](../../src/lib/install.js)). The flow is one-way: `npx @alexandrealvaro/agentic init` copies kit → user. Re-running `init` is idempotent on identical content (byte-compare in [`src/lib/install.js:58-61`](../../src/lib/install.js); divergent targets prompt via `confirmReplace`). Beyond that there is no update story:

- No state on the user's side — the kit cannot tell whether a divergent file is "user edited" or "kit changed since you installed".
- No explicit `update` affordance — users either re-run `init` (no clear semantics for an already-installed repo) or upgrade ad hoc by reading skill diffs from GitHub.
- No removal handling — a skill renamed or deleted in the kit stays as an orphan in the user's tree forever.
- The only signal `installSkills` has when a target file diverges is the byte-compare. With user edits common (the kit explicitly invites them — see `confirmReplace` UX), this conflates *user edits* with *kit drift*, so the safe default is "skip", which is correct but loses real updates silently.

Real users hit this gap immediately: the deciders are running v0.2.0-beta.1 in `agentic-development` itself plus another repo, and need a coherent way to pull subsequent kit changes into both without diff-by-eye reconciliation.

The ecosystem has converged on a small handful of patterns for this exact problem — scaffolders that need to update files they wrote into a user's repo:

- **Copier** — re-renders the template with stored answers (`.copier-answers.yml`); applies a 3-way merge against user changes; mature, popular for Python templates.
- **Cruft** (cookiecutter ecosystem) — stores template SHA in `.cruft.json`; `cruft update` produces a patch the user resolves manually.
- **Yeoman** — has no formal update model; users re-run generators.
- **NX / Angular schematics** — `ng update` plus per-version migration scripts that mutate user configs in place.
- **CRA / Vite** — scaffold-only; no update.
- **GitHub template repos** — fork diverges; manual reconciliation.
- **Renovate / Dependabot** — for declared dependencies, not scaffolded files.

Closest fit by mechanism: **Copier** (re-render + answers file). Closest fit by ecosystem maturity around versioned migrations: **NX schematics**. Worst fit: scaffold-only tools (CRA/Vite/cookiecutter without cruft) — they don't solve the update problem at all.

A separate but related gap surfaced in conversation with the deciders: the WORKFLOW §10 reviewer flow ([ADR-0007](0007-workflow-operational-skills.md)) feels invisible. In Claude Code the skill dispatches a subagent (the fresh-context primitive) and findings come back, but the handoff that went to the subagent is never persisted — users can't audit what was sent or replay the review against an updated diff. In Codex the situation is worse: the user must copy the handoff from chat, run `/clear`, and paste it back, with no file-level support for that round-trip.

## Decision

We will introduce an `agentic update` command implementing a Copier-style re-render with a per-agent state file and a three-way diff, scaled down to what this kit actually needs (no per-version migration scripts in v0.3 — defer until the first layout-breaking change forces the question, per the kit's own [Simplicity First](../../src/skills/claude-code/agentic-philosophy/SKILL.md) rule). We will also persist the WORKFLOW §10 reviewer handoff to disk so the §10 contract has a real artifact, not only an in-flight chat fragment.

1. **New command: `agentic update`.** Distinct command, not a flag on `init`. Intent is unambiguous: re-run the install loop against a project that already has skills in place, pull in kit changes, surface conflicts. `init` retains its current "scaffold from scratch / re-run on installed project" semantics; `update` is what users invoke when they explicitly want to absorb upstream kit changes.

2. **Per-agent state file at `.claude/agentic-state.json` and `.agents/agentic-state.json`.** "Junto dos skills" — sibling to `.claude/skills/` and `.agents/skills/` respectively. Committed to the user's repo (not gitignored) so the team shares a single view of what version of which skills was installed. Schema:

   ```json
   {
     "schemaVersion": 1,
     "kitVersion": "0.3.0-beta.1",
     "agent": "claude-code",
     "skills": {
       "agentic-bootstrap": {
         "version": "0.3.0-beta.1",
         "files": [
           { "path": ".claude/skills/agentic-bootstrap/SKILL.md", "sourceSha": "<hex sha256>" }
         ]
       }
     }
   }
   ```

   `kitVersion` and per-skill `version` are the same on every install today (skills evolve with the kit, per D7 — kit-level versioning, no per-skill versions). Future divergence remains possible without schema change.

3. **Three-way diff per file.** For every file the kit would install, the orchestrator reads three SHAs:

   - `sourceSha` — current kit source content.
   - `prevSourceSha` — what the kit shipped at the time of the last install (from state).
   - `targetSha` — the file currently sitting in the user's repo (or `null` if absent).

   Decision matrix:

   | target | sourceSha vs prevSourceSha | targetSha vs prevSourceSha | action |
   | --- | --- | --- | --- |
   | absent | — | — | install (new file) |
   | exists | unchanged | — | keep target as-is, refresh state |
   | exists | changed | matches (user untouched) | silent update |
   | exists | changed | differs (user modified) | prompt with diff, default skip |
   | exists | no prev state (legacy install) | — | byte-compare (today's behavior); skip if same; prompt if different |

   Default conflict resolution: **skip** (preserve user edits; matches today's `confirmReplace` default). `--force` flips the default to overwrite. `--dry-run` prints the action plan without writing.

4. **Removal handling.** Skills present in the prior state but absent from the new opted set (kit removed/renamed the skill, or user deselected it) are orphans. `update` prompts the user before deleting orphan files; default is keep (safe default, mirrors today's posture on user edits). Bundled subagents under `.claude/agents/<basename>` are removed alongside their skill when the manifest says so.

5. **`init` writes state too.** From v0.3 onward, every `init` run produces the same state file `update` consumes. Existing v0.2 installs ("legacy") have no state file — `update` falls back to today's byte-compare on first run, then writes state for subsequent runs. No migration tool needed; the legacy path is graceful.

6. **No per-version migration scripts in v0.3.** YAGNI. The first layout-breaking change (a skill path rename, a frontmatter field added to all skills, etc.) is the moment to introduce `src/migrations/<from>-<to>.js`. Each future migration gets its own ADR per the same scrutiny rule [ADR-0007](0007-workflow-operational-skills.md) §6 applies to workflow-operational skills. Today's three-way diff handles content changes inside stable file paths.

7. **Reviewer handoff persisted to disk.** [`agentic-review`](../../src/skills/claude-code/agentic-review/SKILL.md) (Claude Code) writes the assembled handoff to `.agentic/reviews/<ISO-timestamp>-<scope>.md` before dispatching the fresh-context-reviewer subagent. The subagent's input is unchanged; the file is an audit-trail / replay artifact. The Codex variant writes the same file and instructs the user to `cat` it into the clipboard, run `/clear`, and paste — same WORKFLOW §10 contract, much less fragile UX. The path `.agentic/reviews/` is gitignored; handoffs are ephemeral.

8. **Slash command `/agentic-review` deferred.** Anthropic Skills are description-triggered, not slash-triggered; `/agentic-review` would have to ship as a Claude Code Slash Command (`.claude/commands/`) wrapping the skill. No legacy users — defer until a real demand surfaces.

## Consequences

Positive:

- The kit becomes safely-updatable. Users running v0.2 installs in real repos (`agentic-development` itself plus the deciders' other project) get a clear command, a clear default, and an auditable preview (`--dry-run`).
- The state file lets the kit distinguish *user edits* from *kit drift* — the conflation that today forces a conservative skip on every divergent file is replaced by a real three-way decision.
- Removal handling closes the orphan-skill gap. Skills renamed or deleted upstream stop accumulating in user repos.
- Default-skip plus `--force` mirrors the kit's overall posture (idempotency by default, escape hatch for power users), so the new command does not violate the trust contract `init` set.
- §10 reviewer flow gains an audit trail (`.agentic/reviews/<ts>.md`). Codex users get a paste source that's reliable instead of scrolling chat.
- The state schema is forward-compatible: `schemaVersion: 1` is explicit, future kits can bump and refuse-with-clear-error.

Negative / trade-offs:

- **One more file per agent in the user repo.** Two state files (`.claude/agentic-state.json`, `.agents/agentic-state.json`) when the user installs both. Worth the cost — they are small, structured, and committed so the whole team shares the view.
- **Three-way diff complexity in `installSkills`.** The function gains state-aware branches; existing tests must continue to pass (legacy callers without state pass through to today's byte-compare). Mitigation: optional state arguments default to "no state available", which is the legacy path.
- **No per-version migration scripts yet.** A future layout break (e.g., a skill is renamed) cannot be smoothly absorbed by `update` alone — the user would see a removal of the old name and an install of the new name, plus state churn. Acceptable for v0.3; revisited when first such break appears.
- **Default-skip on conflicts can hide real updates from users who expect "update means take new".** Mitigation: `--force`, `--dry-run`, and a per-file action summary in the output show exactly which files were skipped due to user edits.
- **`.agentic/reviews/` is at the user repo root**, not under `.claude/` or `.agents/`. Asymmetric with state files, but accurate to its semantics — review handoffs are ephemeral and not agent-specific. Gitignored.

## Alternatives Considered

- **Flag on `init` (`init --update`).** Rejected per D1. Two distinct semantic operations should not share a verb; `init` is "scaffold from scratch / make this repo agentic", `update` is "absorb upstream kit changes into a repo that already is".
- **Single state file at `.agentic/state.json` in the user repo root.** Rejected per D2 — the deciders chose state colocated with the skill installs (`.claude/agentic-state.json`, `.agents/agentic-state.json`). Aligns with how each agent already owns its own subtree (`.claude/`, `.agents/`); users uninstalling one agent can drop its state cleanly with the rest.
- **Default-overwrite on conflicts with `.orig` backups.** Rejected per D3 — preserves the existing kit posture (default-skip on user edits, explicit opt-in via `--force`). `.orig` backups would clutter user trees and contradict the discipline rules in [ADR-0008](0008-documentation-discipline.md) (no extraneous artifacts).
- **NX-style per-version migration scripts in v0.3.** Rejected per D5. YAGNI; the kit has not yet shipped a layout-breaking change. First real migration is the moment to design the migration runtime properly, not preempt it with a speculative framework.
- **Per-skill version field in SKILL.md frontmatter.** Rejected per D7. Skills evolve with the kit today; kit-level versioning plus per-file SHA captures the right granularity without inflating the public skill schema.
- **Slash command `/agentic-review`.** Deferred per D6. No legacy users to migrate; the description-triggered skill mechanism is working in Claude Code via the Task subagent.
- **Save reviewer handoff under `.claude/agents/` to live with the subagent.** Rejected. The subagent is kit-shipped (committed); handoffs are ephemeral per-review artifacts and deserve their own gitignored namespace at `.agentic/reviews/`.
