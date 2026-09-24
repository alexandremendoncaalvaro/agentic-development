# RESEARCH-0030: Skill invocation control and the listing budget without a hard block

**Status:** draft
**Created:** 2026-09-24
**Question:** For a kit of 46 skills installed into Claude Code and Codex, what should decide whether the model may invoke a skill on its own, and how should the host's skill-listing budget be handled once that decision no longer removes descriptions from the listing?
**Stakes:** medium times reversible
**Confidence:** Conditional

## Conclusion and confidence

Two rules, separated. First, invocation: a skill may be model-invocable when every outward or irreversible effect it can cause sits behind an approval step inside the skill; a skill whose body performs such an effect without that step stays blocked by the host flag. This reconciles the host vendors' advice, which blocks side-effect skills (E1), with the practice of the collections surveyed, most of which block nothing, and with the failures the one heavy user of the flag reports (E2, E3); it is the rule ADR-0084 already applied to `ad-pr` and `ad-merge`. Second, budget: do not enforce a whole-collection character total as a gate. Measured on Claude Code 2.1.227 at a 200k window, the kit as it ships today, with 17 skills blocked, already overflows the 8,000-character listing (41 skills, 13,647 characters), because the host adds its own built-in skills to the same listing; the block buys no fit on a small window, and on a 1M window the budget scales with the window (E8, E4). The hosts degrade by dropping descriptions while keeping every name (Claude Code), and no surveyed collection tries to fit its whole set into one listing (E4, E5); keep each description short with the use case and triggers first, which both hosts prescribe (E6). Axis-2 verdict: Conditional. Mitigation one: the debug log reports the overflow but not which descriptions are dropped, and in a fresh session the drop order degenerates to listing order (E4); if a routing trial shows a pipeline skill losing its description, demote the rarely used setup verbs to `skillOverrides: "name-only"`, the documented tool for keeping a skill invocable without its description (E7). Mitigation two: on Codex, where a large set may lose whole skills rather than descriptions (E5), the risk stays unmeasured while the local `codex-cli` refuses the account's models; the 350-character cap per description is kept so the Codex total stays as small as the rule allows.

## Question and scope

ADR-0073 blocks 17 of the kit's 46 skills from model invocation (`disable-model-invocation: true` on Claude Code, `policy.allow_implicit_invocation: false` on Codex) for two reasons at once: a posture that outward-facing verbs stay human-fired, and a listing budget, since a blocked skill's description leaves the listing. ADR-0076 and ADR-0084 have since moved `ad-rules`, `ad-pr`, and `ad-merge` out of the blocked class, the last two on the argument that an approval gate inside the skill carries the safety. The owner holds that the same argument applies to nearly every skill and that the hard block is a defect. Candidate options for the budget once descriptions return to the listing: accept the host's overflow behavior; raise the budget through a setting the installer writes; shrink every description; consolidate or route skills; install selectively. Deciding criterion: the model can reach every skill it should, including the pipeline skills, without the kit writing host settings it does not own. Stakes are medium (routing quality for every consumer of the kit) and the change is reversible (frontmatter, YAML, and description text), so Medium evidence supports a Conditional verdict; a Strong verdict for the budget half needs a measurement on the host.

## Hypothesis

Measurable for Claude Code: with every kit skill model-invocable and each description at most 350 characters, a fresh session on a 200k-token window overflows the listing (1% of the window, about 8,000 characters) and drops descriptions in listing order, while a 1M-token window lists every description. Refuted if the 200k session lists every pipeline skill's description, or if the 1M session drops any. Run for the 200k half, with the owner's approval of its cost, plus a control arm with the kit as it ships (E8): the overflow is confirmed, and it is present in the control arm too; which descriptions are dropped is not observable from the debug log; the 1M half was not run. Not measurable for Codex on this machine while its CLI refuses the account's models.

## Method

Four sources, joined. Official documentation: Claude Code skills, settings reference, environment variables, plugins, and discovery pages; Anthropic's skill authoring best practices and Agent Skills overview; the OpenAI Codex skills page; the open Agent Skills specification; all fetched as raw Markdown with `curl` and searched locally, because a summarizing fetch dropped the budget section on first attempt. Validated implementation references: eight public skill collections cloned at a pinned commit and measured by parsing each `SKILL.md` frontmatter (skill count, blocked count, description characters) and by grepping Codex `agents/openai.yaml`; their README, ADR, changelog, and issue text quoted where they discuss invocation or budget; the counts for five collections, the two maintainer quotes, and the two issue titles re-checked by the author against the clones and the GitHub API. In-repo patterns: ADR-0073, ADR-0074, ADR-0076, ADR-0084, GROUND-0008, and the current frontmatter, with the description totals recomputed per host. Git history: when the flag entered and how the blocked set changed. Claims graded per the evidence hierarchy (measurement, primary docs with a validated reference, consensus, single source, opinion) with agreement, applicability, and recency as modifiers.

## Evidence

### E1 — Both hosts document the flag for side-effect skills, and Claude Code enforces it

**Strength:** High

Claude Code: "Use this for workflows with side effects or that you want to control timing, like `/commit`, `/deploy`, or `/send-slack-message`. You don't want Claude deciding to deploy because your code looks ready", and "If Claude tries anyway, Claude Code blocks the call and instructs it not to reproduce the deploy steps another way" (S1). Codex: "When `false`, Codex won't implicitly invoke the skill based on user prompt; explicit `$skill` invocation still works" (S5). The flag also stops a skill from being preloaded into subagents and from running in a scheduled task (S1). Primary documentation on both hosts, current.

### E2 — Most public collections block no skill, and the one that blocks many reports the cost

**Strength:** Medium

Of eight collections measured, six set `disable-model-invocation: true` on zero skills: anthropics/skills (20 skills), obra/superpowers (15), addyosmani/agent-skills (25), wshobson/agents (183), K-Dense-AI/scientific-agent-skills (166), alirezarezvani/claude-skills (388) (B1-B6). mattpocock/skills blocks 22 of 38 on purpose, with the test "could the model usefully reach for this autonomously?" (B7); its changelog reverts one block because "Codex filtered the skill out of the model-visible skills list, so its description could not trigger it", and open issues report blocked skills that other skills cannot call or that a user could not reach (B7, B9). obra/superpowers blocked only three thin command wrappers, because "This change prevents confusion when Claude would invoke a command that just redirects to a skill anyway", and later removed them (B2). Medium: a consistent practice across independent maintainers, but most of those collections carry few skills with outward effects, so their zero is weaker evidence for release or publish verbs than for setup verbs.

### E3 — The kit's own history shows the block misfiring where an in-skill gate already existed

**Strength:** High

ADR-0073 corrected `ad-commit` into the model-invocable class before acceptance because the block "blocks the agent from landing its own verified work, which is bureaucracy rather than safety"; ADR-0076 moved `ad-rules`; ADR-0084 moved `ad-pr` and `ad-merge` behind "an approval gate stated in the skill" (C1-C3). In the session that produced this study the host refused `ad-level-up`, whose own contract is a hard human-approval gate that "never writes unprompted" (C4). Every one of the 17 blocked skills states some confirmation, preview, or approval step; whether each step precedes every outward effect is not yet verified skill by skill (C5).

Contested: position A (hosts, E1) — side-effect skills should be user-only, enforced by the host. Position B (owner, E2, E3) — an approval step inside the skill carries the safety and the host block only costs reach. A holds for a skill that performs its effect with no approval step, where the host flag is the only deterministic barrier. B holds for a skill whose outward step is already gated, where the flag adds no protection the gate lacks and removes the skill from subagents, schedules, and model routing. The rule in the conclusion applies each where it holds.

### E4 — Claude Code keeps every name on overflow and drops the least-invoked descriptions, and that order degenerates to listing order in a fresh session

**Strength:** High

"The listing always contains every skill name, but if you have many skills, Claude Code shortens descriptions to fit the listing's character budget... The budget scales at 1% of the model's context window. When the listing overflows, Claude Code drops descriptions starting with the skills you invoke least" (S1). The setting reference adds that this "keeps every skill's name but drops the descriptions of the least-used skills, so Claude can still invoke those skills but is less likely to choose one on its own" (S2). A Claude Code maintainer called this "intended, documented behavior rather than a bug", noting that "in a fresh session with no usage history that degenerates to listing order", and left the issue open to surface a truncation marker (S8). The fallback budget is 8,000 characters (S3). The kit's model-invocable descriptions total 7,971 characters on Claude Code and 7,994 on Codex today; the 17 blocked descriptions add 9,368 and 8,818 (C6).

### E5 — Codex may omit whole skills from a large listing

**Strength:** High

"This list uses at most 2% of the model's context window, or 8,000 characters when the context window is unknown. If many skills are installed, Codex shortens skill descriptions first. For large skill sets, Codex may omit some skills from the initial list and show a warning" (S5). Codex does not say at what size omission begins. Primary documentation; the threshold is unmeasured.

### E6 — Both hosts prescribe short, trigger-first descriptions rather than a collection total

**Strength:** High

Codex: "Front-load the key use case and trigger words so a host can still match the skill if descriptions are shortened" (S5). Claude Code: "put the key use case first, since each entry's combined text is capped at 1,536 characters regardless of budget" (S1). The specification caps a description at 1,024 characters (S7). No surveyed collection states or tests a whole-collection total; the only numeric guard found is a per-skill 1,536-character check (B6). The large collections stay within reach by installing selectively, through plugins or one skill at a time, not by fitting one listing (B4-B6, B8).

### E7 — Claude Code documents three remedies for overflow, all settable per project

**Strength:** High

"To raise the budget, set the `skillListingBudgetFraction` setting (for example, `0.02` = 2%) or the `SLASH_COMMAND_TOOL_CHAR_BUDGET` environment variable to a fixed character count. To free budget for other skills, set low-priority entries to `"name-only"` in `skillOverrides` so they list without a description" (S1). `skillOverrides` states: `"on"` lists name and description, `"name-only"` lists the name only and keeps the `/` command (S1). All three settings have scope "Any file", which includes a project's `.claude/settings.json` (S2). `skillOverrides` does not reach plugin skills (S1). Codex offers only a per-skill `enabled = false` in `~/.codex/config.toml` (S5).

### E8 — On a 200k window the kit overflows the Claude Code listing with or without the block

**Strength:** High

Two one-turn Claude Code 2.1.227 sessions on `claude-haiku-4-5-20251001` (200k window), each in a fresh temporary directory whose `.claude/skills/` holds the kit, run with `--setting-sources project` so no user or plugin skill loads, and `--debug-file` to capture the host's listing warning (M1, M2). Control arm, the kit as it ships (17 skills blocked): the host logged "Sending 41 skills via attachment (initial)" and "Skill listing over budget: 41 skills, 13647 chars > 8000 budget — descriptions will be truncated". Treatment arm, every skill model-invocable with each description cut mechanically to its first 350 characters (46 kit descriptions, 13,807 characters): "Sending 58 skills via attachment (initial)" and "Skill listing over budget: 58 skills, 19757 chars > 8000 budget". Both arms answered and cost USD 0.0171 and USD 0.0173. The difference between the listed counts and the kit's model-invocable counts (41 against 29, 58 against 46) is twelve host built-in skills in both arms. Measurement on the real host; one observation per arm, and the log names the budget, not the dropped descriptions.

## Limitations and what would reverse the conclusion

The budget half rests on one measured session per arm on one host version (E8), which settles that the listing overflows at 200k with or without the block, not which descriptions the host drops. A routing trial in which a pipeline skill fails to be chosen because its description was dropped would call for `name-only` demotion of setup verbs; a 1M session that still overflows would reverse the decision to drop the total gate. The Codex omission threshold is unknown and cannot be measured here until the CLI accepts the account's models; evidence that Codex omits kit skills at this size would call for selective installation on that host, the pattern the large collections use. The survey covers eight collections chosen for size and visibility, not a random sample, and most of them ship few outward-effect skills, so E2 bears more on setup verbs than on `ad-release` and `ad-publish`. The per-skill gate audit (C5) is a keyword count, not a verification; a skill found to perform an outward effect before any approval step stays blocked under the rule.

## Provenance and artifacts

- **S1:** Claude Code, "Extend Claude with skills", sections "Control who invokes a skill", "Skill descriptions are cut short", "Override skill visibility from settings", "Frontmatter reference", https://code.claude.com/docs/en/skills (accessed 2026-09-24 via `curl` of the `.md` page)
- **S2:** Claude Code, "Settings reference", entries `skillListingBudgetFraction`, `skillListingMaxDescChars`, `skillOverrides`, and the scope index, https://code.claude.com/docs/en/settings-reference (accessed 2026-09-24 via `curl` of the `.md` page)
- **S3:** Claude Code, "Environment variables", row `SLASH_COMMAND_TOOL_CHAR_BUDGET` ("a fallback of 8,000 characters"), https://code.claude.com/docs/en/env-vars (accessed 2026-09-24 via `curl` of the `.md` page)
- **S4:** Anthropic, "Skill authoring best practices" and "Agent Skills overview", https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices and /overview (accessed 2026-09-24 via `curl` of the `.md` pages): only name and description preload; no recommended skill count
- **S5:** OpenAI Codex, "Build skills", listing budget paragraph, "How Codex uses skills", "Optional metadata", "Enable or disable local Codex skills", https://developers.openai.com/codex/skills (accessed 2026-09-24 via `curl` of the `.md` page)
- **S6:** Claude Code, "Discover plugins" and "Plugins reference" (`enabledPlugins`, `defaultEnabled`), https://code.claude.com/docs/en/discover-plugins and /plugins-reference (accessed 2026-09-24 via `curl`)
- **S7:** Agent Skills specification, frontmatter (`description` "Max 1024 characters"; no invocation field), https://agentskills.io/specification (accessed 2026-09-24 via `curl`)
- **S8:** anthropics/claude-code issue #81081, "[BUG] Session-start skill listing silently truncates most skill descriptions under a size budget" (open), maintainer comment https://github.com/anthropics/claude-code/issues/81081#issuecomment-5308956011 (accessed 2026-09-24 via the GitHub API)
- **B1:** anthropics/skills at `34040c9`: 20 `SKILL.md`, 0 blocked (accessed 2026-09-24 via shallow clone and frontmatter grep)
- **B2:** obra/superpowers at `5bf4e78`: 15 skills, 0 blocked; `RELEASE-NOTES.md:848-850` (the three command wrappers) and `:284` (their removal) (accessed 2026-09-24 via shallow clone)
- **B3:** addyosmani/agent-skills at `bcab6a1`: 25 skills, 0 blocked; `docs/codex-setup.md:27` warns against stacking its router on the host's (accessed 2026-09-24 via shallow clone)
- **B4:** wshobson/agents at `4236bb9`: 183 skills, 0 blocked, 94 plugins; `README.md:71-73` "Installing a plugin loads only its components into context" (accessed 2026-09-24 via shallow clone)
- **B5:** K-Dense-AI/scientific-agent-skills at `49c6e97`: 166 skills, 0 blocked, installed one at a time (`README.md:159-162`) (accessed 2026-09-24 via shallow clone)
- **B6:** alirezarezvani/claude-skills at `19392f7`: 388 skills, 0 blocked, 99 plugins; `scripts/check_frontmatter.py:23,89` per-skill 1,536-character check (accessed 2026-09-24 via shallow clone)
- **B7:** mattpocock/skills at `c55ee46`: 38 skills, 22 blocked; `.agents/invocation.md:5-6` (the classification test); `CHANGELOG.md:21-23` (the Codex reversal) (accessed 2026-09-24 via shallow clone)
- **B8:** sickn33/agentic-awesome-skills at `7b534bc`: 2,461 skills under `skills/`, 23 blocked, 59 plugins and bundles; `README.md:168-172` (installer refuses to install everything without `--all`) (accessed 2026-09-24 via shallow clone)
- **B9:** mattpocock/skills issue #1055, "Skills with disable-model-invocation: true are invisible in Claude Code — users cannot invoke them" (open), and issues #1052, #1056, #965 (accessed 2026-09-24 via the GitHub API)
- **C1:** `doc/adr/0073-skill-invocation-policy-and-listing-budget.md`, Decision and Consequences (the `ad-commit` correction) (accessed 2026-09-24 via repository read)
- **C2:** `doc/adr/0076-compose-a-canonical-decision-maker-brief.md` and `doc/adr/0084-reclassify-pr-and-merge-behind-an-approval-gate.md`, Decision (accessed 2026-09-24 via repository read)
- **C3:** `doc/research/0008-ground-skill-invocation-policy.md`, Decision and confidence (accessed 2026-09-24 via repository read)
- **C4:** the Skill tool refusal of `ad-level-up` on 2026-09-24 ("cannot be used with Skill tool due to disable-model-invocation") and `src/skills/claude-code/ad-level-up/SKILL.md` description (accessed 2026-09-24 via the host and repository read)
- **C5:** `grep -c -i -E "approv|confirm|ask the (user|owner)|never writes|before (writing|overwrit)|y/n|AskUserQuestion"` over each blocked skill's `SKILL.md`, every count non-zero except `ad-update`, whose "Apply only when requested" step follows a mandatory dry-run preview (accessed 2026-09-24 via shell)
- **C6:** description totals per host and class, recomputed by parsing `src/skills/{claude-code,codex}/*/SKILL.md` frontmatter and `agents/openai.yaml` at `e674e9a`: Claude Code 7,971 model-invocable and 9,368 blocked; Codex 7,994 and 8,818 (accessed 2026-09-24 via a local Node script)
- **M1:** control arm: `src/skills/claude-code/*` at `e674e9a` copied into `/tmp/listing-probe-current/.claude/skills/`, then `claude -p "Reply with exactly: ok" --model claude-haiku-4-5-20251001 --max-turns 1 --setting-sources project --output-format stream-json --verbose --debug-file debug.log` from that directory; `grep -E "Sending [0-9]+ skills|over budget" debug.log` (accessed 2026-09-24 via Claude Code 2.1.227, npm `@anthropic-ai/claude-code`; the same command reproduces on any platform with that release)
- **M2:** treatment arm: the same copy with `disable-model-invocation: true` removed from every `SKILL.md` and each `description` truncated to its first 350 characters by a local script, same command from `/tmp/listing-probe/` (accessed 2026-09-24 via Claude Code 2.1.227)
- **D1:** `git log --reverse -S"disable-model-invocation: true" -- src/skills/claude-code`: the flag entered in `1efd695` (2026-09-09, ADR-0073), was extended in `9ef119d` and `0ab4ca8`, and removed from `ad-pr` and `ad-merge` in `9147f7e` (2026-09-22, ADR-0084) (accessed 2026-09-24 via git in the `lagos` worktree)

## Derived decision

None yet. On review, the invocation rule and the budget rule graduate to an ADR that amends ADR-0073, and the per-skill gate verification and the Claude Code listing measurement become that change's task.
