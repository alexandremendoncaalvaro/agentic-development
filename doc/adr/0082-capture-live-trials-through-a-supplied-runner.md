# ADR-0082: Capture live trials through a supplied runner

**Status:** accepted
**Date:** 2026-09-21
**Deciders:** Alexandre Alvaro

## Context

Spec 0007 R7 requires a live lane that "accepts an explicitly supplied runner
through a stable adapter boundary, captures structured host events and final
outcomes, and never discovers, reads, stores, or publishes the runner's
credentials". Task 0048 built everything on the reading side of that boundary:
the host adapters normalize a Claude Code `stream-json` or Codex `--json`
stream into a trial of the receipt contract, and `eval/lib/validate.mjs`
already accepts `origin: "live"` receipts and enforces their frozen skill
identity. Both adapter modules say so in their own headers — "Nothing is
spawned here."

What is missing is the producing side. No code in `eval/` spawns a process, so
every receipt in the corpus is synthetic and every sample stream is authored
from the hosts' documented record shapes rather than captured. GROUND-0025
records that as a deliberate deviation from the word "captured" in ADR-0080
item 5, and leaves two mappings at Conditional confidence pending the first
authorized live run: whether an implicit Codex skill activation is really
observable as a `command_execution` that reads a `SKILL.md`, and whether the
hosts' `declined` and `permission_denied` records appear where the
grant-from-policy rule expects them.

The owner has authorized the pilot. The pilot cannot run until the lane exists,
and the lane's shape is not fully determined by the spec: how the runner is
supplied, how the environment is frozen, what happens to a captured stream, and
how trials are isolated are all decisions this record makes before any code is
written.

## Decision

1. **The runner is supplied, never discovered.** `node eval/run.mjs live` takes
   the exact command to execute. The harness does not search `PATH` for a host
   binary, does not read a configuration file to find one, and refuses to run
   without an explicit `--runner`. The operator's shell is where the host
   credentials already live; the harness inherits that environment to spawn the
   process and never reads, copies, or writes any part of it.

2. **Host identity is measured, not asserted.** Before the first trial the
   harness runs the supplied runner's version probe and freezes what the binary
   prints. A frozen input an author types is a claim; one read from the running
   binary is a measurement, which is the standard the evidence discipline
   applies to any load-bearing environment fact.

3. **A captured stream is written beside its receipt and is the receipt's
   evidence.** The receipt carries the normalized trial; the stream carries what
   the host actually emitted. Keeping both is what makes a live claim auditable
   after the host changes, and it is what lets a future adapter correction be
   re-run against the original bytes rather than re-measured against a moved
   target.

4. **A capture is private until a person clears it.** The harness writes streams
   and receipts outside the repository, under the OS temporary directory, and
   never into the working tree unless the operator passes an explicit
   destination. The denylist check still runs and still aborts on a match, but
   it is a second line, not the first: this repository ships no
   `.agentic/leak-denylist.txt` — the file is gitignored and machine-local — so
   a gate that depended on it would pass everything by default.

   The first pilot is what settled this. A live host in a non-bare context
   reports the operator's whole configuration, and the captured stream carried
   twenty-four references to an unrelated employer's internal agent names and
   five absolute paths inside the operator's home directory. None of it was
   secret in the denylist sense, and all of it belongs to the operator rather
   than to this repository. Defaulting a capture to private is the only
   arrangement where forgetting is safe.

5. **One process per trial, over a fresh copy of the fixture.** Each trial
   spawns its own process against its own copy, so a write made by trial N
   cannot be read by trial N+1. Repeated trials exist to measure variance in
   the model's behavior; sharing state would make them measure accumulation
   instead.

6. **A failing host is data, not a harness error.** A non-zero exit, a refused
   action, or a stream that ends without a terminal produces a trial with a
   `failure` exit state and its reason, and the receipt is still written. The
   harness only aborts on its own defects: a missing runner, a malformed
   invocation, an unparseable line, or a leak.

## Consequences

Positive:

- The credential boundary is structural rather than procedural: there is no
  code path that could read a credential, because there is no discovery step.
- A live receipt's environment claims are reproducible, because the version
  they name was read from the binary that produced the trial.
- The existing replay lane, corpus gate, graders, and staleness rules apply to a
  live receipt unchanged; this decision adds a producer, not a second pipeline.

Negative / trade-offs:

- The operator must know and type the host invocation. That is the cost of
  refusing discovery, and it is deliberate: a harness that can find a binary can
  find the wrong one, and a harness that reads configuration to find it is one
  edit away from reading the credential beside it.
- A capture that stays outside the repository is evidence a reviewer cannot
  open from the diff. The receipt names the capture and its digest, so the claim
  stays checkable by whoever holds the machine, and promoting a capture into the
  tree remains a deliberate act with a person's eyes on it first.
- Copying the fixture per trial costs time linear in trial count.

## Alternatives Considered

* **Discover the host binary on `PATH`.** Rejected: it converts an explicit
  operator action into an implicit one and puts the harness one step from the
  credentials the spec forbids it to touch.
* **Store only the normalized trial and discard the stream.** Rejected: the
  normalization is exactly what the pilot is measuring, so discarding the input
  would leave no way to re-check a mapping the pilot found wrong.
* **Run every trial in one process.** Rejected: it makes repeated trials measure
  accumulated state rather than variance.
* **Write a second secret-scanning policy for streams.** Rejected: the
  repository already has one denylist with one owner; a second would drift.
* **Write captures into the tree and rely on the denylist.** Rejected by the
  first pilot's evidence: the denylist file does not exist in a fresh clone, and
  what a live capture actually carries is the operator's configuration rather
  than the credential shapes a denylist enumerates.
