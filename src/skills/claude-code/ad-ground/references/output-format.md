A single message structured as:

```
## Focus
<one sentence>

## Source A — official documentation
- <lang/lib>: <URL@version> — <one-line summary>

## Source B — validated implementation references
- <repo>:<path>:<line-range> — <one-line summary>   # repo form
  ```
  <quoted code block>
  ```
- <URL> — <one-line summary>                         # Stack Overflow / forum / blog / gist
  ```
  <quoted code block>
  ```

## Source C — in-repo examples
- <file>:<line> — <one-line summary>
- (or: "no analog found in the codebase")

## Source D — git history
- <commit-sha> <touching-path> — <one-line summary>
- (or: "no prior attempt found")

## Happy path
<one paragraph synthesizing A + B + C + D, with citations>
<full mode: seal each load-bearing claim High / Medium / Low / Very-low with provenance, per WORKFLOW §17; record disagreements as side-by-side positions, not a forced consensus>

## Proposed implementation vs happy path
- aligned: <what stays canonical>
- deviates: <list of deviations>
  - <deviation>: <irrefutable justification>

## Confidence checkpoint
- A consulted: yes / no — <gap if no>
- B consulted: yes / no — <gap if no>
- C consulted: yes / no — <gap if no>
- D checked: yes / no — <gap if no>
- happy path declared: yes
- deviations justified: yes / no / n.a.
- evidence grade (full mode): <Strong | Conditional: mitigation | Insufficient: spike-first> — <one-line basis, per WORKFLOW §17>
```
