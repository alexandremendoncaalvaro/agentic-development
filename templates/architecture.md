# Architecture

System-level patterns and boundaries. Pair with ADRs in `doc/adr/` for individual decisions.

## Overview

`<one paragraph: what the system does, key external dependencies, deployment shape>`

## Layers & Boundaries

`<the layered/hexagonal/clean structure: what lives in each layer, what crosses boundaries, what doesn't>`

## Patterns

* **Data access:** `<e.g., Repository pattern; raw SQL only inside `internal/db/`>`
* **HTTP handlers:** `<e.g., all go through middleware in `src/middleware/`>`
* **Async/messaging:** `<e.g., Kafka topics owned by their producer service>`
* **Error handling:** `<e.g., domain errors in `errors/`; HTTP mapping at handler edge>`
* **Validation:** `<e.g., Pydantic at boundary, never inside core>`

## Naming Conventions

`<module/file/class naming rules that aren't obvious from language defaults>`

## Observability

* Logs: `<format, level conventions, where they ship>`
* Metrics: `<library, dashboards>`
* Traces: `<provider, sampling strategy>`

## Deployment Topology

`<how services run in prod: containers, orchestration, scaling rules>`
