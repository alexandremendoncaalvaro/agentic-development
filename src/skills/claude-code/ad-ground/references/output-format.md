A single message structured as:

```
## Evidence record
- Path: `doc/research/<NNNN>-ground-<slug>.md`
- Validation: `valid: true`; `unreadable: []`
- Decision ref: `<task | spec | ADR | durable project artifact>`

## Decision
<one-paragraph happy path synthesized from A + B + C + D; name every deviation and its justification>

## Confidence
- Coverage: A / B / C / D consulted
- Axis 2: <Strong | Conditional: mitigation | Insufficient: spike-first>
- Limitation: <what the receipt cannot establish and what would reverse it>

## Next
<implement, pause for research, or run a spike — link the record from the governing artifact>
```
