# Two-layer evaluation results format

The `eval/results.json` shape — end-to-end pass rate plus per-stage divergence, with a failures list keyed to the debug artifact.

```
{
  "fixture": "fixtures/golden.json",
  "end_to_end": { "total": 10, "passed": 7, "failed": 3 },
  "per_stage": { "01-preprocess": { "passed": 10, "failed": 0 }, ... },
  "failures": [{ "input": "...", "diverged_at": "02-detect", "debug_artifact": "..." }]
}
```
