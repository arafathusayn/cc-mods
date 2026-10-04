---
title: "ADR-0003: Repository tooling is TypeScript run by Bun"
type: adr
id: ADR-0003
status: accepted
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# ADR-0003: Repository tooling is TypeScript run by Bun

**Status:** accepted. Live since [9c48b55](https://github.com/arafathusayn/cc-mods/commit/9c48b55165a8b1f4155425a43b2665f849e226c4).

## Context

The repository needs tooling to scaffold mods, keep the catalog consistent, sync types and run
checks. Mods are TypeScript already.

## Decision

- Every script is TypeScript under `scripts/`, run by Bun (`bun scripts/...`) and exposed as
  `package.json` scripts: `new`, `check`, `test`, `typecheck`, `sync-types`, `sync-kernel`.
  No shell or other-language scripts; `.githooks/commit-msg` is a one-line shim into Bun.
- Bun is pinned with `packageManager` (`bun@1.4.2`); `typescript` (7.0.2, native `tsc`) and
  `@types/bun` are pinned dev dependencies; `bun.lock` is committed and CI installs with
  `--frozen-lockfile`.

## Consequences

- One language and one type system across mods, kernel and tooling.
- The same strict compiler options check the tooling ([ADR-0004](0004-layered-tooling-and-production-standards.md)).
