# ADR-0085: Gate skill effects inside the skill, not by blocking model invocation

**Status:** proposed
**Date:** 2026-09-24
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0073 — replaces the invoker-class rule and its user-invocable-only class with an effect-gate rule, and retires the 8,000-character total for model-invocable descriptions; the 350-character per-description cap and the 1,024-character specification maximum remain, now for every skill.

## Context

ADR-0073 blocked model invocation of every outward-facing or setup verb, on both hosts (`disable-model-invocation: true` on Claude Code, `policy.allow_implicit_invocation: false` on Codex), for two reasons at once: a posture that such verbs stay human-fired, and a listing budget, since a blocked skill's description leaves the host's skill listing. Three amendments have since pulled members out of that class because the block cost more than it protected: ADR-0073 itself moved `ad-commit` out before acceptance, ADR-0076 moved `ad-rules`, and ADR-0084 moved `ad-pr` and `ad-merge` on the argument that an approval step inside the skill carries the safety. Seventeen skills remain blocked, among them `ad-level-up`, whose own contract never writes without the owner's approval and which the host refused to start when the owner asked the agent to run it.

RESEARCH-0030 (`doc/research/0030-skill-invocation-control-and-listing-budget.md`, concluded, approved by the owner on 2026-09-24) settles both reasons. On the posture, the host vendors document the flag for side-effect skills, while six of eight public skill collections surveyed block no skill, and the one that blocks many reports skills made unreachable by it; the positions reconcile on where the effect is gated. On the budget, a measurement on Claude Code 2.1.227 at a 200k window found the kit overflowing the 8,000-character listing as it ships today, with 17 skills blocked (41 listed skills, 13,647 characters), because the host's built-in skills share the listing; the total gate never bought the fit it was written for, and on a 1M window the budget scales with the window. The host keeps every skill name on overflow and drops the least-invoked descriptions first. Codex documents that a large listing may omit whole skills; that threshold is unmeasured on this machine.

## Decision

We will decide model invocation by where a skill's effects are gated, not by who types its name.

1. **Effect-gate rule.** A skill is model-invocable when every outward effect (anything that reaches other people or systems: push, pull request, merge, tag, release, registry publish, a message or post) and every irreversible effect (a change git cannot restore: files outside the repository, machine-level stores, global installs, untracked deletions, history rewrites) it can cause runs only after an approval step stated in the skill body: the agent asks the owner and receives a yes, or the owner explicitly requested that exact action, before the effect runs. Local writes to tracked repository files need no gate.
2. **Host block as the exception.** A skill that performs such an effect without that step carries `disable-model-invocation: true` and `policy.allow_implicit_invocation: false` until its gate is written. The kit ships no skill in that state: the 17 skills ADR-0073 left blocked become model-invocable on both hosts, and any of them found to perform an effect before an approval step receives the missing step in the same change.
3. **Budget.** Every skill description, in either host, is at most 350 characters and opens with the use case and trigger phrases; every description stays within the 1,024-character specification maximum. The whole-collection 8,000-character total is not enforced. `test/skills.test.js` enforces the per-description caps, the absence of the host block on every skill outside an explicit exception set that is empty today, and host parity of the flags.
4. **Overflow response.** If a routing trial shows a pipeline skill losing its description on a small window, the rarely used setup verbs are demoted with `skillOverrides: "name-only"`, which keeps a skill invocable without its description; that is a separate, measured change, not part of this one.

## Consequences

Positive:

- The model can reach every kit skill the owner asks it to run, and a skill can be preloaded into a subagent or run from a scheduled task, which the host block forbade.
- Safety lives in one place per skill, the approval step before the effect, which is the step a reviewer can read and a test fixture can exercise; the host flag no longer suggests a protection the listing budget was actually paying for.
- One description rule for all skills replaces two classes that tests had to keep in sync across hosts.

Negative / trade-offs:

- An in-skill approval is an instruction the model follows, not a barrier the host enforces; for `ad-release` and `ad-publish`, whose effects reach a registry or an audience, the deterministic barrier is gone and the approval step is the whole protection. Accepted: ADR-0084 made the same trade for `ad-pr` and `ad-merge`, and the owner's approval remains the gate on every outward step.
- On a 200k window more descriptions compete for the same budget, so more of them are dropped, least-invoked first and in listing order in a fresh session; the names stay invocable. Mitigated by the per-description cap and by the overflow response in decision 4.
- On Codex a large listing may omit whole skills, and that threshold is unmeasured while the local CLI refuses the account's models. Accepted as a named limitation of RESEARCH-0030; a Codex measurement that shows kit skills omitted reverses the budget half of this decision for that host.
- The evaluation corpus loses its user-invocable-only category, so the cases authored for it are re-authored for the model-invocable class. ADR-0080 item 8 frames the dormancy grader and a null route for a user-invocable-only case; the case validator already applies that rule to any representative, and a dormancy case now names a model-invocable skill that a nearby request must not fire.

Revisit trigger: a routing trial showing a pipeline skill missed for lack of its description, a Codex listing that omits kit skills, or a skill whose effect cannot be gated in its body.

## Alternatives Considered

* Keep ADR-0073's classes and move skills out one amendment at a time, as ADR-0076 and ADR-0084 did — rejected: every amendment so far found the same cost, and RESEARCH-0030 shows the budget reason does not hold on the window it was written for.
* Keep the host block for `ad-release` and `ad-publish` only — rejected by the owner's standard for this decision: both already ask for approval before their outward step, and the rule keeps the block available for any skill that does not.
* Have the installer raise `skillListingBudgetFraction` or write `skillOverrides` into the user's host settings — rejected for this change: it writes host configuration the kit does not own and does not reach Codex; kept as the documented response once a trial shows it is needed.
* Shrink all descriptions until the kit fits 8,000 characters — rejected: the host's built-in skills alone take part of that budget, and ADR-0073 already found the cut too lossy for the pipeline skills.
* Split the kit into bundles the user installs selectively, the pattern of the large public collections — rejected for now: a packaging change with its own design questions, and the kit's size does not yet force it.
