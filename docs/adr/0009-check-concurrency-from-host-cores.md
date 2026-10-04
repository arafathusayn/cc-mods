---
title: "ADR-0009: Heavy checks behind a machine gate, CI concurrency from the host's cores"
type: adr
id: ADR-0009
status: superseded
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# ADR-0009: Heavy checks behind a machine gate, CI concurrency from the host's cores

**Status:** superseded by [ADR-0015](0015-gate-load-limit-from-the-environment.md). Supersedes
[ADR-0006](0006-heavy-checks-behind-a-machine-gate.md).

## Context

ADR-0006 let `CC_MODS_CHECK_CONCURRENCY` range from 1 to the core count and had CI set it to a
fixed 4. A hosted runner with fewer cores refused that value and the check failed before it
started. The runner's size is the runner's business; the workflow should not need to know it.

## Decision

- `tsc`, tests and `claude plugin validate`/`test` run only through
  `bun scripts/cli/gated.ts <command...>`, which `bun run check`, `bun run test` and
  `bun run typecheck` use.
- The gate re-enters itself under `lockf -k -t 5400 <temp dir>/cc-mods-checks.lock` where
  `lockf` exists, then waits while the 1-minute load (`sysctl -n vm.loadavg`) is at or above 60%
  of the cores or free memory (`memory_pressure`) is under 20%. It polls every 15 s and gives up
  after 30 min with exit 75 (sysexits `EX_TEMPFAIL`, as `lockf` uses). With no reading (another
  platform, a sandbox) it runs under the lock alone and says so.
- Inside the gate, `check` runs one check at a time. `CC_MODS_CHECK_CONCURRENCY`, decoded once at
  the boundary, raises it: `auto` is the host's core count (`availableParallelism()`); a positive
  integer is a request that the core count caps; anything else exits 2 with the decode message.
  Only CI, a dedicated runner, sets it, to `auto`.
- `tsc --singleThreaded`; `bun test` without `--parallel`. Checks never run in subagents or in the
  background beside another check.

## Consequences

- Checks are slower on an idle machine and never pile up on a busy one.
- CI runs one check per core on whatever runner it gets, with no number in the workflow.

## Verified

`auto` decodes to the host's core count, `1` and `2` to themselves, a number above the core count
to the core count, an empty or unset variable to 1; `0`, `abc`, `2.5` and `0x4` exit 2 with
`must be "auto" or a positive integer`. `bun run check` and `bun run test` pass under the gate.
