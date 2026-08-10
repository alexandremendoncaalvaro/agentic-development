# Spike directory layout

The staged pipeline structure — discovery README, golden fixtures, one pipeline file per stage, per-stage debug artifacts, and eval results.

```
spikes/NNNN-<slug>/
├── README.md          # spike framing (Step 1 output)
├── fixtures/          # golden inputs + expected outputs
│   └── golden.json
├── pipeline/          # one file per stage
│   ├── 01-preprocess.<ext>
│   ├── 02-detect.<ext>
│   └── 03-postprocess.<ext>
├── debug/             # per-stage debug artifacts
│   ├── 01-preprocess/
│   ├── 02-detect/
│   └── 03-postprocess/
└── eval/              # evaluation results (Step 4)
```
