## Contents

- Glossary entry shape
- CONTEXT.md layout
- First-creation shape
- CONTEXT-MAP shape

## Glossary entry shape

```markdown
### <Canonical Noun>

**Definition:** <one-sentence, project-specific, no general programming words>.

_Avoid_: <Alias 1>, <Alias 2>. <Why each is misleading>.

**Related code:** [`path/to/file.ts:42`](../path/to/file.ts:42), [`path/to/other.ts`](../path/to/other.ts).
```

## CONTEXT.md layout

```markdown
# <Project Name> — Domain Glossary

## Language

<term entries here, one per `### <Term>` heading>

## Relationships

- A **Customer** has many **Orders**.
- An **Order** belongs to one **Customer** and contains one or more **LineItems**.

## Flagged ambiguities

- "Account" vs "User" — see Issue #42; treated interchangeably in code today, separation pending [ADR-NNNN](../doc/adr/NNNN-account-user-separation.md).
```

## First-creation shape

```markdown
# <Project Name> — Domain Glossary

_Lazy artifact — only contains terms that have been resolved through grilling, spec drafting, or explicit capture. Empty entries are worse than no entry; speculation belongs elsewhere._

_Maintained by `/ad-domain`._

## Language

### <First resolved term>

...

## Relationships

(empty until the second term resolves)

## Flagged ambiguities

(empty)
```

## CONTEXT-MAP shape

```markdown
# Context Map

This repository contains multiple bounded contexts. Each has its own `CONTEXT.md`.

- **Ordering** — [`src/ordering/CONTEXT.md`](src/ordering/CONTEXT.md). Owns: Customer, Order, LineItem, Cancellation.
- **Billing** — [`src/billing/CONTEXT.md`](src/billing/CONTEXT.md). Owns: Invoice, Payment, Refund.

System-wide ADRs live at [`doc/adr/`](doc/adr/). Context-scoped ADRs live under each context (e.g., [`src/ordering/doc/adr/`](src/ordering/doc/adr/)).
```
