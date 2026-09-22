# AGENTS.md

## Project Overview

A sample command-line installer. Plain JavaScript, no build step.

## Repository Layout

```
src/download.js              fetches the install archive
doc/research/NNNN-<slug>.md  evidence records: implementation-path receipts and question studies
doc/tasks/NNNN-<slug>.md     one file per planned change, with a completion checklist
```

## Conventions

- Before implementing a non-trivial change, record the research that grounds
  its implementation path under `doc/research/` as `NNNN-ground-<slug>.md`,
  titled `# GROUND-NNNN: <decision>`, with every claim mapped to a cited,
  dated source.
- An open question that needs a conclusion rather than an implementation path
  gets an evidence-graded study under `doc/research/` as `NNNN-<slug>.md`,
  titled `# RESEARCH-NNNN: <question>`.
- Record every planned change under `doc/tasks/` before implementing it.
- Keep documentation definitions-and-decisions only.
