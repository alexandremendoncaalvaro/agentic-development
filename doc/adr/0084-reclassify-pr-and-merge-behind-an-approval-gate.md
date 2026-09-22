# ADR-0084: Reclassify ad-pr and ad-merge as model-invocable behind an in-skill approval gate

**Status:** accepted
**Date:** 2026-09-22
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0073 — moves `ad-pr` and `ad-merge` from the user-invocable-only class to the model-invocable class; the blast-radius classification rule, every other class member, and the listing budgets remain unchanged.

## Context

ADR-0073 classified the kit's skills by invoker so that the descriptions the
model needs fit the hosts' listing budget, and put the outward-facing verbs,
among them `ad-pr` and `ad-merge`, in a user-invocable-only class realized on
Claude Code as `disable-model-invocation: true`. The record accepted the
consequence that "a user-invocable skill can no longer be reached by the
model even when a request clearly asks for it" and that "the model must tell
the user to run `/ad-pr`".

That consequence turned out to be stronger than the owner's rule for these
two verbs. The owner's rule is an approval gate: the agent may open or merge
a pull request once the owner has said yes in the session, and must ask
first. On 2026-09-22 the owner approved a merge in the conversation and the
agent's call to `/ad-merge` was refused by the host with "cannot be invoked
via the Skill tool ... reserved for explicit user invocation", so the approval
could not be acted on and the owner had to type the command. Both skills
already carry the gate the owner wants in their own bodies: `ad-pr` asks
before pushing and surfaces the draft for approval before opening; `ad-merge`
asks the owner to confirm the merge. The host-level block therefore adds no
safety the skill does not already provide and removes the ability to act on
an approval already given. ADR-0073's own review moved `ad-commit` out of
the class for the same reason ("bureaucracy rather than safety"), and
ADR-0076 corrected `ad-rules` by amendment.

## Decision

We will reclassify `ad-pr` and `ad-merge` as model-invocable on both hosts
and keep their outward steps behind an approval gate stated in the skill.

1. **Class.** Claude Code: no `disable-model-invocation` flag. Codex:
   `policy.allow_implicit_invocation: true`. `test/skills.test.js` removes
   the two names from its user-invocable set, so the class flags, the
   350-character description cap, and the 8,000-character listing budget are
   enforced for them as for every model-invocable skill.
2. **Gate in the skill, not in the host.** Each skill states in its regime
   step that the agent may run it when the work is ready and that the
   outward step runs only after the owner's approval given in the session,
   asked once with the recommended answer first. `ad-pr` keeps its push
   confirmation and draft approval. `ad-merge` asks on every path a valid
   release-plan receipt does not already cover, including CI green without
   warnings, which previously merged without a question.
3. **Budget.** The two descriptions are cut to what the listing needs (the
   use case, the approval, one trigger phrase). On Claude Code that alone
   keeps the model-invocable total under the budget. On Codex two
   descriptions (`ad-audit`, `ad-review`) were longer than their Claude Code
   twins by their host-specific clause and are tightened to the same
   meaning, so the Codex total also stays under the budget; no other
   description changes.
4. **Rule unchanged.** The dividing line of ADR-0073 stands: anything that
   reaches the team or a registry needs the owner's decision. This record
   changes where that decision is collected, from a typed slash command to an
   approval the agent asks for and records, for these two verbs only.
   `ad-release`, `ad-publish`, and the setup verbs stay user-invocable-only.

## Consequences

Positive:

- An approval given in conversation is acted on by the agent instead of
  being turned into an instruction to type a command, which is what the
  owner asked of reserved verbs.
- The gate is one contract, the skill body, on both hosts; the host flag no
  longer duplicates it with a stronger and unintended meaning.
- Hosts that never expose the flag (claude.ai uploads, per ADR-0073's own
  consequence) now see these two skills the same way Claude Code does.

Negative / trade-offs:

- The two descriptions return to the listing, about 200 characters against
  a budget that had 229 to spare on Claude Code and less on Codex. Accepted:
  they are cut to the use case and one trigger phrase, two Codex
  descriptions lose redundant words, and the test holds the total on both
  hosts.
- The safety of the outward step now rests on the skill text being followed.
  Accepted: that is the same footing as `ad-commit` and every other
  model-invocable skill, and the `-p` lane denies the underlying `gh` call
  whenever no one can answer a prompt.

Revisit trigger: an approval asked by either skill is skipped in a live
trial or an audit, or a host offers an approval-class permission for skills
that both hosts can express.

## Alternatives Considered

- **Keep the class and add a host `ask` permission rule** (`permissions.ask`
  for `Skill(ad-pr)` on Claude Code). Rejected: it lives in each install's
  settings, which the installer never writes, and Codex has no equivalent,
  so the two hosts would diverge on the one rule that must be the same.
- **Keep the class and have the agent run `gh pr create` / `gh pr merge`
  directly after approval.** Rejected: it bypasses the skill's preflight,
  body shape, and merge-mode checks, which is the workflow the class was
  meant to protect, and the host's refusal text forbids exactly that.
- **Reclassify every outward verb.** Rejected for now: the owner named
  these two; release and publication reach registries and audiences beyond
  the repository and keep the stronger posture until a trial shows the same
  friction.
