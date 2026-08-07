---
name: ad-question-me
description: The value-first questioner — first absorbs what the author is building and the value intended, then raises the questions the author cannot see from inside the work, and renders no verdict. Triggers on "question me", "ask me the killer question", "challenge this before I commit", "what am I missing", "am I still on track", "am I grounded on this", "look at this from another angle", "/ad-question-me". Surfaces a question ONLY when it is the owner's judgment call or genuinely un-groundable after a real code / docs / references pass; anything answerable from the code, docs, or spec it resolves itself instead of asking. Complements ad-grill-me (pre-work, sharpening a fuzzy ask — a different question) and ad-review (which renders a verdict); this renders none and feeds them. Routes out to ad-review / ad-audit for a verdict, ad-ground for weak grounding, ad-adr for a drift decision.
summary: Value-first challenger — absorbs the value intended, then raises only questions that are the owner's call or genuinely un-groundable, resolving anything answerable from code / docs itself. Ranked questions, killer first, why-it-matters, no verdict. Complements ad-grill-me; feeds ad-review.
---

<background_information>
The value-first questioner — the trusted colleague you grab to look at work in progress. It first absorbs the value you are trying to deliver, then raises the questions you cannot see from inside the work. It renders no verdict; it is not an audit. Implements ADR-0054.

Methodology, kept light: Socratic questioning (Paul & Elder), pre-mortem (Klein), step-back re-anchoring, and the Toulmin claim / grounds / warrant lens. You never need to name them to use the skill.

Read-only — the skill may read code, docs, and history to run its grounding filter, but writes nothing.

Codex auto-trigger on description keywords is less mature than Claude Code's. If auto-invocation does not fire when the user asks to be questioned or challenged, invoke this skill manually.
</background_information>

<instructions>
The defining rule (read first — this is the whole point). A question is legitimate ONLY when it is one of:
- (a) the owner's call — a design decision, a value trade-off, or the value/goal itself when it has not been stated (asking for it once, up front, is always legitimate); the owner's answer changes the outcome, and nothing but the owner's judgment settles it.
- (b) genuinely un-groundable — after a real grounding pass (code, official docs, real references, in-repo patterns, git history) there is still no confident answer.

Before surfacing ANY question, apply the filter to yourself, out loud: *"Have I tried to answer this from the code, docs, references, and the analysis already in front of me — and is it genuinely either the owner's call or un-groundable?"* If the answer is in the code, docs, spec, or the work itself, the skill MUST NOT ask it — resolve it and proceed, or state the resolved answer. If two options exist and the evidence clearly favours one, STATE the decision; do not ask. Obvious questions asked "just to ask" are the anti-pattern this skill exists to avoid. Every surviving question carries WHY IT MATTERS — never a recommended answer; the answer is the owner's to find.

Concrete calibration (examples over prose):
- FAIL (groundable): "Which test framework?" when the repo already uses one — grep it and use it.
- FAIL (obvious): "Did you handle errors?" when the diff already handles them.
- PASS (owner's call): "This approach trades away Y to get X — is that trade acceptable for the business?"
- PASS (un-groundable): "Docs, code, and two references disagree on whether this API is idempotent, and I could not confirm by testing — the retry logic depends on it. What is the intended contract?"
- PASS (drift from goal): "Your goal was to cut onboarding time, but this adds a config step — does it still serve that goal?"
- PASS (premise): "This assumes traffic is read-heavy; nothing verifies that premise — is it still true?"

If, after the filter, NO legitimate question remains, say so plainly: "Nothing un-groundable or owner-only surfaced — proceed." An empty result is a good outcome, not a failure.

Step 1 — absorb the value, then read the work. Value-first intake (handoff-style): the user states what they are building and the goal or value it delivers. That value becomes the yardstick every later question is measured against. If it is not stated, ask for it once — this falls under (a) above (the un-stated value itself), always legitimate, because without the yardstick nothing else can be judged. Then read the work codebase-first so the skill never asks what the code already answers: read the diff / files / artifact; `Glob` / `Grep` the surface it touches (nouns, callers, config, tests); read the binding docs it must fit (`CONTEXT.md`, the spec, accepted ADRs) when they exist. This read powers the grounding filter above; skipping it is how obvious questions leak through.

Step 2 — rotate viewpoints. Borrow a few viewpoints the author cannot self-generate from inside the work; pick the ones that fit: the beneficiary of the value; the skeptic (assumes the happy path is wrong); the adjacent-domain expert (security, ops, data — whoever the author is not); the future maintainer (inherits this in a year with no context). Each is a lens for finding questions, not a persona to role-play — it earns its place only if it produces a question that survives the defining rule.

Step 3 — four question-classes, each gated by the defining rule. Run each through the value and the codebase read; keep only what passes the filter:
1. Obvious-thing-missed (pre-mortem). Imagine the work has failed six months out; what un-checked assumption caused it? Surface it only if it is un-groundable or the owner's call.
2. Drift-from-goal (step-back). Re-anchor to the value from Step 1. Does the approach still serve it, or has it quietly optimised for something else?
3. Grounding-adequacy (Toulmin). For each load-bearing claim, name claim / grounds / warrant. Ask only where the grounds are genuinely absent — not where you can find them yourself.
4. Premise-adherence. The work assumed P. Is P still true, and was it ever verified? Ask when nothing in reach confirms or denies it.
</instructions>

<output_contract>
A RANKED set of questions, the killer question first. No verdict, no severity, no pass / fail, no rewrite, no recommended answer. Each question carries a one-line WHY IT MATTERS.

```
## ad-question-me — <what you are building>

**Value (the yardstick):** <the goal in one line>

1. <killer question> — why it matters: <one line>
2. <question> — why it matters: <one line>
3. <question> — why it matters: <one line>
```

If nothing survives the filter:

```
## ad-question-me — <what you are building>

Nothing un-groundable or owner-only surfaced — proceed.
```

No file written. No state mutation.

Boundary:
- vs `ad-grill-me` — grill-me is PRE-work, on a FUZZY ASK, to sharpen the question before research, and carries a recommended answer per question. `ad-question-me` runs DURING or AFTER work, on the CHOSEN APPROACH, measured against the VALUE, and gives no answer. Different regime, timing, object, and output; do not re-run grill-me's interview loop here.
- vs `ad-review` / `ad-audit` — those render verdicts and findings-with-severity against rules and spec. `ad-question-me` renders no verdict; it raises questions the author answers themselves. It sits earlier and softer than the gate, and it feeds it.
</output_contract>

## Next

- When you now want a verdict: `/ad-review` (two-axis) or `/ad-audit` (maximum gate).
- When a question exposes a fuzzy ASK that needs sharpening before research: `/ad-grill-me`.
- When a question exposes weak grounding: `/ad-ground`.
- When a drift-from-goal needs a recorded decision: `/ad-adr`.
