# Workflow Flows

`WORKFLOW.md` is the canonical prose contract. This file is its visual quick-start: after installing `agentic`, use these flows to decide which skill to invoke next and in what order. If a diagram conflicts with `WORKFLOW.md`, `WORKFLOW.md` wins.

## Reading Rule

Start from your situation, not from the full artifact stack. The stack explains why the artifacts exist; the scenario flows below explain what to run next.

If you are unsure where you are, run `/ad-next`. It is read-only and exists exactly for the "what now?" moment.

## Scenario Router

```mermaid
flowchart TD
    Start["I just installed agentic or opened a project"]
    Installed{"Skills installed here?"}
    Init["agentic init<br>choose profile and agent"]
    Ready["Open Claude Code or Codex<br>with installed skills"]
    Unsure{"Not sure what state the project is in?"}
    Next["/ad-next<br>state survey and prioritized next actions"]
    Update["agentic update<br>only when kit state is stale or you want upstream changes"]
    Scenario{"What kind of work is this?"}
    New["New product or first real feature"]
    Existing["Existing project or brownfield feature"]
    Bug["Bug or performance regression"]
    Research["Research question before implementation"]
    Review["Diff ready for review or merge"]
    Handoff["Session getting long or context needs reset"]

    Start --> Installed
    Installed -->|no| Init
    Installed -->|yes| Ready
    Init --> Ready
    Ready --> Unsure
    Unsure -->|yes| Next
    Unsure -->|no| Scenario
    Next -->|kit stale| Update
    Update --> Next
    Next --> Scenario
    Scenario --> New
    Scenario --> Existing
    Scenario --> Bug
    Scenario --> Research
    Scenario --> Review
    Scenario --> Handoff
```

Source: `WORKFLOW.md` sections 1, 4-6, 10-12, 15-16; `ad-next` skill contract.

## Profile Gate

```mermaid
flowchart TD
    Work["Project maturity profile"]
    Poc["poc<br>experiment or spike"]
    Solo["solo<br>real product, one engineer"]
    Team["team<br>shared product"]
    Mature["mature<br>regulated or gate-heavy product"]

    PocFlow["Use /ad-grill-me, /ad-ground, /ad-spike, /ad-tdg, /ad-tdd, /ad-diagnose, /ad-drift, /ad-next<br>Do not create PRD/spec/task/ADR unless the project graduates"]
    SoloFlow["Available beyond poc: /ad-prd, /ad-bootstrap, /ad-guidelines, /ad-spec, /ad-task, /ad-review, /ad-commit, /ad-pr, /ad-merge<br>/ad-architecture and /ad-adr are opt-in"]
    TeamFlow["Use the full artifact stack after product framing<br>/ad-architecture, /ad-adr, /ad-deepen, /ad-audit and /ad-level-up are in the normal path"]
    MatureFlow["Team flow plus /ad-hooks as an expected gate-wiring step"]

    Work --> Poc
    Work --> Solo
    Work --> Team
    Work --> Mature
    Poc --> PocFlow
    Solo --> SoloFlow
    Team --> TeamFlow
    Mature --> MatureFlow
```

Source: `WORKFLOW.md` section 1 and TL;DR #20.

## New Product Or First Real Feature

Use this when the project has no durable product framing yet, or when a greenfield repo is moving past a throwaway PoC.

```mermaid
flowchart TD
    Init["agentic init<br>install skills only"]
    ProductFuzzy{"Product ask fuzzy?"}
    Grill["/ad-grill-me<br>interview before research"]
    Domain["/ad-domain<br>capture resolved vocabulary in CONTEXT.md"]
    Prd["/ad-prd<br>product scope, target user, metrics, roadmap"]
    Bootstrap["/ad-bootstrap<br>AGENTS.md session-load rules derived from context"]
    Guidelines["/ad-guidelines<br>GUIDELINES.md engineering reference"]
    Frontend{"Frontend project with tokens or styles?"}
    Design["/ad-design<br>DESIGN.md visual contract"]
    Feature["Pick one MVP feature"]
    Spec["/ad-spec<br>feature contract"]
    ArchitectureNeeded{"Feature creates or reveals system pattern?"}
    Architecture["/ad-architecture<br>system patterns and boundaries"]
    DecisionNeeded{"Binding decision?<br>hard to reverse, surprising, real trade-off"}
    Adr["/ad-adr<br>decision record"]
    Task["/ad-task<br>vertical work unit with Spec ref"]
    Ground["/ad-ground<br>four-source research and happy path"]
    Implement["Implement slice<br>/ad-tdd or /ad-tdg as needed"]
    Review["/ad-review main..HEAD"]
    Ship["/ad-commit -> /ad-pr -> /ad-merge<br>as project workflow requires"]

    Init --> ProductFuzzy
    ProductFuzzy -->|yes| Grill
    Grill --> Domain
    Domain --> Prd
    ProductFuzzy -->|no| Prd
    Prd --> Bootstrap
    Bootstrap --> Guidelines
    Guidelines --> Frontend
    Frontend -->|yes| Design
    Frontend -->|no| Feature
    Design --> Feature
    Feature --> Spec
    Spec --> ArchitectureNeeded
    ArchitectureNeeded -->|yes| Architecture
    ArchitectureNeeded -->|no| DecisionNeeded
    Architecture --> DecisionNeeded
    DecisionNeeded -->|yes| Adr
    DecisionNeeded -->|no| Task
    Adr --> Task
    Task --> Ground
    Ground --> Implement
    Implement --> Review
    Review --> Ship
```

Source: `WORKFLOW.md` sections 1, 4-6, 9-12, 16.

## Brownfield First Session

Use this when the repo already has code, conventions, and maybe old docs. The first move is to inspect and backfill only what changes agent behavior.

```mermaid
flowchart TD
    Open["Open existing project"]
    Installed{"agentic state present?"}
    Init["agentic init<br>first install"]
    Update["agentic update<br>only for upstream kit changes"]
    Next["/ad-next<br>read-only state survey"]
    NeedRules{"AGENTS.md missing or stale?"}
    Bootstrap["/ad-bootstrap<br>scan-first AGENTS.md"]
    NeedGuidelines{"Engineering rules buried or absent?"}
    Guidelines["/ad-guidelines<br>scan toolchain, tests, gates, canonical examples"]
    NeedArchitecture{"Architecture/pattern docs missing or contradicted?"}
    Architecture["/ad-architecture<br>audit existing code or write patterns"]
    NeedDrift{"Suspect docs/code drift?"}
    Audit["/ad-drift<br>read-only drift list"]
    WorkKind{"What are you doing now?"}
    QuickFix["Small fix<br>implement, verify, maybe /ad-review"]
    Feature["Feature work<br>/ad-grill-me -> /ad-prd or /ad-spec -> /ad-task"]
    Research["Research only<br>/ad-ground"]

    Open --> Installed
    Installed -->|no| Init
    Installed -->|yes| Next
    Init --> Next
    Next -->|kit state stale| Update
    Update --> Next
    Next --> NeedRules
    NeedRules -->|yes| Bootstrap
    NeedRules -->|no| NeedGuidelines
    Bootstrap --> NeedGuidelines
    NeedGuidelines -->|yes| Guidelines
    NeedGuidelines -->|no| NeedArchitecture
    Guidelines --> NeedArchitecture
    NeedArchitecture -->|yes| Architecture
    NeedArchitecture -->|no| NeedDrift
    Architecture --> NeedDrift
    NeedDrift -->|yes| Audit
    NeedDrift -->|no| WorkKind
    Audit --> WorkKind
    WorkKind --> QuickFix
    WorkKind --> Feature
    WorkKind --> Research
```

Source: `WORKFLOW.md` sections 1, 4-6, 10-12.

## Fuzzy Ask To Implementation

Use this when the request is not sharp enough to research or implement.

```mermaid
flowchart TD
    Ask["Vague ask<br>ambiguous user, problem, term, or success condition"]
    Grill["/ad-grill-me<br>one question at a time"]
    Term{"Vocabulary resolved?"}
    Domain["/ad-domain<br>CONTEXT.md"]
    Scope{"Scope level?"}
    Product["/ad-prd<br>product-level scope"]
    Feature["/ad-spec<br>one feature"]
    Decision{"Architecture decision surfaced?"}
    Adr["/ad-adr"]
    Task["/ad-task"]
    Ground["/ad-ground"]
    Implement["Implement and verify"]

    Ask --> Grill
    Grill --> Term
    Term -->|yes| Domain
    Term -->|no| Scope
    Domain --> Scope
    Scope -->|product| Product
    Scope -->|feature| Feature
    Product --> Feature
    Feature --> Decision
    Decision -->|yes| Adr
    Decision -->|no| Task
    Adr --> Task
    Task --> Ground
    Ground --> Implement
```

Source: `WORKFLOW.md` sections 1, 4-6; `ad-grill-me`, `ad-domain`, `ad-prd`, `ad-spec`, `ad-task` skill contracts.

## Research And Technique Choice

Use this before writing code — to answer an open research question, de-risk a build that carries several unknowns, or pick an implementation technique.

```mermaid
flowchart TD
    Start["Question or defined task, before implementation"]
    OpenQ{"Open question whose output is a conclusion?<br>adopt X? A vs B? state of the art?"}
    Research["/ad-research<br>Evidence-Based loop + WORKFLOW §17 grading<br>evidence-graded study at doc/research/NNNN"]
    Verdict{"Study verdict (WORKFLOW §17 Axis 2)"}
    Clear["Clear problem or defined task to build"]
    ManyUnknowns{"Several unknowns to retire before building?"}
    Derisk["/ad-derisk<br>risk register, dispatch per unknown,<br>stop when technical risk drops below non-technical risk"]
    TechniqueUnknown{"Single technique uncertain?<br>library, pipeline, novel approach"}
    Spike["/ad-spike<br>golden fixture, staged pipeline, evaluation"]
    TechniqueKnown{"Technique known but strategy uncertain?"}
    Tdg["/ad-tdg<br>ground truth pair, Test Dependency Map, candidate approaches"]
    BehaviorKnown{"Behavior test-expressible up front?"}
    Tdd["/ad-tdd<br>red, green, refactor"]
    Ground["/ad-ground<br>happy path before implementation"]
    Implement["Implement"]
    AdrNeeded{"Binding decision created?"}
    Adr["/ad-adr"]
    Task["/ad-task or update existing task"]

    Start --> OpenQ
    OpenQ -->|yes| Research
    Research --> Verdict
    Verdict -->|binds a decision| Adr
    Verdict -->|feeds a build| Clear
    Verdict -->|insufficient, spike-first| Spike
    OpenQ -->|no| Clear
    Clear --> ManyUnknowns
    ManyUnknowns -->|yes| Derisk
    ManyUnknowns -->|no| TechniqueUnknown
    Derisk --> TechniqueUnknown
    TechniqueUnknown -->|yes| Spike
    TechniqueUnknown -->|no| TechniqueKnown
    Spike --> AdrNeeded
    TechniqueKnown -->|yes| Tdg
    TechniqueKnown -->|no| BehaviorKnown
    BehaviorKnown -->|yes| Tdd
    BehaviorKnown -->|no| Ground
    Tdg --> Implement
    Tdd --> Implement
    Ground --> Implement
    Implement --> AdrNeeded
    AdrNeeded -->|yes| Adr
    AdrNeeded -->|no| Task
    Adr --> Task
```

Source: `WORKFLOW.md` sections 4-5, 9, 14, 16, 17; `ad-research`, `ad-derisk`, `ad-spike`, `ad-tdg`, `ad-tdd`, `ad-ground` skill contracts.

## Delegation Gate

Use this before asking for a subagent. The question is not "can an agent do it?", it is "can the work be handed over with a bounded packet and a clear stop condition?"

```mermaid
flowchart TD
    Work["Candidate work"]
    Packet{"Can you write a bounded packet?<br>goal, sources, scope, output, stop"}
    Main["Keep in main session<br>explore, plan, implement, verify"]
    Human{"Needs product judgment,<br>taste, frequent back-and-forth,<br>or immediate blocking decision?"}
    Hitl["Mark /ad-task Execution: HITL<br>or keep with the human/main session"]
    Shape{"Which bounded shape?"}
    Review["/ad-review<br>fresh-context review"]
    Research["Sidecar research<br>codebase, docs/API, examples"]
    Test["Test designer<br>public-interface cases from spec/task"]
    Repro["Bug reproducer<br>small failing loop, then stop"]
    Worker["Bounded worker<br>disjoint files/modules only"]
    Reusable{"Role repeats or needs<br>tools/model/sandbox restrictions?"}
    Subagent["/ad-subagent<br>Claude: .claude/agents/*.md<br>Codex: .codex/agents/*.toml"]
    Existing["Use built-in/existing agent<br>or one explicit one-off spawn"]
    Handoff["/ad-handoff<br>when the packet is too large for one turn"]

    Work --> Packet
    Packet -->|no| Main
    Packet -->|yes| Human
    Human -->|yes| Hitl
    Human -->|no| Shape
    Shape --> Review
    Shape --> Research
    Shape --> Test
    Shape --> Repro
    Shape --> Worker
    Review --> Reusable
    Research --> Reusable
    Test --> Reusable
    Repro --> Reusable
    Worker --> Reusable
    Reusable -->|yes| Subagent
    Reusable -->|no| Existing
    Packet -->|too large| Handoff
    Handoff --> Existing
```

Source: `WORKFLOW.md` sections 6 and 10; Claude Code subagents docs; Codex subagents docs; `ad-subagent`, `ad-task`, `ad-handoff`, and `ad-review` skill contracts.

## Bug Or Performance Regression

Use this when something is broken and the cause is not obvious. If it is a typo-level fix, fix it directly and verify.

```mermaid
flowchart TD
    Symptom["Bug or performance regression"]
    Obvious{"Cause obvious and fix tiny?"}
    Direct["Fix directly<br>run relevant tests"]
    Diagnose["/ad-diagnose<br>feedback loop, reproduce, hypotheses, instrument"]
    Regression["Regression test<br>permanent coverage"]
    Review{"Non-trivial diff?"}
    AdReview["/ad-review main..HEAD"]
    Commit["/ad-commit or normal project commit"]

    Symptom --> Obvious
    Obvious -->|yes| Direct
    Obvious -->|no| Diagnose
    Diagnose --> Regression
    Direct --> Review
    Regression --> Review
    Review -->|yes| AdReview
    Review -->|no| Commit
    AdReview --> Commit
```

Source: `WORKFLOW.md` sections 10-12 and 15.

## Close The Work

Use this when code is already changed and you need to decide how to land or hand it off.

```mermaid
flowchart TD
    Diff["Working tree or branch diff"]
    LongSession{"Context long, branch mid-flight, or handoff needed?"}
    Handoff["/ad-handoff<br>ephemeral handoff with suggested next skills"]
    Verify["Run tests and quality gates"]
    ReviewNeeded{"Non-trivial behavior or standards risk?"}
    Review["/ad-review main..HEAD"]
    HighStakes{"Going to the team, a PR, or a handoff?<br>(team / mature profiles)"}
    MaxGate["/ad-audit<br>maximum gate, rules-anchored, evidence per claim"]
    Findings{"Actionable findings?"}
    Fix["Fix, verify again"]
    RuleGap["/ad-level-up<br>when a finding is a rule gap, not a code defect"]
    Commit["/ad-commit<br>atomic Conventional Commit with DCO"]
    Pr["/ad-pr<br>open PR"]
    Merge["/ad-merge<br>evaluate CI, comments, mergeability"]
    Audit["/ad-drift<br>periodic drift check after larger work"]

    Diff --> LongSession
    LongSession -->|yes| Handoff
    LongSession -->|no| Verify
    Handoff --> Verify
    Verify --> ReviewNeeded
    ReviewNeeded -->|yes| Review
    ReviewNeeded -->|no| Commit
    Review --> HighStakes
    HighStakes -->|yes| MaxGate
    HighStakes -->|no| Findings
    MaxGate --> Findings
    Findings -->|yes| Fix
    Findings -->|rule gap| RuleGap
    RuleGap --> Fix
    Fix --> Verify
    Findings -->|no| Commit
    Commit --> Pr
    Pr --> Merge
    Merge --> Audit
```

Source: `WORKFLOW.md` sections 6, 10-12.

## Artifact Stack And Owning Skills

The stack is useful after the scenario router tells you which layer you are touching.

```mermaid
flowchart TD
    Workflow["WORKFLOW.md<br>kit-shipped philosophy"]
    Agents["AGENTS.md<br>/ad-bootstrap"]
    Guidelines["GUIDELINES.md<br>/ad-guidelines"]
    Context["CONTEXT.md<br>/ad-domain"]
    Product["doc/product/PRD.md<br>/ad-prd"]
    Spec["doc/specs/NNNN-slug.md<br>/ad-spec"]
    Architecture["ARCHITECTURE.md<br>/ad-architecture"]
    Adr["doc/adr/NNNN-slug.md<br>/ad-adr"]
    Task["doc/tasks/NNNN-slug.md<br>/ad-task"]
    Code["Code<br>/ad-ground, /ad-tdd, /ad-tdg, /ad-spike, /ad-diagnose"]
    Review["Review and delivery<br>/ad-review, /ad-commit, /ad-pr, /ad-merge"]

    subgraph Constitution["Layer 1: Constitution"]
        Workflow
        Agents
        Guidelines
    end

    Constitution --> Context
    Context --> Product
    Product --> Spec
    Spec --> Architecture
    Spec --> Adr
    Spec --> Task
    Architecture --> Code
    Adr --> Code
    Task --> Code
    Code --> Review
```

Source: `WORKFLOW.md` section 1.
