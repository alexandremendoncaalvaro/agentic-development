# Two-layer evaluation results format

The `eval/results.json` shape — end-to-end pass rate plus per-stage divergence, with a failures list keyed to the debug artifact that shows where and why each input diverged.

```json
{
  "fixture": "fixtures/golden.json",
  "pipeline_version": "<commit-sha or timestamp>",
  "end_to_end": {
    "total": 10,
    "passed": 7,
    "failed": 3
  },
  "per_stage": {
    "01-preprocess": { "passed": 10, "failed": 0 },
    "02-detect": { "passed": 8, "failed": 2 },
    "03-postprocess": { "passed": 7, "failed": 1 }
  },
  "failures": [
    {
      "input": "inputs/hard-02.jpg",
      "diverged_at": "02-detect",
      "expected": [...],
      "actual": [...],
      "debug_artifact": "debug/02-detect/hard-02.png"
    }
  ]
}
```
