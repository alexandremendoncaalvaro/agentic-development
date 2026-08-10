# Spike directory layout

The staged pipeline structure — discovery README, golden fixtures, one pipeline file per stage, per-stage debug artifacts, and eval results.

```
spikes/NNNN-<slug>/
├── README.md          # spike framing (Step 1 output)
├── fixtures/          # golden inputs + expected outputs
├── pipeline/          # one file per stage (01-preprocess, 02-detect, etc)
├── debug/             # per-stage debug artifacts (image / JSON / log row)
└── eval/              # evaluation results (Step 4)
```
