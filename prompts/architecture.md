# Bootstrap ARCHITECTURE.md

Pairs with ADRs in `doc/adr/`. Architecture is the binding pattern; ADRs are individual decisions with status.

## Paste to your agent

> Read [`templates/architecture.md`](../templates/architecture.md). Your job: produce `ARCHITECTURE.md` at the repo root.
>
> **Step 1 — Scan the code.** Read top-level dirs, the main entry points (servers, CLI, jobs), boundary code (handlers, repos, gateways, middleware), config and env loading, observability hooks, deploy config (`Dockerfile`, `compose.yml`, `k8s/`, `terraform/`, GitHub Actions). Existing ADRs in `doc/adr/` are binding — read them all.
>
> **Step 2 — Pre-fill.** For each placeholder, fill from what the code actually does: layers and boundaries, data access pattern, HTTP middleware chain, async/messaging, error and validation patterns, naming, logging/metrics/tracing, deployment topology. No fabrication.
>
> **Step 3 — Show me only the gaps.** Print:
> - (a) placeholders without a code signal;
> - (b) places where the code shows two competing patterns (e.g. some handlers go through middleware, some don't).
>
> One question per gap.
>
> **Step 4 — On my confirmation, write the file.** Cut every line that does not lock a binding pattern. At the end, list any decision that should become an ADR — flag, do not write the ADR yet.
>
> If something I say contradicts what the code shows, surface the conflict. Don't silently trust me; don't silently trust the code.
