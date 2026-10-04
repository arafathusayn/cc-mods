# Index

## Chains

| Chain | What it records | Nodes | Head |
|---|---|---|---|
| [history](chains/history/) | verified milestones of the repository | 9 | [history/009](chains/history/2026-10-05T0525--009--readme-install-guides.md) |

## history

| Node | Datetime (+06:00) | Milestone | Records | Commits |
|---|---|---|---|---|
| [001](chains/history/2026-10-05T0327--001--repository-bootstrap.md) | 2026-10-05 03:27 | Repository bootstrap | PDR-0001, ADR-0001, ADR-0002, ADR-0003 | 9c48b55 |
| [002](chains/history/2026-10-05T0339--002--standards-landed.md) | 2026-10-05 03:39 | Production standards landed | ADR-0004, ADR-0005, ADR-0007 | a01f9b2 45d482a d0ac0fc 9490514 |
| [003](chains/history/2026-10-05T0340--003--ci-checkout-v7.md) | 2026-10-05 03:40 | CI on actions/checkout v7 | | b3dda08 |
| [004](chains/history/2026-10-05T0342--004--license-agpl.md) | 2026-10-05 03:42 | License: AGPL-3.0-only | PDR-0002 | 8c94993 |
| [005](chains/history/2026-10-05T0346--005--check-gate.md) | 2026-10-05 03:46 | Heavy checks behind a machine gate | ADR-0006 | 5ca25a0 |
| [006](chains/history/2026-10-05T0357--006--decision-records.md) | 2026-10-05 03:57 | Decision records and the history chain | ADR-0008 | fc64229 |
| [007](chains/history/2026-10-05T0408--007--check-concurrency-auto.md) | 2026-10-05 04:08 | CI check concurrency from the host's cores | ADR-0009 | c8c04dc |
| [008](chains/history/2026-10-05T0445--008--usage-meter.md) | 2026-10-05 04:45 | The first mod: usage-meter | PDR-0003, ADR-0010, ADR-0011 | 11c48eb 6a1c90f f069555 eaf0a21 |
| [009](chains/history/2026-10-05T0525--009--readme-install-guides.md) | 2026-10-05 05:25 | Install guides in the README, rendered from the catalog | ADR-0012 | ebe95f4 |

## Graph

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Inter, ui-sans-serif, system-ui, sans-serif","lineColor":"#64748b","edgeLabelBackground":"#0f172a","clusterBkg":"#f8fafc","clusterBorder":"#cbd5e1","titleColor":"#0f172a"}}}%%
flowchart LR
  subgraph records ["Decision records"]
    P1["PDR-0001<br>one catalog"]:::purple
    A1["ADR-0001<br>layout"]:::blue
    A2["ADR-0002<br>shared types"]:::blue
    A3["ADR-0003<br>TS on Bun"]:::blue
    A4["ADR-0004<br>layers, standards"]:::blue
    A5["ADR-0005<br>kernel"]:::blue
    A7["ADR-0007<br>commits"]:::blue
    P2["PDR-0002<br>AGPL"]:::purple
    A6["ADR-0006<br>check gate"]:::blue
    A8["ADR-0008<br>records, chain"]:::blue
    A9["ADR-0009<br>cores-sized CI"]:::blue
    P3["PDR-0003<br>usage-meter"]:::purple
    A10["ADR-0010<br>mod structure"]:::blue
    A11["ADR-0011<br>model weeks"]:::blue
    A12["ADR-0012<br>README from catalog"]:::blue
  end
  subgraph history ["history chain"]
    H1["001 bootstrap"]:::green --> H2["002 standards"]:::green
    H2 --> H3["003 checkout v7"]:::green
    H3 --> H4["004 license"]:::green
    H4 --> H5["005 check gate"]:::green
    H5 --> H6["006 records"]:::green
    H6 --> H7["007 CI cores"]:::green
    H7 --> H8["008 usage-meter"]:::green
    H8 --> H9["009 README guides"]:::green
  end
  P1 -.-> H1
  A1 -.-> H1
  A2 -.-> H1
  A3 -.-> H1
  A4 -.-> H2
  A5 -.-> H2
  A7 -.-> H2
  P2 -.-> H4
  A6 -.-> H5
  A8 -.-> H6
  A9 -.-> H7
  A9 -.->|"supersedes"| A6
  P3 -.-> H8
  A10 -.-> H8
  A11 -.-> H8
  A12 -.-> H9
  classDef green fill:#dcfce7,stroke:#16a34a,color:#14532d
  classDef blue fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
  classDef purple fill:#f3e8ff,stroke:#9333ea,color:#581c87
  linkStyle default stroke:#64748b,color:#f8fafc
```

Green nodes are milestones in time order, joined by solid arrows; blue are architecture
decisions and purple product decisions, each joined by a dashed arrow to the milestone that
realised it; a dashed arrow labelled "supersedes" joins a record to the one it replaces.
