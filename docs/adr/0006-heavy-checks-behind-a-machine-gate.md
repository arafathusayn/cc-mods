---
title: "ADR-0006: Heavy checks run one at a time behind a machine gate"
type: adr
id: ADR-0006
status: superseded
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# ADR-0006: Heavy checks run one at a time behind a machine gate

**Status:** superseded by [ADR-0009](0009-check-concurrency-from-host-cores.md). Live since
[5ca25a0](https://github.com/arafathusayn/cc-mods/commit/5ca25a0).

## Context

On a developer machine shared by several coding agents, type checks and test runs started in
parallel can starve it.

## Decision

- `tsc`, tests and `claude plugin validate`/`test` run only through
  `bun scripts/cli/gated.ts <command...>`, which `bun run check`, `bun run test` and
  `bun run typecheck` use.
- The gate re-enters itself under `lockf -k -t 5400 <temp dir>/cc-mods-checks.lock` where
  `lockf` exists, then waits while the 1-minute load (`sysctl -n vm.loadavg`) is at or above 60%
  of the cores or free memory (`memory_pressure`) is under 20%. It polls every 15 s and gives up
  after 30 min with exit 75 (sysexits `EX_TEMPFAIL`, as `lockf` uses). With no reading (another
  platform, a sandbox) it runs under the lock alone and says so.
- Inside the gate, `check` runs one check at a time; `CC_MODS_CHECK_CONCURRENCY` (decoded at the
  boundary, 1 to the core count) raises it, and only CI, a dedicated runner, sets it (4).
- `tsc --singleThreaded`; `bun test` without `--parallel`. Checks never run in subagents or in the
  background beside another check.

## Consequences

- Checks are slower on an idle machine and never pile up on a busy one.
- CI keeps its speed through the concurrency variable.

## Verified

`bun run check` ran under the lock and passed; a non-numeric `CC_MODS_CHECK_CONCURRENCY` exits 2
with a decode message; unit tests cover the readings, the core-relative limits, waiting, giving up
and the unmeasured case.
