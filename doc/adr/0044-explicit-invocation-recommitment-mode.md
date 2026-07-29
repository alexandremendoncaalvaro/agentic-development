# ADR-0044: Explicit invocation of `ad-philosophy` is a recommitment, not a reload

**Status:** accepted
**Date:** 2026-07-29
**Deciders:** Alexandre Alvaro

## Context

`ad-philosophy` carries the kit's eight universal behaviors and auto-loads as posture on non-trivial work ([ADR-0031](0031-decide-when-grounded-posture.md), [ADR-0040](0040-report-for-a-decision-maker-behavior.md), [ADR-0042](0042-evidence-discipline-behaviors.md)). The skill has one mode: its text enters the context, and the agent is expected to behave accordingly.

That single mode has an observed failure. Across this repository's own improvement program, the maintainer recorded three separate violations of the *Decide When Grounded, Ask When Judgment* behavior: each time, the agent escalated a choice its own grounding had already settled. The record is the maintainer's session notes, kept outside this repository, so the count is reported here on their authority rather than as a repo-checkable citation; what is checkable in-repo is the prior remediation attempt, [ADR-0042](0042-evidence-discipline-behaviors.md), and the fact that the same violation class recurred after it landed. In every instance the rule was verifiably in context — `ad-philosophy` had loaded, and [`WORKFLOW.md`](../../WORKFLOW.md) §7 was readable. The rule was not missing; it was not applied.

That distinction is load-bearing. The failure is not a *retrieval* failure at read time, which more or better text would fix; it is an *application* failure at decision time, where a strong default behavior (ask the human when uncertain) outweighs a configured one (decide when grounded). Adding text has already been tried — ADR-0042 sharpened the same behavior family — and the failure recurred afterward. A fourth wording pass has no mechanism by which it would work where the previous three did not.

What the kit does not currently have is a way for the user to *convert* a reload into an application. When a user types `/ad-philosophy` after observing drift, they are not asking for the text again — the text never left. They are issuing a correction, and today the skill's only possible response is to re-read itself.

## Decision

We will give `ad-philosophy` a second mode, triggered by **explicit invocation**: when the user invokes the skill by name (typing `/ad-philosophy`, or naming it in their message), the agent must not merely reload the behaviors. It must emit an **applied-binding statement** before doing any other work:

- **One line per behavior, all eight, in order.** Each line names the behavior and states what it changes about the agent's *immediate next actions on the current task*.
- **Non-binding behaviors are listed as `n/a` with a reason.** Coverage, not cherry-picking — silently omitting a behavior is precisely how a recitation passes for an application.
- **Lines must be concrete.** A line that restates the rule ("I will verify my work") does not count; a line that names the next action ("re-run the suite and paste the output before calling it green") does.
- **A binding that contradicts the current plan forces a correction** stated in the same pass, before continuing.

The auto-load path is unchanged: posture loads silently and the agent continues its task, exactly as today. Only the explicit invocation carries the protocol.

The managed `Skills installed by agentic` table changes with it. It previously advertised `ad-philosophy` as `_(implicit)_` — no slash command — which was accurate when auto-load was the skill's only mode and is now the opposite of what a user needs to know. The generator advertises both surfaces, so the correction gesture is discoverable from the table every consuming project ships.

This lands as a **fold into `ad-philosophy`**, not a new skill, per the principle recorded in [ADR-0034](0034-audit-tier-skills-over-fold.md): *fold when a capability is an increment to a responsibility a skill already owns; create a new skill when it is a distinct operation.* The behaviors being bound are `ad-philosophy`'s own content, the trigger is `ad-philosophy`'s own invocation, and the mode has no meaning detached from that content — there is no distinct operation to give a separate name. A `/ad-recommit` skill would also be unreachable by the user in the moment that matters, since the natural gesture on observing posture drift is to re-invoke the posture skill.

The kit ships **only this advisory layer**. It does not ship an agent-host hook that intercepts the moment of asking, even though [`WORKFLOW.md`](../../WORKFLOW.md) §11 rates deterministic gates above advisory text. Two reasons: the interception point is a host-specific tool primitive with no cross-host equivalent, so shipping it would break the dual-host symmetry this kit maintains (the same argument that rejected plugin packaging in [ADR-0041](0041-keep-ad-prefix-reject-plugin-packaging.md)); and the kit's existing deterministic gates are all host-neutral git hooks (`lefthook.yml`, [ADR-0033](0033-house-ip-leak-guard.md)), a boundary this decision keeps. A user who wants the deterministic layer configures it in their own agent-host settings, where it composes with this skill rather than duplicating it.

## Consequences

Positive:

- Gives the user a working correction gesture. `/ad-philosophy` stops being a no-op re-read and becomes an audit the agent must pass out loud.
- The output is inspectable. A binding line is either concrete or it is not, so a recitation dressed as an application is visible to the reader in a way that silent internal "consideration" never was.
- Enumerating all eight with explicit `n/a` reasons removes the escape hatch. The agent cannot quietly skip the behavior it is currently violating, which is the one it is least likely to volunteer.
- Costs nothing on the auto-load path, which is the overwhelmingly common one.

Negative / trade-offs:

- Advisory text remains advisory. The mode raises the cost of skipping a behavior; it cannot make skipping impossible. The deterministic layer is deliberately out of the kit's scope (above), so the guarantee is partial by construction.
- Explicit invocation becomes more verbose — an eight-line statement before the work resumes. This is intended: the verbosity is the audit. It is confined to a gesture the user makes deliberately.
- The protocol depends on the agent distinguishing an explicit invocation from an auto-load. Both hosts surface that distinction (a typed slash command on Claude Code; a named invocation against `allow_implicit_invocation` on Codex), but it is a judgment the skill text asks for rather than a value it receives.

## Alternatives Considered

* **Strengthen the existing behavior's wording again** — rejected. Tried in ADR-0042; the same violation class recurred after it landed. The failure is at decision time, not read time, so a fourth wording pass has no mechanism of action. Wording is the layer that has already been shown insufficient here.
* **A new `/ad-recommit` skill** — rejected. It fails ADR-0034's fold test: it operates on `ad-philosophy`'s own content, at `ad-philosophy`'s own trigger point, and would carry no content of its own. It also adds a name the user must remember at exactly the moment they are reaching for the skill they already know.
* **Ship a host hook in the kit that intercepts the ask** — rejected for the kit, endorsed outside it. It is the stronger mechanism (§11), but it binds to one host's tool primitive with no dual-host equivalent, and every gate the kit ships today is a host-neutral git hook. It belongs in the user's own host configuration, layered on top of this skill.
* **Make the applied-binding statement mandatory on every auto-load** — rejected. The auto-load fires constantly; an eight-line preamble on every non-trivial change is noise that would train the reader to skip it, destroying the signal exactly where it is needed. The correction gesture is rare by nature and should stay proportionate.
* **Do nothing** — rejected. The violation is measured, recurrent, and the user has no gesture that changes the outcome.
