---
title: Architecture decision records
type: index
status: living
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# Architecture decision records

Why the repository is built the way it is. One decision per record, append-only: a changed
decision gets a new record that supersedes the old one, linked both ways
([ADR-0008](0008-decision-records-and-history-chain.md)).

| ID | Decision | Status | Decided |
|---|---|---|---|
| [ADR-0001](0001-one-marketplace-mods-under-plugin-root.md) | One marketplace, each mod in its own folder under mods/ | accepted | 2026-10-05 |
| [ADR-0002](0002-shared-api-types-from-the-installed-cli.md) | Shared mod API types in mods/types, synced from the installed Claude Code | accepted | 2026-10-05 |
| [ADR-0003](0003-tooling-in-typescript-on-bun.md) | Repository tooling is TypeScript run by Bun | accepted | 2026-10-05 |
| [ADR-0004](0004-layered-tooling-and-production-standards.md) | Layered tooling under DDD, SOLID, CUPID and railway-oriented programming | accepted | 2026-10-05 |
| [ADR-0005](0005-shared-kernel-and-boundary-decoding.md) | A shared kernel for results, boundary decoding and invariants, mirrored into every mod | accepted | 2026-10-05 |
| [ADR-0006](0006-heavy-checks-behind-a-machine-gate.md) | Heavy checks run one at a time behind a machine gate | accepted | 2026-10-05 |
| [ADR-0007](0007-conventional-commits-enforced.md) | Conventional Commits, enforced by a commit-msg hook and in CI | accepted | 2026-10-05 |
| [ADR-0008](0008-decision-records-and-history-chain.md) | Decision records in docs/adr and docs/pdr, project history as a kb chain | accepted | 2026-10-05 |
