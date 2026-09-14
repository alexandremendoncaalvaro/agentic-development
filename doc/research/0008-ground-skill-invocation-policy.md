# GROUND-0008: Classify skills by invoker and bound descriptions to the host listing budget

**Status:** recorded
**Decision:** Two invocation classes declared in frontmatter on both hosts (`disable-model-invocation: true` / `allow_implicit_invocation: false` for user-invocable skills; default / `true` for model-invocable), model-invocable descriptions capped at 350 characters and 8,000 in total, every description within the 1,024-character specification maximum, all enforced by `test/skills.test.js`.
**Decision ref:** doc/tasks/0065-enforce-skill-invocation-policy.md (implements doc/adr/0073-skill-invocation-policy-and-listing-budget.md)
**Confidence:** Strong

## Decision and confidence

The happy path is the one both hosts document and the reference implementation already uses: declare which skills the model may fire, remove the others from the listing by flag rather than by deleting descriptions, and keep the model-facing descriptions short with the trigger words first. The Claude Code flag removes the description from the listing entirely (A1), so the budget is spent only on skills the model should reach for; the Codex flag has the equivalent effect on implicit invocation (A2). The 8,000-character total is the smallest documented budget on either host (A1 at a 200k window, A2 when the window is unknown), so a kit that fits it fits every documented configuration. The 1,024-character per-description cap is the open specification's maximum (A3), stricter than the kit's current 1,536 guard, which is the Claude Code listing truncation point and not a specification limit.

Axis-2 verdict: Strong. The change is reversible (frontmatter and YAML flags, description text), the mechanism is primary-documented on both hosts, a public kit applies exactly this split (B1), and the in-repo Codex tree already carries the flag with the opposite default (C1), so no new file shape is introduced.

## Evidence

### E1 — `disable-model-invocation: true` removes a skill's description from the Claude Code listing while keeping `/name`

**Strength:** High
**Provenance:** A1, B1

A1's invocation table states the row `disable-model-invocation: true` as "You can invoke: Yes; Claude can invoke: No; Description not in context, full skill loads when you invoke." B1 applies the same flag to every user-invoked skill in a public dual-host kit.

### E2 — The Claude Code listing budget is 1% of the context window and drops descriptions of the least-invoked skills on overflow

**Strength:** High
**Provenance:** A1, C2

A1: "The budget scales at 1% of the model's context window. When the listing overflows, Claude Code drops descriptions starting with the skills you invoke least." C2 is a single-session observation, retained for illustration and not reproducible on demand (the live listing depends on the session's invocation history): with 26,274 characters of kit descriptions, 12 of 43 kit skills were listed without a description on 2026-09-09. The claim's High strength rests on A1, not on C2.

### E3 — Codex `policy.allow_implicit_invocation: false` disables prompt-matched invocation while `$skill` keeps working; the Codex listing budget is 2% or 8,000 characters

**Strength:** High
**Provenance:** A2, C1

A2: "`allow_implicit_invocation` (default: `true`): When `false`, Codex won't implicitly invoke the skill based on user prompt; explicit `$skill` invocation still works." and "This list uses at most 2% of the model's context window, or 8,000 characters when the context window is unknown." C1 shows the kit already writes this field for every Codex skill.

### E4 — The open specification caps `description` at 1,024 characters; Claude Code truncates the combined description text at 1,536 in the listing

**Strength:** High
**Provenance:** A3, A1, C3

A3 gives the 1-1024 range as a specification constraint. A1: "the combined `description` and `when_to_use` text is truncated at 1,536 characters in the skill listing." C3 shows the kit's test guards 1,536 and labels it as the specification, which conflates the two numbers.

### E5 — Model-facing descriptions should front-load the use case and trigger words; user-facing ones need only a human summary

**Strength:** Medium
**Provenance:** A2, A4, B1

A2: "Front-load the key use case and trigger words so a host can still match the skill if descriptions are shortened." A4 (best practices) asks for third person, what plus when, and key terms. B1 distinguishes a model-facing description with trigger phrasing from a human-facing one-liner for user-invoked skills. The 350-character figure is the kit's own choice — a round per-skill cap near the 8,000 / 23 = 347 average, with the total-budget test as the binding constraint — not a documented host number; that is why this claim is Medium and the cap is a kit rule, not a host rule.

### E6 — Dot-directories under the skill source tree must be ignored by the enumerator

**Strength:** High
**Provenance:** C4, D2

C4: `src/lib/install.js` `bundledSkills` and `test/skills.test.js` `listSkills` treat every directory as a skill. D2: on 2026-09-09 a plugin wrote `src/skills/claude-code/.slim/eval/usage.jsonl` (gitignored), and 14 tests failed until it was removed. A dot-directory is never a skill in either host's layout (A1 and A2 both address `<name>/SKILL.md` with the name rules of A3, which exclude a leading dot).

## Source register

- **A1:** Claude Code skills reference, https://code.claude.com/docs/en/skills, sections on the skill listing budget, the invocation-control table, and `Keep SKILL.md under 500 lines` (accessed 2026-09-09 via WebFetch)
- **A2:** Codex skills guide, https://learn.chatgpt.com/docs/build-skills (redirect target of developers.openai.com/codex/skills), `agents/openai.yaml` policy and description-budget sections (accessed 2026-09-09 via WebFetch)
- **A3:** Agent Skills specification, https://agentskills.io/specification, `name` and `description` field constraints (accessed 2026-09-09 via WebFetch by the research subagent)
- **A4:** Anthropic skill authoring best practices, https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices (accessed 2026-09-09 via WebFetch by the research subagent)
- **B1:** mattpocock/skills, `.agents/invocation.md`, https://raw.githubusercontent.com/mattpocock/skills/main/.agents/invocation.md, rules for user-invoked vs model-invoked skills on Claude Code and Codex (accessed 2026-09-09 via WebFetch)
- **C1:** `src/skills/codex/*/agents/openai.yaml`, `policy.allow_implicit_invocation` present in all 43 files; 37 `false`, 6 `true` (accessed 2026-09-09 via grep)
- **C2:** Live session listing on 2026-09-09: 12 of 43 kit skills shown by name only (`ad-hooks`, `ad-publish`, `ad-question-me`, `ad-report`, `ad-skill`, `ad-spec`, `ad-subagent`, `ad-tdg`, `ad-template-tune`, `ad-update`, `ad-voice`, `ad-voice-tune`); total `description` length 26,274 characters, 11,187 of them on the 21 user-verb skills (accessed 2026-09-09 via the session skill listing and a js-yaml parse of `src/skills/claude-code/*/SKILL.md`)
- **C3:** `test/skills.test.js:38-40`, description cap asserted at 1,536 and labelled "Anthropic Skills spec" (accessed 2026-09-09 via Read)
- **C4:** `src/lib/install.js:56-62` (`bundledSkills`) and `test/skills.test.js:11-16` (`listSkills`): `readdirSync` filtered by `isDirectory()` only (accessed 2026-09-09 via Read)
- **D1:** `git log --all --oneline -S "allow_implicit_invocation"`: the field dates from the first commit (42d854e) and was never re-decided; `git log --all --oneline --grep=description -i` surfaces 993bb32 (2026-08-07) "fix(skills): cap descriptions, front-load rules, fix stale text/refs", a prior pass that trimmed four descriptions to a 1,024-character cap while the test guard stayed at 1,536 (accessed 2026-09-09 via git log)
- **D2:** Observed 2026-09-09: `src/skills/claude-code/.slim/eval/usage.jsonl` created by an installed plugin (matches `.gitignore` rule `.slim/`), 14 test failures across `test/skills.test.js`, `test/init.test.js`, `test/update.test.js`; suite returned to 711 green after `rm -rf` (reproducible by creating any dot-directory under `src/skills/claude-code/` and running `npm test`) (accessed 2026-09-09 via npm test)

## Limitations and reversal

The 350-character per-description cap is a derived budget, not a host constraint; if the model-invocable set shrinks or grows, the number moves. The record does not measure activation quality of the shortened descriptions (task-0069 adds structural assertions; a live activation eval is deferred). Reversal evidence: either host documenting a materially larger default listing budget, or a measured drop in auto-invocation after the trim.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs doc/research/0008-ground-skill-invocation-policy.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
