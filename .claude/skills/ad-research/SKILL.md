---
name: ad-research
description: Research-to-conclusion methodology (WORKFLOW §17 + §4-5) — turn an open question ("should we adopt X?", "is approach A better than B?", "what is the state of the art on Y?") into an evidence-graded study at doc/research/NNNN-<slug>.md whose output is a defensible conclusion, not code. Runs the Evidence-Based loop (Ask, Acquire, Appraise, Apply, Assess) plus the scientific method (falsifiable hypothesis, experiment) when the question is measurable; reuses ad-ground's four-source pass for Acquire, grades each claim's evidence strength and the confidence to proceed (WORKFLOW §17), and graduates a binding conclusion into an ADR. Triggers on "research", "study", "investigate", "reach a conclusion", "should we adopt", "A vs B", "state of the art", "evaluate options", "literature review", "evidence for", "/ad-research". Distinct from ad-ground (finds the happy path to implement a decided change, writes no artifact) and ad-spike (validates one uncertain technique); routes to ad-spike when evidence is insufficient and to ad-adr when the conclusion binds.
summary: Research-to-conclusion — turn an open question into an evidence-graded study at doc/research/NNNN-<slug>.md via the Evidence-Based loop + WORKFLOW §17 grading + the scientific method when measurable. Reuses ad-ground for Acquire; graduates a binding conclusion to an ADR. WORKFLOW §17 + §4-5.
allowed-tools: Read, Write, Glob, Grep, Bash, WebFetch, WebSearch
---

# /ad-research

Turns an open question into an evidence-graded conclusion — a study, not code. Implements the Evidence-Based loop (Ask → Acquire → Appraise → Apply → Assess) and the `WORKFLOW.md` §17 grade-of-evidence, adding the scientific method when the question is measurable. Acquire reuses `ad-ground`'s four-source pass; this skill does not duplicate research mechanics. Output is a persistent study at `doc/research/NNNN-<slug>.md`, conclusion-first.

Use it for an open question whose answer is knowledge — "should we adopt X?", "is A better than B?", "what is the state of the art on Y?". Not for finding a path to implement an already-decided change (that is `/ad-ground`), and not for validating one uncertain technique (that is `/ad-spike`).

## Step 1 — Frame the question (Ask) and determine NNNN

Turn the ask into an answerable question: the context, the candidate options, the criterion that decides between them, and the outcome that matters. State it in one sentence. If the ask is fuzzy or under-specified, route to `/ad-grill-me` first — a diluted question produces a diluted study.

Name **stakes times irreversibility** for this question. This sets the §17 Axis-2 bar: how strong the evidence must be before the conclusion can read "proceed".

List `doc/research/`; `NNNN` is the next 4-digit number after the highest existing. If the directory does not exist, create it and start at `0001`. Slug: kebab-case, ≤6 words, from the question.

## Step 2 — Hypothesis (when measurable)

When the question can be settled by measurement, state a **falsifiable hypothesis** and the prediction that would confirm or refute it. When it cannot (a survey or state-of-the-art question), say so explicitly and skip — do not manufacture a hypothesis where there is nothing to measure.

## Step 3 — Acquire (four-source pass)

Run the four-source research pass — official docs, validated implementation references, in-repo patterns, git history — per `/ad-ground` (`WORKFLOW.md` §4-5). Do not re-implement its mechanics; follow its Source A / B / C / D contract and cite as it does. When a load-bearing claim can only be settled by measurement (evidence level E1 in §17), run an experiment or a staged spike (`/ad-spike`, `WORKFLOW.md` §14) and bring the result back as evidence.

## Step 4 — Appraise (grade the evidence, §17)

Grade each load-bearing claim per `WORKFLOW.md` §17 Axis 1: seal it **High / Medium / Low / Very-low**, each with its provenance — citation, date, access method. A claim you cannot source cannot be sealed High. Where sources genuinely disagree, record the positions **side by side** — position A, position B, the evidence for each, and the conditions under which each holds — never a manufactured consensus.

## Step 5 — Conclude (Apply, §17 Axis 2)

State the conclusion and its confidence per `WORKFLOW.md` §17 Axis 2: **Strong** (the answer holds — proceed), **Conditional** (holds with a named mitigation), or **Insufficient / spike-first** (the evidence does not yet support a conclusion; the gap is retirable by experiment — route to `/ad-spike`). The bar for Strong scales with the stakes times irreversibility named in Step 1.

## Step 6 — Write the study

Write `doc/research/NNNN-<slug>.md` using the template below — conclusion first, evidence graded, sources dated. Status `draft`. Stop after writing; do not self-flip to `concluded` (that needs user review).

## Step 7 — Graduate (when the conclusion binds)

After the study is reviewed, if its conclusion is a binding decision, graduate it: open an ADR (`/ad-adr`) that references this study by path — the study holds the evidence, the ADR records the decision. If the conclusion feeds a pre-construction build, hand to `/ad-derisk` (Front B) rather than building blind.

## Interview UX

When the host exposes `AskUserQuestion`, use it for the framing choices (scope, stakes level, the candidate options being compared) and for the concluding verdict selector (`concluded` / `needs a spike` / `more research`) — instead of dropping them as plain text. Inline numbered questions are the fallback on hosts without the primitive (Codex).

## Template — `doc/research/NNNN-<slug>.md`

````markdown
# RESEARCH-NNNN: <the question, as a short title>

**Status:** draft
**Created:** <YYYY-MM-DD>
**Question:** <the answerable question>
**Stakes:** <low | medium | high> times <reversible | irreversible>
**Confidence:** <Strong | Conditional | Insufficient>

## Conclusion and confidence

<The answer, first. The §17 Axis-2 verdict and, if Conditional, the named mitigation. One short paragraph a decision-maker can act on without reading the rest.>

## Question and scope

<The open question made answerable: context, candidate options, the deciding criterion, the outcome that matters. Stakes times irreversibility — this is the evidence bar.>

## Hypothesis

<A falsifiable hypothesis and the prediction that confirms or refutes it. Or: "not applicable — this is a survey question", stated explicitly.>

## Method

<How the evidence was gathered (the four sources), what was experimented or measured, and how claims were graded (§17). This is what makes the study reproducible.>

## Evidence

<Each load-bearing claim, sealed High / Medium / Low / Very-low (§17 Axis 1), with its provenance. Where sources disagree, a contested block: position A, position B, the evidence for each, and when each holds.>

## Limitations and what would reverse the conclusion

<What was not covered, and the specific future evidence that would change the verdict.>

## Provenance and artifacts

<Sources with dates and access method; links to any spike, fixtures, or measurements.>

## Derived decision

<Link to the ADR this study grounds, if the conclusion is binding. Or: "none yet".>
````

## Output contract

A single new file at `doc/research/<NNNN>-<slug>.md`, status `draft`. Conclusion first. Every load-bearing claim graded and sourced; genuine disagreement shown side by side, never collapsed. No invented values, no code. Documentation Discipline (`WORKFLOW.md` §2) applies — no emoji, business-context-first, definitions and decisions only — with one exemption: the study carries dates on its `Status` / `Created` fields and on every source in provenance, because dated evidence is the reproducibility primitive. No existing files are modified.

## Next

- `/ad-adr` if the conclusion is a binding architectural decision — the ADR references this study by path.
- `/ad-derisk` if the conclusion feeds a pre-construction build — the study hands to Front B, which de-risks the build before implementation.
- `/ad-spike` if the conclusion is Insufficient / spike-first — run the experiment that settles the open claim.
- `/ad-ground` if the question turns out to be "how do I implement this?" rather than "what is true / what should I choose?".
- Flip `Status` to `concluded` after review; supersede with a new study when later evidence overturns it.
