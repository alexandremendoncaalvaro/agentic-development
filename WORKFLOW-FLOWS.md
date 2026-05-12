# Workflow Flows

`WORKFLOW.md` is the canonical prose contract. This file is its visual companion: it makes the repeated agent-development flows inspectable without turning the constitution into a diagram catalog. If a diagram here conflicts with `WORKFLOW.md`, `WORKFLOW.md` wins.

## Reading Rule

Each diagram is derivative. The source line beneath it names the `WORKFLOW.md` section that owns the rule; update the prose first, then update the diagram.

## Artifact Stack

```mermaid
flowchart TD
    Workflow["WORKFLOW.md<br>Universal philosophy"]
    Agents["AGENTS.md<br>Session rules"]
    Guidelines["GUIDELINES.md<br>Full engineering reference"]
    Context["CONTEXT.md<br>Ubiquitous language"]
    Product["doc/product/PRD.md<br>Product scope"]
    Spec["doc/specs/NNNN-slug.md<br>Feature contract"]
    Architecture["ARCHITECTURE.md<br>System patterns"]
    Adr["doc/adr/NNNN-slug.md<br>Binding decisions"]
    Task["doc/tasks/NNNN-slug.md<br>Implementation tracking"]
    Code["Code<br>Behavior"]

    subgraph Constitution["Layer 1: Constitution"]
        Workflow
        Agents
        Guidelines
    end

    Context --> Product
    Product --> Spec
    Spec --> Architecture
    Spec --> Adr
    Spec --> Task
    Architecture --> Code
    Adr --> Code
    Task --> Code
    Constitution --> Context
```

Source: `WORKFLOW.md` section 1, "Six-layer artifact stack".

## Non-Trivial Change

```mermaid
sequenceDiagram
    autonumber
    actor Human
    participant Agent
    participant Philosophy as ad-philosophy
    participant Ground as ad-ground
    participant Task as ad-task or plan
    participant Tests as Tests and gates
    participant Review as ad-review
    participant Git as ad-commit or ad-pr

    Human->>Agent: Request non-trivial change
    Agent->>Philosophy: Load standing discipline
    Philosophy-->>Agent: Think, simplify, verify, document carefully
    Agent->>Ground: Research before implementation
    Ground-->>Agent: Happy path and deviation gate
    Agent->>Task: Create or update plan when scope needs tracking
    Agent->>Agent: Implement one vertical slice
    Agent->>Tests: Run relevant verification
    alt verification fails
        Tests-->>Agent: Failure signal
        Agent->>Agent: Fix and re-run
    else verification passes
        Tests-->>Agent: Green signal
        Agent->>Review: Fresh-context review
        Review-->>Agent: Findings
        Agent->>Git: Commit or open PR
    end
```

Source: `WORKFLOW.md` sections 4-6 and 10-12.

## Research Before Implementation

```mermaid
flowchart TD
    Scope["Smallest verifiable research scope"]
    Official["Official documentation"]
    References["Validated implementation references"]
    InRepo["In-repo analogs"]
    History["Git history"]
    Happy["Happy path synthesis"]
    Decision{"Implementation follows happy path?"}
    Implement["Proceed to implementation plan"]
    Justify["Write irrefutable deviation justification"]
    Loop["Research harder or narrow scope"]

    Scope --> Official
    Scope --> References
    Scope --> InRepo
    Scope --> History
    Official --> Happy
    References --> Happy
    InRepo --> Happy
    History --> Happy
    Happy --> Decision
    Decision -->|yes| Implement
    Decision -->|no, justified| Justify
    Justify --> Implement
    Decision -->|no, unjustified| Loop
    Loop --> Scope
```

Source: `WORKFLOW.md` sections 4-5.

## Fresh-Context Review

```mermaid
sequenceDiagram
    autonumber
    participant Writer as Writing agent
    participant Handoff as Diff plus spec slice
    participant Reviewer as Fresh-context reviewer
    actor Human

    Writer->>Handoff: Assemble diff, AGENTS.md, applicable specs, task criteria
    Handoff->>Reviewer: Start with no conversation history
    Reviewer->>Reviewer: Review bugs, coupling, edge cases, spec drift
    Reviewer-->>Writer: Structured findings only
    Writer->>Human: Report findings and proposed fixes
    alt findings require changes
        Human-->>Writer: Choose fixes
        Writer->>Writer: Patch and verify
        Writer->>Reviewer: Re-review changed scope when risk remains
    else no actionable findings
        Writer-->>Human: Residual test gaps and risk
    end
```

Source: `WORKFLOW.md` sections 10 and 12.

## TDD and TDG Choice

```mermaid
flowchart TD
    Change["Requested behavior or implementation outcome"]
    KnownBehavior{"Behavior known and test-expressible up front?"}
    StrategyUncertain{"Multiple plausible implementation strategies?"}
    Tdd["Use ad-tdd<br>RED -> GREEN -> refactor"]
    Tdg["Use ad-tdg<br>Ground truth pair -> approaches -> one criterion"]
    Hybrid["Use TDD as outer loop<br>Use TDG inside GREEN strategy selection"]
    Verify["Run tests through public interfaces"]

    Change --> KnownBehavior
    KnownBehavior -->|yes| StrategyUncertain
    StrategyUncertain -->|yes| Hybrid
    StrategyUncertain -->|no| Tdd
    KnownBehavior -->|no| Tdg
    Tdd --> Verify
    Tdg --> Verify
    Hybrid --> Verify
```

Source: `WORKFLOW.md` sections 9 and 16.

## Diagnosis Loop

```mermaid
flowchart TD
    Bug["Hard bug or performance regression"]
    Loop["Build fast deterministic feedback loop"]
    Repro["Reproduce exact symptom"]
    Hypotheses["Rank 3-5 falsifiable hypotheses"]
    Instrument["Instrument one variable at a time"]
    Prediction{"Prediction confirmed?"}
    Fix["Apply fix"]
    Regression["Promote loop into permanent regression test"]

    Bug --> Loop
    Loop --> Repro
    Repro --> Hypotheses
    Hypotheses --> Instrument
    Instrument --> Prediction
    Prediction -->|no| Hypotheses
    Prediction -->|yes| Fix
    Fix --> Loop
    Loop -->|symptom gone| Regression
```

Source: `WORKFLOW.md` section 15.

## Staged Spike

```mermaid
flowchart TD
    Unknown["Technique uncertain"]
    Discovery["Discovery<br>canonical approaches and real examples"]
    Fixture["Golden fixture<br>inputs plus expected outputs"]
    Pipeline["Pipeline with gates<br>one technique per stage"]
    Debug["Per-stage debug artifacts"]
    Eval["End-to-end and per-stage evaluation"]
    Decide{"Technique good enough?"}
    Task["Convert learned path into task or implementation plan"]
    Revise["Revise approach or fixture"]

    Unknown --> Discovery
    Discovery --> Fixture
    Fixture --> Pipeline
    Pipeline --> Debug
    Debug --> Eval
    Eval --> Decide
    Decide -->|yes| Task
    Decide -->|no| Revise
    Revise --> Discovery
```

Source: `WORKFLOW.md` section 14.
