# PRD — <Product Name>

Status: draft
Created: <YYYY-MM-DD>
Updated: <YYYY-MM-DD>
Owner: <Name>

## Product

<One-sentence positioning. "X is a Y that does Z for W.">

## Target User

<Specific role or persona — not "developers", not "users". The primary success-bearing user.>

## Problem

<What the target user cannot do today, or does badly today. The cost of the status quo. What breaks if this product does not exist.>

## Goals

Definitional. State 3–5 measurable outcomes the product is for. Tracking of whether each is met lives in per-feature tasks, not here.

- <Measurable outcome 1>
- <Measurable outcome 2>
- <Measurable outcome 3>

## Non-goals

- <Out-of-scope item readers might assume is in scope>
- <Another non-goal>

## Success Metrics

Definitional. Product-level KPIs that count, and the measurement source for each. Whether a metric is currently met is not tracked here.

- <Metric> — <measurement source>
- <Metric> — <measurement source>

## Roadmap

Multi-feature scope tiers. No status annotations (no "shipped" / "in progress" — those belong to tasks). Each line names a feature, the user value, and the tier it sits in.

- **MVP tier** — <feature> — <user value>
- **Next tier** — <feature> — <user value>
- **Later tier** — <feature> — <user value>

## Constraints

What binds across the entire product. Skip the section if none.

- Regulatory: <e.g., HIPAA, GDPR, PCI>
- Business: <e.g., price ceiling, partner contract>
- Technical: <e.g., platform availability, legacy integration>

## Personas (optional)

Use only if the product has secondary users whose needs reshape it. Skip when one persona drives everything.

- **<Persona name>** — <one-sentence framing of how their needs differ from the primary target user>

## Open Questions

Deferred decisions. Each line becomes a future ADR, a spec-time decision, or an explicit punt with rationale. Never delete a question — append a resolution paragraph.

- <Question 1>
- <Question 2>

## Related

- **ADRs:** <none yet>
- **Specs:** <feature specs implementing parts of this PRD; filled lazily as `/ad-spec` runs reference this PRD>
- **Supersedes:** <prior PRD slug, if any>
