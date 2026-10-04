---
title: "ADR-0010: A mod's $ lives in its hooks module, which builds the ports its use cases run on"
type: adr
id: ADR-0010
status: accepted
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# ADR-0010: A mod's `$` lives in its hooks module, which builds the ports its use cases run on

**Status:** accepted. First applied in [11c48eb](https://github.com/arafathusayn/cc-mods/commit/11c48eb) (`usage-meter`).

## Context

`claude plugin validate` follows `$` only into functions declared in the hooks module itself,
never across an import: a sibling module that takes `$` as a parameter fails validation. The
standards of [ADR-0004](0004-layered-tooling-and-production-standards.md) still ask for use cases
that depend on narrow ports and a pure domain.

## Decision

- `hooks/register.tsx` is the composition root and the only file that touches `$`. It declares
  the mod's `$.state` atoms and builds the ports object (`portsOf($)`), each `$` call written in
  full and wrapped once with `attemptAsync`, so a rejection comes back as a `Result`.
- Use cases (`hooks/actions.ts`) take the ports, never `$`. The ports type and the store's
  encoding and decoding live in `hooks/ports.ts`.
- Views are pure functions of the surface's element table (`Pick<Elements[RenderSurface], 'Box' |
  'Text'>`) and plain data; the render hook reads state, resolves the table and calls them.
- A render hook that keeps what `next(e)` answers puts it under a plain Box: the engine's own
  drawing (`{ type: 'engine' }`) is refused under a Box that sets `width`.
- Tests: domain and views with plain values; use cases against in-memory fake ports, failures
  included; the hooks against the engine with `claude-code/testing`, each drawing mounted on
  `terminal` and `desktop`, and a beneath hook that answers `{ type: 'engine', ref: 0 }`.

## Consequences

- `register.tsx` grows with the number of engine calls; everything else stays pure and testable
  without the engine.
- A mod's tests catch a tree a surface would refuse, which a live session reports only once.
