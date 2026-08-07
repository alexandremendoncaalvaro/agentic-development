# ADR-0054: `ad-question-me` — value-first questioner that renders no verdict

**Status:** accepted
**Date:** 2026-08-07
**Deciders:** Alexandre Alvaro

## Context

There is a recurring move the kit has no skill for: you grab a trusted colleague, tell them what you are building and why, and ask them to poke holes — not to grade the work, just to raise the questions you cannot see because you are inside the work. The value is the questions themselves, surfaced from viewpoints the author cannot self-generate; a verdict is explicitly not wanted.

Nothing in the kit fills this. `ad-grill-me` interviews *before* research to sharpen a *fuzzy ask*, one question at a time, each with a recommended answer, then routes out once the question is sharp. `ad-review` and `ad-audit` sit at the *gate*: they render verdicts and findings-with-severity against rules and spec. The missing skill sits between them — *during or after* the work, on the *chosen approach*, measured against the *value*, raising questions the author answers themselves.

The overlap with `ad-grill-me` is real and must be confronted head-on: both are question-driven, both are read-only, both are conversational. Left unaddressed, the natural reflex is "make it a mode of ad-grill-me". But the two differ on every axis that matters — regime, timing, object, and output — and fusing them would blur the one-question clarity that makes each usable.

There is also a sharp anti-pattern to design against. The owner is emphatic that questions asked "just to ask" — obvious things the code, docs, or spec already answer — are noise, and that `ad-grill-me` sometimes commits exactly this. A questioner skill that repeats that mistake is worse than no skill: it trains the user to ignore it.

Established methodology backs the shape: Socratic questioning (Paul & Elder), the pre-mortem (Klein), step-back re-anchoring, and the Toulmin claim / grounds / warrant lens. These inform the four question-classes but stay light in the skill body.

Kit convention (ADR-0007 §6 skill-surface scrutiny; PRD Constraints) is that no skill ships without an accepted ADR — so this record must justify both the skill and the boundary before it lands.

## Decision

We will ship `ad-question-me` as a read-only, workflow-operational skill: a value-first challenger that first absorbs what the author is building and the value intended, then raises the questions the author cannot see from inside the work, and renders no verdict.

Its contract:

1. **The defining rule (the core decision).** A question is legitimate ONLY when it is either (a) a design decision / value trade-off that depends exclusively on the owner's judgment, or (b) genuinely un-groundable after a real grounding pass (code, official docs, real references, in-repo patterns, git history). Anything answerable from the code, docs, spec, or the analysis already in front of the skill MUST be resolved and stated, never asked. Where two options exist and the evidence clearly favours one, the skill states the decision. Obvious "just to ask" questions are the explicit anti-pattern this skill exists to avoid, and the rule is front-loaded as the first MUST with concrete PASS/FAIL examples.
2. **Value-first, codebase-first.** The user states the value; that becomes the yardstick. The skill then reads the work as-is so it never asks what the code already answers — the read is what powers the grounding filter.
3. **Rotate viewpoints, run four question-classes.** Borrow a few deliberately different lenses (beneficiary, skeptic, adjacent-domain expert, future maintainer); generate candidates across four classes — obvious-thing-missed (pre-mortem), drift-from-goal (step-back), grounding-adequacy (Toulmin), premise-adherence — each gated by the defining rule.
4. **Output = ranked questions, killer first.** No verdict, no severity, no rewrite, and no recommended answer (the answer is the author's to find — the deliberate difference from `ad-grill-me`). Each carries a one-line WHY IT MATTERS. If nothing survives the filter, the skill says so plainly; an empty result is a valid, good outcome.
5. **Read-only.** `allowed-tools` omits Write; the skill reads code and docs to run the filter but writes no file and mutates no state.
6. **Route out, render no verdict.** To `ad-review` / `ad-audit` when the user now wants a verdict; to `ad-grill-me` when a fuzzy ASK is exposed; to `ad-ground` when grounding is weak; to `ad-adr` when a drift needs a recorded decision.

Profile-scoped to `solo`, `team`, and `mature` (added to each `universal` set). Excluded from `poc`, which is deliberately low-ceremony and throwaway. Dual-host (Claude Code + Codex), output words-only per the emoji ban (ADR-0008).

## Consequences

Positive:

- Fills a real gap — the mid-work "what am I missing that I cannot see?" moment — with a skill whose whole discipline is to surface only questions worth the owner's attention.
- The anti-obvious-question rule, encoded as the first MUST with PASS/FAIL examples, directly targets the failure mode the owner dislikes in `ad-grill-me`; it makes an empty result a success, which removes the pressure to manufacture noise.
- The `ad-question-me` / `ad-grill-me` / `ad-review` split keeps each skill to one regime, one object, and one output shape, which is what makes each scannable and routable.

Negative / trade-offs:

- One more skill on the surface, and one adjacent to `ad-grill-me`. The ADR-0007 §6 scrutiny is met by this record and task-0039, and the boundary is stated in both skill bodies and here.
- The grounding filter is only as good as the read behind it: a shallow codebase read can let a groundable question slip through as if un-groundable. This is mitigated by making the read a required step and by the filter's explicit self-check, but it is a discipline dependency, not a mechanical guarantee.
- The skill deliberately gives no answers, which can feel less immediately actionable than `ad-grill-me`'s recommend-an-answer style. That is the point — the answer is the owner's — but it is a change of expectation for users arriving from grill-me.

## Alternatives Considered

* **Make it a mode of `ad-grill-me`** — rejected. The two differ on regime (pre-work fuzzy-ask sharpening vs during/after-work challenge), timing, object (the question vs the chosen approach), and output (recommended answers vs answer-less ranked questions). A mode flag would fuse two disciplines into one skill and erode the one-question clarity that is each skill's value; it would also drag grill-me's recommend-an-answer habit into a skill whose whole point is to *withhold* the answer.
* **Make it a third axis of `ad-review`** — rejected. `ad-review` renders verdicts and findings-with-severity against rules and spec; `ad-question-me` renders no verdict and raises questions the author answers themselves. A "questions" axis inside a verdict skill would collide two output contracts (finding vs question) and two postures (gate vs pre-gate), and would move the skill later and harder than it is meant to sit. `ad-question-me` feeds the gate; it is not part of it.
* **Fold it into `ad-ground`** — rejected. `ad-ground` researches a happy path before implementation; `ad-question-me` challenges an approach that already exists against the value. Routing to `ad-ground` when grounding is weak is the correct seam, not absorption.
* **Do nothing (leave it to ad-hoc prompting)** — rejected. Without the defining-rule filter, ad-hoc "what am I missing?" prompts reliably produce the obvious-question noise the owner objects to; the value is precisely the disciplined filter, which needs a skill to carry it.
