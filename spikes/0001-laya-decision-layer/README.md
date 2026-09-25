# Spike 0001: Laya as a fast decision layer for the kit's workflow

The kit makes three kinds of quick decisions on every turn, today by the host model reading skill descriptions and instructions: which skill a request should route to, whether a command is an outward, irreversible, or local effect (the ADR-0085 effect gate), and whether a request is trivial enough to skip the workflow checkpoint. Laya (https://github.com/NandhaKishorM/laya, 0.3.20 at 4066d5d) is a local, non-autoregressive encoder that answers typed questions (`choice`, `score`, `noul`) in one forward pass. The owner asked whether it adds value at those points, at its best, including domain fine-tuning on this machine (Apple M5 Pro, 48 GB unified memory, MPS). This spike answers that per decision point against the simplest baseline.

## Discovery

Laya's own documentation sets the frame. The base checkpoints score below the majority-class baseline on typed decisions zero-shot (0.362 and 0.352 against 0.461), and fine-tuning raises the same benchmark to 0.766 (`BENCHMARKS.md`; README "Fine-Tuning": "Treat Laya as a fast base to specialise, not as a zero-shot decision engine"). A `choice` question degrades above about 20 options because options share a 192 to 256 token head budget (README "Honest limits": Banking77, 0.425 on 77 labels); `predict_shortlist` narrows many labels by embedding before one forward pass. Node inference exists as `laya-ts` over split ONNX. No prior attempt exists in this repository (`git log --all -i --grep=laya` is empty; pickaxe hits are session checkpoint commits).

### Candidate techniques and the pick

| Decision point | Candidates | Picked |
|---|---|---|
| 1. Route a natural request to one of 46 skills or none | Laya fine-tuned over an embedding shortlist; embedding similarity alone; one Haiku call over all descriptions | Laya fine-tuned over a shortlist; the other two are the baselines |
| 2. Classify a command as outward, irreversible, or local | A deterministic pattern list; the list first and Laya on the rest; Laya alone | The hybrid; the pattern list is the baseline |
| 3. Is a request trivial | A length and keyword rule; Laya fine-tuned `noul`; Haiku | Laya fine-tuned `noul`; the rule is the baseline |

Explicit `/skill` requests are parsed deterministically and excluded from point 1.

### Selection criterion

Accuracy on held-out fixtures, which never enter training. Latency on this machine and the dependency cost (the kit ships two runtime dependencies; Laya would add ONNX) break ties and bound adoption.

### Stop criterion

If, after fine-tuning, Laya does not beat the simplest baseline on any decision point, the spike stops and the negative result is recorded in an ADR.

## Fixtures

- `fixtures/test-routing.json`: 79 requests with the expected route over 47 labels; 18 from the tracked evaluation corpus and 61 written by hand, some in Brazilian Portuguese.
- `fixtures/test-effects.json`: 68 commands labelled per ADR-0085, 19 from the corpus receipts and 49 written by hand; 7 tagged ambiguous, reported separately.
- `fixtures/test-trivial.json`: 40 requests, half trivial.

Training data is generated separately from each skill's description and body by a teacher model, so the held-out sets do not share its style. Model weights, the Python environment, and fine-tuned checkpoints live outside the repository under `~/.cache/laya-spike/`.
