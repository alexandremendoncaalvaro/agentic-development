# ADR-0086: A fine-tuned Laya fits the effect gate and triviality, not skill routing

**Status:** accepted
**Date:** 2026-09-25
**Deciders:** Alexandre Alvaro

## Context

The kit makes three quick decisions on every turn, today by the host model reading instructions: which skill a request routes to, whether a command is an outward, irreversible, or local effect (the ADR-0085 approval step), and whether a request is trivial enough to skip the workflow checkpoint. The effect decision is the one with a safety cost: an outward or irreversible command that runs without the owner's approval is the failure ADR-0085 exists to prevent, and a pattern list is the only deterministic guard the kit could add. Laya (https://github.com/NandhaKishorM/laya, 0.3.20) is a local encoder that answers typed questions in one forward pass. The owner asked whether it adds value at those points at its best, including domain fine-tuning, and the technique was uncertain enough for a staged spike: its own documentation reports that its base checkpoints score below the majority class on typed decisions without fine-tuning.

## Decision

We will treat a fine-tuned Laya as fit for two of the three decision points and not for the third, and we will make any adoption a separate decision. The spike at `spikes/0001-laya-decision-layer/` (deleted; its complete state is commit `77d40ad`) measured, on a third held-out set written by a fresh subagent instructed not to read the spike, its training data, or any model output, which reported reading only the skill frontmatter and ADR-0085 (the report is the evidence; no artifact records the author's exposure). The orchestrator had seen v1's errors on the second set before generating v2's data, which biases the second set for v2 and is why the third exists:

- **Effect gate:** a pattern list alone let 36 of 60 gated commands through; the pattern list first and the fine-tuned Laya on everything it did not match let 5 through (0.90 of commands on the right side of the gate). On the second independent set the counts were 25 and 8. Of the patterns' 36 misses on the third set, Laya caught 31, the kinds a fixed list does not name: deploys (`vercel`, `fly`, `gcloud run`, `kubectl apply`, `terraform apply`), package and image publishes (`twine`, `cargo publish`, `gem push`, `docker push`), destructive operations (`dropdb`, `docker volume rm`, `git filter-repo`), and machine configuration (`git config --global`, `launchctl`, `crontab`, `security`). It still let through an `/etc/hosts` append under `sudo`, `rustup default`, a `helm upgrade` into production, `git config core.hooksPath`, and `redis-cli FLUSHALL`; on the second set it missed `nvm alias default`, `gh gist create --public`, and an `aws s3 sync --delete` it caught on the third, so a case caught once is not a case it always catches.
- **Triviality:** 0.967 against 0.833 for a length and keyword rule; 0.95 against 0.817 on the second set.
- **Skill routing:** 0.713 against 0.989 for a batched Haiku call over the same skill summaries. Deciding only above 0.99 confidence covered 49% of the second set's requests at 0.913. Routing is already done in-context by the host at no added cost, so a classifier that loses to a small model gives no advantage worth the weight.

The fine-tuned model is `laya-multilingual` trained for four epochs on 2,024 teacher-generated items (claude-sonnet-5 from each skill's definition) with Laya's RLCD objective, ported from its notebook to a single Apple MPS device; it took 38 minutes. Zero-shot, the same model scored 0.17, 0.42, and 0.58 on the second set. A v2 with 358 more boundary and neighbouring-skill items (270 commands, 88 requests) and a fitted temperature scored slightly below v1 on all three points of the third set (triviality 0.917 against 0.967, 6 missed gates against 5, routing 0.691 against 0.713), within what sets this size can resolve; more examples of that kind did not help.

In Node 22 on CPU, through its ONNX export and `laya-ts`, the model loads in 1.4 s and answers in 28 to 36 ms at the median, with the same choice as the Python run on all 150 measured items.

## Consequences

Positive:

- The strongest candidate for a later adoption decision is the effect gate as a second layer behind the pattern list, asking for approval when either says the command is gated. The next evidence it needs is a live trial of the approval step with and without the classifier, not more offline accuracy.
- The kit has a measured answer to where a local typed-decision model helps, with the per-item evidence to re-check it at `77d40ad`.

Negative / trade-offs:

- Adoption is not decided here. It would add `onnxruntime-node` (301 MB unpacked for 1.30.0, per `npm view onnxruntime-node@1.30.0 dist.unpackedSize`) and a model of about 1.3 GB in fp32 (322M parameters, per the checkpoint table in Laya's README at 4066d5d) to a CLI with two small runtime dependencies, `laya-ts` would be vendored because it is not on npm, and training needs Python. A hook that starts a process per tool call would pay the 1.4 s load every time, so a deployment needs a long-lived local service. A runtime hook that blocks on the classifier is a new runtime gate, which ADR-0083 bounds to feedback gates, so it needs its own decision.
- Every figure comes from held-out sets of 60 to 94 items and one training run per version, so each carries a few points of uncertainty; the effect-gate gap (36 against 5) is large enough to survive it, the triviality gap less so.
- Spend: USD 7.88 of an approved USD 8 (teacher data USD 7.41, Haiku baseline USD 0.47), each call recorded with its host-reported cost.

Revisit trigger: a live trial of the approval step with and without the classifier, a Laya release whose base checkpoints score well zero-shot, or a lighter runtime than `onnxruntime-node` for the same model.

## Alternatives Considered

- A pattern list alone for the effect gate: kept as the first layer, rejected as the only one because it missed 42% to 60% of gated commands on sets its author had not seen.
- Embedding similarity with a shortlist for routing: rejected; its top 8 held the right skill for only 25% of requests, which capped any model after it.
- Zero-shot Laya: rejected on every point.
