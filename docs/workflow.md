# Gauge workflow

```mermaid
flowchart LR
    A[Seven harnesses through shared swarm] --> B[Existing production resolver]
    B --> C[Original model returned unchanged]
    B --> D[Bounded local observer]
    E[Explicit JSON CLI] --> F[Same Gauge classifier]
    D --> F
    F --> G{Enough context?}
    G -->|No| H[Abstain]
    G -->|Yes| I[Proposed complexity tier]
    I --> J[Canonical resolver and actual registry entry]
    J --> K[Qualified catalog / pins / fallback]
    K --> L[Private shadow receipt]
    H --> L
    M[Timeout or storage failure] --> C
```

No arrow from the proposal to production selection exists. The observer returns the previously computed model; it cannot authorize qualification, promote a catalog route or change a native session. Five assessment tiers map to four swarm tiers at the resolver boundary; apex maps to complex. V3 also failed the unchanged promotion gate. Its diagnostic and completed N01–N40 human review are documented in [the report](../evaluation/v3/REPORT.md) and [approval record](../evaluation/v3/APPROVAL.md). Earlier H01–H30 review is complete.
