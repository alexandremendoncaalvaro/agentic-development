# Spike-outcome ADR template

The ADR shape recorded when a spike concludes — context (what was uncertain), the decision with the end-to-end pass rate and rejected alternatives, and consequences.

```markdown
# ADR-NNNN: We will use technique X for <focus>

## Context

<why the spike was needed — what was uncertain>

## Decision

We will use technique X. The spike at `spikes/NNNN-<slug>/` (now deleted) showed:
- End-to-end pass rate: <%>
- Failures concentrated at stage <NN>, root cause <Y>
- Mitigation: <Z>

Alternatives held in reserve and rejected:
- Technique A: rejected because <reason from spike eval>
- Technique B: rejected because <reason from spike eval>

## Consequences

<follow-on work this decision unblocks; rails to maintain>
```
