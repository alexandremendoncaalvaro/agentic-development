# ADR-0099: Hold a closing question that carries no recommendation

**Status:** accepted
**Date:** 2026-11-24
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0083 — for the ask gate only: decision 1's never-blocks clause (a `Stop` hook may keep a turn going once when the reply ends by asking the owner without a recommendation), decision 3's no-judgment clause (the verdict is a pattern check on prose), and decisions 4 and 5's every-firing-is-recorded clauses (only a held reply is recorded). Every other decision binds it unchanged.
**Amends:** ADR-0074 — its rejection of blocking as coercion, for the ask gate only: the owner asked for this lock, and it checks the shape of a closing question, not its content.
**Qualifies:** ADR-0047, ADR-0055 and ADR-0074, as ADR-0083 decision 1 requires of a blocking guard: the commit gate stays opt-in, the session tier stays opt-in through `ad-hooks`, and the checkpoint keeps its exit-0 contract.
**Related:** ADR-0094 (its rejected `Stop` rewrite for language stays rejected; this ADR admits a `Stop` block for a format check the owner asked for), RESEARCH-0026 C11 (Stop-based repair loop, deferred to its own ADR), RESEARCH-0048 (ground record)

## Context

The owner's most frequent complaint is the agent asking what was already decided or what the evidence settles (186 recorded occurrences). The rule is written in the owner's global instructions and in `ad-philosophy`: decide when grounded; bring a decision only with evidence, options with advantage and disadvantage, and a recommendation. Prose did not hold, so the owner asked for a lock.

No hook can stop prose before it is shown. A `Stop` hook on both hosts sees `last_assistant_message` and can return `{"decision":"block","reason":…}`, which keeps the turn going with the reason as the model's next instruction (Claude Code) or as a continuation prompt (Codex). The owner then sees the reply and its correction. ADR-0074 rejected blocking for heuristic content as coercion; ADR-0094 rejected a `Stop` rewrite for language because the owner would see the reply twice. Here the owner explicitly asked for the lock, and the check is a format check (does the closing question name a pick), not a judgment of the content.

## Decision

1. `ad-hooks` ships `scripts/ask-gate.mjs`, a `Stop` hook, byte-identical on both hosts. A reply asks the owner when one of its last three prose lines ends in `?`, followed by nothing but marks, brackets, quote marks or emoji, after removing fenced and inline code, text in quotation marks and `>` blockquotes. Such a reply is held when it has no recommendation (`recomend…`, `recommend…`, `sugiro`, `suggest`, `minha escolha`, `my pick`, `iria de`, `eu faria`, `escolho`, `vou de`/`vou com` + an option label, `I'd`/`I'll`/`I will` + `go with`/`pick`/`choose`), or when it names labelled options (`opção A`, `option 2`, `caminho B`) without a trade-off word (`vantagem`, `trade-off`, `prós`, `contras`, `custo`, `risco` and English forms).
2. A held reply gets one continuation whose reason says: if the evidence or an earlier decision settles it, decide, act and report; ask only for a design or product call, an approval before something leaves the repository, or what grounding cannot settle, and then restate it as a decision card (evidence, each option with advantage and disadvantage, recommendation with a one-line reason); if it is a fact only the owner can supply, say so in one line and stop.
3. Loop guards: `stop_hook_active: true` always lets the turn stop; a per-session cooldown (`AD_ASK_GATE_COOLDOWN_SECONDS`, default 300) covers hosts where that flag stays false (anthropics/claude-code#54360); the host's own continuation cap is the last guard.
4. `AD_ASK_GATE=shadow` only logs; `AD_ASK_GATE=0` turns it off; malformed input or an internal error fails open. Each held reply appends `{at, state, missing}` (`blocked`, `cooldown`, `would-block`) to `<tmpdir>/agentic-ask-gate/<session_id>.jsonl`; no reply text is stored. It is opt-in through `ad-hooks` (ADR-0083 decision 6); this repository wires it for dogfood.
5. Measured hold rate, exploratory: on 2026-11-24, `scripts/replay-ask-gate.mjs` over the owner's local Claude Code transcripts found 6,417 replies followed by a typed owner message; 819 end by asking, and the gate holds 448 (440 without a recommendation, 21 with options but no trade-off). An evenly spaced sample of 40 held replies, drawn before review widened the recommendation phrasings (it then held 450), was read with the owner's next message: 19 are the target (a choice the agent could make or asked without a pick, three of them answered with an annoyed "already decided?"), 17 are approvals or owner actions before an outward step that lacked a one-line recommendation, and 4 are false holds (a factual check only the owner can answer, a request to finish a cut-off message, a request for an exact phrase, a list of the owner's pending items). The corpus also tuned the rule, so the figures are not a held-out estimate; no Codex transcript was replayed.

## Consequences

Positive:

- The rule the owner wrote is enforced at the one point every reply passes, on both hosts, with an off switch and a shadow mode.
- The evidence log gives a live hold rate per session to revisit the rule with.

Negative:

- The owner sees a held reply and then its correction; each hold costs one extra model turn.
- About one held reply in ten is a false hold (decision 5); the reason tells the model to answer those in one line.
- A recommendation word anywhere in the reply satisfies the check, even in an unrelated paragraph or when the evidence and trade-offs are thin; review still owns their quality. The check does not detect evidence, and options named without a label ("a primeira ou a segunda") never trigger the trade-off check.
- The figures come from Claude Code transcripts only; running it with `AD_ASK_GATE=shadow` on Codex first gives that host's rate.
- Only Portuguese and English phrasings are recognised.

## Alternatives Considered

- **Prose rules only.** Rejected: the complaint recurred 186 times with the rules already written.
- **Shadow only, block later.** Kept as the `AD_ASK_GATE=shadow` mode, not the default: the owner asked for a lock, and the replay already measured the rate a shadow period would produce.
- **Require evidence, options and trade-offs on every question.** Rejected by the replay: it held 813 of 1,165 questions in an earlier corpus cut, approvals and factual checks included.
- **Force questions through the host's structured question tool.** Rejected: Codex has no equivalent, and the problem is the content of the question, not its rendering.
