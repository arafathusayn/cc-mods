---
title: "ADR-0015: The check gate's load limit is a share of the cores, set by CC_MODS_GATE_LOAD_PERCENT"
type: adr
id: ADR-0015
status: accepted
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# ADR-0015: The check gate's load limit is a share of the cores, set by CC_MODS_GATE_LOAD_PERCENT

**Status:** accepted. Supersedes [ADR-0009](0009-check-concurrency-from-host-cores.md).

## Context

ADR-0009 fixed the load gate at 60% of the cores. On a machine busy with other work the 1-minute
load can sit just above that line for a long time, and `bun run check` then waits without
starting: there was no way to let one run through, or to measure what a check costs at a given
load, short of editing the code. The wait line also gave the load but not the limit it was held
to.

## Decision

- `tsc`, tests and `claude plugin validate`/`test` run only through
  `bun scripts/cli/gated.ts <command...>`, which `bun run check`, `bun run test` and
  `bun run typecheck` use.
- The gate re-enters itself under `lockf -k -t 5400 <temp dir>/cc-mods-checks.lock` where
  `lockf` exists, then waits while the 1-minute load (`sysctl -n vm.loadavg`) is at or above the
  load limit or free memory (`memory_pressure`) is under 20%. It polls every 15 s and gives up
  after 30 min with exit 75 (sysexits `EX_TEMPFAIL`, as `lockf` uses). With no reading (another
  platform, a sandbox) it runs under the lock alone and says so.
- The load limit is `CC_MODS_GATE_LOAD_PERCENT` percent of the cores, rounded, at least 1; the
  variable is a positive whole number, 60 when unset or empty, and may exceed 100. It is decoded
  once, before the lock is taken; anything else exits 2 with the decode message.
- Each wait prints the reading and the limits it is held to, such as
  `waiting for room: load 10.15, 41% memory free (needs load under 8, 20% memory free)`.
- Inside the gate, `check` runs one check at a time. `CC_MODS_CHECK_CONCURRENCY`, decoded once at
  the boundary, raises it: `auto` is the host's core count (`availableParallelism()`); a positive
  integer is a request that the core count caps; anything else exits 2 with the decode message.
  Only CI, a dedicated runner, sets it, to `auto`.
- `tsc --singleThreaded`; `bun test` without `--parallel`. Checks never run in subagents or in the
  background beside another check.

## Consequences

- A developer can let one check through a busy machine, or try a check at a chosen load, with
  one variable and no code change; the default stays as cautious as before.
- The lock still keeps checks to one at a time, whatever the load limit.
- A waiting run says how far it is from starting.

## Verified

`loadLimitsFor` gives 8 for 14 cores at the default, 11 at 80, 21 at 150 and 1 at 1 (unit
tests). `CC_MODS_GATE_LOAD_PERCENT` set to `0`, `abc`, `2.5` or `-5` exits 2 with
`must be a positive integer`. `bun run check` passes under the gate.
